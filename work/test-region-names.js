const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "clash-goblal-extend-script.js"), "utf8"), ctx);
const fixtures = [
  ["香港高倍01 3x 流量", "🇭🇰 香港节点", "香港"],
  ["新加坡高倍01 3x 流量", "🇸🇬 新加坡节点", "新加坡"],
  ["美国高倍01 3x 流量", "🇺🇸 美国节点", "美国"],
  ["pro-家庭宽带-美国ATT01-2X", "🇺🇸 美国节点", "美国"],
  ["pro-家庭宽带-美国Wave-10X", "🇺🇸 美国节点", "美国"],
  ["pro-家庭宽带-日本Biglobe-2x", "🇯🇵 日本节点", "日本"],
  ["直连-新加坡01-5x", "🇸🇬 新加坡节点", "新加坡"],
  ["线路01-USA", "🇺🇸 美国节点", "美国"],
  ["线路01USA", "🇺🇸 美国节点", "美国"],
  ["USA01", "🇺🇸 美国节点", "美国"],
  ["台湾高倍家宽02 3x 流量", "🌏 台湾节点", "台湾"],
  ["线路01日本", "🇯🇵 日本节点", "日本"],
  ["韩国高倍01 3x 流量", "🇰🇷 韩国节点", "韩国"],
  ["德国高倍01 3x 流量", "🇪🇺 欧洲节点", "欧洲"]
];
const nodes = fixtures.map(([name]) => ({ name, type: "ss" }));
nodes.push({ name: "美国-剩余流量 50 GB", type: "ss" });
const tips = ["支持AI:新加坡/加拿大/美国/台湾", "支持 AI：美国、日本"];
nodes.push(...tips.map(name => ({ name, type: "ss" })));
for (const input of [{ proxies: nodes }, { "proxy-providers": { sample: { type: "file", path: "./sample.yaml" } } }]) {
  const inline = Array.isArray(input.proxies);
  const output = ctx.main(input, "region-names");
  for (const [name, region] of fixtures) {
    const g = output["proxy-groups"].find(g => g.name === region);
    assert.ok(g, region);
    if (inline) assert.ok(g.proxies.includes(name), name);
    else {
      assert.ok(new RegExp(g.filter.replace(/^\(\?i\)/, ""), "i").test(name), name);
      assert.ok(!new RegExp(g["exclude-filter"].replace(/^\(\?i\)/, ""), "i").test(name), name);
    }
  }
  const us = output["proxy-groups"].find(g => g.name === "🇺🇸 美国节点");
  for (const group of output["proxy-groups"]) {
    for (const tip of tips) {
      assert.ok(!group.proxies.includes(tip), group.name + ": " + tip);
      if (group.use) assert.ok(new RegExp(group["exclude-filter"].replace(/^\(\?i\)/, ""), "i").test(tip), group.name);
    }
  }
  assert.ok(!us.proxies.includes("美国-剩余流量 50 GB"));
  if (us.filter) {
    assert.ok(!new RegExp(us.filter.replace(/^\(\?i\)/, ""), "i").test("Russia-01"));
    assert.ok(new RegExp(us["exclude-filter"].replace(/^\(\?i\)/, ""), "i").test("美国-剩余流量 50 GB"));
  }
}
const lines = fs.readFileSync(path.join(root, "shadowrocket-global.conf"), "utf8").split(/\r?\n/);
const matcher = group => {
  const line = lines.find(line => line.startsWith(group + " ="));
  assert.ok(line, group);
  const pattern = line.split("policy-regex-filter=")[1].replace(/,select=0$/, "");
  return new RegExp(pattern.replace(/^\(\?i\)/, ""), "i");
};
for (const [name, region, country] of fixtures) {
  assert.ok(matcher(region).test(name), name);
  assert.ok(matcher("♻️ " + country + "自动").test(name), name);
  if (["美国", "台湾", "日本", "新加坡"].includes(country)) {
    for (const group of ["🧠 Claude", "✨ OpenAI/AI"]) assert.ok(matcher(group).test(name), group + ": " + name);
  }
}
assert.ok(!matcher("🇺🇸 美国节点").test("Russia-01"));
assert.ok(!matcher("🇺🇸 美国节点").test("美国-剩余流量 50 GB"));
assert.ok(!matcher("🌐 其他国家节点").test("线路01USA"));
assert.ok(matcher("🌐 其他国家节点").test("加拿大高倍家宽 3x 流量"));
for (const tip of tips) {
  for (const group of ["🧠 Claude", "✨ OpenAI/AI", "🇺🇸 美国节点", "♻️ 美国自动", "🌐 其他国家节点", "♻️ 国外自动"]) {
    assert.ok(!matcher(group).test(tip), group + ": " + tip);
  }
}
console.log("PASS: region suffixes, USA names and traffic multipliers; tips and Russia excluded");
