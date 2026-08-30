# Claude and OpenAI Quick Nodes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direct US, Taiwan, Japan, and Singapore node shortcuts to Claude and OpenAI without changing their country-group default.

**Architecture:** Build one cleaned direct-node list from the existing regional buckets and append it after the four country groups only for Claude and OpenAI. In Shadowrocket, retain explicit country-group entries and add the equivalent hardened `policy-regex-filter` only to those two service groups.

**Tech Stack:** JavaScript, Shadowrocket plain-text configuration, Node.js assertions, Mihomo v1.19.30.

## Global Constraints

- Preserve `clash-goblal-extend-script.js` spelling.
- Country groups remain first and keep the United States group as the default.
- Direct shortcuts include only US, Taiwan, Japan, and Singapore nodes after tip-node cleaning.
- Google and Other AI group membership remains unchanged.

---

### Task 1: Clash quick nodes

**Files:**
- Modify: `work/test-public-sanitization.js`
- Modify: `clash-goblal-extend-script.js`

- [ ] **Step 1: Write failing assertions**

Assert Claude and OpenAI proxy arrays equal:

```js
[
  "🇺🇸 美国节点", "🌏 台湾节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点",
  "US-A", "台湾-A", "日本-A", "新加坡-A"
]
```

Keep Google equal to the four country groups and Other AI equal to those groups plus Europe. Add a US tip fixture and assert it is absent.

- [ ] **Step 2: Run `node work/test-public-sanitization.js` and verify RED**

Expected: Claude/OpenAI arrays lack the four direct nodes.

- [ ] **Step 3: Implement the cleaned shortcut list**

```js
const majorAiDirectNodes = ["🇺🇸 美国", "🌏 台湾", "🇯🇵 日本", "🇸🇬 新加坡"]
  .reduce((nodes, key) => nodes.concat(buckets[key]), []);
const quickAiProxies = majorAiRegionGroups.concat(majorAiDirectNodes);
```

Assign `quickAiProxies` only to Claude and OpenAI.

- [ ] **Step 4: Re-run the test and verify GREEN**

---

### Task 2: Shadowrocket quick nodes

**Files:**
- Modify: `work/test-shadowrocket-config.js`
- Modify: `shadowrocket-global.conf`

- [ ] **Step 1: Write failing assertions**

Assert Claude and OpenAI retain the four explicit country groups and also contain `policy-regex-filter`. Assert the filter accepts `US-A`, `台湾-A`, `日本-A`, and `新加坡-A`; rejects Europe, Hong Kong, Korea, and `美国-剩余流量 50 GB`. Assert Google and Other AI have no service-level filter.

- [ ] **Step 2: Run `node work/test-shadowrocket-config.js` and verify RED**

Expected: Claude/OpenAI service lines lack `policy-regex-filter`.

- [ ] **Step 3: Add the exact combined filter**

Use the existing country terms for US, Taiwan, Japan, and Singapore plus the existing negative tip filter. Place it after the four country-group entries and before `select=0` on Claude and OpenAI only.

- [ ] **Step 4: Re-run the test and verify GREEN**

---

### Task 3: Documentation and publication

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document Claude/OpenAI direct shortcuts**

Explain that the first four entries are country groups, following entries are direct nodes, and the default remains the US country group.

- [ ] **Step 2: Run complete verification**

```bash
node --check clash-goblal-extend-script.js
node work/test-public-sanitization.js
node work/test-script-regressions.js
node work/test-shadowrocket-config.js
git diff --check
```

Generate a five-region fixture through the script and require Mihomo to report `configuration file /dev/stdin test is successful`.

- [ ] **Step 3: Commit and push**

Commit runtime changes as `feat: add Claude OpenAI quick nodes`, push `main`, and verify local `HEAD` matches remote `refs/heads/main`.
