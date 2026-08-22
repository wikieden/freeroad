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
    { name: "日本-A", type: "ss" }
  ],
  rules: []
}, "test");

assert.equal(result.proxies.some((proxy) => proxy && proxy.type === "http"), false);
assert.equal(result["proxy-groups"].some((group) => /Kiro/i.test(group.name)), false);
assert.equal(result.rules.some((rule) => rule.includes("🤖")), false);
assert.doesNotMatch(source, /公司|内网|relay/i);

for (const groupName of [
  "🧠 Claude",
  "✨ OpenAI/AI",
  "🔷 Google/Gemini/Antigravity"
]) {
  const group = result["proxy-groups"].find((candidate) => candidate.name === groupName);
  assert.deepEqual(Array.from(group.proxies), ["US-A", "台湾-A"]);
}

console.log("PASS: public script contains no private relay configuration");
