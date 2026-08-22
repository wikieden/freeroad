# Freeroad 分流配置

为不同代理客户端提供统一的分流目标：

- 局域网和国内网站直连。
- 广告与追踪请求拒绝。
- Claude、OpenAI、Google/Gemini/Antigravity 使用相互独立的美台节点组。
- 其他国外及未识别流量走代理。

> 这些文件只提供配置与分流规则，不提供代理节点。使用前需要准备兼容相应客户端的节点订阅。

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
