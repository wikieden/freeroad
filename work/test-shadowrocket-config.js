const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.resolve(__dirname, "../shadowrocket-global.conf");
assert.ok(fs.existsSync(configPath), "shadowrocket-global.conf must exist");

const source = fs.readFileSync(configPath, "utf8");
const lines = source.split(/\r?\n/);
const activeLines = lines.map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));

for (const section of ["[General]", "[Host]", "[Proxy Group]", "[Rule]"]) {
  assert.equal(activeLines.filter((line) => line === section).length, 1, `${section} must occur once`);
}

for (const prohibitedSection of ["[MITM]", "[Script]", "[URL Rewrite]", "[Header Rewrite]", "[Body Rewrite]"]) {
  assert.equal(activeLines.includes(prohibitedSection), false, `${prohibitedSection} is out of scope`);
}
assert.doesNotMatch(source, /公司|内网|relay/i);
assert.doesNotMatch(source, /(?:password|token|secret)\s*=/i);

const generalStart = activeLines.indexOf("[General]") + 1;
const hostSection = activeLines.indexOf("[Host]");
const proxyGroupSection = activeLines.indexOf("[Proxy Group]");
const general = new Map(
  activeLines.slice(generalStart, hostSection).map((line) => {
    const separator = line.indexOf("=");
    assert.notEqual(separator, -1, `invalid general setting: ${line}`);
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  })
);

const hosts = new Map(
  activeLines.slice(hostSection + 1, proxyGroupSection).map((line) => {
    const separator = line.indexOf("=");
    assert.notEqual(separator, -1, `invalid host setting: ${line}`);
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  })
);
assert.equal(general.get("use-local-host-item-for-proxy"), "true", "local Host mappings must apply to proxied domains");
assert.equal(hosts.get("*.local"), "server:system", "mDNS/local domains must use the local resolver");
assert.equal(hosts.get("*.lan"), "server:system", "LAN domains must use the local resolver");
assert.equal(hosts.get("*.home.arpa"), "server:system", "home.arpa domains must use the local resolver");
assert.equal(hosts.get("localhost"), "127.0.0.1", "localhost must remain local");

for (const key of ["dns-server", "direct-dns-server", "fallback-dns-server", "proxy-dns-server"]) {
  const endpoints = general.get(key)?.split(",").map((endpoint) => endpoint.trim()) ?? [];
  assert.ok(endpoints.length > 0, `${key} must define at least one DNS-over-HTTPS endpoint`);
  for (const endpoint of endpoints) {
    assert.match(endpoint, /^https:\/\//, `${key} must not use system, plaintext DNS, DoT, or DoQ: ${endpoint}`);
    const dohUrl = new URL(endpoint);
    assert.match(dohUrl.hostname, /^(?:\d{1,3}\.){3}\d{1,3}$/, `${key} must not need bootstrap DNS: ${endpoint}`);
  }
}

const dnsEndpoints = (key) => general.get(key).split(",").map((endpoint) => endpoint.trim());
const dnsHostname = (endpoint) => new URL(endpoint.replace(/#.*$/, "")).hostname;
const domesticDnsHosts = new Set(["223.5.5.5", "1.12.12.12"]);

for (const endpoint of dnsEndpoints("direct-dns-server")) {
  assert.ok(domesticDnsHosts.has(dnsHostname(endpoint)), `direct DNS must use a domestic DoH endpoint: ${endpoint}`);
  assert.match(endpoint, /#no-h3$/, `direct DNS must stay on HTTPS instead of opportunistic HTTP/3: ${endpoint}`);
  assert.doesNotMatch(endpoint, /#proxy(?:=|&|$)/, `direct DNS must not cross the proxy: ${endpoint}`);
}
for (const key of ["dns-server", "fallback-dns-server"]) {
  for (const endpoint of dnsEndpoints(key)) {
    assert.equal(domesticDnsHosts.has(dnsHostname(endpoint)), false, `${key} must not use a domestic resolver: ${endpoint}`);
    assert.equal(new URL(endpoint).hash, "#proxy", `${key} must use the documented default-node DNS-over-PROXY syntax: ${endpoint}`);
  }
}
for (const endpoint of dnsEndpoints("proxy-dns-server")) {
  assert.ok(domesticDnsHosts.has(dnsHostname(endpoint)), `node bootstrap DNS must use a directly reachable domestic DoH endpoint: ${endpoint}`);
  assert.match(endpoint, /#no-h3$/, `node bootstrap DNS must stay on HTTPS instead of opportunistic HTTP/3: ${endpoint}`);
  assert.doesNotMatch(endpoint, /#proxy(?:=|&|$)/, `node bootstrap DNS must not create a proxy resolution loop: ${endpoint}`);
}
assert.equal(general.get("dns-direct-system"), "false", "direct domains must not use system DNS");
assert.equal(general.get("dns-direct-fallback-proxy"), "false", "direct DNS failure must not silently change route");
assert.equal(general.get("hijack-dns"), ":53", "all hard-coded plaintext DNS on port 53 must be intercepted");

const proxyGroupStart = activeLines.indexOf("[Proxy Group]") + 1;
const ruleStart = activeLines.indexOf("[Rule]");
const groupLines = activeLines.slice(proxyGroupStart, ruleStart);
const groupNames = new Set(groupLines.map((line) => line.split("=")[0].trim()));

for (const groupName of [
  "🧠 Claude", "✨ OpenAI/AI", "🔷 Google/Gemini/Antigravity", "🤖 其他 AI 服务", "🎯 国外代理",
  "🇺🇸 美国节点", "🌏 台湾节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点", "🇪🇺 欧洲节点",
  "♻️ 美国自动", "♻️ 台湾自动", "♻️ 日本自动", "♻️ 新加坡自动", "♻️ 欧洲自动",
  "♻️ 国外自动", "🌐 其他国家节点", "♻️ 其他国家自动"
]) {
  assert.ok(groupNames.has(groupName), `missing proxy group: ${groupName}`);
}

const foreignGroupLine = groupLines.find((candidate) => candidate.startsWith("🎯 国外代理 ="));
assert.match(foreignGroupLine, /=\s*select,/);
assert.deepEqual(
  foreignGroupLine.match(/=\s*select,(.*),select=0$/)[1].split(","),
  [
    "♻️ 国外自动", "🇺🇸 美国节点", "🌏 台湾节点", "🇭🇰 香港节点", "🇯🇵 日本节点",
    "🇸🇬 新加坡节点", "🇰🇷 韩国节点", "🇪🇺 欧洲节点", "🌐 其他国家节点"
  ]
);

const foreignAutoLine = groupLines.find((candidate) => candidate.startsWith("♻️ 国外自动 ="));
assert.match(foreignAutoLine, /=\s*url-test,/);
const foreignAutoFilter = foreignAutoLine.match(/policy-regex-filter=(.*)$/)[1];
const foreignAutoMatcher = new RegExp(foreignAutoFilter.replace(/^\(\?i\)/, ""), "i");
for (const node of ["US-A", "台湾-A", "加拿大-Toronto"]) {
  assert.equal(foreignAutoMatcher.test(node), true, `foreign auto must include ${node}`);
}
for (const node of ["中国-上海", "回国-01", "加拿大-剩余流量 50 GB"]) {
  assert.equal(foreignAutoMatcher.test(node), false, `foreign auto must exclude ${node}`);
}

const otherCountryLine = groupLines.find((candidate) => candidate.startsWith("🌐 其他国家节点 ="));
const otherCountryAutoLine = groupLines.find((candidate) => candidate.startsWith("♻️ 其他国家自动 ="));
assert.match(otherCountryLine, /=\s*select,♻️ 其他国家自动,policy-regex-filter=/);
assert.match(otherCountryAutoLine, /=\s*url-test,/);
const otherCountryFilter = otherCountryLine.match(/policy-regex-filter=(.*),select=0$/)[1];
assert.equal(otherCountryAutoLine.match(/policy-regex-filter=(.*)$/)[1], otherCountryFilter);
const otherCountryMatcher = new RegExp(otherCountryFilter.replace(/^\(\?i\)/, ""), "i");
for (const node of ["🇨🇦 CA-Toronto", "澳大利亚-Sydney", "印度-Mumbai", "巴西-Sao-Paulo", "Russia-01"]) {
  assert.equal(otherCountryMatcher.test(node), true, `other countries must include ${node}`);
}
for (const node of [
  "US-A", "Seattle-01", "台湾-A", "Kaohsiung-01", "香港-A", "日本-A", "Fukuoka-01", "新加坡-A", "韩国-A", "🇩🇪 DE-A", "IT-Milan-01", "ES-Madrid-01",
  "中国-上海", "回国-01", "加拿大-剩余流量 50 GB"
]) {
  assert.equal(otherCountryMatcher.test(node), false, `other countries must exclude ${node}`);
}

const majorCountries = ["🇺🇸 美国节点", "🌏 台湾节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点"];
for (const groupName of ["🧠 Claude", "✨ OpenAI/AI"]) {
  const line = groupLines.find((candidate) => candidate.startsWith(`${groupName} =`));
  assert.match(line, /=\s*select,/);
  assert.match(line, /policy-regex-filter=/);
  assert.doesNotMatch(line, /url-test|欧洲节点/);
  assert.deepEqual(line.match(/=\s*select,(.*),policy-regex-filter=/)[1].split(","), majorCountries);

  const filter = line.match(/policy-regex-filter=(.*),select=0$/)[1];
  const matcher = new RegExp(filter.replace(/^\(\?i\)/, ""), "i");
  for (const node of ["US-A", "台湾-A", "日本-A", "新加坡-A"]) {
    assert.equal(matcher.test(node), true, `${groupName} must include quick node ${node}`);
  }
  for (const node of ["德国-A", "香港-A", "韩国-A", "美国-剩余流量 50 GB"]) {
    assert.equal(matcher.test(node), false, `${groupName} must exclude quick node ${node}`);
  }
}

const googleAiLine = groupLines.find((candidate) => candidate.startsWith("🔷 Google/Gemini/Antigravity ="));
assert.doesNotMatch(googleAiLine, /policy-regex-filter=|url-test|欧洲节点/);
assert.deepEqual(googleAiLine.match(/=\s*select,(.*),select=0$/)[1].split(","), majorCountries);

const otherAiLine = groupLines.find((candidate) => candidate.startsWith("🤖 其他 AI 服务 ="));
assert.doesNotMatch(otherAiLine, /policy-regex-filter=|url-test/);
assert.deepEqual(
  otherAiLine.match(/=\s*select,(.*),select=0$/)[1].split(","),
  majorCountries.concat("🇪🇺 欧洲节点")
);

const countryFixtures = [
  { country: "🇺🇸 美国节点", automatic: "♻️ 美国自动", allowed: ["🇺🇸 US-A", "美国-洛杉矶-01", "Seattle-01"], rejected: ["Russia-01", "日本-东京-01", "美国-剩余流量 50 GB"] },
  { country: "🌏 台湾节点", automatic: "♻️ 台湾自动", allowed: ["🇹🇼 TW-A", "台湾-台北-01", "Kaohsiung-01"], rejected: ["Russia-01", "新加坡-A", "台湾-套餐到期"] },
  { country: "🇯🇵 日本节点", automatic: "♻️ 日本自动", allowed: ["🇯🇵 JP-A", "日本-东京-01", "Fukuoka-01"], rejected: ["Russia-01", "美国-Seattle-01", "日本-剩余流量 50 GB"] },
  { country: "🇸🇬 新加坡节点", automatic: "♻️ 新加坡自动", allowed: ["🇸🇬 SG-A", "新加坡-A"], rejected: ["Russia-01", "台湾-A", "新加坡-官网公告"] },
  { country: "🇪🇺 欧洲节点", automatic: "♻️ 欧洲自动", allowed: ["🇩🇪 DE-A", "英国-London-01", "IT-Milan-01", "ES-Madrid-01"], rejected: ["Russia-01", "US-A", "德国-剩余流量 50 GB"] }
];

for (const { country, automatic, allowed, rejected } of countryFixtures) {
  const countryLine = groupLines.find((candidate) => candidate.startsWith(`${country} =`));
  const automaticLine = groupLines.find((candidate) => candidate.startsWith(`${automatic} =`));
  assert.match(countryLine, new RegExp(`=\\s*select,${automatic},policy-regex-filter=`));
  assert.match(automaticLine, /=\s*url-test,/);
  assert.match(automaticLine, /policy-regex-filter=/);

  const countryFilter = countryLine.match(/policy-regex-filter=(.*),select=0$/)[1];
  const automaticFilter = automaticLine.match(/policy-regex-filter=(.*)$/)[1];
  assert.equal(countryFilter, automaticFilter, `${country} and ${automatic} must use the same filter`);
  const matcher = new RegExp(countryFilter.replace(/^\(\?i\)/, ""), "i");
  for (const node of allowed) assert.equal(matcher.test(node), true, `${country} must include ${node}`);
  for (const node of rejected) assert.equal(matcher.test(node), false, `${country} must exclude ${node}`);
}

const ruleLines = activeLines.slice(ruleStart + 1);
assert.equal(ruleLines.at(-1), "FINAL,🎯 国外代理");
for (const sharedClaudeRule of [
  "DOMAIN-SUFFIX,statsigapi.net,🧠 Claude",
  "DOMAIN-SUFFIX,intercom.io,🧠 Claude",
  "DOMAIN-SUFFIX,intercomcdn.com,🧠 Claude",
  "DOMAIN,cdn.usefathom.com,🧠 Claude"
]) {
  assert.equal(ruleLines.includes(sharedClaudeRule), false, `shared third-party domain must not be pinned to Claude: ${sharedClaudeRule}`);
}
assert.equal(ruleLines.some((line) => line.includes("/Claude/Claude.list")), false, "stale Claude rule set must not reintroduce shared analytics domains");
assert.equal(ruleLines.some((line) => line.includes("/OpenAI/OpenAI.list")), false, "stale broad OpenAI rule set must not capture shared SaaS domains");
for (const currentOpenAiRule of [
  "DOMAIN-SUFFIX,chat.com,✨ OpenAI/AI",
  "DOMAIN-SUFFIX,sora.com,✨ OpenAI/AI",
  "DOMAIN-SUFFIX,chatgpt.site,✨ OpenAI/AI",
  "DOMAIN-SUFFIX,chatgpt.livekit.cloud,✨ OpenAI/AI"
]) {
  assert.ok(ruleLines.includes(currentOpenAiRule), `missing current OpenAI rule: ${currentOpenAiRule}`);
}

const policyForRule = (line) => {
  const parts = line.split(",");
  return parts[0] === "FINAL" ? parts[1] : parts[2];
};
const builtInPolicies = new Set(["DIRECT", "REJECT"]);
for (const rule of ruleLines) {
  const policy = policyForRule(rule);
  assert.ok(builtInPolicies.has(policy) || groupNames.has(policy), `undefined policy ${policy} in ${rule}`);
}

const indexOfRule = (fragment) => {
  const index = ruleLines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `missing rule containing ${fragment}`);
  return index;
};
const aiIndices = [
  indexOfRule("DOMAIN-SUFFIX,anthropic.com,🧠 Claude"),
  indexOfRule("DOMAIN-SUFFIX,openai.com,✨ OpenAI/AI"),
  indexOfRule("Google/Google.list,🔷 Google/Gemini/Antigravity"),
  indexOfRule("Gemini/Gemini.list,🔷 Google/Gemini/Antigravity"),
  indexOfRule("YouTube/YouTube.list,🔷 Google/Gemini/Antigravity")
];
for (const fragment of [
  "DOMAIN-SUFFIX,perplexity.ai,🤖 其他 AI 服务",
  "DOMAIN-SUFFIX,cursorapi.com,🤖 其他 AI 服务",
  "DOMAIN-SUFFIX,huggingface.co,🤖 其他 AI 服务",
  "DOMAIN-SUFFIX,grok.com,🤖 其他 AI 服务",
  "DOMAIN-SUFFIX,kiro.dev,🤖 其他 AI 服务"
]) {
  aiIndices.push(indexOfRule(fragment));
}
const advertisingIndex = indexOfRule("AdvertisingLite/AdvertisingLite.list,REJECT");
const chinaIndex = indexOfRule("China/China.list,DIRECT");
assert.ok(aiIndices.every((index) => index < advertisingIndex), "AI rules must precede advertising");
for (const directRule of [
  "DOMAIN-SUFFIX,feishu.cn,DIRECT",
  "DOMAIN-SUFFIX,feishucdn.com,DIRECT",
  "DOMAIN-SUFFIX,feishu.net,DIRECT",
  "DOMAIN-SUFFIX,feishupkg.com,DIRECT"
]) {
  assert.ok(indexOfRule(directRule) < advertisingIndex, `Feishu direct rule must precede advertising: ${directRule}`);
}
assert.ok(advertisingIndex < chinaIndex, "advertising must precede China direct rules");
assert.ok(chinaIndex < ruleLines.length - 1, "China direct rules must precede FINAL");

for (const expectedRule of [
  "DOMAIN-SUFFIX,anthropic.com,🧠 Claude",
  "DOMAIN-SUFFIX,openai.com,✨ OpenAI/AI",
  "DOMAIN-SUFFIX,oaistatsig.com,✨ OpenAI/AI",
  "DOMAIN-SUFFIX,google.com,🔷 Google/Gemini/Antigravity",
  "DOMAIN-KEYWORD,antigravity,🔷 Google/Gemini/Antigravity",
  "DOMAIN-SUFFIX,pplx.ai,🤖 其他 AI 服务",
  "DOMAIN,q.us-east-1.amazonaws.com,🤖 其他 AI 服务",
  "GEOIP,CN,DIRECT"
]) {
  assert.ok(ruleLines.includes(expectedRule), `missing rule: ${expectedRule}`);
}

const remoteSetUrls = ruleLines
  .filter((line) => /^(?:RULE|DOMAIN)-SET,/.test(line))
  .map((line) => line.split(",")[1]);
assert.equal(new Set(remoteSetUrls).size, remoteSetUrls.length, "remote set URLs must be unique");
assert.ok(remoteSetUrls.length >= 12, "expected maintained remote rule and domain sets");

console.log(`PASS: Shadowrocket config (${groupNames.size} groups, ${ruleLines.length} rules, ${remoteSetUrls.length} remote sets)`);
