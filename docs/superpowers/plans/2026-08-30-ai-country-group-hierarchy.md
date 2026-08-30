# AI Country Group Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route each AI service group through country-level groups where users can choose same-country automatic testing or a fixed node.

**Architecture:** Reuse Clash's existing country `select` groups and their nested `url-test` groups. Restructure Shadowrocket country groups into the same two-level shape, then point the four AI service groups at country groups rather than directly filtered nodes.

**Tech Stack:** JavaScript (Boa/QuickJS-compatible ES syntax), Node.js assertions, Mihomo v1.19.30, Shadowrocket plain-text configuration.

## Global Constraints

- Preserve the exact filename `clash-goblal-extend-script.js`.
- Claude, OpenAI, and Google groups reference United States, Taiwan, Japan, and Singapore country groups in that order.
- Other AI additionally references the Europe country group.
- Automatic selection never crosses country boundaries.
- Existing DNS, rules, UDP fail-closed guards, and public sanitization requirements remain unchanged.

---

### Task 1: Clash country hierarchy

**Files:**
- Modify: `work/test-public-sanitization.js`
- Modify: `work/test-script-regressions.js`
- Modify: `clash-goblal-extend-script.js`

**Interfaces:**
- Consumes: `REGIONS`, `buckets`, `REGION_NAMES`, and generated country groups.
- Produces: `majorAiRegionGroups: string[]` and `otherAiRegionGroups: string[]` used as AI group `proxies` arrays.

- [ ] **Step 1: Write the failing hierarchy assertions**

Use test proxies `US-A`, `台湾-A`, `日本-A`, `新加坡-A`, and `德国-A`. Assert that the first three AI groups contain:

```js
["🇺🇸 美国节点", "🌏 台湾节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点"]
```

Assert that `🤖 其他 AI 服务` additionally ends with `🇪🇺 欧洲节点`. Assert the five pairs `🇺🇸 美国节点`/`♻️ 美国自动`, `🌏 台湾节点`/`♻️ 台湾自动`, `🇯🇵 日本节点`/`♻️ 日本自动`, `🇸🇬 新加坡节点`/`♻️ 新加坡自动`, and `🇪🇺 欧洲节点`/`♻️ 欧洲自动`, with each automatic group first and matching concrete nodes afterward.

- [ ] **Step 2: Run the Clash tests and verify RED**

Run:

```bash
node work/test-public-sanitization.js
node work/test-script-regressions.js
```

Expected: hierarchy assertions fail because AI groups still contain raw US/Taiwan node names.

- [ ] **Step 3: Implement country-group references**

After country groups are generated, build the group names only when their buckets exist:

```js
const existingRegionGroup = (key) => buckets[key].length > 0 ? key + "节点" : null;
const majorAiRegionGroups = ["🇺🇸 美国", "🌏 台湾", "🇯🇵 日本", "🇸🇬 新加坡"]
  .map(existingRegionGroup)
  .filter(Boolean);
const europeRegionGroup = existingRegionGroup("🇪🇺 欧洲");
const otherAiRegionGroups = majorAiRegionGroups.concat(europeRegionGroup ? [europeRegionGroup] : []);
```

Require `majorAiRegionGroups.length > 0`. Assign it to Claude, OpenAI, and Google; assign `otherAiRegionGroups` to Other AI. Keep country groups as `select` with their automatic group first and raw nodes afterward.

- [ ] **Step 4: Run the Clash tests and verify GREEN**

Run the two Node tests again. Expected: both print `PASS` and exit 0.

---

### Task 2: Shadowrocket country hierarchy

**Files:**
- Modify: `work/test-shadowrocket-config.js`
- Modify: `shadowrocket-global.conf`

**Interfaces:**
- Consumes: subscription nodes selected through `policy-regex-filter`.
- Produces: visible country `select` groups and nested `♻️ ...自动` `url-test` groups.

- [ ] **Step 1: Write the failing Shadowrocket assertions**

Assert the service groups explicitly reference these country groups:

```js
const majorCountries = ["🇺🇸 美国节点", "🌏 台湾节点", "🇯🇵 日本节点", "🇸🇬 新加坡节点"];
const otherCountries = majorCountries.concat("🇪🇺 欧洲节点");
```

For each country, assert the visible group is `select`, references the matching automatic group, and retains `policy-regex-filter`; assert the automatic group is `url-test` with the same country filter.

- [ ] **Step 2: Run the Shadowrocket test and verify RED**

Run `node work/test-shadowrocket-config.js`.

Expected: failure because AI groups still use direct filters and country groups are still single-level `url-test` groups.

- [ ] **Step 3: Implement nested Shadowrocket groups**

Change the four AI service groups to country references. For each country, use this exact shape:

```text
🇺🇸 美国节点 = select,♻️ 美国自动,policy-regex-filter=(?i)(🇺🇸|(?:^|[ _-])USA?(?:$|[ _-])|United[ _-]?States|America|美国|洛杉矶|圣何塞|硅谷),select=0
♻️ 美国自动 = url-test,url=http://www.gstatic.com/generate_204,interval=600,tolerance=50,timeout=5,select=0,policy-regex-filter=(?i)(🇺🇸|(?:^|[ _-])USA?(?:$|[ _-])|United[ _-]?States|America|美国|洛杉矶|圣何塞|硅谷)
```

Use these exact filters for the remaining regions:

```text
Taiwan: (?i)(🇹🇼|(?:^|[ _-])TWN?(?:$|[ _-])|Taiwan|Taipei|台湾|台灣|台北)
Japan: (?i)(🇯🇵|(?:^|[ _-])JP(?:$|[ _-])|Japan|Tokyo|日本|东京|大阪)
Singapore: (?i)(🇸🇬|(?:^|[ _-])SG(?:$|[ _-])|Singapore|新加坡|狮城)
Europe: (?i)(🇪🇺|🇩🇪|🇫🇷|🇬🇧|🇳🇱|🇮🇹|🇪🇸|欧洲|德国|法国|英国|荷兰|意大利|西班牙|Germany|France|Britain|Europe|(?:^|[ _-])(?:UK|GB|DE|FR|NL)(?:$|[ _-])|London|Frankfurt)
```

Only `🤖 其他 AI 服务` references Europe.

- [ ] **Step 4: Run the Shadowrocket test and verify GREEN**

Run `node work/test-shadowrocket-config.js`.

Expected: `PASS: Shadowrocket config` and exit 0.

---

### Task 3: Documentation and end-to-end verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the final country hierarchy from Tasks 1 and 2.
- Produces: user guidance that matches both client formats.

- [ ] **Step 1: Update README behavior and safety guidance**

Document the path `AI 服务组 → 国家节点组 → 自动/具体节点`, list the four countries for the three major groups and Europe for Other AI, and explain that country auto may change IP inside one country.

- [ ] **Step 2: Run the complete regression suite**

Run:

```bash
node --check clash-goblal-extend-script.js
node work/test-public-sanitization.js
node work/test-script-regressions.js
node work/test-shadowrocket-config.js
git diff --check
```

Expected: all tests print `PASS`; syntax and diff checks exit 0.

- [ ] **Step 3: Validate with Mihomo v1.19.30**

Generate a configuration from the script using US, Taiwan, Japan, Singapore, and Germany Shadowsocks fixtures, pipe the JSON to `mihomo -t -f /dev/stdin`, and require `configuration file /dev/stdin test is successful`.

- [ ] **Step 4: Commit and publish**

Stage only the spec, plan, two runtime configurations, README, and three test files. Commit with:

```bash
git commit -m "feat: add nested AI country selectors"
```

Push `main`, then verify local `HEAD` equals `refs/heads/main` from `git ls-remote origin`.
