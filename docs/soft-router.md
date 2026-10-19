# Freeroad 软路由接入：RouterOS（ROS）与爱快（iKuai）

Freeroad 的应用分组和域名规则可以在运行 Mihomo 的软路由上使用。本文的 ROS 指 MikroTik RouterOS。推荐由 ROS／爱快负责拨号、DHCP 和主路由，由 OpenWrt 或 Linux 旁路由运行 Mihomo，执行 Claude、OpenAI、Google、其他 AI 和 Steam 分流。

仓库的 `clash-goblal-extend-script.js` 是配置生成脚本，需要宿主调用 `main(config, name)`；Mihomo 内核读取的是生成后的完整 YAML，不会自动执行该 JS。`shadowrocket-global.conf` 只用于 Shadowrocket，不能当作 ROS／爱快或 Mihomo 配置导入。

本文提供接入方案与验证步骤；仓库的本地测试验证了分组生成和规则行为，尚未完成 ROS／爱快实机部署验收。具体菜单和透明代理实现取决于系统版本、硬件及所用插件。

## 部署方式

| 方式 | 使用条件 | Freeroad 在哪里执行 |
|---|---|---|
| ROS／爱快主路由 + 外置 OpenWrt／Linux 旁路由 | 主路由可将指定设备流量送往旁路由 | 旁路由的 Mihomo |
| 爱快主路由 + OpenWrt／Linux 虚拟机 | 设备、固件支持虚拟机，网卡与资源配置正确 | 虚拟机内的 Mihomo |
| RouterOS 容器方案 | RouterOS 支持容器且设备模式、架构、存储满足要求 | 容器中的兼容运行环境；须单独验证流量接管 |

初次使用优先选择外置旁路由；爱快虚拟机是可选的同机部署方式。RouterOS 的容器功能不等于已支持本文的 TUN／透明代理方案，不提供未经验证的容器一键部署命令。[RouterOS 容器说明](https://help.mikrotik.com/docs/spaces/ROS/pages/84901929/Container)、[爱快虚拟机说明](https://www.ikuai8.com/support/ymgn/lyym/2019-12-13-06-35-05/2019-05-13-02-02-08.html)

## 准备完整 Mihomo 配置

1. 在私有配置中准备节点或 `proxy-providers`，保留订阅凭据在本地。节点名称要能识别国家或地区。
2. 使用支持脚本覆写的宿主执行最新版 [`clash-goblal-extend-script.js`](../clash-goblal-extend-script.js)。例如在 Clash Verge Rev 应用全局脚本后，取出实际运行的完整配置；不要只复制原始订阅。
3. 确认生成文件含 `proxies` 或 `proxy-providers`、`proxy-groups`、`rules`、`dns` 等必要字段。Provider-only 配置也受支持，但远程节点是否下载成功仍需在运行环境检查。
4. 将完整 YAML 放入旁路由 Mihomo 的配置目录。按旁路由宿主要求配置 TUN／TProxy／redir 入站、网络接口和防火墙接管；桌面端导出的接口名、监听地址、控制端口和文件路径不能直接照搬。
5. 在目标机器运行 `mihomo -t -f /实际路径/config.yaml` 验证内核是否接受配置，再由服务管理器或插件加载。

若使用 OpenWrt 插件，先确认所选内核是 Mihomo，且支持生成配置中的 GeoSite、逻辑规则和 provider 字段。插件自身可能重建 DNS、分组或规则，需查看最终运行配置，避免覆盖 Freeroad 的应用分流。单纯把 JS 放入插件目录不会自动生效。

完整配置还涉及部署环境的监听端口、TUN 权限、转发、NAT 和插件管理机制；本仓库脚本只生成通用分流层，不自动完成这些主机设置。[Mihomo TUN 配置说明](https://wiki.metacubex.one/config/inbound/tun/)

## 先用一台设备接入

以下地址仅为示例，部署时替换为实际网段：

| 角色 | 示例地址 | 用途 |
|---|---|---|
| ROS／爱快主路由 | `192.168.50.1` | 拨号、DHCP、上游出口 |
| Mihomo 旁路由 | `192.168.50.2` | DNS 和应用分流 |
| 测试客户端 | `192.168.50.100` | 首批验证设备 |

最容易验证的接入方式是将测试客户端的 IPv4 网关设为旁路由，DNS 指向旁路由提供的 DNS 服务；旁路由自己的默认网关仍为主路由。旁路由须具备 LAN 流量接管、IP 转发和正确的回程路由／NAT，而不是只启动一个 SOCKS 或 HTTP 监听端口。

流量路径为：客户端 → Mihomo 旁路由 → 直连或所选代理 → 主路由上网。国内、局域网和 Steam 直连下载仍经过旁路由判定，`DIRECT` 表示不使用代理出口，并不表示绕过旁路由。

Mihomo 脚本当前 DNS 监听为 `0.0.0.0:1053`。DHCP 下发的 DNS 地址不携带端口，不能只下发旁路由 IP 就认为客户端会访问 1053：必须由旁路由在 TCP／UDP 53 提供转发到 Mihomo 1053 的服务，或在最终运行配置中明确改为可用的 53 端口。确认没有与 dnsmasq 等现有服务争用端口。

当前配置使用 fake-IP（`198.18.0.1/16`）。收到 fake-IP 的客户端，其数据流量必须进入维护该映射的同一个 Mihomo 实例；不能将 DNS 指向旁路由、数据却仍从主路由直出，也不能把 `198.18.0.0/15` 当作普通内网旁路。

## RouterOS（ROS）主路由

可先按上一节修改单个测试客户端的网关和 DNS；验证通过后，再考虑用 RouterOS 的策略路由按源地址或 VLAN 将指定设备导向旁路由。RouterOS 支持独立路由表和路由规则，但版本、现有 mangle 与路由优先级会影响实际结果。[RouterOS 策略路由说明](https://help.mikrotik.com/docs/spaces/ROS/pages/59965508/Policy%2BRouting)

配置主路由策略时应满足以下条件：

- 管理地址、直连网段及路由器自身所需流量保留正确的本地路径。
- 旁路由自身发出的流量使用主路由原出口，不再被送回旁路由；按测试客户端源地址限定规则更容易避免回环。
- 使用非 main 路由表的连接需要排除 FastTrack。RouterOS 官方说明 FastTrack 只适用于 main 表，否则可能绕过预期的策略路由。[官方 Packet Flow 说明](https://help.mikrotik.com/docs/spaces/ROS/pages/328227/Packet%2BFlow%2Bin%2BRouterOS)
- DNS 与数据流量一起接入旁路由；不能只转发代理端口或 DNS 就期待全网透明分流。

本文不将 AI 域名表转为 RouterOS 静态 IP 地址列表。CDN、动态解析与共享 IP 会使这种转换偏离 Freeroad 的域名策略；应用归属仍交给 Mihomo。

## 爱快（iKuai）主路由

外置旁路由接入方法与上一节一致。使用爱快虚拟机时，在具备相关功能的设备上安装 OpenWrt／Linux，将虚拟网卡接入需要服务的 LAN／VLAN，给虚拟机固定地址，并在虚拟机内运行 Mihomo。虚拟机资源、网卡类型及自启能力应按实际爱快版本核对。[爱快虚拟机文档](https://www.ikuai8.com/support/ymgn/lyym/2019-12-13-06-35-05/2019-05-13-02-02-08.html)

先仅修改测试设备的网关和 DNS。需要保持客户端网关为爱快时，再使用当前版本支持的下一跳／策略路由功能，将指定设备或 VLAN 导向旁路由；不要把“端口分流”中的 WAN 出口选择默认理解为 LAN 下一跳配置。具体菜单和字段需要现场确认。

旁路由自身应从爱快正常出网，避免被相同策略再次送回自己。若旁路由采用不同子网或双网卡布局，还需配置回程路由／NAT；爱快官方的路由模式说明也要求为下级网段建立正确静态路由。[爱快 NAT 与路由模式说明](https://www.ikuai8.com/support/cjwt/xs/nat.html)

## DNS、IPv6 与出口选择

- 当前脚本关闭 Mihomo 的 IPv6，但这不会关闭主路由发出的 IPv6 RA 或客户端自己的 IPv6。测试设备若仍有 IPv6 直出路径，需要在对应测试网段禁用该路径，或另行完整配置 IPv6 接管后验证。
- 浏览器／应用自带 DoH 不会因为 DHCP DNS 设置而自动改用 Mihomo DNS；检查测试设备的实际解析路径。
- 节点引导解析保留国内 AliDNS／DNSPod DoH，国内域名用国内 DoH，境外域名的 DNS 连接按 Mihomo 规则转发。不要让上游路由把这些连接再次送回同一个代理链。
- 用受保护的 Mihomo 控制面板选择 AI 国家组或具体节点；控制端口只向需要管理的 LAN 开放，启用访问认证。
- Shadowrocket 的应用组地区自动快捷入口属于其 CONF 配置；软路由使用 Mihomo 脚本生成的国家组，进入国家组后选择自动测速或固定节点。
- 同一 Mihomo 实例的应用组选择会影响所有使用该实例的设备。若不同设备需要不同出口，应另行设计源地址规则或独立实例。

## 验收与更新

1. 完整 YAML 通过目标机器的 `mihomo -t`，provider、Geo 数据可下载，分组非空。
2. 仅接入一台测试设备，确认主路由和旁路由管理页面、本地设备、国内网站正常。
3. 实际访问 Claude、OpenAI、Google 和其他 AI，日志分别命中对应应用组，出口与选择一致。
4. Steam 商店／社区命中 `🎮 Steam`，明确的下载 CDN 命中 `DIRECT`；不据此推断所有下载都直连。
5. 验证 DNS、IPv6、UDP 路径和路由无回环，再扩展到其他设备。测试旁路由服务停止时的行为，并按实际需求设置故障回退。
6. 本文方案尚无 ROS／爱快实机验收记录；记录系统版本、最终拓扑和日志后，才能确认具体部署可用。

更新订阅只更新 provider 节点，不会自动更新本仓库的 JS 规则。Freeroad 更新后，重新执行脚本生成完整 YAML，保留旁路由专用的入站、接口和防火墙设置，通过配置检查后重载。完整 YAML、控制面板密码和订阅地址均只保存在私有环境。
