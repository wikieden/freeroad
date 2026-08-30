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
console.log("PASS: Keep Alive fields and repeated execution");
