# Freeroad 分流配置：Shadowrocket / FlClash / Clash Verge Rev 多平台 AI 分流策略方案

> 如果需要注册 ChatGPT、Claude 或相关 Agent 服务，请查看 [Freedom To ChatGPT Claude Agent](https://github.com/wikieden/Freedom-To-Chatgpt-Claude-Agent)。

Freeroad 面向 Shadowrocket、FlClash、Clash Verge Rev 等多平台代理工具，为 Claude、OpenAI、Google/Gemini/Antigravity 和其他 AI 服务提供独立出口、国家节点选择、DNS 防泄漏与安全检测方案。

只使用代理服务商自带的默认分流策略通常远远不够。AI 服务的登录、API、静态资源和遥测请求可能落到不同出口，DNS、UDP 或 WebRTC 泄漏也会影响账号稳定性与检测结果。不信可以先打开 [Net.Coffee Claude AI IP 风险检测](https://ip.net.coffee/claude/) 看一下当前出口评分，再决定是否需要独立的 AI 分流策略。

这套方案会把 AI 出口、DNS、UDP 回落和客户端差异显式管理，帮助减少常见安全评分扣分项。在节点质量、IP 信誉和客户端环境正确时，检测结果可以达到高分甚至满分，但不承诺所有节点、网络和账号都必然满分。

为不同代理客户端提供统一的分流目标：

- 局域网和国内网站直连。
- 广告与追踪请求拒绝。
- Claude、OpenAI、Google/Gemini/Antigravity 使用相互独立的国家选择组。
- Perplexity、Cursor、Hugging Face、Grok、Kiro、Typesafe（`typesafe.ai` 及其子域名）等境外 AI 统一进入 `🤖 其他 AI 服务`。
- Steam 商店、社区及客户端使用 `🎮 Steam` 独立组，明确的下载 CDN 和中国服务优先直连。
- 其他国外及未识别流量走代理。

> 这些文件只提供配置与分流规则，不提供代理节点。使用前需要准备兼容相应客户端的节点订阅。

## 快速导航

- [第一章：方案优势与核心能力](#overview)
- [AI 服务分流策略](#ai-routing)
- [Steam 独立分流](#steam-routing)
- [国内外划分与直连白名单](#domestic-direct)
- [DNS 与安全防护](#dns-security)
- [第二章：账号地区限制与风险信号](#account-risk)
- [第三章：AI 出口检测与验收](#ai-verification)
- [第四章：客户端下载](#downloads)
- [第五章：文件与客户端兼容性](#compatibility)
- [第六章：Clash Verge Rev](#clash-verge-rev)
- [第七章：FlClash](#flclash)
- [第八章：Shadowrocket](#shadowrocket)
- [本地内网 Hosts 模板](#internal-hosts)
- [第九章：Clash Meta for Android](#clash-meta-android)
- [软路由：RouterOS（ROS）与爱快（iKuai）](#soft-router)
- [第十章：常见问题](#faq)

## 一分钟选择客户端

| 设备或客户端 | 使用文件 | 适合场景 |
|---|---|---|
| Windows、macOS、Linux / Clash Verge Rev | [`clash-goblal-extend-script.js`](./clash-goblal-extend-script.js) | 已有 Clash/Mihomo 节点订阅，希望通过全局扩展脚本自动重建 AI 分组和规则 |
| Android、Windows、macOS、Linux / FlClash | [`clash-goblal-extend-script.js`](./clash-goblal-extend-script.js) | 使用 FlClash 脚本覆写，希望订阅更新后继续保留统一分流策略 |
| iPhone、iPad、Mac、Apple TV / Shadowrocket | [`shadowrocket-global.conf`](./shadowrocket-global.conf) | 需要可直接导入的完整配置、国家节点组、DoH 和广告过滤 |
| Android / Clash Meta for Android | 自建完整 Clash/Mihomo YAML | 需要在本地 YAML 中配置私密 `proxy-providers`，不能直接导入本仓库 JS/CONF |
| RouterOS（ROS）／爱快（iKuai）主路由 + Mihomo 旁路由 | 脚本生成的完整 Clash/Mihomo YAML | 主路由负责网络接入，OpenWrt／Linux 旁路由执行分流；需配置流量和 DNS 接管 |

<a id="overview"></a>

## 第一章：方案优势与核心能力

<a id="ai-routing"></a>

### 让 AI 服务保持稳定、可控的出口

Claude、OpenAI 和 Google/Gemini/Antigravity 分别使用独立策略组；其余境外 AI 使用第四个统一策略组。选择路径统一为 `AI 服务组 → 国家节点组 → 自动测速/具体节点`，不会因为普通网页、下载或流媒体线路切换而跨国家改变出口。

前三个 AI 组提供美国、台湾、日本、新加坡；`🤖 其他 AI 服务` 额外提供欧洲。进入国家组后默认使用该国家的自动测速，也可以固定一个具体节点。自动测速只在同一国家内部进行，但仍可能更换出口 IP；账号稳定性优先时应改选具体节点。

为了减少常用服务的选择步骤，`🧠 Claude` 和 `✨ OpenAI/AI` 会在四个国家组之后，再直接列出美、台、日、新具体节点。国家组仍排在前面，所以默认行为不变；Clash/Mihomo 的 Google 和其他 AI 继续只显示国家组，避免列表过长。

Shadowrocket 的应用组配置还直接引用地区自动测速快捷选项，具体范围见第八章。各地区组仍可进入后固定具体节点；自动测速只在对应地区内切换，不验证 Claude 登录、账号状态或目标应用可用性。

这样可以减少会话过程中出口地区或 IP 频繁变化导致的重新登录、连接中断和异常验证风险。但配置不能保证账号绝对不触发风控，最终效果仍取决于节点质量、IP 信誉、账号地区和使用行为。

Clash/Mihomo 脚本还对四个 AI 组采用 UDP 失败关闭：所选 AI 节点支持 UDP 时照常按组转发；不支持时直接拒绝该 AI UDP，让应用回退到 TCP，而不是改走普通代理或直连。Shadowrocket 则通过 `udp-policy-not-supported-behaviour = REJECT` 和代理 QUIC 阻断实现同类保护。

服务归属如下：

| 策略组 | 主要范围 | 可选国家组 |
|---|---|---|
| `🧠 Claude` | Claude、Anthropic API 与一方资源 | 美国、台湾、日本、新加坡 |
| `✨ OpenAI/AI` | ChatGPT、OpenAI API、Codex 与一方资源 | 美国、台湾、日本、新加坡 |
| `🔷 Google/Gemini/Antigravity` | Google 登录和全家桶、Gemini、Antigravity、YouTube | 美国、台湾、日本、新加坡 |
| `🤖 其他 AI 服务` | Perplexity、Cursor、Hugging Face、xAI/Grok、Kiro、Typesafe、Mistral、Poe、Cohere、OpenRouter 等境外 AI | 美国、台湾、日本、新加坡、欧洲 |
| `🎮 Steam` | Steam 商店、社区及相关服务 | 自动代理、直连及现有地区组 |

Clash/Mihomo 使用维护中的 `GEOSITE,category-ai-!cn` 自动补充新出现的境外 AI 域名，三大独立组的规则排在它前面，因此不会被统一组抢走。Shadowrocket 不支持同等的 GeoSite 分类，配置中改用一方域名和明确专属端点，避免旧规则集把整站 Sentry、Intercom、Stripe、Auth0 等共享服务错误绑定到某个 AI 出口。国内 AI 不进入该统一组，仍按国内直连规则处理。

<a id="steam-routing"></a>

### Steam 独立分流

Steam 使用独立的 `🎮 Steam` 策略组，默认自动代理，可以单独选择地区或直连。Clash/Mihomo 与 Shadowrocket 使用相同的 52 条显式域名规则，直连规则先于 Steam 代理规则，整个区块位于国内及境外通用规则之前。

| 请求范围 | 示例 | 策略 |
|---|---|---|
| 商店、社区、客户端连接 | `store.steampowered.com`、`steamcommunity.com`、`cm.steampowered.com` | `🎮 Steam` |
| 静态资源、云存档、用户内容 | `steamstatic.com`、`steamusercontent.com`、专属云存档端点 | `🎮 Steam` |
| 明确的下载 CDN、中国服务 | `steamcontent.com`、`steamchina.com`、列出的国内下载端点 | `DIRECT`，不受 Steam 组选择影响 |
| 第三方网站 | Humble Bundle、Fanatical、SteamUnlocked | 不在 Steam 专用规则内，遵循通用分流 |

其他海外下载域名仍可能走 Steam 组，不保证所有下载都直连。规则不使用宽泛关键词，也不依赖两套范围不同的 Steam 远程规则集；新增域名需要更新配置。选定 Steam 策略后，从连接日志确认商店/社区命中 `🎮 Steam`、下载端点命中 `DIRECT`。规则表与匹配顺序已有本地测试，实际客户端的下载速度和界面显示仍需设备验收。

<a id="domestic-direct"></a>

### 国内外划分：国内直连、境外代理

Freeroad 的默认模式是“国内外划分”：局域网、私网、中国域名和中国 IP 直接连接；境外网站和未识别流量默认进入代理。这样可以避免国内服务绕境外代理造成延迟升高、下载变慢或本地设备无法访问，同时避免新出现的境外 AI 或开发者服务因为尚未收录而意外直连。

这里的“国内直连白名单”来自维护中的中国域名与 IP 数据集，而不是手工列举少量常见网站：

- Clash/Mihomo 使用 `GEOSITE,cn,DIRECT` 与 `GEOIP,cn,DIRECT`，并固定从 [MetaCubeX meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/releases/latest) 下载 GeoSite、GeoIP 与 MMDB 数据。
- Shadowrocket 使用 `China_Domain.list`、`China.list` 与 `GEOIP,CN,DIRECT`。
- 局域网和 RFC1918 私网地址始终优先直连；回环、CGNAT（`100.64.0.0/10`）、IPv4/IPv6 链路本地地址及 IPv6 ULA 也不进入代理。`198.18.0.0/15` 保留给 Clash fake-IP 映射，不能加入直连名单。

规则优先级保持为：AI 专用规则 → 广告拦截 → Steam 等服务专用规则 → 国内直连白名单 → 默认境外代理。也就是说，Claude、OpenAI、Google/Gemini/Antigravity 等服务不会被“国内直连”误覆盖；对未命中中国域名/IP 列表的海外 CDN、境外站点和未知流量，默认仍走 `🎯 国外代理`。这与“让全部未知网站直连”的黑名单模式不同。

Shadowrocket 的 `🎯 国外代理` 默认使用 `♻️ 国外自动`，也可以手动进入美国、台湾、香港、日本、新加坡、韩国、欧洲或 `🌐 其他国家节点`。其他国家组会排除中国、回国、套餐提示和已单独分类的国家，并提供自动测速与具体节点选择。

<a id="dns-security"></a>

### DNS 与安全防护：Shadowrocket 优先使用加密 DoH

Shadowrocket 配置的所有解析路径都只使用 HTTPS DoH，并关闭系统 DNS 参与。DoH 使用通过 TLS 校验的 IP 端点，避免解析 DoH 服务域名时再次依赖引导 DNS。所有硬编码到 UDP/TCP 53 端口的明文 DNS 请求会被接管。直连和节点引导 DoH 使用 `#no-h3`；代理 DoH 使用 Shadowrocket 官方的 `#proxy` 写法，并由 `block-quic = all-proxy` 阻止代理 QUIC 回落。

Shadowrocket 的国内直连域名使用 AliDNS DoH（`https://223.5.5.5/dns-query#no-h3`）；国内 DNS 端点 IP 显式直连，不依赖 GeoIP 数据库判断。代理类域名由 Shadowrocket 按实际代理规则交给代理节点远程解析。默认与备用 DNS 使用 Cloudflare/Google 境外 DoH，并通过默认代理转发。国内解析仅使用 AliDNS，因此 AliDNS 不可达时会解析失败，不会切换到代理；此调整仍需在实际客户端验证是否改善访问延迟。

代理节点自身域名必须在代理建立前解析，不能依赖尚未建立的代理。该引导步骤单独使用 AliDNS/DNSPod 加密 DoH，避免部分网络无法直连境外 DoH 时导致所有代理失效。国内解析器在这里最多看到代理节点的服务器域名，不会用于解析 ChatGPT、Claude、Google 或其他代理网站。

所有境外 DoH 或代理均不可达时，解析会直接失败，而不是静默回退到国内、运营商或系统 DNS。这是防止代理网站 DNS 泄漏的预期行为。DNS-over-PROXY 使用的是 Shadowrocket 的默认节点；正常代理域名仍由实际命中的国家策略组远程解析。

可使用 [IPinfo.cv DNS 泄漏检测](https://ipinfo.cv/dns-leak-check) 辅助检查。代理网站测试不应出现当前本地网络运营商或路由器的解析器；但代理节点自身可能使用 AliDNS、DNSPod 或其他中国解析器，因此出现中国解析器不等于已经证明本地泄漏。测试国内直连网站时使用国内加密 DoH 也属于正常行为。必须结合所选代理出口和 Shadowrocket DNS/连接日志判断，不能只看页面颜色。

Clash/Mihomo 脚本的默认、节点引导、国内和境外 DNS 上游同样使用 IP 形式 DoH；`respect-rules = true` 让境外 DNS 连接按规则进入代理，节点引导则使用可直连的国内加密 DoH，避免形成启动循环。

### 广告与追踪过滤

Shadowrocket 配置使用维护中的广告域名集；Clash/Mihomo 脚本使用内核广告分类。广告规则只负责明确命中的广告与追踪请求，AI 核心域名规则具有更高优先级，降低认证、静态资源或遥测接口被误拦截的概率。

### 不同设备保持相同分流逻辑

电脑、Android 和 Apple 设备虽然使用不同客户端和配置格式，但都遵循相同目标：

- Claude、OpenAI、Google 使用独立国家出口，其他境外 AI 使用统一服务组并可额外选择欧洲。
- 国内和局域网直连。
- 其他国外流量代理。
- 广告请求拒绝。

切换设备时不需要重新理解每个客户端的规则体系，只需按本文对应章节导入。

### 订阅更新后仍保留自定义规则

Clash Verge Rev 和 FlClash 通过脚本在节点订阅加载后重建策略组与规则，机场更新节点时不需要手工修改订阅文件。Shadowrocket 使用独立配置文件和远程规则集，可以分别更新节点订阅与分流规则。

### 公开配置不包含节点凭据

仓库只保存公开分流逻辑，不保存机场订阅 URL、节点密码或私有网络配置。你可以检查全部规则，并把真实订阅凭据保留在自己的客户端或本地 YAML 中。

<a id="account-risk"></a>

## 第二章：账号地区限制与社区风险信号

官方资料能确认的是：Anthropic 会使用 IP 等信号判断国家或地区并执行支持地区政策；OpenAI 可能阻止来自不支持地区的注册或 API 访问；Gemini API/AI Studio 也只在列出的地区开放。对应资料见 [Anthropic 位置说明](https://privacy.claude.com/en/articles/11186740-does-claude-use-my-location)、[Anthropic 支持地区执法说明](https://www.anthropic.com/transparency/system-trust-reporting)、[OpenAI 不支持地区说明](https://help.openai.com/en/articles/8983035-why-can-t-i-sign-up-due-to-unsupported-country)和 [Gemini 可用地区](https://ai.google.dev/gemini-api/docs/available-regions)。

X、Reddit 和 Hacker News 上还有 VPN、共享 IP、账号国家不一致、第三方 OAuth、短期跨地区切换后被验证或停用的用户报告，例如 [Antigravity 第三方 OAuth 停用讨论](https://www.reddit.com/r/google_antigravity/comments/1swz0rm/this_service_has_been_disabled_in_this_account)、[Cursor 地区限制讨论](https://www.reddit.com/r/cursor/comments/1smvuax/banned_from_cursor_two_days_after_paying_60_no)、[Grok 与 VPN 讨论](https://www.reddit.com/r/grok/comments/1vipc62/grok_is_banning_people_for_using_a_vpn)、[Antigravity 账号国家经验帖](https://x.com/Jimmy_JingLv/status/2004592735530160589)和 [Perplexity VPN 讨论](https://news.ycombinator.com/item?id=38698782)。这些是社区个案，不等于厂商公开规则，也不能单独证明封禁原因。

本配置能做的是固定网络出口并避免协议回落串到其他国家；它不能修复账号共享、多账号绕限额、第三方工具违反条款、付款资料不一致或账号本身已被限制。使用时仍应遵守服务条款，并长期固定信誉较好的支持地区节点。

<a id="ai-verification"></a>

## 第三章：AI 出口检测与验收

出口检测是配置完成后的关键验收步骤。Claude、OpenAI、Google/Gemini/Antigravity 和其他境外 AI 使用四个相互隔离的策略组，必须分别检查，不能只验证浏览器显示的普通公网 IP。

### Claude

检测地址：[Net.Coffee Claude AI IP 风险检测](https://ip.net.coffee/claude/)

1. 在 `🧠 Claude` 中选择美国、台湾、日本或新加坡国家组，再选择自动测速或固定具体节点；也可以直接选择国家组后方的具体节点快捷入口。重新连接并保持 Rule/规则模式。
2. 打开检测页，确认“Claude AI 出口 IP”的国家与所选节点一致。
3. 同时检查 Claude 支持地区、IP 信任评分、DNS 和 WebRTC/UDP 泄露提示。
4. 实际打开 Claude 或执行一次 Claude Code 请求，再从客户端连接日志确认命中 `🧠 Claude`。

### OpenAI / ChatGPT / Codex

检测地址：[Net.Coffee ChatGPT · Codex IP 风险检测](https://ip.net.coffee/gpt/)

1. 在 `✨ OpenAI/AI` 中选择美国、台湾、日本或新加坡国家组，再选择自动测速或固定具体节点；也可以直接选择国家组后方的具体节点快捷入口并重新连接。
2. 确认“ChatGPT 出口 IP”的国家与所选节点一致，并分别查看 `chatgpt.com` 与 `api.openai.com` 的连通性。
3. 实际打开 ChatGPT 或发起一次 Codex/API 请求，再从客户端连接日志确认命中 `✨ OpenAI/AI`。

### Google / Gemini / Antigravity

Google 官方明确要求 Google AI Studio 和 Gemini API 只能从[支持的国家和地区](https://ai.google.dev/gemini-api/docs/available-regions)访问，[服务条款](https://ai.google.dev/gemini-api/terms)也写明只能在可用地区访问。[Gemini 隐私说明](https://support.google.com/gemini/answer/13594961?hl=zh-Hans)还说明服务会使用来自设备、IP 地址以及 Google 账号家庭/工作地址的位置信息。

因此建议先在 `🔷 Google/Gemini/Antigravity` 选择与账号国家一致且受支持的美国、台湾、日本或新加坡国家组，再在国家组内固定具体节点。不要在登录、Gemini 对话或 Antigravity 任务过程中跨国家切换；若使用国家自动测速，也要知道它可能在同一国家内更换具体出口 IP。

验证顺序：

1. 选择 Google 国家组及其自动/具体节点并重新连接，保持 Rule/规则模式。
2. 打开 [Google 搜索“what is my ip”](https://www.google.com/search?q=what+is+my+ip)；如果结果页显示公网 IP，确认其国家符合预期。
3. 分别登录 Gemini 与 Antigravity，并各完成一次真实模型请求；只能打开登录页不算验证完成。
4. 查看客户端连接日志，确认 `google.com`、`googleapis.com`、`antigravity`、`cloudcode-pa` 等连接命中 `🔷 Google/Gemini/Antigravity`。
5. 如果使用 Google 账号安全活动记录，再检查登录位置是否与固定出口国家一致。

本仓库会把 Google 登录、Gmail、Drive、Gemini、Antigravity、YouTube 等 Google 流量统一送入该策略组，避免同一账号同时从不同国家出口访问。Google 官方公开资料没有写明“出口 IP 必须与账号国家完全相同”是所有产品的统一硬性规则，因此这里将两者一致作为稳定性强建议，而不是官方保证。

### 其他 AI 服务

1. 在 `🤖 其他 AI 服务` 中选择美国、台湾、日本、新加坡或欧洲国家组，再选择自动测速或固定具体节点并重新连接。
2. 实际打开你使用的服务并完成一次请求，例如 Perplexity 搜索、Cursor Agent、Grok 对话或 Kiro 对话。
3. 从客户端连接日志确认相应主域名命中 `🤖 其他 AI 服务`，没有进入 `✨ OpenAI/AI` 或普通国外代理。
4. Grok 独立站和 xAI API 会进入该组；整个 `x.com` 仍走普通国外代理，避免把全部 X 图片与视频流量绑到 AI 节点。若必须让 Grok-in-X 与 xAI 完全同出口，可在客户端个人规则中把 `x.com` 也指向本组。

### 验收标准与安全提示

- 四个策略组都必须单独选择国家和自动/具体节点、实际发起服务请求，并在客户端连接日志中命中正确分组。
- 检测结果、实际服务和客户端日志三者的出口国家应一致；任一不一致都先排查规则、IPv6、DNS 或 WebRTC 泄露。
- 第三方检测页的评分和标签只适合辅助比较节点，不代表厂商官方判定，也不能保证账号不会触发验证或风控。
- 不要在任何检测页面输入账号密码、订阅链接或节点凭据。

<a id="downloads"></a>

## 第四章：客户端官方下载

| 客户端 | 平台 | 当前验证版本 | 官方下载地址 |
|---|---|---|---|
| Clash Verge Rev | Windows、macOS、Linux | v2.5.2 | [GitHub Releases](https://github.com/clash-verge-rev/clash-verge-rev/releases/latest) |
| FlClash | Android、Windows、macOS、Linux | v0.8.96 | [GitHub Releases](https://github.com/chen08209/FlClash/releases/latest) |
| Shadowrocket | iPhone、iPad、Mac、Apple TV | App Store 当前版 | [Apple App Store](https://apps.apple.com/us/app/shadowrocket/id932747118) |
| Clash Meta for Android | Android | v2.11.33 | [GitHub Releases](https://github.com/MetaCubeX/ClashMetaForAndroid/releases/latest) |

安装包选择：

- 普通 Intel/AMD Windows 电脑选择 `x64` 安装包，Windows on ARM 选择 `arm64`。
- Apple Silicon Mac（M1/M2/M3/M4 等）选择 `aarch64`/`arm64`，Intel Mac 选择 `x64`。
- 绝大多数近年的 Android 手机选择 `arm64-v8a`；不确定时可选择 `universal`，文件会更大。
- Debian/Ubuntu 选择 `.deb`，Fedora/RHEL 选择 `.rpm`。
- 如果 Shadowrocket 链接跳回 App Store 首页或显示不可用，表示当前 Apple ID 所在地区未提供该 App；请使用 App Store 正常提供 Shadowrocket 的地区账号，不要从第三方网站侧载 IPA。

请勿从来源不明的“汉化版”“破解版”或第三方 APK/IPA 下载站安装。这类客户端拥有 VPN 与全量网络流量权限，应优先使用项目 GitHub Releases 或 Apple App Store。

<a id="compatibility"></a>

## 第五章：文件与客户端兼容性

| 客户端 | 使用文件 | 使用方式 |
|---|---|---|
| Clash Verge Rev | [`clash-goblal-extend-script.js`](./clash-goblal-extend-script.js) | 全局扩展脚本 |
| FlClash | [`clash-goblal-extend-script.js`](./clash-goblal-extend-script.js) | 订阅配置的脚本覆写 |
| Shadowrocket | [`shadowrocket-global.conf`](./shadowrocket-global.conf) | 完整配置文件 |
| Clash Meta for Android | Clash/Mihomo YAML | 需要含节点或 `proxy-providers` 的完整 YAML，不能直接导入本仓库的 JS/CONF |
| ROS／爱快 + Mihomo 旁路由 | 脚本生成的完整 Clash/Mihomo YAML | JS 由宿主生成配置后交给 Mihomo；不是 ROS／爱快原生配置 |

公共 Raw 地址：

```text
https://raw.githubusercontent.com/wikieden/freeroad/main/clash-goblal-extend-script.js
https://raw.githubusercontent.com/wikieden/freeroad/main/shadowrocket-global.conf
```

<a id="clash-verge-rev"></a>

## 第六章：Clash Verge Rev

### 多订阅源聚合

全局脚本同时支持内嵌 `proxies` 和 `proxy-providers`。将私密聚合 YAML 导入为本地配置，再启用本仓库最新版全局脚本即可。订阅地址、节点凭据与生成的完整配置只保存在本地，不要上传 GitHub。

Provider 节点由 Mihomo 在订阅更新后按名称动态筛选到地区组，套餐提示节点会排除；HTTP provider 应配置自己的 `health-check`。因为脚本无法预先读取远程节点，provider 模式会显示全部地区组，空地区组使用 `REJECT`，不会回落直连。Claude/OpenAI 同时展示国家组和美、台、日、新的具体节点，支持各自直接固定一个 provider 或内嵌节点。仅有内嵌节点时继续只显示存在的地区。


### 用全局扩展保留私有节点和固定出口链路

`🖥️ 美国 VPS 出口` 表示美国 VPS／固定代理出口，不是住宅 IP 认证。节点按供应商区分 Sunflare、IPIPGO、Lychee；`private-residential-*` provider 键和 `clash-global-residential-extend-script.js` 文件名为兼容旧配置而保留，不代表 IP 的住宅属性。旧界面的 `🏠 家宅出口` 已更名，导入新版后请重新确认各 AI 分组的出口选择。

需要将手工节点、多个订阅和固定出口链路统一保存在全局设置时，使用以下一对文件，替代普通全局脚本的导入方式：

| 放置位置 | 文件 | 用途 |
|---|---|---|
| 全局扩展配置 | [`templates/clash-global-private.example.yaml`](./templates/clash-global-private.example.yaml) 的本地填写副本 | 保存订阅 URL、手工节点和链式派生关系 |
| 全局扩展脚本 | [`clash-global-residential-extend-script.js`](./clash-global-residential-extend-script.js) | 已包含公开分流和固定出口扩展，可完整复制，无需手工拼接函数 |

先备份现有全局配置与脚本，再填写 YAML 占位值，将两份内容分别粘贴到对应编辑器，保存并重新应用当前配置。YAML 不要重复定义顶层键，也不要加入 `rules` 或 `proxy-groups` 覆盖通用分流；已有私有 DNS 设置应合并保留。示例 URL 不能直接使用，HTTP provider 首次加载仍需网络可达。

原始节点沿用客户端名称，可在对应国家组直接选择；`｜链式` 副本通过 `🖥️ 美国 VPS 出口` 选择，路径为“本机 → 🛫 出国前置 → 落地节点 → 目标网站”。原始节点不经过该前置，但仍是代理出口，不是目标网站 `DIRECT`。VPS 订阅使用两份 provider：原始名称版供国家组选择，链式版通过 `override` 添加前置和名称后缀；两者使用不同缓存路径，可能各自发起更新请求。手工节点的原始条目与链式副本应同步修改账号和地址。

`🛫 出国前置` 手动选择组包含全部自动测速组、机场节点、私有原始节点及VPS 链式节点。`private-residential-*` 和兼容的 `private-ipipgo-chain` 可在固定出口组和出国前置中选择；`private-fixed-ip`、`private-vps-direct` 原始节点也保留国家选择组入口。`♻️ 出国前置自动` 仍只测速独立机场节点，默认选择保持不变，不自动选VPS 节点。机场 provider 不要使用 `private-` 前缀。四个 AI 应用组保留原有选项和默认选择，增加固定出口而不自动切换。**手动前置已取消住宅排除限制：选择本身带有 `dialer-proxy: 🛫 出国前置` 的节点会形成回环，由使用者自行避免；这些节点出现在菜单中不代表任意组合都可用。**若当前订阅已内嵌同一批节点，列表可能重复，可改用简单本地配置承载全局层。

此扩展已在本地 Mihomo v1.19.32 进行隔离加载检查；客户端保存、应用和实际服务访问仍需验证。完整私有 YAML、节点凭据及客户端完整导出不能上传公开 GitHub；可放在本人受保护的 iCloud／OneDrive 同步目录，复制到目录不等于已确认云端同步完成。公开脚本更新后需要更新这份固定出口合并脚本；仅覆盖为普通脚本会移除固定出口分组。

维护生成文件时执行 `node scripts/build-residential-script.cjs`，再运行 `node work/test-residential-global.js`。公开模板不包含真实节点或订阅。

验证基线：[Clash Verge Rev v2.5.2](https://github.com/clash-verge-rev/clash-verge-rev/releases/tag/v2.5.2)。官方扩展机制支持通过 `main(config, profileName)` 修改订阅生成的配置。

### 导入步骤

1. 在“订阅”页面导入并更新节点订阅。
2. 用浏览器打开 [`clash-goblal-extend-script.js` Raw 地址](https://raw.githubusercontent.com/wikieden/freeroad/main/clash-goblal-extend-script.js)，复制全部内容。
3. 回到“订阅”页面，打开“全局扩展脚本”。
4. 进入编辑器，用复制的内容替换原脚本并保存。
5. 更新或重新选择订阅，使扩展脚本重新执行。
6. 打开代理组，确认出现：
   - `🧠 Claude`
   - `✨ OpenAI/AI`
   - `🔷 Google/Gemini/Antigravity`
   - `🤖 其他 AI 服务`
   - `🎮 Steam`
7. 进入每个 AI 组选择国家，再在国家组内选择自动测速或具体节点；Claude、OpenAI 也可以直接选择其国家组后方的具体节点。保持 Rule 模式。

### 更新脚本

Clash Verge Rev 的全局扩展脚本是本地编辑项。仓库脚本更新后，需要重新复制 Raw 内容并保存。

参考：[Clash Verge Rev 扩展说明](https://www.clashverge.dev/guide/extend.html)、[自定义脚本说明](https://www.clashverge-cn.com/guide/script.html)。

<a id="flclash"></a>

## 第七章：FlClash

验证基线：[FlClash v0.8.96](https://github.com/chen08209/FlClash/releases/tag/v0.8.96)。FlClash 的脚本覆写会执行 `main(config)`；本仓库脚本的第二个 `name` 参数是可选的，因此可以直接使用。

### 导入步骤

1. 打开“配置/Profiles”页面。
2. 点击添加按钮，选择“URL”，导入机场提供的 Clash/Mihomo 订阅。
3. 打开该配置的 `⋮` 菜单，进入“更多”→“覆写”。
4. 将覆写模式切换为“脚本”。
5. 点击“前往配置脚本”→“添加”。
6. 在脚本编辑器中选择远程下载，填写：

   ```text
   https://raw.githubusercontent.com/wikieden/freeroad/main/clash-goblal-extend-script.js
   ```

7. 保存为 `Freeroad Global`。
8. 返回当前订阅的覆写页面，选中该脚本。
9. 点击“预览”，确认四个 AI 策略组、`🎮 Steam` 和对应规则已经生成。
10. 应用配置并重启 VPN。

### 更新脚本

更新机场订阅只会更新节点。仓库脚本变化后，还需要在脚本编辑器中重新执行远程下载，再重新应用配置。

实现依据：[FlClash JavaScript 执行入口](https://github.com/chen08209/FlClash/blob/main/lib/common/javascript.dart)、[脚本管理界面](https://github.com/chen08209/FlClash/blob/main/lib/views/config/scripts.dart)。

### 私有完整 YAML 导入（实验方案）

Clash Verge 的 `global-extension.yaml` 是合并片段，不能单独当作完整分流配置启用。需要把私有 YAML 交给配套的 `clash-global-residential-extend-script.js` 执行 `main(config)`，将返回的完整对象导出为 YAML，才会同时包含订阅、策略组和规则。导出过程应在本地完成，不要把私有内容发送到在线转换网站。

完整文件可通过 FlClash“配置”→“添加”→“文件”导入，无需另外导入同一份 JavaScript；不要再叠加会重建分组的旧脚本。机场节点仍由 `proxy-providers` 更新；分组和规则是生成时的快照，公开脚本更新后需要重新生成、导入。

固定出口链式入口应在四个 AI 分组中显示为 `🖥️ 美国 VPS 出口`，其中列出名称带 `｜链式` 的节点；`🛫 出国前置` 可手动选择全部自动分组及VPS 节点，回环由使用者自行避免；其默认的 `♻️ 出国前置自动` 仍只使用独立机场节点。完整 YAML 与全局扩展片段必须区分，不要互相覆盖。

**验证边界：** 本地合并文件已通过 Mihomo 配置校验，但 FlClash 导入后存在固定出口链式节点未显示的反馈，客户端兼容性尚未验收。遇到缺失时，应检查实际生效配置是否保留 `proxy-providers`、`🖥️ 美国 VPS 出口` 的 `use`、provider 加载状态及额外覆写；不能仅凭 YAML 校验通过就认定客户端可用。

完整私有文件含账号与订阅令牌，仅放在本地或私人 iCloud/OneDrive；公开仓库只保留通用脚本、占位模板及说明。

### 节点测速口径与最近汇总

2026-10-19（America/Los_Angeles）隔离复测覆盖 180 个缓存订阅节点。每节点做 5 次 HTTPS 探测；有响应的 163 个节点再串行下载两次、每次 1 MB。共 900 次探测，743 次成功；119 个节点探测 5/5 成功，48 个节点同时满足探测 5/5、下载 2/2 成功。下载共 326 次，133 次完整成功，部分节点出现连续超时。逐节点结果、真实参数及原始日志不公开。

- 延迟是 HTTPS 首字节耗时，不是 ICMP RTT；吞吐是短文件端到端有效速率，不是线路峰值带宽。
- 请求失败率不等于包级丢包率；未进行真实包级丢包测试，也未测试 ChatGPT/Claude 登录后对话。
- 本轮订阅刷新超时，使用本地缓存；短时测试不能证明长期稳定，也不代表订阅服务器的实时最新清单。
- 当前系统 VPN 未关闭。初轮发现系统将代理服务器域名解析为 fake-IP，已废弃该轮；隔离内核改用国内 IP 地址形式的 DoH，小样本验证通过后重新全量测试。隔离内核仍可能受到系统底层路径影响，不等同于 Shadowrocket/FlClash 原生验收。
- 结果仅描述该时段和测试目标的表现，不能直接据此认定节点永久失效、住宅 IP 属性或 AI 账号可用性。

<a id="shadowrocket"></a>

## 第八章：Shadowrocket

Shadowrocket 使用自己的 `.conf` 格式，不能导入 Clash JavaScript。

私有固定出口版与公开主配置分开保存：当前私有版的 `🛫 出国前置` 可手动选择全部自动测速组和VPS 节点，默认仍为 `♻️ 出国前置自动`；自动前置的筛选范围保持不变。手动选择依赖自身前置的节点可能形成回环，由使用者自行避免。该改动需要重新导入私有 `.conf`，仅更新此处的公开主配置不会加入私人节点或固定出口分组。私有完整配置只放入本人受保护的云盘，不上传 GitHub。

### URL 导入

1. 在首页添加或更新节点订阅。
2. 打开“配置”。
3. 点击右上角 `+`。
4. 粘贴：

   ```text
   https://raw.githubusercontent.com/wikieden/freeroad/main/shadowrocket-global.conf
   ```

5. 下载后选中该配置，并点击“使用配置”。
6. 将“全局路由”设置为“配置”。
7. 打开代理分组，分别为四个 AI 服务选择国家，再进入国家组选择自动测速或固定具体节点；也可直接选择应用组内的地区自动选项。Claude、OpenAI 另提供具体节点快捷入口。
8. 普通国外流量默认保持 `🎯 国外代理 → ♻️ 国外自动`；需要指定国家时，可进入 `🎯 国外代理` 选择国家组或 `🌐 其他国家节点`。
9. 在 `🎮 Steam` 中独立选择自动代理、地区或直连；下载和中国服务的直连规则仍优先生效。

### 应用组中的地区自动快捷选项

| 应用组 | 配置中直接引用的自动组 |
|---|---|
| `🧠 Claude`、`✨ OpenAI/AI`、`🔷 Google/Gemini/Antigravity` | 美国、台湾、日本、新加坡自动 |
| `🤖 其他 AI 服务` | 美国、台湾、日本、新加坡、欧洲自动 |
| `🎮 Steam` | 美国、台湾、日本、新加坡、香港、韩国、欧洲、其他国家自动；另保留国外自动 |

例如 `🧠 Claude → ♻️ 台湾自动` 可以直接选择台湾测速组；`🧠 Claude → 🌏 台湾节点 → 具体节点` 用于固定出口。国家组仍排在应用组的快捷选项之前，默认选择未改变。香港、韩国也采用“地区选择组 + 自动测速组”，支持自动或手动固定节点。

当前自动组配置为每 600 秒测试一次，超时 5 秒，切换容差 50 毫秒。测速地址是 `http://www.gstatic.com/generate_204`，结果反映该测试地址的连接情况，不代表 Claude、Steam 或其他应用一定可用。自动组选中的节点会被所有引用该自动组的应用共享；需要不同固定出口时，请分别选择具体节点。

### 本地文件导入

也可以下载 [`shadowrocket-global.conf`](./shadowrocket-global.conf)，通过 AirDrop、文件 App 或分享菜单交给 Shadowrocket 打开。

<a id="internal-hosts"></a>

### 本地内网 Hosts 模块模板

主配置已让本地 Host 映射对代理域名生效，并仅对 `*.local`、`*.lan`、`*.home.arpa` 使用系统解析；其他国内和代理网站仍遵循前面的 DoH 分流。仓库提供脱敏模板 [`templates/shadowrocket-internal-hosts.example.sgmodule`](./templates/shadowrocket-internal-hosts.example.sgmodule)，用于保留只应存在于个人设备上的内网域名、固定 Hosts 和内部 DNS。模板会将指定的内部域名后缀设为直连；独立模块不会随着主配置更新而被覆盖。

使用步骤：

1. 下载模板并复制为本地文件，例如 `shadowrocket-internal-hosts.local.sgmodule`。
2. 将 `internal.example`、示例主机名和 `10.0.0.10` 替换成自己的内部配置。
3. 内网使用系统 Hosts/DNS 时保留 `server:system`；使用指定内部 DNS 时改为 `server:<内部 DNS IP>`。
4. 在 Shadowrocket 中打开“配置”→“模块”→右上角 `+`，新建本地模块并粘贴修改后的内容，保存后启用。
5. 断开并重新连接 Shadowrocket，再通过连接日志或实际内部服务确认解析和直连策略生效。

`.in` 是真实的印度国家顶级域名，不能直接写入公开通用模板。只有在明确知道整个 `.in` 后缀都属于自己的本地内网时，才可以在私人副本中把 `internal.example` 替换为 `in`。

Clash Verge Rev 用户可复制 [`templates/clash-internal-dns.example.yaml`](./templates/clash-internal-dns.example.yaml)，将 `internal.example` 与占位 DNS 替换为自己的私有配置后粘贴到“全局扩展配置”。全局扩展脚本会保留任意显式的 `+.私有域名` DNS 策略；路由不由 DNS 策略自动推断，仍须在订阅“编辑规则”中用 `DOMAIN-SUFFIX,你的域名,DIRECT` 明确声明。

不要把 `rules` 写进这份全局扩展配置：部分 Clash Verge Rev 版本会整体覆盖订阅规则。为兼容既有私有 `.in` 配置，脚本仍会对 `+.in` 自动补齐 fake-IP 排除、嗅探排除和 `DOMAIN-SUFFIX,in,DIRECT`；未配置时，公开脚本不会接管公网 `.in` 域名。

系统 `/etc/hosts` 不会自动复制到 Shadowrocket，需要使用的条目应手工放入本地模块。真实内部域名、内部 DNS、固定 IP 和公司配置不得提交到公开仓库。建议把私人模块保存在仓库外的独立目录；发布或提交前运行 `git status` 确认它没有进入版本控制。

### Johnshall 黑名单过滤 + 广告规则

[Shadowrocket-ADBlock-Rules-Forever](https://github.com/Johnshall/Shadowrocket-ADBlock-Rules-Forever#%E9%BB%91%E5%90%8D%E5%8D%95%E8%BF%87%E6%BB%A4--%E5%B9%BF%E5%91%8A) 还提供一份专门面向 Shadowrocket 的“黑名单过滤 + 广告”完整配置：

- GFWList 等黑名单网站走代理。
- 未匹配网站默认直连。
- 包含广告与追踪过滤规则。
- 局域网请求直连。
- 上游项目每日自动构建更新。

导入地址：

```text
https://johnshall.github.io/Shadowrocket-ADBlock-Rules-Forever/sr_top500_banlist_ad.conf
```

该完整配置体积约 3 MB，首次下载或更新可能需要较长时间；下载过程中不要立即重复添加。

导入方法：

1. 打开 Shadowrocket 的“配置”页面。
2. 点击右上角 `+`。
3. 粘贴上面的配置地址并下载。
4. 在本地配置列表中选中它，点击“使用配置”。
5. 将“全局路由”设置为“配置”，断开并重新连接一次。

它和本仓库配置的区别：

| 配置 | 未匹配网站 | AI 国家选择组 | 广告过滤 |
|---|---|---|---|
| `shadowrocket-global.conf` | 国外代理，可选自动/国家/其他国家 | Claude、OpenAI、Google 独立组 + 其他 AI 统一组 | `AdvertisingLite` |
| Johnshall 黑名单 + 广告 | 默认直连 | 无本仓库的四个 AI 策略组 | Johnshall 聚合规则 |

Johnshall 文件是一份完整配置，不是可直接叠加到 `shadowrocket-global.conf` 的模块。建议把两份配置都下载到 Shadowrocket，按场景切换；如果选择 Johnshall 配置，本仓库的 AI 独立策略组不会生效。

### 更新配置

在“配置”页面对当前配置执行“更新配置”或重新下载。配置中的 `update-url` 已指向本仓库 Raw 地址。更新后重新选择“使用配置”并断开重连。首页“更新订阅”只更新节点；“使用配置/编译配置”更新远程规则资源，不能代替主配置的下载更新。更新配置会覆盖主文件中的本地修改，自定义 Hosts 应保存在独立本地模块中。[操作说明](https://lowertop.github.io/Shadowrocket/#更新配置)

参考：[Shadowrocket 使用手册](https://github.com/LOWERTOP/Shadowrocket/wiki/)。

<a id="clash-meta-android"></a>

## 第九章：Clash Meta for Android

验证基线：[Clash Meta for Android v2.11.33](https://github.com/MetaCubeX/ClashMetaForAndroid/releases/tag/v2.11.33)。该客户端导入完整 Clash/Mihomo YAML，不支持 FlClash 的 `main(config)` 脚本覆写。

### 为什么不能直接使用现有文件

- `shadowrocket-global.conf` 是 Shadowrocket 专用语法。
- `clash-goblal-extend-script.js` 需要宿主先载入节点订阅，再执行 JavaScript 修改配置。
- Clash Meta for Android 的高级覆写能力有限，不能等价执行该脚本并重建全部代理组与规则。

### 推荐方式：本地完整 YAML

准备一份本地 `mihomo-mobile.yaml`，在其中配置私密订阅：

```yaml
proxy-providers:
  airport:
    type: http
    url: "在本地填写机场订阅链接"
    path: ./providers/airport.yaml
    interval: 3600
    health-check:
      enable: true
      interval: 600
      url: https://www.gstatic.com/generate_204
```

代理组通过 `use: [airport]` 和 `filter` 读取节点。真实订阅 URL 相当于凭据，不能提交到公开 GitHub。

### 文件导入步骤

1. 在本地 YAML 中填写真实订阅 URL。
2. 把文件传到 Android 设备。
3. 打开“配置/Profiles”→ `+`。
4. 选择“文件/File”，选中 YAML。
5. 激活导入的配置。
6. 如果自行在完整 YAML 中复刻本仓库策略组，进入 AI 服务组选择国家，再在国家组内选择自动测速或固定节点。
7. 保持 Rule 模式并启动 VPN。

### URL 导入步骤

若完整 YAML 托管在受保护的私有地址：

1. “配置/Profiles”→ `+`→“URL”。
2. 输入完整 YAML 地址并保存。
3. 激活配置并启动 VPN。

官方还支持：

```text
clashmeta://install-config?url=<URL 编码后的完整 YAML 地址>
```

参考：[Clash Meta for Android 官方仓库](https://github.com/MetaCubeX/ClashMetaForAndroid)。

<a id="soft-router"></a>

## 软路由：RouterOS（ROS）与爱快（iKuai）

Freeroad 的分流策略可用于运行 Mihomo 的 OpenWrt／Linux 软路由。ROS（MikroTik RouterOS）或爱快作为主路由时，推荐将指定设备的流量与 DNS 接入 Mihomo 旁路由；爱快支持虚拟机的设备也可在虚拟机内运行旁路由系统。

使用的是执行 `clash-goblal-extend-script.js` 后生成的完整 YAML，不是直接把 JS 或 Shadowrocket CONF 导入主路由。当前脚本 DNS 监听 1053，部署时还需提供客户端可用的 53 端口入口，并配套配置转发、回程、IPv6 和透明代理接管。

详见 [软路由接入说明](./docs/soft-router.md)，包含完整配置准备、ROS 策略路由与 FastTrack 注意事项、爱快外置／虚拟机接入、fake-IP 路径、单设备验收及更新步骤。本文描述可行接入方式，尚未完成 ROS／爱快实机验收。

<a id="faq"></a>

## 第十章：常见问题

### Shadowrocket 的 Claude 组看不到国家自动

仓库配置已引用美、台、日、新四个自动组，但配置文本检查不等于设备界面验证。已有“Claude 内看不到国家自动”的反馈，原因尚未确认，不能直接认定为正则过滤或客户端不支持。

1. 在“配置”页确认当前启用的是 `shadowrocket-global.conf`，而非其他配置或旧副本。
2. 对该文件执行“更新配置”，再“使用配置”，断开并重连。
3. 用“编辑纯文本”查看 `[Proxy Group]` 中的 `🧠 Claude =` 行，确认包含 `♻️ 美国自动`、`♻️ 台湾自动`、`♻️ 日本自动`、`♻️ 新加坡自动`。
4. 若文件已有这些选项但界面仍未显示，记录 Shadowrocket 版本、Claude 分组截图和相关组定义，继续排查加载与解析行为；分享时去掉节点凭据、订阅地址等私密内容。

### Shadowrocket 的出国前置看不到自动组

2026-10-20 的 Mac 私有固定出口版导入测试已复现：`🛫 出国前置` 同时配置显式自动组成员和 `policy-regex-filter` 时，导入后的成员列表被正则匹配的节点替代，自动组没有保留。仅调整组定义顺序无效；仅移除父组正则后，自动组恢复显示。此结论对应本次实测环境，不代表所有版本、所有分组场景都相同。

修正版将自动组和已有节点显式写入 `🛫 出国前置`，父组不再设置正则；动态节点筛选放到独立的 `📋 全部前置节点` 子组。新加入的节点可从该子组选择；需要平铺到父菜单时须重新生成配置。Mac 已在实际生效菜单确认十个自动组可见；iPhone 仍需导入修正版并验收，不能以云盘文件更新代替手机生效确认。私人完整配置不上传 GitHub。

### 综合代理名单与未识别流量

已接入 blackmatrix7 的 `Proxy` 综合规则：Shadowrocket 使用 `Proxy_Domain.list`（DOMAIN-SET）和 `Proxy.list`（RULE-SET）；Clash/Mihomo 使用 classical 格式的 `Proxy_Classical.yaml`，provider 名为 `freeroad-proxy`，每天检查更新。它们补充现有服务规则，排在国内直连规则之后、最终兜底之前；AI、Steam 等专用规则和原有默认选择保持不变。

Proxy 是代理候选名单，不是全部国外网站，也不是实时可达性检测。未匹配流量仍沿用原来的兜底：Shadowrocket 进入 `🎯 国外代理`，Clash/FlClash 进入 `🎯 全局分流`；本次未改成名单外默认直连。Shadowrocket 的 `🎯 国外代理` 已提供可手动选择的 `DIRECT`，但它会影响进入整个分组的流量，不仅是未识别流量。规则集首次下载或后续更新依赖网络可达；导入后须确认规则集加载成功。

### AI 策略组为空

国家中文名、英文全名及 `USA` 按名称包含匹配，前后可以有线路名或编号，例如 `线路01美国`、`线路01USA`。`美国高倍01 3x 流量`、`台湾高倍家宽02 3x 流量` 等真实节点不会仅因含有“流量”被排除；“剩余流量”“套餐到期”等提示项仍会过滤。`US` 等短代码保留边界限制，以免把 Russia 等名称误分入美国。

订阅中没有名称可识别的美国、台湾、日本或新加坡节点。节点名应包含相应旗帜、国家代码或国家名称；例如 `US`/`USA`、`TW`/`TWN`、`JP`、`SG`、`美国`、`台湾`、`日本`、`新加坡`。只有欧洲节点时，前三个 AI 策略组仍无法创建。

### Claude、OpenAI 或 Google 没有进入独立组

1. 确认当前运行模式为 Rule/规则。
2. 更新订阅和远程规则集。
3. 重新应用脚本或配置。
4. 查看客户端连接日志，确认实际命中的规则和策略组。

### 使用了 GitHub 页面地址却导入失败

客户端需要 Raw 文件内容，不能使用包含网页界面的 `github.com/.../blob/...` 地址。请使用本文给出的 `raw.githubusercontent.com` 地址。

### 首次下载远程规则集失败

首次启动时网络可能还无法访问 GitHub。先临时使用一个可用节点完成规则集下载，再重新应用配置。

### 是否可以公开机场订阅链接

不可以。订阅 URL 可能允许他人下载节点并消耗账号流量，应只保存在设备本地或受保护的私有配置服务中。

## 维护验证

修改或发布配置前运行：

```bash
node --check clash-goblal-extend-script.js
node work/test-script-regressions.js
node work/test-script-providers.js
node work/test-region-names.js
node work/test-residential-global.js
node work/test-steam-routing.js
node work/test-public-sanitization.js
node work/test-shadowrocket-config.js
node work/test-shadowrocket-internal-hosts-template.js
node work/test-shadowrocket-remote-rules.js
git diff --check
```

最后一项远程规则测试需要联网，会逐个检查 HTTP 状态、非 HTML 内容以及 Shadowrocket 规则格式；日常离线编辑可以先运行其余本地测试。
