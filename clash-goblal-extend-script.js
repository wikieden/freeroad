// Define main function (script entry)
// ============================================================================
// Clash Verge 全局扩展脚本 —— 公开通用版 v2.6（AI 服务分组版）
// 引擎：Boa/QuickJS（无 fs / 无网络，仅 console）。入口 main(config, name)。
// ----------------------------------------------------------------------------
// 这是「通用层」：节点按地区归类 + DNS/防泄露 + 三大 AI 独立组 + 其他 AI 统一组。
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
  const incomingDnsPolicy = config["dns"] && config["dns"]["nameserver-policy"];
  const incomingInDns = incomingDnsPolicy && incomingDnsPolicy["+.in"];
  const internalInDns = Array.isArray(incomingInDns)
    ? incomingInDns.filter((server) => typeof server === "string" && server.trim())
    : [];
  const hasInternalInDns = internalInDns.length > 0;

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
    "default-nameserver": ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"],
    nameserver: ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"],
    "proxy-server-nameserver": ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"],
    "nameserver-policy": {
      "geosite:cn": ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"],
      "geosite:geolocation-!cn": ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query"]
    }
  };
  if (hasInternalInDns) {
    config["dns"]["fake-ip-filter"].push("+.in");
    config["dns"]["nameserver-policy"]["+.in"] = internalInDns.slice();
  }

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
  if (hasInternalInDns) config["sniffer"]["skip-domain"].push("+.in");

  // ---------- 4. 清洗 + 按地区归类（加固正则，防跨订阅误配）----------
  if (!Array.isArray(config.proxies)) config.proxies = [];
  const isTip = (n) => /(流量|重置|过期|到期|套餐|官网|发布|公告|网站|网址|不懂|剩余|续费|购买|客服)/i.test(n);

  // 地区定义：中文关键词 + 词边界限定的拉丁码。
  // 词边界 \b 是关键：避免 Russia→US（含 "us"）、Fukuoka→UK（含 "uk"）、Sweden→DE 这类子串误配。
  // 顺序即展示顺序：美国排最前，也是分类优先级（多匹配取第一个）。
  // auto:true = 该区做手自一体（默认自动测速、可手动钉）。现在全部地区都开。
  // AI 策略组先选择国家组，再由国家组选择自动测速或具体节点；自动测速不会跨国家。
  const REGIONS = [
    { key: "🇺🇸 美国",  re: /美国|\bUSA?\b|United\s?States|America|洛杉矶|圣何塞|硅谷|Seattle|New\s?York|Dallas|Chicago|Phoenix|西雅图|纽约|芝加哥|达拉斯|凤凰城/i, auto: true },
    { key: "🇭🇰 香港",  re: /香港|\bHK\b|Hong\s?Kong/i, auto: true },
    { key: "🇯🇵 日本",  re: /日本|\bJP\b|Japan|东京|大阪|Fukuoka|Nagoya|福冈|福岡|名古屋/i, auto: true },
    { key: "🇸🇬 新加坡", re: /新加坡|狮城|\bSG\b|Singapore/i, auto: true },
    { key: "🌏 台湾",  re: /台湾|台灣|\bTW\b|Taiwan|Taipei|Taichung|Kaohsiung|台北|台中|高雄|新北/i, auto: true },
    { key: "🇰🇷 韩国",  re: /韩国|首尔|\bKR\b|Korea/i, auto: true },
    { key: "🇪🇺 欧洲",  re: /欧洲|德国|法国|英国|荷兰|意大利|西班牙|Germany|France|Britain|Europe|Italy|Spain|\bUK\b|\bGB\b|\bDE\b|\bFR\b|\bNL\b|\bIT\b|\bES\b|London|Frankfurt|Milan|Madrid|Rome|米兰|米蘭|马德里|馬德里|罗马|羅馬/i, auto: true }
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

  // 三大 AI 组引用美、台、日、新国家组；Claude/OpenAI 再追加同范围具体节点快捷入口。
  // 其它 AI 在国家组范围上增加欧洲。自动测速始终限制在已选择的国家内部。
  const existingRegionGroup = (key) => buckets[key].length > 0 ? key + "节点" : null;
  const majorAiRegionKeys = ["🇺🇸 美国", "🌏 台湾", "🇯🇵 日本", "🇸🇬 新加坡"];
  const majorAiRegionGroups = majorAiRegionKeys
    .map(existingRegionGroup)
    .filter(Boolean);
  const majorAiDirectNodes = majorAiRegionKeys
    .reduce((nodes, key) => nodes.concat(buckets[key]), []);
  const quickAiProxies = majorAiRegionGroups.concat(majorAiDirectNodes);
  const europeRegionGroup = existingRegionGroup("🇪🇺 欧洲");
  const otherAiRegionGroups = majorAiRegionGroups.concat(europeRegionGroup ? [europeRegionGroup] : []);
  if (majorAiRegionGroups.length === 0) {
    throw new Error("AI 策略组需要至少一个美国、台湾、日本或新加坡节点；请检查订阅节点命名后重试。");
  }
  const aiGroup = {
    name: "✨ OpenAI/AI", type: "select",
    proxies: quickAiProxies
  };

  // Google / Gemini / Antigravity：独立选择国家组，避免与其它 AI 联动。
  const googleAiGroup = {
    name: "🔷 Google/Gemini/Antigravity", type: "select",
    proxies: majorAiRegionGroups
  };

  // Claude / Anthropic：独立策略组 + 全量域名规则，最大化降低风控概率。
  const claudeGroup = {
    name: "🧠 Claude", type: "select",
    proxies: quickAiProxies
  };

  // 其他境外 AI：在美、台、日、新之外提供欧洲国家组；国内 AI 仍不进入本组。
  const otherAiGroup = {
    name: "🤖 其他 AI 服务", type: "select",
    proxies: otherAiRegionGroups
  };

  const mediaGroup = {
    name: "🎬 国际媒体", type: "select",
    proxies: ["♻️ 全局自动", "🎯 全局分流"].concat(REGION_NAMES)
  };

  const adsGroup = { name: "🚫 广告拦截", type: "select", proxies: ["REJECT", "DIRECT"] };

  // AI 风控组优先展示；顺序仅影响界面排列，不影响 rules 的匹配优先级。
  config["proxy-groups"] = [claudeGroup, aiGroup, googleAiGroup, otherAiGroup, mainGroup, globalAuto, mediaGroup, adsGroup].concat(regionGroups).concat(autoGroups);

  // ---------- 6. 规则 ----------
  config["rules"] = [
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
    // 明确的 Claude 专属监控端点；共享 SaaS 域名不固定到任何 AI 组。
    "DOMAIN,browser-intake-us5-datadoghq.com,🧠 Claude",
    // IP 段兜底（不使用 IP-ASN，避免 Windows 首次校验依赖额外下载 ASN.mmdb）
    "IP-CIDR,160.79.104.0/21,🧠 Claude,no-resolve",
    "IP-CIDR6,2607:6bc0::/32,🧠 Claude,no-resolve",
    "GEOSITE,anthropic,🧠 Claude", // geosite 分类兜底
    // 仅当上面的 Claude 策略不支持 UDP、内核继续向下匹配时触发，避免换出口或直连。
    "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,anthropic.com),(DOMAIN-SUFFIX,claude.ai),(DOMAIN-SUFFIX,claude.com),(DOMAIN-SUFFIX,clau.de),(DOMAIN-SUFFIX,claudemcpclient.com),(DOMAIN-SUFFIX,claudemcpcontent.com),(DOMAIN-SUFFIX,claudeusercontent.com),(DOMAIN-SUFFIX,anthropicusercontent.com),(DOMAIN,anthropic.auth0.com),(DOMAIN,anthropic.com.cdn.cloudflare.net),(DOMAIN,servd-anthropic-website.b-cdn.net),(DOMAIN,anthropic-com.ghost.io),(DOMAIN,browser-intake-us5-datadoghq.com),(IP-CIDR,160.79.104.0/21),(IP-CIDR6,2607:6bc0::/32),(GEOSITE,anthropic)))),REJECT",

    // OpenAI：官方一方域名保持独立出口；不把共享的 Stripe/Cloudflare/Intercom 整站强行归组。
    "GEOSITE,openai,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,openai.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,chatgpt.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,oaistatic.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,oaiusercontent.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,oaistatsig.com,✨ OpenAI/AI",
    "DOMAIN-SUFFIX,openaimerge.com,✨ OpenAI/AI",
    // OpenAI 节点不支持 UDP 时拒绝，让应用回退 TCP，不允许落入普通国外组。
    "AND,((NETWORK,UDP),(OR,((GEOSITE,openai),(DOMAIN-SUFFIX,openai.com),(DOMAIN-SUFFIX,chatgpt.com),(DOMAIN-SUFFIX,oaistatic.com),(DOMAIN-SUFFIX,oaiusercontent.com),(DOMAIN-SUFFIX,oaistatsig.com),(DOMAIN-SUFFIX,openaimerge.com)))),REJECT",

    // Google 全家桶 / Gemini / Antigravity 独立出口；cloudcode-pa 是 Antigravity 后端关键词。
    "DOMAIN-SUFFIX,gemini.google.com,🔷 Google/Gemini/Antigravity",
    "DOMAIN-SUFFIX,generativelanguage.googleapis.com,🔷 Google/Gemini/Antigravity",
    "DOMAIN-KEYWORD,antigravity,🔷 Google/Gemini/Antigravity",
    "DOMAIN-KEYWORD,cloudcode-pa,🔷 Google/Gemini/Antigravity",
    "DOMAIN-KEYWORD,makersuite,🔷 Google/Gemini/Antigravity",
    "GEOSITE,youtube,🔷 Google/Gemini/Antigravity",
    "GEOSITE,google,🔷 Google/Gemini/Antigravity",
    // Google 组节点不支持 UDP 时拒绝，避免 QUIC 改走其它国家节点或直连。
    "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,gemini.google.com),(DOMAIN-SUFFIX,generativelanguage.googleapis.com),(DOMAIN-KEYWORD,antigravity),(DOMAIN-KEYWORD,cloudcode-pa),(DOMAIN-KEYWORD,makersuite),(GEOSITE,youtube),(GEOSITE,google)))),REJECT",

    // 其他境外 AI：先列官方/常用主域名，再由维护中的 GeoSite 分类补齐新服务。
    "DOMAIN-SUFFIX,perplexity.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,pplx.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,cursor.sh,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,cursor.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,cursorapi.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,cursor-cdn.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,huggingface.co,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,hf.co,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,x.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,grok.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,kiro.dev,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,kiro.aws.dev,🤖 其他 AI 服务",
    "DOMAIN,q.us-east-1.amazonaws.com,🤖 其他 AI 服务",
    "DOMAIN,q.eu-central-1.amazonaws.com,🤖 其他 AI 服务",
    "DOMAIN,cognito-identity.us-east-1.amazonaws.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,mistral.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,cohere.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,poe.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,character.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,midjourney.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,openrouter.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,replicate.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,together.ai,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,groq.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,elevenlabs.io,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,manus.im,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,codeium.com,🤖 其他 AI 服务",
    "DOMAIN-SUFFIX,windsurf.com,🤖 其他 AI 服务",
    "GEOSITE,category-ai-!cn,🤖 其他 AI 服务",
    // 其他 AI 节点不支持 UDP 时同样失败关闭，不允许继续落入普通国外组。
    "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,perplexity.ai),(DOMAIN-SUFFIX,pplx.ai),(DOMAIN-SUFFIX,cursor.sh),(DOMAIN-SUFFIX,cursor.com),(DOMAIN-SUFFIX,cursorapi.com),(DOMAIN-SUFFIX,cursor-cdn.com),(DOMAIN-SUFFIX,huggingface.co),(DOMAIN-SUFFIX,hf.co),(DOMAIN-SUFFIX,x.ai),(DOMAIN-SUFFIX,grok.com),(DOMAIN-SUFFIX,kiro.dev),(DOMAIN-SUFFIX,kiro.aws.dev),(DOMAIN,q.us-east-1.amazonaws.com),(DOMAIN,q.eu-central-1.amazonaws.com),(DOMAIN,cognito-identity.us-east-1.amazonaws.com),(GEOSITE,category-ai-!cn)))),REJECT",

    // 飞书中国站及静态资源显式直连，避免域名集遗漏后落入国外代理造成绕境卡顿。
    "DOMAIN-SUFFIX,feishu.cn,DIRECT",
    "DOMAIN-SUFFIX,feishucdn.com,DIRECT",
    "DOMAIN-SUFFIX,feishu.net,DIRECT",
    "DOMAIN-SUFFIX,feishupkg.com,DIRECT",

    // 广告规则位于 AI 规则之后，避免共享遥测域名先于 AI 一方域名被误拦截。
    "GEOSITE,category-ads-all,🚫 广告拦截",

    // 社交 / 媒体（折叠，无独立组）
    "GEOSITE,telegram,🎯 全局分流",
    "GEOSITE,discord,🎯 全局分流",
    "GEOIP,telegram,🎯 全局分流,no-resolve",
    "GEOSITE,netflix,🎬 国际媒体",
    "GEOSITE,disney,🎬 国际媒体",
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

    // 厂商规则（Google 已在 AI 规则区固定独立组，Apple 直连）
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
  const internalInRules = hasInternalInDns ? ["DOMAIN-SUFFIX,in,DIRECT"] : [];
  const universalRules = internalInRules.concat([
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve"
  ], config["rules"]);
  config["rules"] = [PERSONAL_RULES_MARKER].concat(personalRules, universalRules)
    .filter((rule, index, rules) => rules.indexOf(rule) === index);

  return config;
}
