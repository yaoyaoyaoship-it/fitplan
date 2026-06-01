# FitPlan Supabase 改造 · Codex 审查意见

**审查时间**: 2026-06-01  
**审查方式**: Codex (gpt-5.5) 分析 spec + index.html 源码

---

## 🔴 缺失项

### 1. 用户档案/设置表不完整
spec 的 `profiles` 表只有 id/email/created_at。但现有 app 的 settings 包含：
- height (身高)、weight (体重)、bodyfat (体脂率)、age (年龄)
- period (增肌/减脂)、frequency (训练频率)
这些必须存到 profiles 或独立的 `user_settings` 表中，否则每个用户都是硬编码默认值。

### 2. 自定义训练模板没纳入 schema
现有 app 里 `fitplan_templates` (localStorage) 是用户的核心数据——自己编的训练模板。spec 完全没有提到模板的存储。需要新增 `templates` 表（user_id, name, exercises jsonb）。

### 3. 计数派生字段的问题
`totalWorkouts`、`thisMonthWorkouts`、`bestStreak` 目前在 localStorage 里作为派生计数字段存在。云端方案有两种选择：
- 在数据库里实时 COUNT (推荐，准确且无 sync 问题)
- 存为 materialized 字段但需维护触发器
spec 没说明选哪种。

### 4. 登录后的 session 持久化策略
spec 说 "页面加载 → getSession() → 有则渲染，无则登录"，但没说 session refresh 机制。Supabase 默认 session 1 小时后过期，需要 auth state listener 自动刷新。没说清楚谁来处理 refresh token 和登出。

---

## 🟡 安全问题

### 5. innerHTML 在云认证场景下风险未变高
Codex 扫描发现代码中大量使用 innerHTML（模板渲染、自定义食物添加等）。单用户场景风险有限（用户只坑自己），但多用户云认证后：如果任何用户生成内容（模板名、食物名、备注）不转义就直接 innerHTML，可能被恶意用户用于 XSS 攻击其他用户。**需要全面 audit 所有 innerHTML 点并做转义。**

### 6. anon key 暴露 + 缺少 RLS 的 INSERT 策略
spec 的 RLS 示例只给了 SELECT 和 UPDATE。对于 workouts/meals/body_logs 只有 USING 没有 WITH CHECK。INSERT 需要单独的策略确保 user_id 正确注入。建议：
```sql
CREATE POLICY "Users can insert own" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 🟢 Supabase 免费版细节

### 7. 邮件确认的问题
spec 说"可选，初期可关闭降低门槛"，这是对的。但需要注意：关闭 email confirmation 后，注册 API 无速率限制（容易被恶意注册），免费版 Supabase 每月 50,000 MAU 上限但 bot 注册可能瞬间拉满。建议前端加简单的验证码或频率限制。

### 8. 并发连接限制
免费版 Supabase 最多 2 个数据库连接（通过 Supavisor 连接池）。如果多用户同时操作且查询较重，可能排队。建议前端加 debounce 减少并发查询。

### 9. 数据库休眠恢复
spec 提到用 cron poke 防止休眠，正确。但需注意：恢复后第一次查询可能在 Supabase 侧也慢（不仅是冷启动），建议加 loading 重试逻辑。

---

## 总结

**Blocking（实现前必须解决）**: #1 (settings)、#2 (模板)、#6 (INSERT RLS)  
**Important（实现中处理）**: #3 (计数策略)、#4 (session 刷新)、#5 (innerHTML XSS)  
**Nice-to-have**: #7、#8、#9
