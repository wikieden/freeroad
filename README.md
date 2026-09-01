# Freeroad 分流配置：Shadowrocket / FlClash / Clash Verge Rev 多平台 AI 分流策略方案

Freeroad 面向 Shadowrocket、FlClash、Clash Verge Rev 等多平台代理工具，为 Claude、OpenAI、Google/Gemini/Antigravity 和其他 AI 服务提供独立出口、国家节点选择、DNS 防泄漏与安全检测方案。

只使用代理服务商自带的默认分流策略通常远远不够。AI 服务的登录、API、静态资源和遥测请求可能落到不同出口，DNS、UDP 或 WebRTC 泄漏也会影响账号稳定性与检测结果。不信可以先打开 [Net.Coffee Claude AI IP 风险检测](https://ip.net.coffee/claude/) 看一下当前出口评分，再决定是否需要独立的 AI 分流策略。

这套方案会把 AI 出口、DNS、UDP 回落和客户端差异显式管理，帮助减少常见安全评分扣分项。在节点质量、IP 信誉和客户端环境正确时，检测结果可以达到高分甚至满分，但不承诺所有节点、网络和账号都必然满分。

为不同代理客户端提供统一的分流目标：

- 局域网和国内网站直连。
- 广告与追踪请求拒绝。
- Claude、OpenAI、Google/Gemini/Antigravity 使用相互独立的国家选择组。
- Perplexity、Cursor、Hugging Face、Grok、Kiro 等境外 AI 统一进入 `🤖 其他 AI 服务`。
- 其他国外及未识别流量走代理。

> 这些文件只提供配置与分流规则，不提供代理节点。使用前需要准备兼容相应客户端的节点订阅。

## 快速导航

- [第一章：方案优势与核心能力](#overview)
- [AI 服务分流策略](#ai-routing)
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
- [第十章：常见问题](#faq)

## 一分钟选择客户端

| 设备或客户端 | 使用文件 | 适合场景 |
|---|---|---|
| Windows、macOS、Linux / Clash Verge Rev | [`clash-goblal-extend-script.js`](./clash-goblal-extend-script.js) | 已有 Clash/Mihomo 节点订阅，希望通过全局扩展脚本自动重建 AI 分组和规则 |
| Android、Windows、macOS、Linux / FlClash | [`clash-goblal-extend-script.js`](./clash-goblal-extend-script.js) | 使用 FlClash 脚本覆写，希望订阅更新后继续保留统一分流策略 |
| iPhone、iPad、Mac、Apple TV / Shadowrocket | [`shadowrocket-global.conf`](./shadowrocket-global.conf) | 需要可直接导入的完整配置、国家节点组、DoH 和广告过滤 |
| Android / Clash Meta for Android | 自建完整 Clash/Mihomo YAML | 需要在本地 YAML 中配置私密 `proxy-providers`，不能直接导入本仓库 JS/CONF |

<a id="overview"></a>

## 第一章：方案优势与核心能力

<a id="ai-routing"></a>

### 让 AI 服务保持稳定、可控的出口

Claude、OpenAI 和 Google/Gemini/Antigravity 分别使用独立策略组；其余境外 AI 使用第四个统一策略组。选择路径统一为 `AI 服务组 → 国家节点组 → 自动测速/具体节点`，不会因为普通网页、下载或流媒体线路切换而跨国家改变出口。

前三个 AI 组提供美国、台湾、日本、新加坡；`🤖 其他 AI 服务` 额外提供欧洲。进入国家组后默认使用该国家的自动测速，也可以固定一个具体节点。自动测速只在同一国家内部进行，但仍可能更换出口 IP；账号稳定性优先时应改选具体节点。

为了减少常用服务的选择步骤，`🧠 Claude` 和 `✨ OpenAI/AI` 会在四个国家组之后，再直接列出美、台、日、新具体节点。国家组仍排在前面，所以默认行为不变；Google 和其他 AI 继续只显示国家组，避免列表过长。

这样可以减少会话过程中出口地区或 IP 频繁变化导致的重新登录、连接中断和异常验证风险。但配置不能保证账号绝对不触发风控，最终效果仍取决于节点质量、IP 信誉、账号地区和使用行为。

Clash/Mihomo 脚本还对四个 AI 组采用 UDP 失败关闭：所选 AI 节点支持 UDP 时照常按组转发；不支持时直接拒绝该 AI UDP，让应用回退到 TCP，而不是改走普通代理或直连。Shadowrocket 则通过 `udp-policy-not-supported-behaviour = REJECT` 和代理 QUIC 阻断实现同类保护。

服务归属如下：

| 策略组 | 主要范围 | 可选国家组 |
|---|---|---|
| `🧠 Claude` | Claude、Anthropic API 与一方资源 | 美国、台湾、日本、新加坡 |
| `✨ OpenAI/AI` | ChatGPT、OpenAI API、Codex 与一方资源 | 美国、台湾、日本、新加坡 |
| `🔷 Google/Gemini/Antigravity` | Google 登录和全家桶、Gemini、Antigravity、YouTube | 美国、台湾、日本、新加坡 |
| `🤖 其他 AI 服务` | Perplexity、Cursor、Hugging Face、xAI/Grok、Kiro、Mistral、Poe、Cohere、OpenRouter 等境外 AI | 美国、台湾、日本、新加坡、欧洲 |

Clash/Mihomo 使用维护中的 `GEOSITE,category-ai-!cn` 自动补充新出现的境外 AI 域名，三大独立组的规则排在它前面，因此不会被统一组抢走。Shadowrocket 不支持同等的 GeoSite 分类，配置中改用一方域名和明确专属端点，避免旧规则集把整站 Sentry、Intercom、Stripe、Auth0 等共享服务错误绑定到某个 AI 出口。国内 AI 不进入该统一组，仍按国内直连规则处理。

### 国内直连，国外代理

局域网、私网和国内网站直接连接，避免国内服务绕境外代理造成延迟升高、下载变慢或本地设备无法访问。国外网站和未识别流量默认进入代理，避免新出现的国外 AI 或开发者服务因为规则尚未收录而意外直连。

Shadowrocket 的 `🎯 国外代理` 默认使用 `♻️ 国外自动`，也可以手动进入美国、台湾、香港、日本、新加坡、韩国、欧洲或 `🌐 其他国家节点`。其他国家组会排除中国、回国、套餐提示和已单独分类的国家，并提供自动测速与具体节点选择。

<a id="dns-security"></a>

### DNS 与安全防护：Shadowrocket 优先使用加密 DoH

Shadowrocket 配置的所有解析路径都只使用 HTTPS DoH，并关闭系统 DNS 参与。DoH 使用通过 TLS 校验的 IP 端点，避免解析 DoH 服务域名时再次依赖引导 DNS。所有硬编码到 UDP/TCP 53 端口的明文 DNS 请求会被接管。直连和节点引导 DoH 使用 `#no-h3`；代理 DoH 使用 Shadowrocket 官方的 `#proxy` 写法，并由 `block-quic = all-proxy` 阻止代理 QUIC 回落。

国内直连域名只使用国内加密 DoH，以保留国内 CDN 和局域网使用体验；代理类域名由 Shadowrocket 按实际代理规则交给代理节点远程解析。默认与备用 DNS 使用 Cloudflare/Google 境外 DoH，并通过默认代理转发，不接触国内解析器。

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

公共 Raw 地址：

```text
https://raw.githubusercontent.com/wikieden/freeroad/main/clash-goblal-extend-script.js
https://raw.githubusercontent.com/wikieden/freeroad/main/shadowrocket-global.conf
```

<a id="clash-verge-rev"></a>

## 第六章：Clash Verge Rev

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
9. 点击“预览”，确认四个 AI 策略组和规则已经生成。
10. 应用配置并重启 VPN。

### 更新脚本

更新机场订阅只会更新节点。仓库脚本变化后，还需要在脚本编辑器中重新执行远程下载，再重新应用配置。

实现依据：[FlClash JavaScript 执行入口](https://github.com/chen08209/FlClash/blob/main/lib/common/javascript.dart)、[脚本管理界面](https://github.com/chen08209/FlClash/blob/main/lib/views/config/scripts.dart)。

<a id="shadowrocket"></a>

## 第八章：Shadowrocket

Shadowrocket 使用自己的 `.conf` 格式，不能导入 Clash JavaScript。

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
7. 打开代理分组，分别为四个 AI 服务选择国家，再进入国家组选择自动测速或固定具体节点；Claude、OpenAI 也提供具体节点快捷入口。
8. 普通国外流量默认保持 `🎯 国外代理 → ♻️ 国外自动`；需要指定国家时，可进入 `🎯 国外代理` 选择国家组或 `🌐 其他国家节点`。

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

在“配置”页面对当前配置执行更新或重新下载。配置中的 `update-url` 已指向本仓库 Raw 地址。更新后需要重新选择“使用配置”并断开重连；自定义 Hosts 应保存在独立本地模块中。

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

<a id="faq"></a>

## 第十章：常见问题

### AI 策略组为空

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
node work/test-public-sanitization.js
node work/test-shadowrocket-config.js
node work/test-shadowrocket-internal-hosts-template.js
node work/test-shadowrocket-remote-rules.js
git diff --check
```

最后一项远程规则测试需要联网，会逐个检查 HTTP 状态、非 HTML 内容以及 Shadowrocket 规则格式；日常离线编辑可以先运行其余本地测试。
