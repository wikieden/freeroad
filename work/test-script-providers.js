const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../clash-goblal-extend-script.js"), "utf8"), ctx);
const providers = { alpha: { type: "http", url: "https://example.invalid/a" }, beta: { type: "file", path: "./b.yaml" } };
const output = ctx.main({ "proxy-providers": providers }, "provider-only");
assert.equal(output["proxy-providers"], providers);
const groups = Object.fromEntries(output["proxy-groups"].map(g => [g.name, g]));
const match = (group, name) => (!group.filter || new RegExp(group.filter.replace("(?i)", ""), "i").test(name)) && !new RegExp(group["exclude-filter"].replace("(?i)", ""), "i").test(name);
for (const name of ["♻️ 美国自动", "🇺🇸 美国节点", "♻️ 全局自动", "🌐 其它地区"]) {
  assert.deepEqual(Array.from(groups[name].use), ["alpha", "beta"]);
  assert.equal(groups[name]["empty-fallback"], "REJECT");
  assert.ok(!groups[name].proxies.includes("DIRECT"));
}
assert.ok(match(groups["🇺🇸 美国节点"], "[alpha] US new node"));
assert.ok(match(groups["🇺🇸 美国节点"], "[beta] 美国 02"));
assert.ok(!match(groups["🇺🇸 美国节点"], "[beta] Russia"));
assert.ok(!match(groups["🇺🇸 美国节点"], "[alpha] 美国剩余流量"));
assert.ok(!match(groups["🇯🇵 日本节点"], "美国 日本"));
assert.ok(!match(groups["🌐 其它地区"], "[beta] US node"));
assert.ok(match(groups["🌐 其它地区"], "[beta] Brazil"));
assert.ok(!match(groups["♻️ 全局自动"], "套餐剩余"));
for (const name of ["🧠 Claude", "✨ OpenAI/AI", "🔷 Google/Gemini/Antigravity", "🤖 其他 AI 服务"]) {
  assert.ok(groups[name].proxies.includes("🇺🇸 美国节点"));
  assert.ok(!groups[name].proxies.includes("DIRECT"));
}
const mixed = ctx.main({ proxies: [{ name: "US-local", type: "ss" }], "proxy-providers": providers }, "mixed");
assert.ok(mixed["proxy-groups"].find(g => g.name === "🇺🇸 美国节点").proxies.includes("US-local"));
const rerun = ctx.main(output, "repeat");
assert.equal(rerun["proxy-groups"].length, Object.keys(groups).length);
assert.throws(() => ctx.main({ proxies: [] }, "empty"), /AI/);
console.log("PASS: provider-only, mixed, dynamic filters, region priority, empty rejection, repeated execution");

for (const name of ["🧠 Claude", "✨ OpenAI/AI"]) {
  assert.deepEqual(Array.from(groups[name].use), ["alpha", "beta"]);
  for (const node of ["[alpha] US 01", "[beta] 台湾 02", "Japan 03", "SG 04"]) assert.ok(match(groups[name], node));
  for (const node of ["Hong Kong 01", "Russia 02", "美国剩余流量"]) assert.ok(!match(groups[name], node));
  assert.equal(groups[name]["empty-fallback"], "REJECT");
}
assert.equal(groups["🔷 Google/Gemini/Antigravity"].use, undefined);
console.log("PASS: Claude/OpenAI expose both providers' eligible nodes directly");
