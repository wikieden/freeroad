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
assert.equal(twice.rules.filter((rule) => rule === marker).length, 1);
assert.equal(twice.rules.filter((rule) => rule === personalRule).length, 1);
assert.equal(
  twice.rules.some((rule) => rule.startsWith("IP-ASN,")),
  false,
  "public script must not require the separately downloaded ASN.mmdb during Windows validation"
);
assert.ok(twice.rules.includes("IP-CIDR,160.79.104.0/21,🧠 Claude,no-resolve"));
assert.ok(twice.rules.includes("IP-CIDR6,2607:6bc0::/32,🧠 Claude,no-resolve"));
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

const claudeUdpGuard = "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,anthropic.com),(DOMAIN-SUFFIX,claude.ai),(DOMAIN-SUFFIX,claude.com),(DOMAIN-SUFFIX,clau.de),(DOMAIN-SUFFIX,claudemcpclient.com),(DOMAIN-SUFFIX,claudemcpcontent.com),(DOMAIN-SUFFIX,claudeusercontent.com),(DOMAIN-SUFFIX,anthropicusercontent.com),(DOMAIN,anthropic.auth0.com),(DOMAIN,anthropic.com.cdn.cloudflare.net),(DOMAIN,servd-anthropic-website.b-cdn.net),(DOMAIN,anthropic-com.ghost.io),(DOMAIN,browser-intake-us5-datadoghq.com),(IP-CIDR,160.79.104.0/21),(IP-CIDR6,2607:6bc0::/32),(GEOSITE,anthropic)))),REJECT";
const openAiUdpGuard = "AND,((NETWORK,UDP),(OR,((GEOSITE,openai),(DOMAIN-SUFFIX,openai.com),(DOMAIN-SUFFIX,chatgpt.com),(DOMAIN-SUFFIX,oaistatic.com),(DOMAIN-SUFFIX,oaiusercontent.com),(DOMAIN-SUFFIX,oaistatsig.com),(DOMAIN-SUFFIX,openaimerge.com)))),REJECT";
const googleUdpGuard = "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,gemini.google.com),(DOMAIN-SUFFIX,generativelanguage.googleapis.com),(DOMAIN-KEYWORD,antigravity),(DOMAIN-KEYWORD,cloudcode-pa),(DOMAIN-KEYWORD,makersuite),(GEOSITE,youtube),(GEOSITE,google)))),REJECT";
const otherAiUdpGuard = "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,perplexity.ai),(DOMAIN-SUFFIX,pplx.ai),(DOMAIN-SUFFIX,cursor.sh),(DOMAIN-SUFFIX,cursor.com),(DOMAIN-SUFFIX,cursorapi.com),(DOMAIN-SUFFIX,cursor-cdn.com),(DOMAIN-SUFFIX,huggingface.co),(DOMAIN-SUFFIX,hf.co),(DOMAIN-SUFFIX,x.ai),(DOMAIN-SUFFIX,grok.com),(DOMAIN-SUFFIX,kiro.dev),(DOMAIN-SUFFIX,kiro.aws.dev),(DOMAIN,q.us-east-1.amazonaws.com),(DOMAIN,q.eu-central-1.amazonaws.com),(DOMAIN,cognito-identity.us-east-1.amazonaws.com),(GEOSITE,category-ai-!cn)))),REJECT";

for (const guard of [claudeUdpGuard, openAiUdpGuard, googleUdpGuard, otherAiUdpGuard]) {
  assert.equal(twice.rules.filter((rule) => rule === guard).length, 1, `missing UDP fail-closed guard: ${guard}`);
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
assert.ok(twice.rules.indexOf("GEOSITE,anthropic,🧠 Claude") < twice.rules.indexOf(claudeUdpGuard));
assert.ok(twice.rules.indexOf(claudeUdpGuard) < twice.rules.indexOf("GEOSITE,openai,✨ OpenAI/AI"));
assert.ok(twice.rules.indexOf("DOMAIN-SUFFIX,openaimerge.com,✨ OpenAI/AI") < twice.rules.indexOf(openAiUdpGuard));
assert.ok(twice.rules.indexOf(openAiUdpGuard) < twice.rules.indexOf("GEOSITE,google,🔷 Google/Gemini/Antigravity"));
assert.ok(twice.rules.indexOf("GEOSITE,google,🔷 Google/Gemini/Antigravity") < twice.rules.indexOf(googleUdpGuard));
assert.ok(twice.rules.indexOf(googleUdpGuard) < twice.rules.indexOf("DOMAIN-SUFFIX,perplexity.ai,🤖 其他 AI 服务"));
assert.ok(twice.rules.indexOf("GEOSITE,category-ai-!cn,🤖 其他 AI 服务") < twice.rules.indexOf(otherAiUdpGuard));
assert.ok(twice.rules.indexOf(otherAiUdpGuard) < twice.rules.indexOf("GEOSITE,category-ads-all,🚫 广告拦截"));
assert.ok(twice.rules.indexOf(otherAiUdpGuard) < twice.rules.indexOf("GEOSITE,apple,DIRECT"));
console.log("PASS: Keep Alive fields and repeated execution");
