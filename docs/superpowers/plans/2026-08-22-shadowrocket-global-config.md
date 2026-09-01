# Shadowrocket Global Config Implementation Plan

> Historical implementation snapshot. The delivered configuration has since changed; use the root README, `shadowrocket-global.conf`, and current tests as the source of truth.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a public-safe Shadowrocket configuration that sends LAN and China traffic direct, rejects ads, and forces foreign and AI traffic through proxy groups.

**Architecture:** Create one standalone `.conf` using Shadowrocket-native sections and maintained remote rule sets. Add a Node validator that checks section structure, policy references, AI group constraints, ordering, privacy, and final fallback behavior.

**Tech Stack:** Shadowrocket `.conf`; Node.js assertions; remote Shadowrocket rule sets from blackmatrix7.

## Global Constraints

- Claude, OpenAI, and Google groups are independent manual `select` groups.
- AI groups directly filter only US and Taiwan nodes and do not embed `url-test` groups.
- LAN and China traffic use `DIRECT`; ads use `REJECT`; final fallback uses `🎯 国外代理`.
- AI rules precede advertising rules to prevent false-positive blocking.
- No private relay, internal DNS, company domain, credential, MITM, or request/response script configuration.

---

### Task 1: Create and validate the Shadowrocket configuration

**Files:**
- Create: `work/test-shadowrocket-config.js`
- Create: `shadowrocket-global.conf`

**Interfaces:**
- Consumes: Shadowrocket configuration grammar and remote `RULE-SET` URLs.
- Produces: an importable `shadowrocket-global.conf` with `[General]`, `[Proxy Group]`, and `[Rule]` sections.

- [ ] **Step 1: Add a failing validator**

Create `work/test-shadowrocket-config.js` to assert the target file exists, required sections occur once, all policies resolve, AI groups are manual US/TW selectors, AI rules precede ads and China rules, `FINAL,🎯 国外代理` is last, and prohibited private/MITM fields are absent.

- [ ] **Step 2: Run the validator and verify RED**

Run: `node work/test-shadowrocket-config.js`

Expected: FAIL because `shadowrocket-global.conf` does not exist.

- [ ] **Step 3: Implement the minimal complete config**

Create the three required sections, direct-node AI groups, general overseas `url-test`, regional diagnostic groups, explicit AI fallbacks, remote service lists, China direct list, and final overseas proxy policy.

- [ ] **Step 4: Run local verification**

Run:

```bash
node work/test-shadowrocket-config.js
git diff --check
```

Expected: validator PASS and no whitespace errors.

- [ ] **Step 5: Verify every remote rule set**

Fetch every `RULE-SET` URL and assert an HTTP-success response with at least one active Shadowrocket rule line.

- [ ] **Step 6: Review privacy and scope**

Scan the generated config for private-network names, relay settings, credentials, `[MITM]`, `[Script]`, and rewrite sections; confirm only the Shadowrocket public configuration and its validator were added.
