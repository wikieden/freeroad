# Shadowrocket 国内外分流与 AI 固定出口配置设计

## 目标

创建一份可直接导入 Shadowrocket 的完整配置 `shadowrocket-global.conf`：局域网、私网和国内网站直连；广告及追踪请求拒绝；Claude、OpenAI、Google/Gemini/Antigravity 等国外 AI 服务强制使用独立的美国或台湾节点；其他国外及未识别流量使用国外代理。

## 参考与取舍

- 参考 Johnshall `Shadowrocket-ADBlock-Rules-Forever` 的完整配置结构、广告过滤和国内外分流思路。
- 不复制约 8.5 万行的每日生成配置，改用小型主配置结合远程 `RULE-SET`，降低维护和合并成本。
- 参考 LOWERTOP/Shadowrocket 的 `[General]`、`[Proxy Group]`、`[Rule]` 格式与规则优先级。

参考地址：

- https://github.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever
- https://johnshall.github.io/Shadowrocket-ADBlock-Rules-Forever/lazy_group.conf
- https://github.com/LOWERTOP/Shadowrocket/wiki/

## 配置文件

### `[General]`

- 关闭 IPv6，延续现有 Clash 配置的单栈策略。
- 将 RFC1918 私网、环回、链路本地、`.local`、`.lan` 等范围加入直连或 TUN 排除。
- 使用国内 DoH 作为默认 DNS，并保留系统 DNS 回退。
- 启用私有 IP 应答，避免内网域名因返回私网地址而被误判为劫持。
- 不包含公司 Kiro relay、公司 DNS、公司域名或其他内部网络信息。

### `[Proxy Group]`

建立以下策略组：

1. `🧠 Claude`
   - 类型为 `select`。
   - 通过 `policy-regex-filter` 直接筛选美国、台湾具体节点。
   - 不嵌套 `url-test` 组，防止会话期间自动切换出口。
2. `✨ OpenAI/AI`
   - 与 Claude 相同，仅允许美国和台湾具体节点并手动固定。
3. `🔷 Google/Gemini/Antigravity`
   - 与 Claude 相同，仅允许美国和台湾具体节点并手动固定。
   - 同时承接 YouTube 流量。
4. `🎯 国外代理`
   - 类型为 `url-test`，用于除 AI 外的其他国外流量。
   - 排除套餐、流量、到期、官网等提示节点。
5. 美国、台湾、香港、日本、新加坡、韩国等地区测速组
   - 供普通流量和手动排障使用。

美国与台湾的节点筛选表达式需要覆盖中英文、地区码和旗帜关键词，同时避免使用过宽的单字匹配。

## 规则优先级

`[Rule]` 严格按以下顺序组织：

1. 局域网、私网和明确的本地域名 → `DIRECT`。
2. Claude/Anthropic 精确域名、社区 Claude 规则集及为出口一致性保留的相关认证/遥测规则 → `🧠 Claude`。
3. OpenAI、ChatGPT、Perplexity、Cursor、Hugging Face 等 → `✨ OpenAI/AI`。
4. Google、Gemini、Generative Language API、MakerSuite、Antigravity、cloudcode-pa、YouTube → `🔷 Google/Gemini/Antigravity`。
5. 广告与追踪远程规则集 → `REJECT`。
6. GitHub、Telegram、Discord、Netflix、Disney 等国外服务 → `🎯 国外代理`。
7. 国内域名远程规则集 → `DIRECT`。
8. `GEOIP,CN,DIRECT`。
9. `FINAL,🎯 国外代理`，保证国外和未识别网站不会意外直连。

AI 规则必须位于广告、国内规则和最终兜底之前，避免 AI 的认证、遥测或静态资源被广告规则误伤。

## 远程规则集

- 优先采用维护活跃、提供 Shadowrocket 格式的规则集。
- 实施时逐一验证 HTTP 可访问性和内容格式，不使用返回 HTML、空文件或非 Shadowrocket 规则格式的 URL。
- 主配置仅保留必要的精确域名兜底，避免完全依赖单一第三方规则集。
- 远程规则集不可用时，AI 精确域名仍应继续命中对应 AI 策略组。

## 导入与隐私

- 脱敏后的 `shadowrocket-global.conf` 放在公开的 `wikieden/freeroad`，支持通过 Raw URL 导入与更新。
- 带公司配置的 Clash 版本仅保存在本地 Git 仓库外，不进入公开提交。
- Shadowrocket 配置不得包含公司内部地址、域名或 relay 信息。

## 验证标准

1. 配置包含且仅包含一个 `[General]`、`[Proxy Group]` 和 `[Rule]` 主段。
2. 每条规则引用的策略组均已定义，或是 Shadowrocket 内置的 `DIRECT`/`REJECT`。
3. Claude、OpenAI、Google 三个策略组的筛选范围仅包含美国与台湾节点关键词，且类型均为手动 `select`；Russia、Fukuoka、日本节点和流量提示节点不得误匹配。
4. Claude、OpenAI、Google/YouTube 的规则分别指向正确的独立策略组。
5. 私网和国内规则位于 `FINAL` 之前，`FINAL,🎯 国外代理` 是最后一条有效规则。
6. 所有远程 `RULE-SET` URL 可访问，且响应包含有效 Shadowrocket 规则。
7. 配置中不存在公司 relay、公司 DNS、公司域名或凭据。
8. 提供简明的 iPhone 导入与策略组选择说明。

## 不在范围内

- 不修改现有 Clash Verge 脚本。
- 不引入 MITM、证书安装、URL Rewrite 或请求/响应脚本。
- 不承诺通过域名规则完全屏蔽 YouTube 视频广告。
