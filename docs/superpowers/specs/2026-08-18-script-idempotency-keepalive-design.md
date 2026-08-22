# Clash 全局扩展脚本幂等性与 Keep Alive 修正设计

## 目标

对 `clash-goblal-extend-script.js` 做两项最小修正：保证个人规则在脚本重复执行后仍被保留，并将未见于 Mihomo 官方文档的 `tcp-keep-alive` 替换为官方字段。

## 范围

### 个人规则幂等性

- 最终规则数组继续以个人规则优先。
- 将 `PERSONAL_RULES_MARKER` 一并写回最终规则数组。
- 同一份生成配置连续执行 `main` 两次后，marker 和个人规则均只出现一次。
- 不改变没有 marker 时整体重建规则的现有行为。

### TCP Keep Alive

- 删除 `config["tcp-keep-alive"] = true`。
- 写入 `config["disable-keep-alive"] = false`，明确启用 TCP Keep Alive。
- 不主动设置 `keep-alive-idle` 或 `keep-alive-interval`，避免在没有实测数据时改变内核默认时序。

## 不在范围内

- 不收窄 Claude 的第三方认证、遥测或内容规则。
- 不调整 Kiro/AWS 的 `amazonaws.com` 规则。
- 不改变 Google/Gemini/Antigravity 策略组、节点范围或规则顺序。
- 不进行其他重构或文件改名。

## 验证

1. 先增加回归测试，并确认当前脚本在第二次执行后丢失个人规则。
2. 修改后连续执行两次，marker 与个人规则各存在一次。
3. 生成配置包含 `disable-keep-alive: false`，且不再包含 `tcp-keep-alive`。
4. 运行 JavaScript 语法检查及既有 Google/Gemini/Antigravity 行为验证。

## 官方依据

Mihomo 当前全局配置文档将 TCP Keep Alive 配置定义为 `disable-keep-alive`、`keep-alive-idle` 和 `keep-alive-interval`。本次仅设置 `disable-keep-alive: false`，其余参数沿用默认值。
