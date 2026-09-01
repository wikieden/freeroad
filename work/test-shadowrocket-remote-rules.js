const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const configPath = path.resolve(__dirname, "../shadowrocket-global.conf");
const source = fs.readFileSync(configPath, "utf8");
const entries = source
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^(?:RULE|DOMAIN)-SET,/.test(line))
  .map((line) => {
    const [type, url] = line.split(",");
    return { type, url };
  });

assert.ok(entries.length >= 10, "expected remote Shadowrocket rule sets");
assert.equal(new Set(entries.map(({ url }) => url)).size, entries.length, "remote rule URLs must be unique");

async function validate({ type, url }) {
  const response = await fetch(url, {
    headers: { "user-agent": "freeroad-rule-validator" },
    signal: AbortSignal.timeout(20000)
  });
  assert.ok(response.ok, `${url} returned HTTP ${response.status}`);
  assert.doesNotMatch(response.headers.get("content-type") || "", /text\/html/i, `${url} returned HTML`);

  const text = await response.text();
  const activeLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  assert.ok(activeLines.length > 0, `${url} has no active rules`);

  if (type === "RULE-SET") {
    assert.ok(
      activeLines.some((line) => /^(?:DOMAIN|DOMAIN-SUFFIX|DOMAIN-KEYWORD|IP-CIDR|IP-CIDR6|IP-ASN|GEOIP),/.test(line)),
      `${url} does not contain Shadowrocket classical rules`
    );
  } else {
    assert.ok(
      activeLines.some((line) => /^(?:\+?\.)?[A-Za-z0-9_*?-]/.test(line)),
      `${url} does not contain a Shadowrocket domain set`
    );
  }
}

entries.reduce((previous, entry) => previous.then(() => validate(entry)), Promise.resolve())
  .then(() => console.log(`PASS: ${entries.length} remote Shadowrocket rule sets`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
