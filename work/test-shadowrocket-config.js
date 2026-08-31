const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.resolve(__dirname, "../shadowrocket-global.conf");
assert.ok(fs.existsSync(configPath), "shadowrocket-global.conf must exist");

const source = fs.readFileSync(configPath, "utf8");
const lines = source.split(/\r?\n/);
const activeLines = lines.map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));

for (const section of ["[General]", "[Proxy Group]", "[Rule]"]) {
  assert.equal(activeLines.filter((line) => line === section).length, 1, `${section} must occur once`);
}

for (const prohibitedSection of ["[MITM]", "[Script]", "[URL Rewrite]", "[Header Rewrite]", "[Body Rewrite]"]) {
  assert.equal(activeLines.includes(prohibitedSection), false, `${prohibitedSection} is out of scope`);
}
assert.doesNotMatch(source, /公司|内网|relay/i);
assert.doesNotMatch(source, /(?:password|token|secret)\s*=/i);

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
  "US-A", "台湾-A", "香港-A", "日本-A", "新加坡-A", "韩国-A", "🇩🇪 DE-A",
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
  { country: "🇺🇸 美国节点", automatic: "♻️ 美国自动", allowed: ["🇺🇸 US-A", "美国-洛杉矶-01"], rejected: ["Russia-01", "日本-东京-01", "美国-剩余流量 50 GB"] },
  { country: "🌏 台湾节点", automatic: "♻️ 台湾自动", allowed: ["🇹🇼 TW-A", "台湾-台北-01"], rejected: ["Russia-01", "新加坡-A", "台湾-套餐到期"] },
  { country: "🇯🇵 日本节点", automatic: "♻️ 日本自动", allowed: ["🇯🇵 JP-A", "日本-东京-01"], rejected: ["Russia-01", "Fukuoka-01", "日本-剩余流量 50 GB"] },
  { country: "🇸🇬 新加坡节点", automatic: "♻️ 新加坡自动", allowed: ["🇸🇬 SG-A", "新加坡-A"], rejected: ["Russia-01", "台湾-A", "新加坡-官网公告"] },
  { country: "🇪🇺 欧洲节点", automatic: "♻️ 欧洲自动", allowed: ["🇩🇪 DE-A", "英国-London-01"], rejected: ["Russia-01", "US-A", "德国-剩余流量 50 GB"] }
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
  indexOfRule("Claude/Claude.list,🧠 Claude"),
  indexOfRule("OpenAI/OpenAI.list,✨ OpenAI/AI"),
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
assert.ok(remoteSetUrls.length >= 13, "expected maintained remote rule and domain sets");

console.log(`PASS: Shadowrocket config (${groupNames.size} groups, ${ruleLines.length} rules, ${remoteSetUrls.length} remote sets)`);
