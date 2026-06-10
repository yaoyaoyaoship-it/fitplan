const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = path.resolve(__dirname, "..");
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "text/html; charset=utf-8";
}

function startServer() {
  const server = http.createServer((req, res) => {
    const requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    const filePath = path.join(repoRoot, decodeURIComponent(requested.replace(/^\/+/, "")));
    if (!filePath.startsWith(repoRoot)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function main() {
  const { server, url } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: edgePath,
  });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    await page.fill("#login-email", "user@fitplan.com");
    await page.fill("#login-password", "fitplan123");
    await page.click("#login-form .btn-primary");
    await page.waitForTimeout(9000);
    await page.waitForSelector("#page-overview.active", { timeout: 10000 });

    const state = await page.evaluate(() => {
      const ids = ["overview", "today", "training", "diet", "progress"];
      return {
        pageErrors: [],
        moduleIds: ids.map((id) => ({
          id,
          hasTab: !!document.querySelector(`#tab-${id}`),
          hasPage: !!document.querySelector(`#page-${id}`),
        })),
        activeTab: document.querySelector("#main-tabs .tab.active")?.id || "",
        activePage: document.querySelector(".page.active")?.id || "",
        settingsVisible: !!document.querySelector("#settings-modal"),
      };
    });

    const missing = state.moduleIds.filter((item) => !item.hasTab || !item.hasPage);
    if (missing.length) {
      throw new Error(`Missing modules: ${JSON.stringify(missing)}`);
    }
    if (state.activeTab !== "tab-overview" || state.activePage !== "page-overview") {
      throw new Error(`Expected overview active after login, got ${state.activeTab}/${state.activePage}`);
    }

    await page.click("#tab-diet");
    await page.waitForTimeout(1500);
    const dietState = await page.evaluate(() => ({
      hasFrequentFoods: !!document.querySelector("#frequent-foods"),
      hasManageButton: !!document.querySelector("#manage-frequent-foods"),
      frequentText: document.querySelector("#frequent-foods")?.innerText || "",
    }));
    if (!dietState.hasFrequentFoods || !dietState.hasManageButton) {
      throw new Error(`Expected frequent food management controls, got ${JSON.stringify(dietState)}`);
    }
    await page.click("#manage-frequent-foods");
    await page.fill("#freq-name", "Playwright oats");
    await page.fill("#freq-cal", "420");
    await page.fill("#freq-protein", "24");
    await page.fill("#freq-carbs", "54");
    await page.fill("#freq-fat", "9");
    await page.click("#frequent-food-modal .btn-primary");
    await page.waitForTimeout(500);
    const frequentAfterAdd = await page.evaluate(() => document.querySelector("#frequent-foods")?.innerText || "");
    if (!frequentAfterAdd.includes("Playwright oats")) {
      throw new Error(`Expected saved frequent food to appear, got ${frequentAfterAdd}`);
    }
    await page.click("#frequent-food-modal .btn-secondary");
    await page.waitForTimeout(500);

    while (await page.evaluate(() => [...document.querySelectorAll("#today-foods .food-delete")]
      .some((button) => button.getAttribute("aria-label")?.includes("Meal timeline ")))) {
      await page.evaluate(() => [...document.querySelectorAll("#today-foods .food-delete")]
        .find((button) => button.getAttribute("aria-label")?.includes("Meal timeline "))?.click());
      await page.waitForTimeout(700);
    }

    const mealTestName = `Meal timeline ${Date.now()}`;
    await page.selectOption("#meal-type-select", "晚餐");
    await page.fill("#food-name", mealTestName);
    await page.fill("#food-cal", "321");
    await page.fill("#food-protein", "20");
    await page.fill("#food-carbs", "35");
    await page.fill("#food-fat", "8");
    await page.click("button[onclick='addCustomFood()']");
    await page.waitForFunction(
      (name) => document.querySelector("#today-foods")?.innerText.includes(name),
      mealTestName,
      { timeout: 12000 },
    );

    const mealGroups = await page.evaluate(() => [...document.querySelectorAll("#today-foods .meal-record-group")].map((group) => ({
      type: group.dataset.mealType,
      text: group.innerText,
      deleteTexts: [...group.querySelectorAll("button")].map((button) => button.textContent.trim()),
    })));
    const dinnerState = mealGroups.find((group) => group.type === "晚餐");
    if (!dinnerState || !dinnerState.text.includes(mealTestName)) {
      throw new Error(`Expected dinner record ${JSON.stringify(mealTestName)}, got ${JSON.stringify(mealGroups)}`);
    }
    if (!dinnerState.deleteTexts.length || dinnerState.deleteTexts.some((text) => text !== "×" || text.includes("\\u2715"))) {
      throw new Error(`Expected real delete symbols, got ${JSON.stringify(dinnerState.deleteTexts)}`);
    }

    await page.click("#tab-today");
    await page.waitForTimeout(1200);
    const todayMealState = await page.evaluate((name) => ({
      hasSummary: !!document.querySelector("#today-summary"),
      breakfastTime: document.querySelector('[data-meal-type="早餐"] .timeline-time')?.textContent || "",
      dinnerText: document.querySelector('[data-meal-type="晚餐"]')?.innerText || "",
      dinnerCalories: document.querySelector('[data-meal-type="晚餐"]')?.innerText.includes("321 kcal") || false,
      hasFood: document.querySelector('[data-meal-type="晚餐"]')?.innerText.includes(name) || false,
    }), mealTestName);
    if (!todayMealState.hasSummary || !todayMealState.breakfastTime.includes("09:00")
        || !todayMealState.dinnerCalories || !todayMealState.hasFood) {
      throw new Error(`Expected meal-aware Today timeline, got ${JSON.stringify(todayMealState)}`);
    }

    await page.click("#tab-diet");
    await page.waitForTimeout(800);
    while (await page.evaluate(() => [...document.querySelectorAll("#today-foods .food-delete")]
      .some((button) => button.getAttribute("aria-label")?.includes("Meal timeline ")))) {
      await page.evaluate(() => [...document.querySelectorAll("#today-foods .food-delete")]
        .find((button) => button.getAttribute("aria-label")?.includes("Meal timeline "))?.click());
      await page.waitForTimeout(500);
    }

    await page.click("#tab-training");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /管理|模板/ }).first().click();
    await page.waitForTimeout(500);
    const templateState = await page.evaluate(() => ({
      visible: window.getComputedStyle(document.querySelector("#template-modal")).display !== "none",
      text: document.querySelector("#template-modal")?.innerText || "",
    }));
    if (!templateState.visible) {
      throw new Error(`Expected template manager to open, got ${JSON.stringify(templateState)}`);
    }
    await page.locator("#template-modal").getByRole("button", { name: "关闭" }).click();
    await page.waitForTimeout(500);

    await page.click("#user-avatar");
    await page.waitForTimeout(500);
    const settingsState = await page.evaluate(() => ({
      visible: document.querySelector("#settings-modal")?.classList.contains("show") || false,
      text: document.querySelector("#settings-modal")?.innerText || "",
    }));
    if (!settingsState.visible || !settingsState.text.includes("基础代谢") || !settingsState.text.includes("每日消耗")) {
      throw new Error(`Expected settings with BMR/TDEE, got ${JSON.stringify(settingsState)}`);
    }
    await page.click("#settings-modal .btn-secondary");
    await page.waitForTimeout(500);

    await page.click("#tab-progress");
    await page.waitForTimeout(2000);
    const progressState = await page.evaluate(() => ({
      hasWeeklyTraining: !!document.querySelector("#weekly-training-record"),
      text: document.querySelector("#weekly-training-record")?.innerText || "",
    }));
    if (!progressState.hasWeeklyTraining || !progressState.text.includes("本周训练记录")) {
      throw new Error(`Expected weekly training record, got ${JSON.stringify(progressState)}`);
    }

    if (pageErrors.length) {
      throw new Error(`Unexpected page errors: ${pageErrors.join(" | ")}`);
    }

    console.log("fitplan refresh smoke passed");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
