# FitPlan 多用户云端改造 · 设计规格

**日期**: 2026-06-01  
**范围**: 从单用户 localStorage → 多用户 Supabase 云端  
**状态**: 已确认，待实现

---

## 1. 目标

- 支持多人注册/登录，各自数据完全隔离
- 数据存储在 Supabase 云端，换设备不丢失
- 遵循 YAGNI：不加社交、排行榜、好友系统等

## 2. 架构

```
GitHub Pages (单文件 HTML /index.html)
  ├── Supabase Auth · 邮箱密码注册/登录
  ├── Supabase PostgreSQL · 训练、饮食、身体数据
  └── Row Level Security · 每用户只能读写自己的数据
```

- Supabase JS SDK v2 通过 CDN 引入
- `SUPABASE_URL` 和 `anon_key` 写在前端（公开无害）
- 不需要自有服务器
- 当前 59KB 单文件内容直接扩展，不拆分为多文件

## 3. 数据库设计

### 3.1 表结构

**profiles** — 用户档案（auth 自动触发创建）

| 列 | 类型 | 说明 |
|----|------|------|
| id | uuid PK | = auth.uid() |
| email | text | 邮箱 |
| created_at | timestamptz | 注册时间 |

**workouts** — 训练记录

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigserial PK | |
| user_id | uuid FK → profiles | 用户 |
| date | date | 训练日期 |
| template_name | text | 模板名（如"胸+三头"，可选）|
| exercises | jsonb | [{name, sets, reps, weight}, ...] |
| notes | text | 备注（可选）|
| created_at | timestamptz | |

**meals** — 饮食记录

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigserial PK | |
| user_id | uuid FK → profiles | 用户 |
| date | date | |
| meal_type | text | 早餐/午餐/晚餐/加餐/零食 |
| foods | jsonb | [{name, amount, kcal, protein, fat, carbs}, ...] |
| total_kcal | int | |
| created_at | timestamptz | |

**body_logs** — 体重/体脂记录

| 列 | 类型 | 说明 |
|----|------|------|
| id | bigserial PK | |
| user_id | uuid FK → profiles | 用户 |
| date | date | |
| weight | numeric(5,1) | kg |
| body_fat | numeric(4,1) | 百分比（可选）|
| note | text | 备注（可选）|
| created_at | timestamptz | |

### 3.2 Row Level Security

所有表启用 RLS，策略如下：

```sql
-- profiles: 只能读写自己的
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- workouts / meals / body_logs: 只能读写自己的
CREATE POLICY "Users can CRUD own data" ON workouts FOR ALL USING (auth.uid() = user_id);
-- (同样的策略在 meals 和 body_logs 上)
```

INSERT 时自动注入 `user_id = auth.uid()`（前端不改的话后端 trigger 兜底）。

## 4. 登录注册流程

### 4.1 页面路由

```
页面加载
  ↓
supabase.auth.getSession()
  ├── 有 session → 拉数据，渲染主界面（训练/饮食/进度 tab）
  └── 无 session → 显示登录注册卡
```

### 4.2 登录注册 UI

- 卡片居中，两个 tab：「登录」「注册」
- 注册：邮箱 + 密码 + 确认密码 + 注册按钮
- 登录：邮箱 + 密码 + 登录按钮 +「忘记密码？」链接
- 错误提示：表单内红色文字（邮箱未注册 / 密码错误 / 网络错误）
- 注册成功后自动登录并跳到主界面
- 「忘记密码？」调用 Supabase 发送重置邮件（需要配置 Supabase SMTP）

### 4.3 主界面变化

- header 右侧：退出按钮（原设置齿轮旁边）
  - 显示用户邮箱首字母或 @ 前两位做圆形头像
  - 点击弹出：邮箱地址 +「退出登录」按钮
- 训练/饮食/进度三个 tab 和内容区保持不变
- 所有数据读写从 localStorage 改为 Supabase SDK
- 加载中状态：骨架屏（灰色轮廓占位卡片，1-2 秒）
- 网络错误：底部 toast 提示「网络连接失败，请检查」

### 4.4 兼容过渡

- 移除所有现有 localStorage 读写代码
- 不需要旧数据迁移（用户决定从零开始）
- 首次登录后自动创建 profiles 记录（Supabase trigger）

## 5. Supabase 配置清单

### 5.1 需要在 Supabase Dashboard 操作

1. 创建项目
2. 开启 Email/Password Auth Provider
3. 启用「Enable email confirmations」（可选，初期可关闭降低门槛）
4. 在 SQL Editor 中执行建表 + RLS 策略脚本
5. 复制 `SUPABASE_URL` 和 `anon_key` 填入前端代码

### 5.2 需要在前端配置

```js
const SUPABASE_URL = 'https://<project>.supabase.co';
const SUPABASE_ANON_KEY = '<anon_key>';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 5.3 可选配置

- SMTP（Supabase 内置）：用于忘记密码邮件
- 为保持免费额度不超，建议保留一个月一个 cron（Hermes 可管理）定时 poke Supabase 防止休眠

## 6. 数据量估算

- 每用户每天：~3 条训练记录 + ~5 条饮食记录 + ~0.5 条身体记录 ≈ 8 条/天
- 100 用户 × 8 条/天 × 365 天 ≈ 292,000 条/年
- 每条 ~1KB jsonb → 300MB/年（接近但未超 500MB 免费额度）
- API 请求：100 用户 × 每天 3 次访问 × 10 次查询 ≈ 3,000/天 ≈ 90,000/月（远低于 200 万限制）

## 7. 不做的

- 好友系统 / 排行榜 / 社交功能
- 微信登录
- 自定义后端服务器
- 数据迁移工具（从零开始）
- 训练模板云端共享
- 照片上传

## 8. 自检

- [x] 无 TODO / 待定字段
- [x] 表结构完整（PK/FK/类型）
- [x] RLS 策略覆盖所有表
- [x] UI 流程明确（路由→登录→主界面）
- [x] 错误处理覆盖（网络/验证/加载中）
- [x] 范围明确（无越界功能）
- [x] 无模糊表述
