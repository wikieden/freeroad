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

const claudeUdpGuard = "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,anthropic.com),(DOMAIN-SUFFIX,claude.ai),(DOMAIN-SUFFIX,claude.com),(DOMAIN-SUFFIX,clau.de),(DOMAIN-SUFFIX,claudemcpclient.com),(DOMAIN-SUFFIX,claudemcpcontent.com),(DOMAIN-SUFFIX,claudeusercontent.com),(DOMAIN-SUFFIX,anthropicusercontent.com),(DOMAIN,anthropic.auth0.com),(DOMAIN,anthropic.com.cdn.cloudflare.net),(DOMAIN,servd-anthropic-website.b-cdn.net),(DOMAIN,anthropic-com.ghost.io),(DOMAIN-SUFFIX,sentry.io),(DOMAIN-SUFFIX,statsigapi.net),(DOMAIN-KEYWORD,datadog),(DOMAIN-KEYWORD,sift),(DOMAIN-SUFFIX,intercom.io),(DOMAIN-SUFFIX,intercomcdn.com),(DOMAIN,cdn.usefathom.com),(IP-CIDR,160.79.104.0/21),(IP-CIDR6,2607:6bc0::/32),(GEOSITE,anthropic)))),REJECT";
const openAiUdpGuard = "AND,((NETWORK,UDP),(OR,((GEOSITE,openai),(DOMAIN-SUFFIX,openai.com),(DOMAIN-SUFFIX,chatgpt.com),(DOMAIN-SUFFIX,perplexity.ai),(DOMAIN-SUFFIX,cursor.sh),(DOMAIN-SUFFIX,cursor.com),(DOMAIN-SUFFIX,huggingface.co)))),REJECT";
const googleUdpGuard = "AND,((NETWORK,UDP),(OR,((DOMAIN-SUFFIX,gemini.google.com),(DOMAIN-SUFFIX,generativelanguage.googleapis.com),(DOMAIN-KEYWORD,antigravity),(DOMAIN-KEYWORD,cloudcode-pa),(DOMAIN-KEYWORD,makersuite),(GEOSITE,youtube),(GEOSITE,google)))),REJECT";

for (const guard of [claudeUdpGuard, openAiUdpGuard, googleUdpGuard]) {
  assert.equal(twice.rules.filter((rule) => rule === guard).length, 1, `missing UDP fail-closed guard: ${guard}`);
}
assert.ok(twice.rules.indexOf("GEOSITE,anthropic,🧠 Claude") < twice.rules.indexOf(claudeUdpGuard));
assert.ok(twice.rules.indexOf(claudeUdpGuard) < twice.rules.indexOf("GEOSITE,openai,✨ OpenAI/AI"));
assert.ok(twice.rules.indexOf("DOMAIN-SUFFIX,huggingface.co,✨ OpenAI/AI") < twice.rules.indexOf(openAiUdpGuard));
assert.ok(twice.rules.indexOf("GEOSITE,google,🔷 Google/Gemini/Antigravity") < twice.rules.indexOf(googleUdpGuard));
assert.ok(twice.rules.indexOf(googleUdpGuard) < twice.rules.indexOf("GEOSITE,apple,DIRECT"));
console.log("PASS: Keep Alive fields and repeated execution");
