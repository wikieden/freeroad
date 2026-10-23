const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const {sections, composeShadow} = require('../scripts/build-private-config.cjs');
const root = path.resolve(__dirname, '..');
const name = '❓ 未识别流量';
const shadow = fs.readFileSync(path.join(root, 'shadowrocket-global.conf'), 'utf8');
const s = sections(shadow);
assert.equal(s.Rule.at(-1), 'FINAL,' + name);
assert.equal(s.Rule.filter(r => r.startsWith('FINAL,')).length, 1);
const group = s['Proxy Group'].find(r => r.startsWith(name + ' = '));
assert(group);
assert(group.startsWith(name + ' = select,🎯 国外代理,DIRECT,'));
assert(s.Rule.some(r => r.endsWith(',🎯 国外代理') && r.startsWith('RULE-SET,')));
// A private overlay must inherit the new fallback without editing its credentials.
const privateShadow = composeShadow(shadow, {schemaVersion:1, general:{}, hosts:{}, proxies:[], groups:{}, prependRules:[], removeRules:[]});
assert.equal(sections(privateShadow).Rule.at(-1), 'FINAL,' + name);
for (const file of ['clash-goblal-extend-script.js', 'clash-global-residential-extend-script.js']) {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  const out = ctx.main({proxies:[{name:'美国-test',type:'socks5'}]}, 'unmatched-test');
  assert.equal(out.rules.at(-1), 'MATCH,' + name);
  assert.equal(out.rules.filter(r => r.startsWith('MATCH,')).length, 1);
  const g = out['proxy-groups'].find(g => g.name === name);
  assert(g);
  assert.deepEqual(Array.from(g.proxies.slice(0,2)), ['🎯 全局分流','DIRECT']);
  assert(!out['proxy-groups'].find(g => g.name === '🎯 全局分流').proxies.includes(name), 'No fallback/main selector loop');
  assert(out.rules.includes('RULE-SET,freeroad-proxy,🎯 全局分流'), 'Known proxy list retains original route');
}
console.log('PASS: unmatched-only terminal routing, direct option, preserved proxy default and no main-group loop');
