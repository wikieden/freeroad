const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "clash-goblal-extend-script.js"), "utf8"), context);
const shadowrocket = fs.readFileSync(path.join(root, "shadowrocket-global.conf"), "utf8");
const block = shadowrocket.split("# Steam：")[1].split("RULE-SET,")[0];
const shadowRules = block.split(/\r?\n/).filter(line => /^DOMAIN(?:-SUFFIX)?,/.test(line));

for (const input of [
  { proxies: [{ name: "US-test", type: "ss" }] },
  { "proxy-providers": { test: { type: "file", path: "./test.yaml" } } }
]) {
  const output = context.main(input, "steam-routing");
  const rules = Array.from(output.rules);
  const start = rules.indexOf(shadowRules[0]);
  assert.notEqual(start, -1);
  assert.deepEqual(rules.slice(start, start + shadowRules.length), shadowRules, "both clients must use identical Steam rules in identical order");
  assert.ok(start + shadowRules.length <= rules.indexOf("GEOSITE,geolocation-!cn,🎯 全局分流"));
  const group = output["proxy-groups"].find(group => group.name === "🎮 Steam");
  assert.equal(group.proxies[0], "♻️ 全局自动");
  assert.ok(group.proxies.includes("DIRECT"));
  assert.ok(group.proxies.includes("🇺🇸 美国全部节点"));

  const route = host => {
    const rule = shadowRules.find(rule => {
      const [type, domain] = rule.split(",");
      return host === domain || (type === "DOMAIN-SUFFIX" && host.endsWith("." + domain));
    });
    return rule?.split(",")[2];
  };
  for (const host of ["store.steampowered.com", "cm.steampowered.com", "steamcommunity.com", "avatars.steamstatic.com", "cloud.steamusercontent.com", "steamcloudsweden.blob.core.windows.net"]) {
    assert.equal(route(host), "🎮 Steam", host);
  }
  for (const host of ["cdn.steamcontent.com", "cdn-ali.content.steamchina.com", "dl.steam.clngaa.com", "steampowered.com.8686c.com"]) {
    assert.equal(route(host), "DIRECT", host);
  }
  for (const host of ["humblebundle.com", "fanatical.com", "steamunlocked.net", "unrelated-steamstore.example", "steampowered.com.example"]) {
    assert.equal(route(host), undefined, host);
  }
}
assert.doesNotMatch(shadowrocket, /Steam(?:CN)?\/Steam(?:CN)?\.list/);
console.log(`PASS: identical Steam rules (${shadowRules.length}), service/download routing and third-party exclusion`);
