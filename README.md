# Freeroad 分流配置

为不同代理客户端提供统一的分流目标：

- 局域网和国内网站直连。
- 广告与追踪请求拒绝。
- Claude、OpenAI、Google/Gemini/Antigravity 使用相互独立的美台节点组。
- 其他国外及未识别流量走代理。

> 这些文件只提供配置与分流规则，不提供代理节点。使用前需要准备兼容相应客户端的节点订阅。

## 为什么使用这套配置

### 让 AI 服务保持稳定、可控的出口

Claude、OpenAI 和 Google/Gemini/Antigravity 分别使用独立策略组，不会因为普通网页、下载或流媒体的线路切换而一起改变出口。三个 AI 组只展示美国和台湾具体节点，并默认采用手动选择，适合长期固定同一节点。

这样可以减少会话过程中出口地区或 IP 频繁变化导致的重新登录、连接中断和异常验证风险。但配置不能保证账号绝对不触发风控，最终效果仍取决于节点质量、IP 信誉、账号地区和使用行为。

Clash/Mihomo 脚本还对三个 AI 组采用 UDP 失败关闭：所选 AI 节点支持 UDP 时照常按组转发；不支持时直接拒绝该 AI UDP，让应用回退到 TCP，而不是改走普通代理或直连。Shadowrocket 则通过 `udp-policy-not-supported-behaviour = REJECT` 和代理 QUIC 阻断实现同类保护。

### 国内直连，国外代理

局域网、私网和国内网站直接连接，避免国内服务绕境外代理造成延迟升高、下载变慢或本地设备无法访问。国外网站和未识别流量默认进入代理，避免新出现的国外 AI 或开发者服务因为规则尚未收录而意外直连。

### 广告与追踪过滤

Shadowrocket 配置使用维护中的广告域名集；Clash/Mihomo 脚本使用内核广告分类。广告规则只负责明确命中的广告与追踪请求，AI 核心域名规则具有更高优先级，降低认证、静态资源或遥测接口被误拦截的概率。

### 不同设备保持相同分流逻辑

电脑、Android 和 Apple 设备虽然使用不同客户端和配置格式，但都遵循相同目标：

- Claude、OpenAI、Google 使用独立美台出口。
- 国内和局域网直连。
- 其他国外流量代理。
- 广告请求拒绝。

切换设备时不需要重新理解每个客户端的规则体系，只需按本文对应章节导入。

### 订阅更新后仍保留自定义规则

Clash Verge Rev 和 FlClash 通过脚本在节点订阅加载后重建策略组与规则，机场更新节点时不需要手工修改订阅文件。Shadowrocket 使用独立配置文件和远程规则集，可以分别更新节点订阅与分流规则。

### 公开配置不包含节点凭据

仓库只保存公开分流逻辑，不保存机场订阅 URL、节点密码或私有网络配置。你可以检查全部规则，并把真实订阅凭据保留在自己的客户端或本地 YAML 中。

## 先验证三个 AI 出口

出口检测是配置完成后的关键验收步骤。Claude、OpenAI、Google/Gemini/Antigravity 使用三个相互独立的策略组，必须分别检查，不能只验证浏览器显示的普通公网 IP。

### Claude

检测地址：[Net.Coffee Claude AI IP 风险检测](https://ip.net.coffee/claude/)

1. 在 `🧠 Claude` 中固定一个美国或台湾具体节点，重新连接并保持 Rule/规则模式。
2. 打开检测页，确认“Claude AI 出口 IP”的国家与所选节点一致。
3. 同时检查 Claude 支持地区、IP 信任评分、DNS 和 WebRTC/UDP 泄露提示。
4. 实际打开 Claude 或执行一次 Claude Code 请求，再从客户端连接日志确认命中 `🧠 Claude`。

### OpenAI / ChatGPT / Codex

检测地址：[Net.Coffee ChatGPT · Codex IP 风险检测](https://ip.net.coffee/gpt/)

1. 在 `✨ OpenAI/AI` 中固定一个美国或台湾具体节点并重新连接。
2. 确认“ChatGPT 出口 IP”的国家与所选节点一致，并分别查看 `chatgpt.com` 与 `api.openai.com` 的连通性。
3. 实际打开 ChatGPT 或发起一次 Codex/API 请求，再从客户端连接日志确认命中 `✨ OpenAI/AI`。

### Google / Gemini / Antigravity

Google 官方明确要求 Google AI Studio 和 Gemini API 只能从[支持的国家和地区](https://ai.google.dev/gemini-api/docs/available-regions)访问，[服务条款](https://ai.google.dev/gemini-api/terms)也写明只能在可用地区访问。[Gemini 隐私说明](https://support.google.com/gemini/answer/13594961?hl=zh-Hans)还说明服务会使用来自设备、IP 地址以及 Google 账号家庭/工作地址的位置信息。

因此建议把 `🔷 Google/Gemini/Antigravity` 长期固定为一个支持地区的具体节点；如果 Google 账号国家是美国就固定美国节点，账号国家是台湾就固定台湾节点。不要在登录、Gemini 对话或 Antigravity 任务过程中在美国、台湾或其他国家节点之间来回切换。

验证顺序：

1. 固定 Google 组节点并重新连接，保持 Rule/规则模式。
2. 打开 [Google 搜索“what is my ip”](https://www.google.com/search?q=what+is+my+ip)；如果结果页显示公网 IP，确认其国家符合预期。
3. 分别登录 Gemini 与 Antigravity，并各完成一次真实模型请求；只能打开登录页不算验证完成。
4. 查看客户端连接日志，确认 `google.com`、`googleapis.com`、`antigravity`、`cloudcode-pa` 等连接命中 `🔷 Google/Gemini/Antigravity`。
5. 如果使用 Google 账号安全活动记录，再检查登录位置是否与固定出口国家一致。

本仓库会把 Google 登录、Gmail、Drive、Gemini、Antigravity、YouTube 等 Google 流量统一送入该策略组，避免同一账号同时从不同国家出口访问。Google 官方公开资料没有写明“出口 IP 必须与账号国家完全相同”是所有产品的统一硬性规则，因此这里将两者一致作为稳定性强建议，而不是官方保证。

### 验收标准与安全提示

- 三个策略组都必须单独固定节点、实际发起服务请求，并在客户端连接日志中命中正确分组。
- 检测结果、实际服务和客户端日志三者的出口国家应一致；任一不一致都先排查规则、IPv6、DNS 或 WebRTC 泄露。
- 第三方检测页的评分和标签只适合辅助比较节点，不代表厂商官方判定，也不能保证账号不会触发验证或风控。
- 不要在任何检测页面输入账号密码、订阅链接或节点凭据。

## 客户端官方下载

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

## 文件与客户端兼容性

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

## Clash Verge Rev

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
7. 分别选择一个美国或台湾具体节点，并保持 Rule 模式。

### 更新脚本

Clash Verge Rev 的全局扩展脚本是本地编辑项。仓库脚本更新后，需要重新复制 Raw 内容并保存。

参考：[Clash Verge Rev 扩展说明](https://www.clashverge.dev/guide/extend.html)、[自定义脚本说明](https://www.clashverge-cn.com/guide/script.html)。

## FlClash

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
9. 点击“预览”，确认三个 AI 策略组和规则已经生成。
10. 应用配置并重启 VPN。

### 更新脚本

更新机场订阅只会更新节点。仓库脚本变化后，还需要在脚本编辑器中重新执行远程下载，再重新应用配置。

实现依据：[FlClash JavaScript 执行入口](https://github.com/chen08209/FlClash/blob/main/lib/common/javascript.dart)、[脚本管理界面](https://github.com/chen08209/FlClash/blob/main/lib/views/config/scripts.dart)。

## Shadowrocket

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
7. 打开代理分组，分别为 Claude、OpenAI、Google 三组固定一个美国或台湾节点。

### 本地文件导入

也可以下载 [`shadowrocket-global.conf`](./shadowrocket-global.conf)，通过 AirDrop、文件 App 或分享菜单交给 Shadowrocket 打开。

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

| 配置 | 未匹配网站 | AI 独立美台组 | 广告过滤 |
|---|---|---|---|
| `shadowrocket-global.conf` | 国外代理 | Claude、OpenAI、Google 三个独立组 | `AdvertisingLite` |
| Johnshall 黑名单 + 广告 | 默认直连 | 无本仓库的三个独立 AI 组 | Johnshall 聚合规则 |

Johnshall 文件是一份完整配置，不是可直接叠加到 `shadowrocket-global.conf` 的模块。建议把两份配置都下载到 Shadowrocket，按场景切换；如果选择 Johnshall 配置，本仓库的 AI 独立策略组不会生效。

### 更新配置

在“配置”页面对当前配置执行更新或重新下载。配置中的 `update-url` 已指向本仓库 Raw 地址。

参考：[Shadowrocket 使用手册](https://github.com/LOWERTOP/Shadowrocket/wiki/)。

## Clash Meta for Android

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
6. 进入代理组，固定三个 AI 组的美台节点。
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

## 常见问题

### AI 策略组为空

订阅中没有名称可识别的美国或台湾节点。节点名应包含旗帜、`US`/`USA`、`TW`/`TWN`、`美国`、`台湾`、`Taiwan` 等关键词。

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
