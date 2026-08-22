# Script Idempotency and Keep Alive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve personal rules across repeated script execution and replace the undocumented Keep Alive field with the current Mihomo field.

**Architecture:** Keep the single-file `main(config, name)` interface unchanged. Add one Node VM regression test that exercises the real script, then make two localized assignments in the production file.

**Tech Stack:** JavaScript compatible with Boa/QuickJS; Node.js `vm` and `node:assert/strict` for regression testing.

## Global Constraints

- Do not change Claude routing rules.
- Do not change Kiro/AWS routing rules.
- Do not change Google/Gemini/Antigravity groups, node scope, or rule order.
- Do not set `keep-alive-idle` or `keep-alive-interval`.
- Do not rename files or perform unrelated refactoring.

---

### Task 1: Add regression coverage and apply the two minimal fixes

**Files:**
- Create: `work/test-script-regressions.js`
- Modify: `clash-goblal-extend-script.js:39`
- Modify: `clash-goblal-extend-script.js:346-347`

**Interfaces:**
- Consumes: global function `main(config, name)` from `clash-goblal-extend-script.js`.
- Produces: a returned Clash config with official Keep Alive configuration and idempotent personal-rule preservation.

- [ ] **Step 1: Write the failing regression test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const scriptPath = require("node:path").resolve(__dirname, "../clash-goblal-extend-script.js");
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
console.log("PASS: Keep Alive fields and repeated execution");
```

- [ ] **Step 2: Run the regression test and verify RED**

Run: `node work/test-script-regressions.js`

Expected: FAIL because `disable-keep-alive` is absent; after moving that assertion below the marker checks if necessary for diagnosis, the existing script also fails because the second execution drops the marker and personal rule.

- [ ] **Step 3: Replace the Keep Alive field**

Replace:

```js
config["tcp-keep-alive"] = true;
```

with:

```js
config["disable-keep-alive"] = false;
```

- [ ] **Step 4: Preserve the personal-rule marker in the final rule array**

Replace:

```js
config["rules"] = personalRules.concat(universalRules)
  .filter((rule, index, rules) => rules.indexOf(rule) === index);
```

with:

```js
config["rules"] = [PERSONAL_RULES_MARKER].concat(personalRules, universalRules)
  .filter((rule, index, rules) => rules.indexOf(rule) === index);
```

- [ ] **Step 5: Run focused and compatibility verification**

Run:

```bash
node work/test-script-regressions.js
node --check clash-goblal-extend-script.js
node /Users/wiki/Documents/Codex/2026-08-18/ba/work/test-antigravity-policy.js /Users/wiki/Documents/ChatGPT/freeroad/clash-goblal-extend-script.js
```

Expected:

```text
PASS: Keep Alive fields and repeated execution
PASS: combined Google/Gemini/Antigravity policy group
```

- [ ] **Step 6: Review the final diff**

Run: `git diff --check && git diff -- clash-goblal-extend-script.js work/test-script-regressions.js`

Expected: no whitespace errors; production changes are limited to the Keep Alive assignment and marker-preserving concatenation.
