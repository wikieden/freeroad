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

for (const groupName of ["🧠 Claude", "✨ OpenAI/AI", "🔷 Google/Gemini/Antigravity", "🤖 其他 AI 服务", "🎯 国外代理"]) {
  assert.ok(groupNames.has(groupName), `missing proxy group: ${groupName}`);
}

for (const groupName of ["🧠 Claude", "✨ OpenAI/AI", "🔷 Google/Gemini/Antigravity", "🤖 其他 AI 服务"]) {
  const line = groupLines.find((candidate) => candidate.startsWith(`${groupName} =`));
  assert.match(line, /=\s*select,/);
  assert.match(line, /policy-regex-filter=/);
  assert.match(line, /(?:US|USA|美国|🇺🇸)/);
  assert.match(line, /(?:TW|TWN|台湾|台灣|🇹🇼)/);
  assert.doesNotMatch(line, /url-test|香港|日本|新加坡|韩国/);

  const filter = line.match(/policy-regex-filter=(.*),select=0$/)[1].replace(/^\(\?i\)/, "");
  const matcher = new RegExp(filter, "i");
  for (const allowedNode of ["🇺🇸 US-A", "美国-洛杉矶-01", "🇹🇼 TW-A", "台湾-台北-01"]) {
    assert.equal(matcher.test(allowedNode), true, `${groupName} must include ${allowedNode}`);
  }
  for (const rejectedNode of ["Russia-01", "Fukuoka-01", "日本-东京-01", "剩余流量 50 GB"]) {
    assert.equal(matcher.test(rejectedNode), false, `${groupName} must exclude ${rejectedNode}`);
  }
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
