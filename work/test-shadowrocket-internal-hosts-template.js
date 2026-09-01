const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const templatePath = path.resolve(__dirname, "../templates/shadowrocket-internal-hosts.example.sgmodule");
assert.ok(fs.existsSync(templatePath), "public Shadowrocket internal Hosts template must exist");

const source = fs.readFileSync(templatePath, "utf8");
const activeLines = source.split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const section = (name, nextName) => {
  const start = activeLines.indexOf(`[${name}]`);
  assert.notEqual(start, -1, `missing [${name}] section`);
  const end = nextName ? activeLines.indexOf(`[${nextName}]`) : activeLines.length;
  assert.ok(end > start, `invalid [${name}] section order`);
  return activeLines.slice(start + 1, end);
};

const general = new Map(section("General", "Rule").map((line) => line.split(/\s*=\s*/, 2)));
const rules = section("Rule", "Host");
const hosts = new Map(section("Host").map((line) => line.split(/\s*=\s*/, 2)));

assert.equal(general.get("use-local-host-item-for-proxy"), "true");
assert.deepEqual(rules, ["DOMAIN-SUFFIX,internal.example,DIRECT"]);
assert.equal(hosts.size, 2, "public template must contain only the documented placeholder Hosts");
assert.equal(hosts.get("nas.internal.example"), "10.0.0.10");
assert.equal(hosts.get("*.internal.example"), "server:system");

assert.match(source, /# \*\.in = server:<内部 DNS IP>/);
const privateDnsAddress = [172, 16, 4, 103].join(".");
assert.ok(!source.includes(privateDnsAddress), "public template must not contain the private DNS address");
assert.doesNotMatch(source, /(?:password|token|secret|api[_-]?key)\s*=/i);

console.log("PASS: public Shadowrocket internal Hosts template");
