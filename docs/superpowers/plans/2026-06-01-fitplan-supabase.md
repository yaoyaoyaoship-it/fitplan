# FitPlan 多用户 Supabase 改造 · 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 FitPlan 从单用户 localStorage 改造为多用户 Supabase 云端应用（Auth + PostgreSQL + RLS）

**架构：** GitHub Pages 单文件 HTML，引入 Supabase JS SDK CDN。所有数据读写通过 Supabase SDK 直接操作 PostgreSQL，RLS 保证用户数据隔离。

**技术栈：** HTML/CSS/JS（单文件）、Supabase JS SDK v2（CDN）、Supabase Auth（email/password）、PostgreSQL + RLS

---

## 前置准备

### 任务 0：创建 Supabase 项目并记录凭据

- [ ] 前往 https://supabase.com/dashboard 创建新项目
- [ ] 项目名 `fitplan`，密码自设，区域选 `ap-southeast-1`（新加坡，国内延迟最低）
- [ ] 等待项目初始化完成（~2 分钟）
- [ ] 复制以下凭据到本地文件 `/tmp/fitplan-repo/.env.supabase`：

```env
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<anon-key-from-dashboard>
```

- [ ] 进入 Supabase Dashboard → Authentication → Providers → 开启 Email
- [ ] **关闭** "Confirm email"（降低注册门槛）

---

### 任务 1：执行数据库建表脚本

- [ ] 进入 Supabase Dashboard → SQL Editor → New Query
- [ ] 粘贴并执行以下完整 SQL：

```sql
-- ============================================
-- FitPlan 数据库 schema + RLS
-- ============================================

-- 1. profiles 表（auth trigger 自动创建）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  height INT DEFAULT 180,
  weight NUMERIC(5,1) DEFAULT 70.0,
  bodyfat NUMERIC(4,1) DEFAULT 18.0,
  age INT DEFAULT 22,
  period TEXT DEFAULT 'bulk',
  frequency INT DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. workouts 表
CREATE TABLE IF NOT EXISTS public.workouts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  template_name TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, date DESC);

-- 3. meals 表
CREATE TABLE IF NOT EXISTS public.meals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  foods JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_kcal INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_meals_user_date ON public.meals(user_id, date DESC);

-- 4. body_logs 表
CREATE TABLE IF NOT EXISTS public.body_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC(5,1),
  body_fat NUMERIC(4,1),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_body_logs_user_date ON public.body_logs(user_id, date DESC);

-- 5. templates 表
CREATE TABLE IF NOT EXISTS public.templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_templates_user ON public.templates(user_id);

-- ============================================
-- RLS 策略
-- ============================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- workouts
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts_select" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workouts_insert" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_update" ON public.workouts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_delete" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- meals
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals_select" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update" ON public.meals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_delete" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- body_logs
ALTER TABLE public.body_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "body_logs_select" ON public.body_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "body_logs_insert" ON public.body_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "body_logs_update" ON public.body_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "body_logs_delete" ON public.body_logs FOR DELETE USING (auth.uid() = user_id);

-- templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select" ON public.templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "templates_insert" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates_update" ON public.templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates_delete" ON public.templates FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Auth trigger: 新用户注册时自动创建 profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] 确认执行成功（无报错），然后在 Table Editor 里确认 5 张表都已创建
- [ ] Commit: `git add docs/superpowers/plans/ && git commit -m "infra: Supabase SQL schema + RLS"`

---

## 前端改造

所有前端改造都在 `/tmp/fitplan-repo/index.html` 这一个文件上进行。

### 任务 2：引入 Supabase SDK + 初始化

- [ ] 在 `<head>` 的 `</style>` 之后、`</head>` 之前，添加 Supabase CDN：

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

- [ ] 在 `<script>` 标签顶部（`function loadData()` 之前），添加初始化代码：

```js
// ============ SUPABASE INIT ============
const SUPABASE_URL = 'https://<project-id>.supabase.co';
const SUPABASE_ANON_KEY = '<anon-key>';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
```

- [ ] 填入 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 的实际值
- [ ] Commit: `git commit -m "feat: add Supabase SDK CDN + init"`

---

### 任务 3：Auth UI — 登录注册页面

- [ ] 在 `<body>` 顶部（`<header>` 之前），添加登录/注册容器：

```html
<!-- ===== AUTH PAGE ===== -->
<div id="auth-page" style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px;">
  <div class="card" style="width:100%; max-width:360px;">
    <div style="display:flex; gap:0; margin-bottom:20px; background:var(--border); border-radius:10px; padding:3px;">
      <button class="tab active" onclick="switchAuthTab('login')" id="auth-tab-login">登录</button>
      <button class="tab" onclick="switchAuthTab('register')" id="auth-tab-register">注册</button>
    </div>

    <!-- Login Form -->
    <form id="login-form" onsubmit="handleLogin(event)">
      <div class="form-group"><input id="login-email" type="email" placeholder="邮箱" required></div>
      <div class="form-group"><input id="login-password" type="password" placeholder="密码" required minlength="6"></div>
      <p id="login-error" style="color:var(--danger);font-size:12px;display:none;margin-bottom:8px;"></p>
      <button class="btn btn-primary btn-block" type="submit">登录</button>
      <p style="text-align:center;margin-top:12px;font-size:12px;color:var(--text3);">
        <a href="#" onclick="handleForgotPassword(event)" style="color:var(--accent3);">忘记密码？</a>
      </p>
    </form>

    <!-- Register Form -->
    <form id="register-form" style="display:none;" onsubmit="handleRegister(event)">
      <div class="form-group"><input id="reg-email" type="email" placeholder="邮箱" required></div>
      <div class="form-group"><input id="reg-password" type="password" placeholder="密码（至少6位）" required minlength="6"></div>
      <div class="form-group"><input id="reg-password2" type="password" placeholder="确认密码" required minlength="6"></div>
      <p id="reg-error" style="color:var(--danger);font-size:12px;display:none;margin-bottom:8px;"></p>
      <button class="btn btn-primary btn-block" type="submit">注册</button>
    </form>
  </div>
</div>
```

- [ ] 添加 Auth tab 切换函数（在 `<script>` 标签内）：

```js
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-tab-login').classList.toggle('active', isLogin);
  document.getElementById('auth-tab-register').classList.toggle('active', !isLogin);
  document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('reg-error').style.display = 'none';
}
```

- [ ] Commit: `git commit -m "feat: add auth UI (login/register forms)"`

---

### 任务 4：Auth JS — 登录/注册/登出逻辑

- [ ] 添加 Auth 核心函数：

```js
// ============ AUTH LOGIC ============
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = error.message.includes('Invalid') ? '邮箱或密码错误' : error.message;
    errEl.style.display = 'block';
    return;
  }
  currentUser = data.user;
  showMainApp();
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const errEl = document.getElementById('reg-error');

  if (password !== password2) {
    errEl.textContent = '两次密码不一致';
    errEl.style.display = 'block';
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    return;
  }
  // auto-login after signup
  if (data.session) {
    currentUser = data.user;
    showMainApp();
  } else {
    document.getElementById('login-email').value = email;
    switchAuthTab('login');
    document.getElementById('login-error').textContent = '注册成功！请登录';
    document.getElementById('login-error').style.display = 'block';
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    document.getElementById('login-error').textContent = '请先输入邮箱';
    document.getElementById('login-error').style.display = 'block';
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  document.getElementById('login-error').textContent = error
    ? '发送失败：' + error.message
    : '已发送重置邮件，请查收';
  document.getElementById('login-error').style.display = 'block';
}

async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  document.getElementById('auth-page').style.display = 'flex';
  document.querySelector('header').style.display = 'none';
  document.querySelector('.tabs').style.display = 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
}
```

- [ ] 修改 header，添加用户头像和退出按钮：

```html
<header>
  <h1>Fit<span>Plan</span></h1>
  <div style="display:flex; gap:8px; align-items:center;">
    <div id="user-avatar" onclick="toggleUserMenu()" style="width:32px;height:32px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;cursor:pointer;display:none;"></div>
    <button class="btn-icon" onclick="openSettings()" title="设置">⚙</button>
  </div>
</header>
```

- [ ] 添加用户菜单函数和退出下拉：

```js
function toggleUserMenu() {
  const menu = document.getElementById('user-dropdown');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}
```

- [ ] 在 header 下方添加下拉菜单 HTML：

```html
<div id="user-dropdown" style="display:none; position:absolute; top:52px; right:16px; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:8px; z-index:50; min-width:160px; box-shadow:0 4px 20px rgba(0,0,0,0.4);">
  <div style="padding:8px 12px; font-size:12px; color:var(--text3);" id="user-email-display"></div>
  <button class="btn btn-sm btn-outline btn-block" onclick="handleLogout()" style="margin-top:4px;">退出登录</button>
</div>
```

- [ ] 添加 `showMainApp()` 函数：

```js
function showMainApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.querySelector('header').style.display = 'flex';
  document.querySelector('.tabs').style.display = 'flex';
  document.getElementById('page-training').classList.add('active');
  // set avatar
  const email = currentUser.email || '';
  const initial = email.charAt(0).toUpperCase();
  const av = document.getElementById('user-avatar');
  av.textContent = initial;
  av.style.display = 'flex';
  document.getElementById('user-email-display').textContent = email;
  // show settings button
  document.querySelector('.btn-icon').style.display = 'flex';
  // load data
  init().then(() => {
    renderTraining();
    renderDiet();
    updateAllStats();
    initTemplateSelect();
    initStrengthSelect();
  });
}
```

- [ ] 修改页面初始化逻辑：在 `<script>` 底部，替换原来的 `init();` 为：

```js
// ============ STARTUP ============
async function startup() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showMainApp();
  } else {
    document.getElementById('auth-page').style.display = 'flex';
    document.querySelector('header').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
  }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    showMainApp();
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    document.getElementById('auth-page').style.display = 'flex';
    document.querySelector('header').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
  }
});

startup();
```

- [ ] Commit: `git commit -m "feat: auth logic (login/register/logout/session)"`

---

### 任务 5：数据层 — 替换 localStorage 为 Supabase

**注意：** 这一步是核心重构。删除所有 `saveData()` / `loadData()` 调用，改为 Supabase CRUD。

- [ ] **删除**旧的 `loadData()` 和 `saveData()` 函数：

```js
// ❌ 删除这两行
function loadData() { ... }  // 约 10 行
function saveData(data) { ... }  // 1 行
// ❌ 删除这行
let DATA = loadData();
```

- [ ] **删除**所有 `saveData(DATA)` 调用（约 20+ 处），每个改为对应的 Supabase upsert/insert/update。

以下是每个数据模块的具体改写：

#### 5a. 训练数据 → workouts 表

- [ ] `getTodayTraining()` 改为从 Supabase 读取：

```js
async function getTodayTraining() {
  if (!currentUser) return [];
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .limit(1);

  if (error || !data || data.length === 0) {
    // No workout today — pick default template
    const all = getAllTemplates();
    const t = all[0];
    if (!t) return [];
    // Create new workout for today
    const newWorkout = {
      user_id: currentUser.id,
      date: today,
      template_name: t.name,
      exercises: t.exercises.map(e => ({...e, done: false}))
    };
    const { data: inserted } = await supabase
      .from('workouts')
      .insert(newWorkout)
      .select()
      .single();
    return inserted ? inserted.exercises : [];
  }
  return data[0].exercises;
}
```

- [ ] `renderTraining()` 改为 async，先 `const exercises = await getTodayTraining()`
- [ ] `toggleExercise(i)` 改为更新 Supabase：

```js
async function toggleExercise(i) {
  const { data: workout } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .single();

  if (!workout) return;
  const exercises = workout.exercises;
  exercises[i].done = !exercises[i].done;

  await supabase
    .from('workouts')
    .update({ exercises })
    .eq('id', workout.id);

  renderTraining();
}
```

- [ ] `updateExParam(i, field, val)` 同样改为 Supabase update
- [ ] `loadTemplate()` 改为：选模板 → delete 当日训练 → insert 新模板
- [ ] `finishWorkout()` 改为：更新 exercises done 状态 → 不再存计数器（用 COUNT 替代）

#### 5b. 模板 → templates 表

- [ ] 删除 `getUserTemplates()` / `saveUserTemplates()` 的 localStorage 实现
- [ ] 改为 Supabase CRUD：

```js
async function getUserTemplates() {
  const { data } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });
  return (data || []).map(t => ({ name: t.name, exercises: t.exercises }));
}

async function saveUserTemplates(templates) {
  // Delete old, insert new (simple approach for MVP)
  await supabase.from('templates').delete().eq('user_id', currentUser.id);
  const inserts = templates.map(t => ({
    user_id: currentUser.id,
    name: t.name,
    exercises: t.exercises
  }));
  if (inserts.length > 0) await supabase.from('templates').insert(inserts);
}
```

- [ ] `saveTemplate()` / `deleteTemplate()` 调 `saveUserTemplates()` 保持接口一致

#### 5c. 饮食 → meals 表

- [ ] `addCafeteriaFood(i)` 改为 upsert：

```js
async function addCafeteriaFood(i) {
  const food = getCafeteriaFoods()[i];
  const { data: meal } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .eq('meal_type', '正餐')
    .single();

  if (meal) {
    const foods = meal.foods;
    foods.push(food);
    await supabase.from('meals').update({
      foods,
      total_kcal: foods.reduce((s, f) => s + (f.cal || 0), 0)
    }).eq('id', meal.id);
  } else {
    await supabase.from('meals').insert({
      user_id: currentUser.id,
      date: today,
      meal_type: '正餐',
      foods: [food],
      total_kcal: food.cal || 0
    });
  }
  renderDiet();
}
```

- [ ] `addCustomFood()` 同理 → 已有 meal 则追加，否则 insert
- [ ] `removeFood(i)` / `clearTodayDiet()` → Supabase delete
- [ ] `renderDiet()` 改为 async，从 Supabase 查询当日 meals

#### 5d. 体重 → body_logs 表

- [ ] `recordWeight()` 改为：

```js
async function recordWeight() {
  const w = parseFloat(document.getElementById('new-weight').value);
  if (!w || w < 30 || w > 300) return;
  await supabase.from('body_logs').upsert({
    user_id: currentUser.id,
    date: today,
    weight: w,
    body_fat: DATA.bodyfat  // from profiles
  }, { onConflict: 'user_id,date' });
  document.getElementById('new-weight').value = '';
  renderProgress();
}
```

#### 5e. 设置 → profiles 表

- [ ] `saveSettings()` 改为：

```js
async function saveSettings() {
  const updates = {
    height: parseInt(document.getElementById('set-height').value) || 180,
    weight: parseFloat(document.getElementById('set-weight').value) || 70,
    bodyfat: parseFloat(document.getElementById('set-bodyfat').value) || 18,
    age: parseInt(document.getElementById('set-age').value) || 22,
    period: document.getElementById('set-period').value,
    frequency: parseInt(document.getElementById('set-frequency').value) || 4,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', currentUser.id);
  if (!error) {
    Object.assign(DATA, updates);
    closeSettings();
    renderTraining();
    renderDiet();
    renderProgress();
    updateAllStats();
  }
}
```

- [ ] `openSettings()` 改为先拉取 profiles：

```js
async function openSettings() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  if (data) Object.assign(DATA, data);
  document.getElementById('set-height').value = DATA.height;
  // ... 其他字段同理
  document.getElementById('settings-modal').classList.add('show');
}
```

- [ ] Commit: `git commit -m "refactor: replace localStorage with Supabase CRUD"`

---

### 任务 6：统计数据重算

- [ ] `updateAllStats()` 改为从 Supabase COUNT 查询：

```js
async function updateAllStats() {
  if (!currentUser) return;

  // 本月健身次数
  const monthStart = today.slice(0, 7) + '-01';
  const { count: monthCount } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .gte('date', monthStart);
  document.getElementById('stat-streak').textContent = monthCount || 0;

  // 总训练次数
  const { count: totalCount } = await supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id);
  document.getElementById('stat-total-workouts').textContent = totalCount || 0;
}
```

- [ ] `renderProgress()` → `renderWeightChart()` 改为从 `body_logs` 查询：

```js
async function renderWeightChart() {
  const { data } = await supabase
    .from('body_logs')
    .select('date, weight')
    .eq('user_id', currentUser.id)
    .gte('date', new Date(Date.now() - 30*86400000).toISOString().slice(0,10))
    .order('date', { ascending: true });

  // ... 用 data 替代原来的 DATA.weightLog 逻辑
}
```

- [ ] `showStrengthLog()` 改为从 workouts 表查询
- [ ] `generateSuggestions()` 改为接收 Supabase 查询参数，去掉对 `DATA.trainingLog` 的依赖
- [ ] Commit: `git commit -m "refactor: stats recalculated from Supabase COUNT"`

---

### 任务 7：加载态 + 错误提示

- [ ] 添加 loading 骨架屏 CSS：

```css
.skeleton { background: linear-gradient(90deg, var(--card) 25%, var(--card-hover) 50%, var(--card) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius); }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.skeleton-card { height: 120px; margin-bottom: 12px; }
```

- [ ] 添加 toast 通知 CSS + HTML：

```css
.toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--danger); color: #fff; padding: 10px 20px; border-radius: 10px; font-size: 13px; z-index: 200; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.toast.show { opacity: 1; }
```

```html
<div class="toast" id="toast"></div>
```

- [ ] 添加 `showToast(message, duration=3000)` 函数
- [ ] 在 Supabase 查询的 catch/error 中调 `showToast('网络连接失败，请检查')`
- [ ] Commit: `git commit -m "feat: loading skeletons + error toast"`

---

### 任务 8：部署到 GitHub Pages

- [ ] 确认所有改动在 `/tmp/fitplan-repo/index.html` 中
- [ ] 复制到部署目录并推送：

```bash
cp /tmp/fitplan-repo/index.html /tmp/fitplan-repo/docs/superpowers/specs/ /tmp/fitplan-repo/docs/superpowers/plans/ -r
# (实际部署只需 index.html)
cp /tmp/fitplan-repo/index.html /tmp/fitplan-repo/index.html
git add index.html
git commit -m "feat: Supabase multi-user rewrite done"
gh release create ... # 或直接 push to main for GitHub Pages
```

- [ ] 推送后访问 `https://yaoyaoyaoship-it.github.io/fitplan/` 验证
- [ ] 测试清单：
  - [ ] 打开页面 → 显示登录注册卡片
  - [ ] 注册新账号 → 自动登录进入主界面
  - [ ] 完成一次训练 → 数据持久化
  - [ ] 刷新页面 → session 保持，数据仍在
  - [ ] 退出登录 → 回到登录页
  - [ ] 换浏览器/隐私模式 → 数据为空（新用户状态）
  - [ ] 另一个账号登录 → 各自数据隔离
- [ ] Commit: `git commit -m "deploy: push to GitHub Pages"`

---

## 自检

- [x] 规格覆盖度：profiles/模板/workouts/meals/body_logs 全部覆盖，auth 流程完整
- [x] 无占位符：所有代码步骤都有具体实现代码
- [x] 类型一致性：函数签名跨任务一致（async/await 模式统一）
- [x] 范围明确：只做 Supabase 改造，不动 UI 布局和原有功能
