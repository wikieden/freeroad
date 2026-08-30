// Define main function (script entry)
// ============================================================================
// Clash Verge 全局扩展脚本 —— 公开通用版 v2.3（Windows 校验兼容版）
// 引擎：Boa/QuickJS（无 fs / 无网络，仅 console）。入口 main(config, name)。
// ----------------------------------------------------------------------------
// 这是「通用层」：节点按地区归类 + DNS/防泄露 + Claude/OpenAI/Google 独立风控分流。
// 个人规则不写这里 —— 通过订阅右键菜单的「编辑规则 / 编辑代理组」维护。
//
// Clash Verge Rev 2.5.2 增强链顺序（已核实源码 enhance/mod.rs）：
//   订阅规则/代理/组 → app 生成项 → 全局扩展配置 → 全局扩展脚本(本文件)
//   → 订阅扩展配置 → 订阅扩展脚本。
// 因此「编辑规则」会先执行，而本脚本随后整体重建 rules。为保留个人规则：
//   在「编辑规则」的 append 首行放 PERSONAL_RULES_MARKER，个人规则都写在标记之后；
//   本脚本会取出标记后的规则，并在重建完成后重新放到最前面。
// ============================================================================

function main(config, name) {
  // ===================== 个人规则桥接（只保留，不定义个人规则） =====================
  const PERSONAL_RULES_MARKER = "DOMAIN,__clash_verge_personal_rules__.invalid,DIRECT";
  const incomingRules = Array.isArray(config["rules"]) ? config["rules"] : [];
  const personalMarkerIndex = incomingRules.indexOf(PERSONAL_RULES_MARKER);
  const personalRules = personalMarkerIndex >= 0 ? incomingRules.slice(personalMarkerIndex + 1) : [];

  // ---------- 1. 基础 ----------
  config["ipv6"] = false;
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["disable-keep-alive"] = false; // 使用 Mihomo 官方字段，保持 TCP Keep Alive 启用
  config["mode"] = "rule";

  // ---------- 2. DNS（fake-ip + 防泄露）----------
  config["dns"] = {
    enable: true,
    listen: "0.0.0.0:1053",
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "respect-rules": true,
    "use-hosts": true,
    "fake-ip-filter": [
      "*.lan", "*.local", "*.localhost",
      "+.ntp.org.cn", "+.pool.ntp.org",
      "+.msftconnecttest.com", "+.msftncsi.com"
    ],
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "proxy-server-nameserver": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "nameserver-policy": {
      "geosite:cn": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
      "geosite:geolocation-!cn": ["https://dns.cloudflare.com/dns-query", "https://dns.google/dns-query"]
    }
  };

  // ---------- 3. 嗅探 ----------
  config["sniffer"] = {
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": false,
    sniff: {
      HTTP: { ports: [80, "8080-8880"], "override-destination": true },
      // TLS/QUIC 必须覆写目的地址：只嗅不覆写时，内核用 SNI 匹配到了正确规则，
      // 却仍拿本机解析出的地址去连 —— 本机 DNS 被污染（明文 53 走 en0 出隧道）时，
      // 节点等于拿着 SNI=chatgpt.com 去连 Facebook/Dropbox 段，报 tls handshake eof。
      // 2026-07-30 实测：Codex websocket 因此无限重连。覆写后由内核 DNS 链重解析，免疫本机污染。
      TLS:  { ports: [443, 8443], "override-destination": true },
      QUIC: { ports: [443, 8443], "override-destination": true }
    },
    "skip-domain": ["Mijia Cloud", "+.push.apple.com", "+.apple.com"]
  };

  // ---------- 4. 清洗 + 按地区归类（加固正则，防跨订阅误配）----------
  if (!Array.isArray(config.proxies)) config.proxies = [];
  const isTip = (n) => /(流量|重置|过期|到期|套餐|官网|发布|公告|网站|网址|不懂|剩余|续费|购买|客服)/i.test(n);

  // 地区定义：中文关键词 + 词边界限定的拉丁码。
  // 词边界 \b 是关键：避免 Russia→US（含 "us"）、Fukuoka→UK（含 "uk"）、Sweden→DE 这类子串误配。
  // 顺序即展示顺序：美国排最前，也是分类优先级（多匹配取第一个）。
  // auto:true = 该区做手自一体（默认自动测速、可手动钉）。现在全部地区都开。
  // 美国、台湾地区组虽默认自动，但 AI 走单独的 ✨ OpenAI/AI 手动组，不受地区自动测速影响。
  const REGIONS = [
    { key: "🇺🇸 美国",  re: /美国|\bUSA?\b|United\s?States|America|洛杉矶|圣何塞|硅谷/i, auto: true },
    { key: "🇭🇰 香港",  re: /香港|\bHK\b|Hong\s?Kong/i, auto: true },
    { key: "🇯🇵 日本",  re: /日本|\bJP\b|Japan|东京|大阪/i, auto: true },
    { key: "🇸🇬 新加坡", re: /新加坡|狮城|\bSG\b|Singapore/i, auto: true },
    { key: "🌏 台湾",  re: /台湾|台灣|\bTW\b|Taiwan/i, auto: true },
    { key: "🇰🇷 韩国",  re: /韩国|首尔|\bKR\b|Korea/i, auto: true },
    { key: "🇪🇺 欧洲",  re: /欧洲|德国|法国|英国|荷兰|意大利|西班牙|Germany|France|Britain|Europe|\bUK\b|\bGB\b|\bDE\b|\bFR\b|\bNL\b|London|Frankfurt/i, auto: true }
  ];

  const buckets = {};
  REGIONS.forEach(r => { buckets[r.key] = []; });
  const others = [];
  const all = [];

  for (const p of config.proxies) {
    const nm = p && p.name;
    if (!nm) continue;
    if (isTip(nm)) continue;
    all.push(nm);
    let hit = null;
    for (const r of REGIONS) { if (r.re.test(nm)) { hit = r.key; break; } }
    if (hit) buckets[hit].push(nm); else others.push(nm);
  }

  // ---------- 5. 策略组（每地区一个选择组，仅在有节点时建；标 auto 的区做手自一体）----------
  const regionGroups = [];
  const autoGroups = [];
  const REGION_NAMES = [];
  REGIONS.forEach(r => {
    const nodes = buckets[r.key];
    if (nodes.length === 0) return;
    const gname = r.key + "节点";
    if (r.auto) {
      const aname = "♻️ " + r.key.split(/\s+/).pop() + "自动";
      autoGroups.push({ name: aname, type: "url-test", proxies: nodes.slice(), url: "https://www.gstatic.com/generate_204", interval: 300, tolerance: 50 });
      regionGroups.push({ name: gname, type: "select", proxies: [aname].concat(nodes) }); // 手自一体：默认自动，可手动钉
    } else {
      regionGroups.push({ name: gname, type: "select", proxies: nodes.slice() });          // 纯手动
    }
    REGION_NAMES.push(gname);
  });
  if (others.length > 0) {
    autoGroups.push({ name: "♻️ 其它自动", type: "url-test", proxies: others.slice(), url: "https://www.gstatic.com/generate_204", interval: 300, tolerance: 50 });
    regionGroups.push({ name: "🌐 其它地区", type: "select", proxies: ["♻️ 其它自动"].concat(others) }); // 手自一体
    REGION_NAMES.push("🌐 其它地区");
  }

  const globalAuto = {
    name: "♻️ 全局自动", type: "url-test",
    proxies: all.length ? all.slice() : ["DIRECT"],
    url: "https://www.gstatic.com/generate_204", interval: 300, tolerance: 50
  };

  const mainGroup = {
    name: "🎯 全局分流", type: "select",
    // 默认 ♻️全局自动（测速选最快）；DIRECT 次之；再各地区组。选地区组进去挑具体节点。
    proxies: ["♻️ 全局自动", "DIRECT"].concat(REGION_NAMES)
  };

  // OpenAI/AI：只允许美国、台湾具体节点；美国排前作为默认，台湾备用。
  // 不提供全局分流、DIRECT 或其它地区回退，避免 AI 会话悄悄换出口。
  const usNodes = buckets["🇺🇸 美国"];
  const twNodes = buckets["🌏 台湾"];
  const aiNodes = usNodes.concat(twNodes);
  if (aiNodes.length === 0) {
    throw new Error("✨ OpenAI/AI 需要至少一个美国或台湾节点；请检查订阅节点命名后重试。");
  }
  const aiGroup = {
    name: "✨ OpenAI/AI", type: "select",
    proxies: aiNodes
  };

  // Google / Gemini / Antigravity：复用美台低风控节点，并保持独立选择。
  const googleAiGroup = {
    name: "🔷 Google/Gemini/Antigravity", type: "select",
    proxies: aiNodes
  };

  // Claude / Anthropic：复用美台低风控节点，独立策略组 + 全量域名规则，最大化降低风控概率
  const claudeGroup = {
    name: "🧠 Claude", type: "select",
    proxies: aiNodes
  };

  const mediaGroup = {
    name: "🎬 国际媒体", type: "select",
    proxies: ["♻️ 全局自动", "🎯 全局分流"].concat(REGION_NAMES)
  };

  const adsGroup = { name: "🚫 广告拦截", type: "select", proxies: ["REJECT", "DIRECT"] };

  // AI 风控组优先展示；顺序仅影响界面排列，不影响 rules 的匹配优先级。
  config["proxy-groups"] = [claudeGroup, aiGroup, googleAiGroup, mainGroup, globalAuto, mediaGroup, adsGroup].concat(regionGroups).concat(autoGroups);

  // ---------- 6. 规则 ----------
  config["rules"] = [
    "GEOSITE,category-ads-all,🚫 广告拦截",

    // ========== Claude / Anthropic 全量分流（优先级最高，避免漏配触发风控）==========
    // 核心主域名
    "DOMAIN-SUFFIX,anthropic.com,🧠 Claude",
    "DOMAIN-SUFFIX,claude.ai,🧠 Claude",
    "DOMAIN-SUFFIX,claude.com,🧠 Claude",
    "DOMAIN-SUFFIX,clau.de,🧠 Claude",
    "DOMAIN-SUFFIX,claudemcpclient.com,🧠 Claude",
    "DOMAIN-SUFFIX,claudemcpcontent.com,🧠 Claude",
    "DOMAIN-SUFFIX,claudeusercontent.com,🧠 Claude",
    "DOMAIN-SUFFIX,anthropicusercontent.com,🧠 Claude",
    // 子服务精确域名
    "DOMAIN,api.anthropic.com,🧠 Claude",
    "DOMAIN,mcp.anthropic.com,🧠 Claude",
    "DOMAIN,console.anthropic.com,🧠 Claude",
    "DOMAIN,workbench.anthropic.com,🧠 Claude",
    "DOMAIN,statsig.anthropic.com,🧠 Claude",
    // CDN 静态资源
    "DOMAIN,cdn.anthropic.com,🧠 Claude",
    "DOMAIN,anthropic.com.cdn.cloudflare.net,🧠 Claude",
    "DOMAIN,servd-anthropic-website.b-cdn.net,🧠 Claude",
    // 认证与内容服务
    "DOMAIN,anthropic.auth0.com,🧠 Claude",
    "DOMAIN,anthropic-com.ghost.io,🧠 Claude",
    // 监控与遥测上报（出口IP不一致会直接触发风控）
    "DOMAIN-SUFFIX,sentry.io,🧠 Claude",
    "DOMAIN-SUFFIX,statsigapi.net,🧠 Claude",
    "DOMAIN,browser-intake-us5-datadoghq.com,🧠 Claude",
    "DOMAIN-KEYWORD,datadog,🧠 Claude",
    "DOMAIN-KEYWORD,sift,🧠 Claude",
    // 第三方客服与统计
    "DOMAIN-SUFFIX,intercom.io,🧠 Claude",
    "DOMAIN-SUFFIX,intercomcdn.com,🧠 Claude",
    "DOMAIN,cdn.usefathom.com,🧠 Claude",
    // IP 段兜底（不使用 IP-ASN，避免 Windows 首次校验依赖额外下载 ASN.mmdb）
    "IP-CIDR,160.79.104.0/21,🧠 Claude,no-resolve",
    "IP-CIDR6,2607:6bc0::/32,🧠 Claude,no-resolve",
    "GEOSITE,anthropic,🧠 Claude", // geosite 分类兜底

    // OpenAI / 其他 AI 服务（Google 系服务转入下方独立组）
    "GEOSITE,openai,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,openai.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,chatgpt.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,perplexity.ai,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,gemini.google.com,🔷 Google/Gemini/Antigravity",
    "DOMAIN-SUFFIX,generativelanguage.googleapis.com,🔷 Google/Gemini/Antigravity",
    "DOMAIN-SUFFIX,cursor.sh,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,cursor.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,huggingface.co,✨ OpenAI/AI",
    // Google AI / Antigravity 独立出口；cloudcode-pa 是 Antigravity 的后端服务域名关键词。
    "DOMAIN-KEYWORD,antigravity,🔷 Google/Gemini/Antigravity",
    "DOMAIN-KEYWORD,cloudcode-pa,🔷 Google/Gemini/Antigravity",
    "DOMAIN-KEYWORD,makersuite,🔷 Google/Gemini/Antigravity",

    // Kiro / AWS 使用普通国外代理。
    "DOMAIN-SUFFIX,desktop-release.q.us-east-1.amazonaws.com,🎯 全局分流",
    "DOMAIN-SUFFIX,kiro.dev,🎯 全局分流",
    "DOMAIN-SUFFIX,aws.dev,🎯 全局分流",
    "DOMAIN-SUFFIX,amazonaws.com,🎯 全局分流",
    "DOMAIN-SUFFIX,awsapps.com,🎯 全局分流",

    // 社交 / 媒体（折叠，无独立组）
    "GEOSITE,telegram,🎯 全局分流",
    "GEOSITE,discord,🎯 全局分流",
    "GEOIP,telegram,🎯 全局分流,no-resolve",
    "GEOSITE,netflix,🎬 国际媒体",
    "GEOSITE,disney,🎬 国际媒体",
    "GEOSITE,youtube,🔷 Google/Gemini/Antigravity",
    // 非通用服务的个人偏好统一放到订阅右键的「编辑规则 / 编辑代理组」中维护。
    // 通用核不包含任何个人服务规则，未单独配置的流量继续进入下方通用兜底。

    // GitHub（微软旗下；国内直连常被墙/限速）→ 走代理。
    // 必须排在 GEOSITE,microsoft 之前：否则 github 域名被 microsoft 直连规则吃掉。
    "GEOSITE,github,🎯 全局分流",
    "DOMAIN-SUFFIX,github.com,🎯 全局分流",
    "DOMAIN-SUFFIX,githubusercontent.com,🎯 全局分流",
    "DOMAIN-SUFFIX,githubassets.com,🎯 全局分流",
    "DOMAIN-SUFFIX,github.io,🎯 全局分流",
    "DOMAIN-SUFFIX,ghcr.io,🎯 全局分流",
    "DOMAIN-SUFFIX,githubcopilot.com,🎯 全局分流",

    // 厂商规则（Google 使用独立组，Apple 直连）
    "GEOSITE,google,🔷 Google/Gemini/Antigravity",
    "GEOSITE,apple,DIRECT",
    // 微软：国内可达的服务（@cn：dynamics.cn / lync.cn / microsoftonline-m.cn 等）直连，
    // 其余（海外）微软走代理 —— 海外 IP 一律走全局分流。@cn 必须排在 microsoft 前。
    "GEOSITE,microsoft@cn,DIRECT",
    // Windows Update / 分发优化：巨型系统下载，国内直连快，绕代理只会更慢更烧流量 → 直连
    "DOMAIN-SUFFIX,windowsupdate.com,DIRECT",
    "DOMAIN-SUFFIX,update.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,delivery.mp.microsoft.com,DIRECT",
    "DOMAIN-SUFFIX,do.dsp.mp.microsoft.com,DIRECT",
    "GEOSITE,microsoft,🎯 全局分流",

    // NTP 时间同步：统一走代理出口，避免时区与代理地区不一致触发隐蔽风控
    "GEOSITE,category-ntp,🎯 全局分流",

    // 兜底
    "GEOIP,lan,DIRECT,no-resolve",
    "GEOSITE,geolocation-!cn,🎯 全局分流",
    "GEOSITE,cn,DIRECT",
    "GEOIP,cn,DIRECT",
    "MATCH,🎯 全局分流"
  ];

  // ---------- 6.1 个人规则 + 私网直连规则（插到最前，优先级最高）----------
  // 2.5.2 会先应用订阅「编辑规则」，再执行全局脚本。个人规则使用 append 标记协议，
  // 由脚本在入口处暂存，并在此处重新插到最终规则最前；个人规则内容始终留在订阅规则文件中。
  // RFC1918 私网段 → DIRECT + no-resolve。
  const universalRules = [
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve"
  ].concat(config["rules"]);
  config["rules"] = [PERSONAL_RULES_MARKER].concat(personalRules, universalRules)
    .filter((rule, index, rules) => rules.indexOf(rule) === index);

  return config;
}
