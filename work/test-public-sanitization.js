const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.resolve(__dirname, "../clash-goblal-extend-script.js");
const source = fs.readFileSync(scriptPath, "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(source, context, { filename: scriptPath });

const result = context.main({
  proxies: [
    { name: "US-A", type: "ss" },
    { name: "台湾-A", type: "ss" },
    { name: "日本-A", type: "ss" },
    { name: "新加坡-A", type: "ss" },
    { name: "德国-A", type: "ss" },
    { name: "美国-剩余流量 50 GB", type: "ss" }
  ],
  rules: []
}, "test");

assert.equal(result.proxies.some((proxy) => proxy && proxy.type === "http"), false);
assert.equal(result["proxy-groups"].some((group) => /Kiro/i.test(group.name)), false);
assert.doesNotMatch(source, /公司|内网|relay/i);

const majorAiCountries = ["🇺🇸 美国节点", "🌏 台湾节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点"];
const majorAiQuickNodes = ["US-A", "台湾-A", "日本-A", "新加坡-A"];
const serviceCountries = new Map([
  ["🧠 Claude", majorAiCountries.concat(majorAiQuickNodes)],
  ["✨ OpenAI/AI", majorAiCountries.concat(majorAiQuickNodes)],
  ["🔷 Google/Gemini/Antigravity", majorAiCountries],
  ["🤖 其他 AI 服务", majorAiCountries.concat("🇪🇺 欧洲节点")]
]);

for (const groupName of [
  "🧠 Claude",
  "✨ OpenAI/AI",
  "🔷 Google/Gemini/Antigravity",
  "🤖 其他 AI 服务"
]) {
  const group = result["proxy-groups"].find((candidate) => candidate.name === groupName);
  assert.ok(group, `missing proxy group: ${groupName}`);
  assert.deepEqual(Array.from(group.proxies), serviceCountries.get(groupName));
}

assert.deepEqual(
  Array.from(result["proxy-groups"].slice(0, 4), (group) => group.name),
  ["🧠 Claude", "✨ OpenAI/AI", "🔷 Google/Gemini/Antigravity", "🤖 其他 AI 服务"]
);
assert.ok(result.rules.includes("GEOSITE,category-ai-!cn,🤖 其他 AI 服务"));

for (const [groupName, expectedProxies] of [
  ["🇺🇸 美国节点", ["♻️ 美国自动", "US-A"]],
  ["🌏 台湾节点", ["♻️ 台湾自动", "台湾-A"]],
  ["🇯🇵 日本节点", ["♻️ 日本自动", "日本-A"]],
  ["🇸🇬 新加坡节点", ["♻️ 新加坡自动", "新加坡-A"]],
  ["🇪🇺 欧洲节点", ["♻️ 欧洲自动", "德国-A"]]
]) {
  const group = result["proxy-groups"].find((candidate) => candidate.name === groupName);
  assert.ok(group, `missing country group: ${groupName}`);
  assert.deepEqual(Array.from(group.proxies), expectedProxies);
}

const japanOnly = context.main({ proxies: [{ name: "日本-B", type: "ss" }], rules: [] }, "japan-only");
for (const groupName of ["🧠 Claude", "✨ OpenAI/AI", "🔷 Google/Gemini/Antigravity", "🤖 其他 AI 服务"]) {
  const group = japanOnly["proxy-groups"].find((candidate) => candidate.name === groupName);
  const expected = ["🧠 Claude", "✨ OpenAI/AI"].includes(groupName)
    ? ["🇯🇵 日本节点", "日本-B"]
    : ["🇯🇵 日本节点"];
  assert.deepEqual(Array.from(group.proxies), expected);
}

console.log("PASS: public script contains no private relay configuration");
