// ============ DATA STORE ============
// ============ SUPABASE INIT ============
const SUPABASE_URL = 'https://dqmifbcvmjsosutlhlhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbWlmYmN2bWpzb3N1dGxobGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjA4MjEsImV4cCI6MjA5NTg5NjgyMX0.s4vv2shHbc0ktH2ldowC3TusaZSBG_Z_0RznMOtk3S0';
let supabase = null;
let currentUser = null;

// Wait for CDN to load Supabase
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    document.getElementById('auth-page').innerHTML = '<div class="card" style="text-align:center;padding:40px;"><p>正在加载...</p><p style="font-size:12px;color:var(--text3);margin-top:8px;">如果长时间未响应，请检查网络连接后刷新页面</p></div>';
    return false;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

let DATA = {height:180, weight:70, bodyfat:18, age:22, period:"bulk", frequency:4, weightLog:{}, dietLog:{}, trainingLog:{}, thisMonthWorkouts:0, totalWorkouts:0, currentMonth:"", lastWorkoutDate:"", bestStreak:0};
const TD = () => new Date().toISOString().slice(0,10);
const today = TD();

// ============ CALCULATIONS ============
function calcBMR() { return Math.round(10*DATA.weight + 6.25*DATA.height - 5*DATA.age + 5); }
function calcTDEE() { return Math.round(calcBMR() * 1.55); }
function calcTarget() { const t = calcTDEE(); return DATA.period === 'bulk' ? t + 300 : t - 300; }
function calcMacros() {
  const target = calcTarget();
  const protein = Math.round(DATA.weight * 2.0);
  const fat = Math.round(target * 0.25 / 9);
  const carbs = Math.round((target - protein*4 - fat*9) / 4);
  return { target, protein, carbs, fat };
}

// ============ EXERCISE LIBRARY ============
const EXERCISE_LIBRARY = {
  '杠铃卧推': { part: '胸', defaultSets: 4, defaultReps: '8-10', defaultWeight: 60 },
  '哑铃上斜卧推': { part: '胸', defaultSets: 4, defaultReps: '10-12', defaultWeight: 22 },
  '哑铃飞鸟': { part: '胸', defaultSets: 3, defaultReps: '12-15', defaultWeight: 14 },
  '双杠臂屈伸': { part: '胸', defaultSets: 3, defaultReps: '8-12', defaultWeight: 0 },
  '绳索夹胸': { part: '胸', defaultSets: 3, defaultReps: '12-15', defaultWeight: 20 },
  '引体向上': { part: '背', defaultSets: 4, defaultReps: '6-10', defaultWeight: 0 },
  '杠铃划船': { part: '背', defaultSets: 4, defaultReps: '8-10', defaultWeight: 50 },
  '哑铃单臂划船': { part: '背', defaultSets: 3, defaultReps: '10-12', defaultWeight: 24 },
  '高位下拉': { part: '背', defaultSets: 4, defaultReps: '10-12', defaultWeight: 45 },
  '坐姿划船': { part: '背', defaultSets: 3, defaultReps: '10-12', defaultWeight: 40 },
  '杠铃深蹲': { part: '腿', defaultSets: 4, defaultReps: '8-10', defaultWeight: 80 },
  '腿举': { part: '腿', defaultSets: 4, defaultReps: '10-12', defaultWeight: 120 },
  '罗马尼亚硬拉': { part: '腿', defaultSets: 3, defaultReps: '10-12', defaultWeight: 70 },
  '腿弯举': { part: '腿', defaultSets: 3, defaultReps: '12-15', defaultWeight: 35 },
  '小腿提踵': { part: '腿', defaultSets: 4, defaultReps: '15-20', defaultWeight: 60 },
  '杠铃推举': { part: '肩', defaultSets: 4, defaultReps: '8-10', defaultWeight: 35 },
  '哑铃侧平举': { part: '肩', defaultSets: 4, defaultReps: '12-15', defaultWeight: 8 },
  '哑铃前平举': { part: '肩', defaultSets: 3, defaultReps: '12-15', defaultWeight: 8 },
  '面拉': { part: '肩', defaultSets: 3, defaultReps: '15-20', defaultWeight: 20 },
  '杠铃弯举': { part: '手臂', defaultSets: 3, defaultReps: '10-12', defaultWeight: 25 },
  '哑铃锤式弯举': { part: '手臂', defaultSets: 3, defaultReps: '10-12', defaultWeight: 12 },
  '绳索下压': { part: '手臂', defaultSets: 3, defaultReps: '12-15', defaultWeight: 25 },
  '窄距卧推': { part: '手臂', defaultSets: 3, defaultReps: '8-10', defaultWeight: 40 },
  '上斜杠铃卧推': { part: '胸', defaultSets: 4, defaultReps: '8-10', defaultWeight: 50 },
  '器械推胸': { part: '胸', defaultSets: 4, defaultReps: '10-12', defaultWeight: 55 },
  '俯卧撑': { part: '胸', defaultSets: 4, defaultReps: '15-20', defaultWeight: 0 },
  '哑铃俯身划船': { part: '背', defaultSets: 3, defaultReps: '10-12', defaultWeight: 20 },
  'T杠划船': { part: '背', defaultSets: 4, defaultReps: '8-10', defaultWeight: 45 },
  '直臂下压': { part: '背', defaultSets: 3, defaultReps: '12-15', defaultWeight: 25 },
  '保加利亚分腿蹲': { part: '腿', defaultSets: 3, defaultReps: '10-12', defaultWeight: 30 },
  '臀推': { part: '腿', defaultSets: 4, defaultReps: '10-12', defaultWeight: 60 },
  '腿屈伸': { part: '腿', defaultSets: 3, defaultReps: '12-15', defaultWeight: 40 },
  '负重弓步': { part: '腿', defaultSets: 3, defaultReps: '12-15', defaultWeight: 24 },
  '阿诺德推举': { part: '肩', defaultSets: 3, defaultReps: '10-12', defaultWeight: 14 },
  '蝴蝶机反向飞鸟': { part: '肩', defaultSets: 3, defaultReps: '12-15', defaultWeight: 20 },
  '俯身侧平举': { part: '肩', defaultSets: 3, defaultReps: '12-15', defaultWeight: 6 },
  '上斜哑铃弯举': { part: '手臂', defaultSets: 3, defaultReps: '10-12', defaultWeight: 10 },
  '集中弯举': { part: '手臂', defaultSets: 3, defaultReps: '10-12', defaultWeight: 10 },
  '过头臂屈伸': { part: '手臂', defaultSets: 3, defaultReps: '10-12', defaultWeight: 20 },
  '反握弯举': { part: '手臂', defaultSets: 3, defaultReps: '10-12', defaultWeight: 20 },
  '悬垂举腿': { part: '核心', defaultSets: 3, defaultReps: '12-15', defaultWeight: 0 },
  '卷腹': { part: '核心', defaultSets: 4, defaultReps: '15-20', defaultWeight: 0 },
  '平板支撑': { part: '核心', defaultSets: 3, defaultReps: '60秒', defaultWeight: 0 },
  '俄罗斯转体': { part: '核心', defaultSets: 3, defaultReps: '20', defaultWeight: 0 },
};

const PRESET_TEMPLATES = {
  '推胸+三头': ['杠铃卧推','哑铃上斜卧推','哑铃飞鸟','绳索夹胸','绳索下压','窄距卧推'],
  '拉背+二头': ['引体向上','杠铃划船','高位下拉','坐姿划船','杠铃弯举','哑铃锤式弯举'],
  '腿+肩': ['杠铃深蹲','腿举','罗马尼亚硬拉','腿弯举','杠铃推举','哑铃侧平举'],
  '胸+背超级组': ['杠铃卧推','引体向上','哑铃上斜卧推','高位下拉','哑铃飞鸟','坐姿划船'],
  '全身训练': ['杠铃深蹲','杠铃卧推','杠铃划船','杠铃推举','杠铃弯举','罗马尼亚硬拉'],
};

async function getUserTemplates() {
  if (!currentUser) return [];
  const { data } = await supabase.from('templates').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true });
  return (data || []).map(t => ({ name: t.name, exercises: t.exercises }));
}

async function saveUserTemplates(templates) {
  if (!currentUser) return;
  await supabase.from('templates').delete().eq('user_id', currentUser.id);
  const inserts = templates.map(t => ({ user_id: currentUser.id, name: t.name, exercises: t.exercises }));
  if (inserts.length > 0) await supabase.from('templates').insert(inserts);
}

async function getAllTemplates() {
  const list = [];
  for (const [name, exs] of Object.entries(PRESET_TEMPLATES)) {
    list.push({ name, exercises: exs.map(e => {
      const lib = EXERCISE_LIBRARY[e] || {};
      return { name: e, sets: lib.defaultSets||4, reps: lib.defaultReps||'8-10', weight: lib.defaultWeight||0 };
    }), preset: true });
  }
  for (const t of getUserTemplates()) {
    list.push({ ...t, preset: false });
  }
  return list;
}

// ============ CAFETERIA FOODS ============
const DEFAULT_FOODS = [
  { name:'🍚 米饭 1碗', cal:200, protein:4, carbs:44, fat:1 },{ name:'🍚 米饭 2碗', cal:400, protein:8, carbs:88, fat:2 },
  { name:'🍗 鸡腿', cal:180, protein:20, carbs:0, fat:11 },{ name:'🥩 红烧肉', cal:350, protein:15, carbs:5, fat:30 },
  { name:'🐟 清蒸鱼', cal:120, protein:18, carbs:1, fat:5 },{ name:'🥬 炒青菜', cal:60, protein:3, carbs:5, fat:3 },
  { name:'🥦 西兰花', cal:35, protein:3, carbs:6, fat:0 },{ name:'🍳 番茄炒蛋', cal:150, protein:8, carbs:10, fat:9 },
  { name:'🥟 饺子×10', cal:350, protein:12, carbs:45, fat:12 },{ name:'🥚 水煮蛋×2', cal:140, protein:12, carbs:1, fat:10 },
  { name:'🥛 豆浆 1杯', cal:80, protein:7, carbs:8, fat:2 },{ name:'🥟 包子×2', cal:300, protein:10, carbs:45, fat:8 },
  { name:'🍜 牛肉面', cal:450, protein:20, carbs:55, fat:15 },{ name:'🍛 咖喱鸡饭', cal:550, protein:25, carbs:60, fat:22 },
  { name:'🥗 凉拌黄瓜', cal:30, protein:1, carbs:4, fat:1 },{ name:'🍎 苹果 1个', cal:95, protein:0, carbs:25, fat:0 },
  { name:'🍌 香蕉 1根', cal:105, protein:1, carbs:27, fat:0 },{ name:'🥜 花生 1把', cal:160, protein:7, carbs:5, fat:14 },
  { name:'🍞 全麦面包 2片', cal:160, protein:8, carbs:28, fat:3 },{ name:'🐔 鸡胸肉', cal:130, protein:28, carbs:0, fat:3 },
];

// ============ FOOD SEARCH DATABASE ============
const FOOD_DB = [
  { name:'麻辣烫 1碗', cal:500, protein:25, carbs:45, fat:25 },
  { name:'黄焖鸡米饭', cal:650, protein:30, carbs:65, fat:30 },
  { name:'宫保鸡丁饭', cal:600, protein:28, carbs:60, fat:28 },
  { name:'鱼香肉丝饭', cal:580, protein:22, carbs:62, fat:26 },
  { name:'回锅肉饭', cal:650, protein:24, carbs:58, fat:35 },
  { name:'糖醋里脊饭', cal:620, protein:25, carbs:65, fat:28 },
  { name:'红烧牛肉面', cal:500, protein:22, carbs:55, fat:20 },
  { name:'炸酱面', cal:480, protein:18, carbs:60, fat:18 },
  { name:'兰州拉面', cal:420, protein:16, carbs:60, fat:12 },
  { name:'蛋炒饭', cal:500, protein:14, carbs:60, fat:22 },
  { name:'扬州炒饭', cal:550, protein:18, carbs:65, fat:25 },
  { name:'酸辣粉', cal:380, protein:8, carbs:55, fat:14 },
  { name:'螺蛳粉', cal:450, protein:12, carbs:55, fat:20 },
  { name:'麻辣香锅 1人份', cal:650, protein:30, carbs:40, fat:42 },
  { name:'火锅 1人份', cal:800, protein:45, carbs:50, fat:50 },
  { name:'炸鸡汉堡套餐', cal:850, protein:35, carbs:75, fat:45 },
  { name:'披萨 2片', cal:500, protein:20, carbs:55, fat:22 },
  { name:'寿司 8个', cal:350, protein:15, carbs:55, fat:8 },
  { name:'三明治', cal:350, protein:15, carbs:35, fat:16 },
  { name:'鸡胸肉沙拉', cal:280, protein:28, carbs:12, fat:14 },
  { name:'烤鱼 1人份', cal:400, protein:35, carbs:10, fat:25 },
  { name:'水煮鱼', cal:450, protein:30, carbs:15, fat:30 },
  { name:'酸菜鱼', cal:380, protein:28, carbs:12, fat:24 },
  { name:'薯条 中份', cal:350, protein:4, carbs:42, fat:18 },
  { name:'炸鸡 2块', cal:400, protein:25, carbs:20, fat:25 },
  { name:'鸡排', cal:350, protein:20, carbs:18, fat:22 },
  { name:'烤串 10串', cal:500, protein:35, carbs:10, fat:35 },
  { name:'方便面', cal:450, protein:10, carbs:60, fat:18 },
  { name:'自热火锅', cal:600, protein:25, carbs:45, fat:35 },
  { name:'奶茶 中杯', cal:350, protein:3, carbs:55, fat:12 },
  { name:'珍珠奶茶', cal:400, protein:3, carbs:65, fat:14 },
  { name:'拿铁咖啡', cal:150, protein:8, carbs:12, fat:8 },
  { name:'可乐 330ml', cal:140, protein:0, carbs:35, fat:0 },
  { name:'果汁 250ml', cal:120, protein:0, carbs:28, fat:0 },
  { name:'啤酒 500ml', cal:215, protein:2, carbs:18, fat:0 },
  { name:'冰淇淋 1球', cal:150, protein:3, carbs:20, fat:8 },
  { name:'薯片 1包', cal:500, protein:6, carbs:50, fat:30 },
  { name:'巧克力 1条', cal:250, protein:3, carbs:25, fat:15 },
  { name:'饼干 100g', cal:450, protein:8, carbs:60, fat:18 },
  { name:'蛋糕 1块', cal:300, protein:5, carbs:35, fat:16 },
  { name:'肉夹馍', cal:400, protein:18, carbs:40, fat:18 },
  { name:'煎饼果子', cal:350, protein:15, carbs:40, fat:15 },
  { name:'手抓饼', cal:300, protein:8, carbs:35, fat:14 },
  { name:'麻辣拌', cal:450, protein:20, carbs:35, fat:25 },
  { name:'米线', cal:380, protein:12, carbs:55, fat:12 },
  { name:'水饺 15个', cal:450, protein:20, carbs:55, fat:16 },
  { name:'馄饨 1碗', cal:300, protein:14, carbs:35, fat:12 },
  { name:'汤圆 10个', cal:350, protein:6, carbs:55, fat:12 },
  { name:'粽子 1个', cal:300, protein:8, carbs:45, fat:10 },
  { name:'月饼 1个', cal:400, protein:6, carbs:50, fat:20 },
  { name:'烧麦 4个', cal:280, protein:10, carbs:35, fat:12 },
  { name:'肠粉', cal:200, protein:8, carbs:30, fat:6 },
  { name:'盖浇饭 鱼香茄子', cal:520, protein:15, carbs:60, fat:24 },
  { name:'盖浇饭 土豆牛肉', cal:580, protein:28, carbs:55, fat:28 },
  { name:'沙县小吃 鸡腿饭', cal:550, protein:28, carbs:60, fat:22 },
  { name:'沙县小吃 蒸饺', cal:320, protein:14, carbs:40, fat:12 },
  { name:'冒菜 1人份', cal:550, protein:28, carbs:35, fat:32 },
  { name:'干锅 1人份', cal:600, protein:32, carbs:35, fat:35 },
  { name:'铁板烧', cal:550, protein:30, carbs:30, fat:32 },
  { name:'卤肉饭', cal:600, protein:22, carbs:62, fat:30 },
  { name:'猪脚饭', cal:650, protein:28, carbs:58, fat:35 },
  { name:'叉烧饭', cal:580, protein:25, carbs:60, fat:26 },
  { name:'鸡蛋灌饼', cal:300, protein:10, carbs:35, fat:14 },
  { name:'油条 1根', cal:230, protein:5, carbs:28, fat:12 },
  { name:'豆浆 甜', cal:120, protein:7, carbs:18, fat:2 },
  { name:'豆腐脑', cal:150, protein:10, carbs:15, fat:6 },
  { name:'热干面', cal:450, protein:14, carbs:60, fat:16 },
  { name:'担担面', cal:420, protein:15, carbs:55, fat:15 },
  { name:'凉皮', cal:350, protein:8, carbs:55, fat:12 },
  { name:'凉面', cal:380, protein:10, carbs:58, fat:12 },
  { name:'烤冷面', cal:350, protein:12, carbs:45, fat:14 },
  { name:'关东煮 5串', cal:200, protein:15, carbs:20, fat:8 },
  { name:'茶叶蛋 2个', cal:140, protein:12, carbs:2, fat:10 },
  { name:'玉米 1根', cal:180, protein:5, carbs:38, fat:2 },
  { name:'红薯 1个', cal:200, protein:3, carbs:46, fat:1 },
  { name:'酸奶 1杯', cal:120, protein:5, carbs:18, fat:3 },
  { name:'牛奶 250ml', cal:160, protein:8, carbs:12, fat:9 },
  { name:'旺仔牛奶', cal:200, protein:5, carbs:28, fat:8 },
  { name:'红牛', cal:110, protein:0, carbs:28, fat:0 },
  { name:'雪糕 1支', cal:180, protein:3, carbs:25, fat:8 },
  { name:'辣条 1包', cal:300, protein:5, carbs:35, fat:16 },
  { name:'瓜子 1把', cal:160, protein:6, carbs:5, fat:14 },
  { name:'坚果 1把', cal:170, protein:5, carbs:6, fat:15 },
  { name:'牛肉干 50g', cal:150, protein:25, carbs:5, fat:4 },
  { name:'蛋白粉 1勺', cal:120, protein:24, carbs:3, fat:1 },
];

// ============ INIT ============
async function init() {
  if(currentUser){
    const{data:profile}=await supabase.from("profiles").select("*").eq("id",currentUser.id).single();
    if(profile){DATA.height=profile.height;DATA.weight=profile.weight;DATA.bodyfat=profile.bodyfat;DATA.age=profile.age;DATA.period=profile.period;DATA.frequency=profile.frequency;}
  }
}

function initTemplateSelect() { refreshTemplateSelect(); }
async function refreshTemplateSelect() {
  const sel = document.getElementById('template-select');
  const val = sel.value;
  sel.innerHTML = '<option value="">选择训练模板...</option>';
  const all = await getAllTemplates();
  for (const t of all) {
    sel.innerHTML += `<option value="${t.name}">${t.preset?'📋':'⭐'} ${t.name} (${t.exercises.length}动作)</option>`;
  }
  sel.value = val;
}
function initStrengthSelect() {
  const sel = document.getElementById('strength-ex-select');
  sel.innerHTML = '<option value="">选择动作...</option>';
  for (const ex in EXERCISE_LIBRARY) sel.innerHTML += `<option value="${ex}">${ex}</option>`;
}

// ============ AUTH LOGIC ============
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-tab-login').classList.toggle('active', isLogin);
  document.getElementById('auth-tab-register').classList.toggle('active', !isLogin);
  document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('reg-error').style.display = 'none';
}

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
  if (password !== password2) { errEl.textContent = '两次密码不一致'; errEl.style.display = 'block'; return; }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  if (data.session) { currentUser = data.user; showMainApp(); }
  else { document.getElementById('login-email').value = email; switchAuthTab('login'); document.getElementById('login-error').textContent = '注册成功！请登录'; document.getElementById('login-error').style.display = 'block'; }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) { document.getElementById('login-error').textContent = '请先输入邮箱'; document.getElementById('login-error').style.display = 'block'; return; }
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  document.getElementById('login-error').textContent = error ? '发送失败：' + error.message : '已发送重置邮件，请查收';
  document.getElementById('login-error').style.display = 'block';
}

function toggleUserMenu() { const m = document.getElementById('user-dropdown'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; }

async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  document.getElementById('auth-page').style.display = 'flex';
  document.querySelector('header').style.display = 'none';
  document.querySelector('.tabs').style.display = 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('user-dropdown').style.display = 'none';
}

function showMainApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.querySelector('header').style.display = 'flex';
  document.querySelector('.tabs').style.display = 'flex';
  document.getElementById('page-training').classList.add('active');
  const email = currentUser.email || '';
  const initial = email.charAt(0).toUpperCase();
  const av = document.getElementById('user-avatar');
  av.textContent = initial; av.style.display = 'flex';
  document.getElementById('user-email-display').textContent = email;
  init().then(() => { renderTraining(); renderDiet(); updateAllStats(); initTemplateSelect(); initStrengthSelect(); });
}

// ============ TAB SWITCHING ============
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t,i) => {
    const active = ['training','diet','progress'][i] === tab;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-'+tab).classList.add('active');
  if (tab === 'progress') renderProgress();
  if (tab === 'diet') renderDiet();
}

// ============ SMART SUGGESTIONS ============
async function generateSuggestions() {
  const suggestions=[];
  const{data:logs}=await supabase.from("workouts").select("*").eq("user_id",currentUser.id).order("date",{ascending:false}).limit(30);
  if(!logs||logs.length<2)return suggestions;
  const allEx=[];
  for(const w of logs){for(const ex of(w.exercises||[])){allEx.push({date:w.date,...ex});}}
  const exHistory={};
  for(const ex of allEx){if(!exHistory[ex.name])exHistory[ex.name]=[];exHistory[ex.name].push({date:ex.date,weight:ex.weight,sets:ex.sets,reps:ex.reps,done:ex.done});}
  for(const[name,history]of Object.entries(exHistory)){
    if(history.length<2)continue;
    const last=history[0],prev=history[1];
    if(!last.done||last.weight<=0)continue;
    if(last.weight<=prev.weight&&prev.done){
      const lib=EXERCISE_LIBRARY[name];
      if(lib&&lib.defaultWeight){const inc=lib.defaultWeight<15?1:2.5;suggestions.push({type:"increase",icon:"\\u{1F4C8}",text:"<strong>"+name+"</strong>上次 "+last.weight+"kg 全部完成 \\u2192 试试 <strong>"+(last.weight+inc)+"kg</strong>?",action:name,newWeight:last.weight+inc});}
    }
  }
  const partLastDate={};
  for(const[name,lib]of Object.entries(EXERCISE_LIBRARY)){
    const history=exHistory[name]||[];
    if(history.length>0&&history[0].done){
      const p=lib.part;if(!partLastDate[p]||history[0].date>partLastDate[p])partLastDate[p]=history[0].date;
    }
  }
  const daysSince=(dateStr)=>{const d=new Date(dateStr);return Math.floor((new Date()-d)/86400000);};
  for(const part of["胸","背","腿","肩","手臂","核心"]){
    const last=partLastDate[part];
    if(!last)suggestions.push({type:"balance",icon:"\\u26A0\\uFE0F",text:"<strong>"+part+"部</strong>还没有训练记录,记得安排一下!"});
    else if(daysSince(last)>5)suggestions.push({type:"balance",icon:"\\u23F0",text:"<strong>"+part+"部</strong>已经 "+daysSince(last)+" 天没练了,下次优先安排!"});
  }
  return suggestions.slice(0,5);
}

async function renderSuggestions() {
  var panel = document.getElementById("suggestion-panel");
  var suggestions = await generateSuggestions();
  if (suggestions.length === 0) { panel.style.display = "none"; return; }
  panel.style.display = "block";
  var html = '<div class=sug-title>🧠 智能建议</div>';
  for (var i = 0; i < suggestions.length; i++) {
    var s = suggestions[i];
    html += '<div class=suggestion-item><span class=sug-icon>' + s.icon + '</span><div><span>' + s.text + '</span>';
    if (s.action) {
      html += '<button class="btn btn-xs btn-primary" style="margin-top:4px" onclick="applySuggestion(\'' + s.action + '\',' + s.newWeight + ')">采纳建议</button>';
    }
    html += '</div></div>';
  }
  panel.innerHTML = html;
}

async function applySuggestion(exName,newWeight) {
  if(!currentUser)return;
  const{data:workout}=await supabase.from("workouts").select("*").eq("user_id",currentUser.id).eq("date",today).single();
  if(!workout)return;
  const exercises=workout.exercises;
  for(const ex of exercises){if(ex.name===exName){ex.weight=newWeight;break;}}
  await supabase.from("workouts").update({exercises}).eq("id",workout.id);
  renderTraining();
}

// ============ TRAINING ============
async function getTodayTraining() {
  if(!currentUser)return[];
  const{data}=await supabase.from("workouts").select("*").eq("user_id",currentUser.id).eq("date",today).limit(1);
  if(!data||data.length===0){
    const all=await getAllTemplates();const t=all[0];if(!t)return[];
    const nw={user_id:currentUser.id,date:today,template_name:t.name,exercises:t.exercises.map(e=>({...e,done:false}))};
    const{data:inserted}=await supabase.from("workouts").insert(nw).select().single();
    return inserted?inserted.exercises:[];
  }
  return data[0].exercises;
}

async function renderTraining() {
  const list = document.getElementById('exercise-list');
  const exercises = await getTodayTraining();
  const period = DATA.period;
  document.getElementById('period-badge').textContent = period === 'bulk' ? '增肌期' : '减脂期';
  document.getElementById('period-badge').className = 'badge ' + (period === 'bulk' ? 'badge-red' : 'badge-green');
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.includes(period==='bulk'?'增肌':'减脂'));
  });
  
  if (exercises.length === 0) {
    list.innerHTML = '<div class="empty"><p>选择一个训练模板开始，或点击「管理」创建自己的模板</p></div>';
  } else {
    list.innerHTML = exercises.map((ex, i) => `
      <div class="exercise-item ${ex.done ? 'done' : ''}">
        <div class="ex-info">
          <div class="ex-name">${ex.name}</div>
          <div class="ex-detail">${ex.sets}组 × ${ex.reps}次 · ${ex.weight}kg</div>
        </div>
        <div class="ex-edit-group">
          <input type="number" value="${ex.weight}" onchange="updateExParam(${i},'weight',this.value)" title="重量kg" style="width:40px;">
          <input type="number" value="${ex.sets}" onchange="updateExParam(${i},'sets',this.value)" title="组数" style="width:30px;">
        </div>
        <div class="ex-check ${ex.done ? 'checked' : ''}" onclick="toggleExercise(${i})">${ex.done ? '✓' : ''}</div>
      </div>
    `).join('');
  }
  const doneCount = exercises.filter(e => e.done).length;
  document.getElementById('stat-today-ex').textContent = `${doneCount}/${exercises.length}`;
  document.getElementById('stat-today-cal').textContent = exercises.length * 65;
  updateAllStats();
  renderSuggestions();
  refreshTemplateSelect();
}

async function toggleExercise(i) {
  if(!currentUser)return;
  const{data:workout}=await supabase.from("workouts").select("*").eq("user_id",currentUser.id).eq("date",today).single();
  if(!workout)return;
  const exercises=workout.exercises;exercises[i].done=!exercises[i].done;
  await supabase.from("workouts").update({exercises}).eq("id",workout.id);
  renderTraining();
}

async function updateExParam(i,field,val) {
  if(!currentUser)return;
  const{data:workout}=await supabase.from("workouts").select("*").eq("user_id",currentUser.id).eq("date",today).single();
  if(!workout)return;
  const exercises=workout.exercises;exercises[i][field]=parseInt(val)||exercises[i][field];
  await supabase.from("workouts").update({exercises}).eq("id",workout.id);
}

async function loadTemplate() {
  const sel = document.getElementById('template-select');
  if (!sel.value) return;
localStorage.setItem('fitplan_template', sel.value);
const all = await getAllTemplates();
const t = all.find(t => t.name === sel.value);
if (t) {
  await supabase.from('workouts').delete().eq('user_id', currentUser.id).eq('date', today);
  await supabase.from('workouts').insert({ user_id: currentUser.id, date: today, template_name: t.name, exercises: t.exercises.map(e => ({...e, done: false})) });
  renderTraining();
  }
}

async function resetToday() {
  await supabase.from("workouts").delete().eq("user_id",currentUser.id).eq("date",today);
  renderTraining();
}

async function finishWorkout() {
  const exercises=await getTodayTraining();
  if(!exercises||exercises.length===0)return;
  const doneCount=exercises.filter(e=>e.done).length;
  renderTraining();
  const monthStart=today.slice(0,7)+"-01";
  const{count}=await supabase.from("workouts").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id).gte("date",monthStart);
  alert("训练完成！"+doneCount+"/"+exercises.length+" 动作 \u2713  本月健身 "+(count||0)+" 次 \u{1F525}");
}

function switchPeriod(p) {
  DATA.period = p;
  /* saveData removed */
  renderTraining();
  renderDiet();
}

// ============ TEMPLATE MANAGER ============
function openTemplateManager() {
  renderTemplateList();
  document.getElementById('template-modal').classList.add('show');
  document.getElementById('template-builder-area').style.display = 'none';
}
function closeTemplateManager() {
  document.getElementById('template-modal').classList.remove('show');
  document.getElementById('template-builder-area').style.display = 'none';
  renderTraining();
}

function renderTemplateList() {
  const div = document.getElementById('template-list');
  const userTemplates = getUserTemplates();
  if (userTemplates.length === 0) {
    div.innerHTML = '<div class="empty" style="padding:20px;"><p>还没有自定义模板</p></div>';
  } else {
    div.innerHTML = userTemplates.map((t, i) => `
      <div class="exercise-item" style="justify-content:space-between;">
        <div class="ex-info">
          <div class="ex-name">⭐ ${t.name}</div>
          <div class="ex-detail">${t.exercises.length} 个动作</div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-xs btn-outline" onclick="editTemplate(${i})">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="deleteTemplate(${i})">✕</button>
        </div>
      </div>
    `).join('');
  }
}

function showTemplateBuilder(editIndex) {
  const area = document.getElementById('template-builder-area');
  area.style.display = 'block';
  const parts = ['胸','背','腿','肩','手臂','核心'];
  let selectedExs = [];
  let tplName = '';
  
  if (editIndex !== undefined && editIndex >= 0) {
    const templates = getUserTemplates();
    const t = templates[editIndex];
    tplName = t.name;
    selectedExs = t.exercises.map(e => ({...e}));
  }
  
  area.innerHTML = `
    <hr style="border-color:var(--border);margin:12px 0;">
    <div class="form-group"><label>模板名称</label><input id="tpl-name" value="${tplName}" placeholder="如：我的推胸日"></div>
    <div class="form-group"><label>动作库（点击添加）</label>
      ${parts.map(part => {
        const exs = Object.entries(EXERCISE_LIBRARY).filter(([n,lib]) => lib.part === part);
        return `<div style="margin-bottom:6px;"><span style="font-size:10px;color:var(--text3);">${part}部 </span>
          ${exs.map(([n]) => `<button class="ex-lib-chip" data-ex="${n}" onclick="toggleExInBuilder(this,'${n}')">${n}</button>`).join('')}
        </div>`;
      }).join('')}
    </div>
    <div class="form-group"><label>已选动作</label>
      <div class="selected-exercises" id="builder-selected"></div>
    </div>
    <p class="hint-text">点击上方动作库添加，已选动作可调组数/次数/重量</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" style="flex:1;" onclick="closeTemplateManager()">取消</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveTemplate(${editIndex !== undefined ? editIndex : -1})">💾 保存模板</button>
    </div>
  `;
  
  // Store initial state
  area._selectedExs = selectedExs;
  area._editIndex = editIndex;
  renderBuilderSelected(area);
  
  // Pre-select chips
  for (const ex of selectedExs) {
    const chip = area.querySelector(`[data-ex="${ex.name}"]`);
    if (chip) chip.classList.add('selected');
  }
}

function toggleExInBuilder(chip, exName) {
  const area = document.getElementById('template-builder-area');
  if (!area._selectedExs) area._selectedExs = [];
  const idx = area._selectedExs.findIndex(e => e.name === exName);
  if (idx >= 0) {
    area._selectedExs.splice(idx, 1);
    chip.classList.remove('selected');
  } else {
    const lib = EXERCISE_LIBRARY[exName] || {};
    area._selectedExs.push({ name: exName, sets: lib.defaultSets||4, reps: lib.defaultReps||'8-10', weight: lib.defaultWeight||0 });
    chip.classList.add('selected');
  }
  renderBuilderSelected(area);
}

function renderBuilderSelected(area) {
  const div = area.querySelector('#builder-selected');
  if (!area._selectedExs) area._selectedExs = [];
  if (area._selectedExs.length === 0) {
    div.innerHTML = '<div class="empty" style="padding:10px;"><p>还没选动作</p></div>';
    return;
  }
  div.innerHTML = area._selectedExs.map((e, i) => `
    <div class="selected-ex">
      <span class="se-name">${i+1}. ${e.name}</span>
      <input type="number" value="${e.sets}" onchange="updateBuilderEx(${i},'sets',this.value)" title="组" placeholder="组">
      <input value="${e.reps}" onchange="updateBuilderEx(${i},'reps',this.value)" title="次" placeholder="次" style="width:50px;">
      <input type="number" value="${e.weight}" onchange="updateBuilderEx(${i},'weight',this.value)" title="kg" placeholder="kg">
      <button class="btn btn-xs btn-outline" onclick="removeBuilderEx(${i})" style="color:var(--danger);">✕</button>
    </div>
  `).join('');
}

function updateBuilderEx(i, field, val) {
  const area = document.getElementById('template-builder-area');
  if (!area._selectedExs) return;
  if (field === 'reps') area._selectedExs[i].reps = val;
  else area._selectedExs[i][field] = parseInt(val) || area._selectedExs[i][field];
}

function removeBuilderEx(i) {
  const area = document.getElementById('template-builder-area');
  area._selectedExs.splice(i, 1);
  renderBuilderSelected(area);
}

async function saveTemplate(editIndex) {
  const area = document.getElementById('template-builder-area');
  const name = document.getElementById('tpl-name').value.trim();
  if (!name) { alert('请输入模板名称'); return; }
  if (!area._selectedExs || area._selectedExs.length === 0) { alert('请至少选一个动作'); return; }
  
  const templates = getUserTemplates();
  const tpl = { name, exercises: area._selectedExs.map(e => ({...e})) };
  
  if (editIndex >= 0 && editIndex < templates.length) {
    templates[editIndex] = tpl;
  } else {
    templates.push(tpl);
  }
  await saveUserTemplates(templates);
  closeTemplateManager();
  renderTemplateList();
  refreshTemplateSelect();
}

function editTemplate(i) {
  showTemplateBuilder(i);
}

async function deleteTemplate(i) {
  if (!confirm('确定删除这个模板？')) return;
  const templates = getUserTemplates();
  templates.splice(i, 1);
  await saveUserTemplates(templates);
  renderTemplateList();
  refreshTemplateSelect();
}

// ============ DIET ============
function getCafeteriaFoods() { return DEFAULT_FOODS; }

async function renderDiet() {
  const macros=calcMacros();
  const{data:meals}=await supabase.from("meals").select("*").eq("user_id",currentUser.id).eq("date",today);
  const todayDiet=[];let totalCal=0,totalProtein=0,totalCarbs=0,totalFat=0;
  if(meals){for(const m of meals){for(const f of(m.foods||[])){todayDiet.push(f);totalCal+=f.cal||0;totalProtein+=f.protein||0;totalCarbs+=f.carbs||0;totalFat+=f.fat||0;}}}
  document.getElementById("diet-summary").textContent=totalCal+" / "+macros.target+" kcal";
  document.getElementById("diet-progress").style.width=Math.min(100,totalCal/macros.target*100)+"%";
  document.getElementById("macro-protein").textContent=totalProtein+"/"+macros.protein+"g";
  document.getElementById("macro-carbs").textContent=totalCarbs+"/"+macros.carbs+"g";
  document.getElementById("macro-fat").textContent=totalFat+"/"+macros.fat+"g";
  document.getElementById("bar-protein").style.width=Math.min(100,totalProtein/macros.protein*100)+"%";
  document.getElementById("bar-carbs").style.width=Math.min(100,totalCarbs/macros.carbs*100)+"%";
  document.getElementById("bar-fat").style.width=Math.min(100,totalFat/macros.fat*100)+"%";
  const foods=getCafeteriaFoods();
  document.getElementById("cafeteria-chips").innerHTML=foods.map((f,i)=>"<button class=food-chip onclick=addCafeteriaFood("+i+")>"+f.name+" <span style=font-size:10px;opacity:0.7;>"+f.cal+"kcal</span></button>").join("");
  const todayDiv=document.getElementById("today-foods");
  if(todayDiet.length===0){todayDiv.innerHTML="<div class=empty><p>还没记录饮食</p></div>";}
  else{todayDiv.innerHTML=todayDiet.map((f,i)=>"<div class=food-item><span class=food-name>"+f.name+"</span><span class=food-cal>"+f.cal+" kcal</span><button class=\"btn btn-sm btn-outline\" onclick=removeFood("+i+") style=margin-left:8px;>\\u2715</button></div>").join("");}
}

async function addCafeteriaFood(i) {
  if(!currentUser)return;
  const food=getCafeteriaFoods()[i];
  const{data:meal}=await supabase.from("meals").select("*").eq("user_id",currentUser.id).eq("date",today).eq("meal_type","正餐").single();
  if(meal){const foods=meal.foods||[];foods.push(food);await supabase.from("meals").update({foods,total_kcal:foods.reduce((s,f)=>s+(f.cal||0),0)}).eq("id",meal.id);}
  else{await supabase.from("meals").insert({user_id:currentUser.id,date:today,meal_type:"正餐",foods:[food],total_kcal:food.cal||0});}
  renderDiet();
}

// ============ FOOD SEARCH ============
function searchFood() {
  const query = document.getElementById('food-name').value.trim().toLowerCase();
  const resultsDiv = document.getElementById('food-search-results');
  if (!query || query.length < 1) { resultsDiv.innerHTML = ''; return; }
  
  const matches = FOOD_DB.filter(f => f.name.toLowerCase().includes(query)).slice(0, 6);
  let html = '';
  if (matches.length > 0) {
    html += '<div class="food-search-dropdown">';
    matches.forEach((f, i) => {
      html += `<div class="food-search-item" onclick="selectFood(${FOOD_DB.indexOf(f)})">
        <span class="fs-name">${f.name}</span>
        <span class="fs-macros">${f.cal}kcal | 蛋${f.protein}g 碳${f.carbs}g 脂${f.fat}g</span>
      </div>`;
    });
    html += '</div>';
  }
  // No local match hint
  if (matches.length === 0) {
    html += '<div style="font-size:11px;color:var(--text3);padding:4px 0;">库中未找到「'+query+'」，手动填写参数，或问 Hermes 帮你查</div>';
  }
  resultsDiv.innerHTML = html;
}

function selectFood(idx) {
  const f = FOOD_DB[idx];
  document.getElementById('food-name').value = f.name;
  document.getElementById('food-cal').value = f.cal;
  document.getElementById('food-protein').value = f.protein;
  document.getElementById('food-carbs').value = f.carbs;
  document.getElementById('food-fat').value = f.fat;
  document.getElementById('food-search-results').innerHTML = '';
}
async function addCustomFood() {
  if(!currentUser)return;
  const name=document.getElementById("food-name").value.trim();
  const cal=parseInt(document.getElementById("food-cal").value)||0;
  const protein=parseInt(document.getElementById("food-protein").value)||0;
  const carbs=parseInt(document.getElementById("food-carbs").value)||0;
  const fat=parseInt(document.getElementById("food-fat").value)||0;
  if(!name||cal<=0)return;
  const food={name,cal,protein,carbs,fat};
  const{data:meal}=await supabase.from("meals").select("*").eq("user_id",currentUser.id).eq("date",today).eq("meal_type","正餐").single();
  if(meal){const foods=meal.foods||[];foods.push(food);await supabase.from("meals").update({foods,total_kcal:foods.reduce((s,f)=>s+(f.cal||0),0)}).eq("id",meal.id);}
  else{await supabase.from("meals").insert({user_id:currentUser.id,date:today,meal_type:"正餐",foods:[food],total_kcal:cal});}
  ["food-name","food-cal","food-protein","food-carbs","food-fat"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("food-search-results").innerHTML="";
  renderDiet();
}

async function removeFood(i) {
  if(!currentUser)return;
  const{data:meals}=await supabase.from("meals").select("*").eq("user_id",currentUser.id).eq("date",today);
  if(!meals||meals.length===0)return;
  let ti=0;
  for(const meal of meals){
    const foods=meal.foods||[];
    if(i<ti+foods.length){
      foods.splice(i-ti,1);
      if(foods.length===0){await supabase.from("meals").delete().eq("id",meal.id);}
      else{await supabase.from("meals").update({foods,total_kcal:foods.reduce((s,f)=>s+(f.cal||0),0)}).eq("id",meal.id);}
      break;
    }
    ti+=foods.length;
  }
  renderDiet();
}
async function clearTodayDiet() {
  await supabase.from("meals").delete().eq("user_id",currentUser.id).eq("date",today);
  renderDiet();
}

// ============ PROGRESS ============
function renderProgress() { renderWeightChart(); updateAllStats(); }

async function renderWeightChart() {
  var chartDiv=document.getElementById("weight-chart");
  var labelsDiv=document.getElementById("weight-labels");
  var d=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  var{data}=await supabase.from("body_logs").select("date,weight").eq("user_id",currentUser.id).gte("date",d).order("date",{ascending:true});
  if(!data||data.length<2){chartDiv.innerHTML="<div class=empty style=padding:20px><p>数据不足，记录体重后生成图表</p></div>";labelsDiv.innerHTML="";return;}
  var weights=data.map(function(e){return e.weight;});
  var maxW=Math.max.apply(null,weights),minW=Math.min.apply(null,weights),range=maxW-minW||1;
  var bars="",labels="";
  for(var i=0;i<data.length;i++){bars+="<div class=chart-bar style=height:"+(((data[i].weight-minW)/range)*80+20)+"%;background:var(--accent2) title="+data[i].date+":"+data[i].weight+"kg></div>";labels+="<div class=chart-label>"+data[i].date.slice(5)+"</div>";}
  chartDiv.innerHTML=bars;
  labelsDiv.innerHTML=labels;
  document.getElementById("stat-weight-change").textContent=(data[data.length-1].weight-data[0].weight).toFixed(1);
}
async function recordWeight() {
  const w=parseFloat(document.getElementById("new-weight").value);
  if(!w||w<30||w>300)return;
  await supabase.from("body_logs").upsert({user_id:currentUser.id,date:today,weight:w},{onConflict:"user_id,date"});
  document.getElementById("new-weight").value="";
  renderProgress();
}

async function showStrengthLog() {
  const exName=document.getElementById("strength-ex-select").value;
  const logDiv=document.getElementById("strength-log");
  if(!exName){logDiv.innerHTML="<div class=empty><p>选择一个动作查看力量变化</p></div>";return;}
  const{data:workouts}=await supabase.from("workouts").select("*").eq("user_id",currentUser.id).order("date",{ascending:false}).limit(30);
  const entries=[];
  for(const w of(workouts||[])){for(const ex of(w.exercises||[])){if(ex.name===exName&&ex.done&&ex.weight)entries.push({date:w.date,weight:ex.weight,reps:ex.reps,sets:ex.sets});}}
  if(entries.length===0){logDiv.innerHTML="<div class=empty><p>还没有这个动作的记录</p></div>";return;}
  logDiv.innerHTML=entries.slice(0,10).map((e,i)=>{
    const prev=entries[i+1];let arrow="";
    if(prev){if(e.weight>prev.weight)arrow=" <span style=color:var(--success)>\\u2191</span>";else if(e.weight<prev.weight)arrow=" <span style=color:var(--danger)>\\u2193</span>";else arrow=" \\u2192";}
    return "<div class=log-entry><span class=log-name>"+e.date.slice(5)+"</span><span class=log-current>"+e.weight+"kg \\u00d7 "+e.sets+"组"+arrow+"</span><span class=log-prev>"+(prev?prev.weight+"kg":"--")+"</span></div>";
  }).join("");
}

// ============ SETTINGS ============
async function openSettings() {
  const{data}=await supabase.from("profiles").select("*").eq("id",currentUser.id).single();
  if(data){DATA.height=data.height;DATA.weight=data.weight;DATA.bodyfat=data.bodyfat;DATA.age=data.age;DATA.period=data.period;DATA.frequency=data.frequency;}
  document.getElementById("set-height").value=DATA.height;
  document.getElementById("set-weight").value=DATA.weight;
  document.getElementById("set-bodyfat").value=DATA.bodyfat;
  document.getElementById("set-age").value=DATA.age;
  document.getElementById("set-period").value=DATA.period;
  document.getElementById("set-frequency").value=DATA.frequency;
  document.getElementById("settings-modal").classList.add("show");
}

function closeSettings() { document.getElementById('settings-modal').classList.remove('show'); }
async function saveSettings() {
  const u={height:parseInt(document.getElementById("set-height").value)||180,weight:parseFloat(document.getElementById("set-weight").value)||70,bodyfat:parseFloat(document.getElementById("set-bodyfat").value)||18,age:parseInt(document.getElementById("set-age").value)||22,period:document.getElementById("set-period").value,frequency:parseInt(document.getElementById("set-frequency").value)||4,updated_at:new Date().toISOString()};
  await supabase.from("profiles").update(u).eq("id",currentUser.id);
  Object.assign(DATA,u);
  closeSettings();renderTraining();renderDiet();renderProgress();updateAllStats();
}

// ============ STATS ============
async function updateAllStats() {
  if(!currentUser)return;
  const ms=today.slice(0,7)+"-01";
  const{count:mc}=await supabase.from("workouts").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id).gte("date",ms);
  document.getElementById("stat-streak").textContent=mc||0;
  const{count:tc}=await supabase.from("workouts").select("*",{count:"exact",head:true}).eq("user_id",currentUser.id);
  document.getElementById("stat-total-workouts").textContent=tc||0;
  document.getElementById("stat-best-streak").textContent=DATA.bestStreak||0;
}

// ============ STARTUP ============
async function startup() {
  if (!initSupabase()) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showMainApp();
  } else {
    document.getElementById('auth-page').style.display = 'flex';
    document.querySelector('header').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  }
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      showMainApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      document.getElementById('auth-page').style.display = 'flex';
      document.querySelector('header').style.display = 'none';
      document.querySelector('.tabs').style.display = 'none';
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    }
  });
}

startup();
