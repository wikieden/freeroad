# OpenClash 公开版

使用仓库根目录的 [`openclash-public.yaml`](../openclash-public.yaml)。这是从公共分流脚本生成的独立完整 YAML，不依赖 Clash Verge 或 FlClash 的 JavaScript 扩展。包含国家自动、国家全部节点、四个 AI 分组、Steam、广告过滤、国内直连和独立的未识别流量组。

**它是公开起始模板，不提供免费节点。** 不包含私人订阅、固定出口、公司 DNS、住宅或 VPS 账号。不能把它当作已完成软路由部署的配置。

## 使用前修改

1. 下载 YAML，在本地修改 `proxy-providers.airport.url`，填入自己的 Clash/Mihomo 格式订阅。订阅必须返回含 `proxies` 的 YAML；仅 Base64 链接列表不适用。
2. 修改 `secret: CHANGE_ME_BEFORE_USE` 为自己的控制面板密码；不要提交或公开分享填写后的文件。
3. 有多个订阅时，可复制 `airport` provider，使用不同名称及独立缓存 `path`；还需把新名称加入使用订阅的分组 `use`。更推荐在本机调整 `templates/openclash-providers.example.yaml` 后重新生成，避免漏改引用。修改后的私有模板也不能提交 GitHub。

未替换订阅时无法提供代理服务。配置中的国家组无匹配节点时拒绝使用，不会自动回退到直连。最终未识别流量默认沿用全局分流，可在独立组中选择 DIRECT。

## 在 OpenClash 导入

1. 备份路由器现有 OpenClash 配置；不要直接替换正在使用的配置。
2. 在“服务 → OpenClash”的配置文件管理中上传本地改好的完整 YAML，然后选择使用。
3. 使用支持本配置字段的 Meta/Mihomo 内核；选择 Rule/规则代理模式。DNS 模式选择 Fake-IP，与本文件一致。
4. 由 OpenClash 设置 Redir/TProxy/TUN 等流量接管、DNS 转发及防火墙。模板未启用独立的 TUN 自动路由，避免与插件重复接管。初次使用不叠加其他规则模板或分组重建，确认最终运行配置保留 Freeroad 分组。
5. DNS 初期保留文件中的阿里/腾讯 DoH、境外 DNS 策略和 `respect-rules`，避免额外追加 WAN DNS 或覆盖 Nameserver-Policy。插件可以按实际环境覆写监听地址和端口。
6. 启动后检查日志：provider 下载成功、国家组非空、规则及 Geo 数据加载正常。菜单名称和具体接管设置以安装的 OpenClash 版本为准。

当前 OpenClash 支持完整配置上传，以及运行模式、端口、DNS 和覆写设置；参见[官方项目说明](https://github.com/vernesong/OpenClash)和[官方覆写配置项](https://github.com/vernesong/OpenClash/blob/master/luci-app-openclash/root/etc/openclash/overwrite/default)。

## 路由器字段

模板提供以下起始值，OpenClash 可能在最终配置中覆写它们：

| 字段 | 起始值 | 注意 |
|---|---|---|
| `mixed-port` | `7890` | 局域网 HTTP/SOCKS 代理入口 |
| `redir-port` | `7892` | 由插件配套设置流量接管 |
| `tproxy-port` | `7893` | 需要插件、防火墙和路由支持 |
| `allow-lan` | `true` | `lan-allowed-ips` 限制为常见私有/本地网段；其他 LAN 网段须自行补充 |
| `external-controller` | `127.0.0.1:9090` | 默认不直接对 LAN/WAN 暴露控制接口；用插件面板管理 |
| `secret` | `CHANGE_ME_BEFORE_USE` | 必须在本地替换；插件若覆写管理口和密码，以最终值为准 |
| `dns.listen` | `127.0.0.1:7874` | dnsmasq/插件须转发到实际 DNS 监听，不应在客户端填写带端口 DNS |
| `find-process-mode` | `off` | 路由器不按本机进程区分 LAN 应用 |

不要将代理端口或控制面板映射到 WAN。`allow-lan` 和监听端口不等于已经建立透明代理；必须检查 OpenClash 的实际防火墙与 DNS 接管。启用 Fake-IP 后，客户端 DNS 与数据流量须进入同一个实例。仅关闭 YAML 的 IPv6 不会自动关闭主路由/客户端的 IPv6 直出路径。

主路由与旁路由拓扑不同。旁路由初次只接入一台测试设备，并正确设置网关与 DNS；详见[软路由接入说明](./soft-router.md)。

## 验收与更新

- 在控制面板中检查 `♻️ 国家自动` 与 `国家图标 国家全部节点`；不再有“国家节点”中间父组。
- 国内和局域网流量命中 DIRECT；Claude、OpenAI、Google 和其他 AI 分别命中独立应用组；未识别流量命中 `❓ 未识别流量`。
- 公开版没有 `🛫 出国前置`、`🖥️ 美国 VPS 出口` 或私人链式节点。需要链式时应单独构建私有包，不可用公开占位订阅冒充可用出口。
- HTTP provider 每小时更新节点，**不会自动更新本 YAML 的分流逻辑**。公共规则更新后重新下载新版 YAML，再在本地填入订阅与密码并重新应用，或在本机按下方步骤重新生成。
- 当前仅完成本地生成、规则一致性和 Mihomo 配置校验；尚无此公开文件在目标 OpenWrt/OpenClash 设备上的实机验收。重载、重启及 DNS/UDP/IPv6 路径需要现场验证。

## 从公共规则重新生成

本仓库生成工具需要 Node.js 和 Ruby。OpenClash 本身不需要安装这些生成工具。

```sh
node scripts/sync-europe-pattern.cjs
node scripts/sync-country-patterns.cjs
node scripts/build-residential-script.cjs
node scripts/build-openclash-config.cjs
node work/test-openclash-public.js
```

使用 `node scripts/build-openclash-config.cjs --check` 检查已提交的公开 YAML 是否与当前公共源一致。生成器只读取公共文件，不读取私有配置或本机客户端数据库。
