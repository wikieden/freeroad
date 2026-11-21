const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const scriptPath = path.resolve(__dirname, "../clash-goblal-extend-script.js");
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(scriptPath, "utf8"), context, { filename: scriptPath });

const marker = "DOMAIN,__clash_verge_personal_rules__.invalid,DIRECT";
const personalRule = "DOMAIN,personal.example,DIRECT";
const input = {
  proxies: [
    { name: "US-A", type: "ss" },
    { name: "台湾-A", type: "ss" }
  ],
  rules: [marker, personalRule]
};

const once = context.main(input, "test");
const twice = context.main(once, "test");

assert.equal(twice["disable-keep-alive"], false);
assert.equal(Object.hasOwn(twice, "tcp-keep-alive"), false);
assert.equal(
  JSON.stringify(twice["geox-url"]),
  JSON.stringify({
    geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat",
    geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country.mmdb"
  }),
  "Mihomo GeoSite, GeoIP, and MMDB sources must be pinned to MetaCubeX releases"
);
assert.equal(twice.rules.filter((rule) => rule === marker).length, 1);
assert.equal(twice.rules.filter((rule) => rule === personalRule).length, 1);
assert.equal(
  twice.rules.some((rule) => rule.startsWith("IP-ASN,")),
  false,
  "public script must not require the separately downloaded ASN.mmdb during Windows validation"
);
assert.ok(twice.rules.includes("IP-CIDR,160.79.104.0/23,🧠 Claude,no-resolve"));
assert.ok(twice.rules.includes("IP-CIDR,153.61.224.0/22,🧠 Claude,no-resolve"));
assert.ok(twice.rules.includes("IP-CIDR6,2607:6bc0::/48,🧠 Claude,no-resolve"));
assert.equal(twice.dns["respect-rules"], true);
assert.deepEqual(Array.from(twice.dns["default-nameserver"]), [
  "https://223.5.5.5/dns-query",
  "https://1.12.12.12/dns-query"
]);
assert.deepEqual(Array.from(twice.dns.nameserver), [
  "https://223.5.5.5/dns-query",
  "https://1.12.12.12/dns-query"
]);
assert.deepEqual(Array.from(twice.dns["proxy-server-nameserver"]), [
  "https://223.5.5.5/dns-query",
  "https://1.12.12.12/dns-query"
]);
assert.deepEqual(Array.from(twice.dns["nameserver-policy"]["geosite:geolocation-!cn"]), [
  "https://1.1.1.1/dns-query",
  "https://8.8.8.8/dns-query"
]);
assert.equal(twice.dns["nameserver-policy"]["+.in"], undefined);
assert.equal(twice.dns["fake-ip-filter"].includes("+.in"), false);
assert.equal(twice.rules.includes("DOMAIN-SUFFIX,in,DIRECT"), false);
assert.ok(twice.dns["fake-ip-filter"].includes("localhost"), "localhost must bypass fake-IP");
for (const loopbackRule of [
  "DOMAIN,localhost,DIRECT",
  "DOMAIN-SUFFIX,localhost,DIRECT",
  "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR6,::1/128,DIRECT,no-resolve",
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
  "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
  "IP-CIDR6,fe80::/10,DIRECT,no-resolve"
]) {
  assert.ok(twice.rules.includes(loopbackRule), `missing loopback direct rule: ${loopbackRule}`);
}

const privateDomainDns = ["https://223.5.5.5/dns-query", "https://1.12.12.12/dns-query"];
const privateDomain = context.main({
  proxies: [{ name: "US-A", type: "ss" }],
  rules: [],
  dns: { "nameserver-policy": { "+.internal.example": privateDomainDns } }
}, "private-domain");
assert.deepEqual(
  Array.from(privateDomain.dns["nameserver-policy"]["+.internal.example"]),
  privateDomainDns,
  "explicit private suffix DNS policies must survive the global script"
);
assert.equal(
  privateDomain.rules.includes("DOMAIN-SUFFIX,internal.example,DIRECT"),
  false,
  "a private DNS policy must not implicitly override routing"
);

const internalDns = "192.0.2.53";
const internalIn = context.main({
  proxies: [{ name: "US-A", type: "ss" }],
  rules: [],
  dns: { "nameserver-policy": { "+.in": [internalDns] } }
}, "internal-in");
assert.ok(internalIn.dns["nameserver-policy"]["+.in"], "configured .in DNS policy must survive the script");
assert.deepEqual(Array.from(internalIn.dns["nameserver-policy"]["+.in"]), [internalDns]);
assert.equal(internalIn.dns["fake-ip-filter"].includes("+.in"), true);
assert.equal(internalIn.sniffer["skip-domain"].includes("+.in"), true);
assert.equal(internalIn.rules.filter((rule) => rule === "DOMAIN-SUFFIX,in,DIRECT").length, 1);

const otherAiUdpGuard = "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,perplexity.ai),(DOMAIN-SUFFIX,pplx.ai),(DOMAIN-SUFFIX,cursor.sh),(DOMAIN-SUFFIX,cursor.com),(DOMAIN-SUFFIX,cursorapi.com),(DOMAIN-SUFFIX,cursor-cdn.com),(DOMAIN-SUFFIX,huggingface.co),(DOMAIN-SUFFIX,hf.co),(DOMAIN-SUFFIX,x.ai),(DOMAIN-SUFFIX,grok.com),(DOMAIN-SUFFIX,kiro.dev),(DOMAIN-SUFFIX,kiro.aws.dev),(DOMAIN,q.us-east-1.amazonaws.com),(DOMAIN,q.eu-central-1.amazonaws.com),(DOMAIN,cognito-identity.us-east-1.amazonaws.com),(DOMAIN-SUFFIX,typesafe.ai),(GEOSITE,category-ai-!cn)))),REJECT";

assert.equal(twice.rules.filter(rule => rule === otherAiUdpGuard).length, 1);
for (const [group, samples] of [
  ["🧠 Claude", ["(DOMAIN-SUFFIX,claude.ai)", "(DOMAIN,o1158394.ingest.us.sentry.io)", "(IP-CIDR,153.61.224.0/22,no-resolve)"]],
  ["✨ OpenAI/AI", ["(DOMAIN-SUFFIX,chatgpt.com)", "(GEOSITE,openai)"]],
  ["🔷 Google/Gemini/Antigravity", ["(DOMAIN-SUFFIX,youtube.com)", "(GEOSITE,google)"]],
]) {
  const first = twice.rules.findIndex(rule => rule.split(",")[2] === group);
  assert.ok(first > 0, group);
  const guard = twice.rules[first - 1];
  assert.ok(guard.startsWith("AND,((NETWORK,UDP),(OR,(") && guard.endsWith(",REJECT"), group);
  for (const sample of samples) assert.ok(guard.includes(sample), group + ": " + sample);
}
for (const broadSharedRule of [
  "DOMAIN-SUFFIX,sentry.io,🧠 Claude",
  "DOMAIN-SUFFIX,statsigapi.net,🧠 Claude",
  "DOMAIN-KEYWORD,datadog,🧠 Claude",
  "DOMAIN-KEYWORD,sift,🧠 Claude",
  "DOMAIN-SUFFIX,intercom.io,🧠 Claude",
  "DOMAIN-SUFFIX,intercomcdn.com,🧠 Claude",
  "DOMAIN,cdn.usefathom.com,🧠 Claude"
]) {
  assert.equal(twice.rules.includes(broadSharedRule), false, `shared third-party domain must not be pinned to Claude: ${broadSharedRule}`);
}
assert.ok(twice.rules.includes("DOMAIN,browser-intake-us5-datadoghq.com,🧠 Claude"));
assert.ok(twice.rules.indexOf("GEOSITE,category-ai-!cn,🤖 其他 AI 服务") < twice.rules.indexOf(otherAiUdpGuard));
assert.ok(twice.rules.indexOf(otherAiUdpGuard) < twice.rules.indexOf("GEOSITE,category-ads-all,🚫 广告拦截"));
assert.ok(twice.rules.indexOf(otherAiUdpGuard) < twice.rules.indexOf("GEOSITE,apple,MS-Apple"));
const advertisingRuleIndex = twice.rules.indexOf("GEOSITE,category-ads-all,🚫 广告拦截");
const typesafeRule = "DOMAIN-SUFFIX,typesafe.ai,🤖 其他 AI 服务";
assert.equal(twice.rules.filter((rule) => rule === typesafeRule).length, 1);
assert.ok(twice.rules.indexOf(typesafeRule) < twice.rules.indexOf(otherAiUdpGuard));
for (const directRule of [
  "DOMAIN-SUFFIX,feishu.cn,DIRECT",
  "DOMAIN-SUFFIX,feishucdn.com,DIRECT",
  "DOMAIN-SUFFIX,feishu.net,DIRECT",
  "DOMAIN-SUFFIX,feishupkg.com,DIRECT",
  "DOMAIN-SUFFIX,pockyt.io,DIRECT"
]) {
  const directRuleIndex = twice.rules.indexOf(directRule);
  assert.notEqual(directRuleIndex, -1, `missing explicit direct rule: ${directRule}`);
  assert.ok(directRuleIndex < advertisingRuleIndex, `explicit direct rule must precede advertising: ${directRule}`);
}
console.log("PASS: Keep Alive fields and repeated execution");
