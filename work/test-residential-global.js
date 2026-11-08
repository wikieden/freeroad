const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(root, 'scripts/build-residential-script.cjs'), '--check']);
const script = fs.readFileSync(path.join(root, 'clash-global-residential-extend-script.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(script, ctx);
const providers = {
  airport: { type: 'file', path: './airport.yaml' },
  'private-fixed-ip': { type: 'inline', payload: [{ name: '美国01-手工', type: 'socks5' }] },
  'private-vps-direct': { type: 'file', path: './vps-direct.yaml' },
  'private-residential-manual': {
    type: 'inline', payload: [{ name: '美国01-手工｜链式', type: 'socks5', 'dialer-proxy': '🛫 出国前置' }]
  },
  'private-residential-vps': {
    type: 'file', path: './vps-chain.yaml',
    override: { 'dialer-proxy': '🛫 出国前置', 'additional-suffix': '｜链式' }
  }
};
const input = { 'proxy-providers': providers, proxies: [{ name: '美国-普通内嵌', type: 'ss' }] };
const base = ctx.freeroadBaseMain(structuredClone(input), 'base');
const output = ctx.main(structuredClone(input), 'residential');
const requestedDefaults = ctx.main({ ...structuredClone(input), 'freeroad-defaults': {
  claude:'🖥️ 美国 VPS 出口',openai:'🖥️ 美国 VPS 出口2',global:'🖥️ 自建 VPS'
}}, 'private-defaults');
for (const [name, expected] of [['🧠 Claude','🖥️ 美国 VPS 出口'],['✨ OpenAI/AI','🖥️ 美国 VPS 出口2'],['🎯 全局分流','🖥️ 自建 VPS']]) {
  assert.equal(requestedDefaults['proxy-groups'].find(g => g.name === name).proxies[0], expected);
}
assert(!Object.hasOwn(requestedDefaults, 'freeroad-defaults'));
assert.deepEqual(Array.from(requestedDefaults['proxy-groups'].find(g => g.name === '🖥️ 自建 VPS').use), ['private-vps-direct']);
assert(!requestedDefaults['proxy-groups'].find(g => g.name === '🛫 出国前置').proxies.includes('🎯 全局分流'));
const group = name => output['proxy-groups'].find(g => g.name === name);
const pinnedNames = ['🛫 出国前置','🖥️ 美国 VPS 出口','🖥️ 美国 VPS 出口2'];
const trailingNames = ['♻️ 其他国家自动','♻️ 出国前置自动'];
assert.deepEqual(Array.from(output['proxy-groups'].slice(0,3), g=>g.name), pinnedNames);
assert.equal(output['proxy-groups'][3].name, '🖥️ 自建 VPS');
assert.deepEqual(Array.from(output['proxy-groups'].slice(-2), g=>g.name), trailingNames);
const homeProviders = ['private-residential-manual', 'private-residential-vps'];
assert.deepEqual(Array.from(group('🖥️ 美国 VPS 出口').use), homeProviders.concat('private-vps-direct', 'private-fixed-ip'));
assert.deepEqual(Array.from(group('🖥️ 美国 VPS 出口2').use), homeProviders.concat('private-vps-direct', 'private-fixed-ip'));
assert.notEqual(group('🖥️ 美国 VPS 出口2').use, group('🖥️ 美国 VPS 出口').use);
assert.notEqual(group('🖥️ 美国 VPS 出口2').proxies, group('🖥️ 美国 VPS 出口').proxies);
assert.deepEqual(Array.from(group('🛫 出国前置').use), Object.keys(providers));
assert.deepEqual(Array.from(group('♻️ 出国前置自动').use), ['airport']);
for (const g of output['proxy-groups'].filter(g => g.type === 'url-test' && !['♻️ LisaVPS 自动','♻️ AkiVPS 自动'].includes(g.name))) {
  assert(group('🛫 出国前置').proxies.includes(g.name), `Missing automatic choice: ${g.name}`);
}
assert(!/住宅|IPIPGO|lychee|sunflare/i.test(group('🛫 出国前置')['exclude-filter']));
assert.equal(group('🛫 出国前置').proxies[0], '♻️ 出国前置自动');
assert.equal(group('🛫 出国前置')['empty-fallback'], 'REJECT');
for (const g of output['proxy-groups']) {
  if (!['🇮🇱 以色列全部节点', '🖥️ 美国 VPS 出口', '🖥️ 美国 VPS 出口2', '🛫 出国前置', '🧠 Claude', '✨ OpenAI/AI', '🔷 Google/Gemini/Antigravity'].includes(g.name)) assert(!(g.use || []).some(key => homeProviders.includes(key)));
  if (g.type === 'url-test' && !['♻️ LisaVPS 自动','♻️ AkiVPS 自动'].includes(g.name)) assert(!(g.use || []).some(key => key.startsWith('private-')));
}
assert(group('🇺🇸 美国全部节点').use.includes('private-fixed-ip'));
assert(group('🇺🇸 美国全部节点').use.includes('private-vps-direct'));
for (const name of ['🧠 Claude', '✨ OpenAI/AI', '🔷 Google/Gemini/Antigravity', '🤖 其他 AI 服务']) {
  const old = base['proxy-groups'].find(g => g.name === name);
  assert.deepEqual(Array.from(group(name).proxies).slice(0, -3), Array.from(old.proxies));
  assert.equal(group(name).proxies.at(-3), '🖥️ 美国 VPS 出口');
  assert.equal(group(name).proxies.at(-2), '🖥️ 美国 VPS 出口2');
}
assert.deepEqual(Array.from(output.rules), Array.from(base.rules));
for (const name of ['🎮 Steam','🎯 全局分流','🎬 国际媒体','❓ 未识别流量']) {
  assert(group(name).proxies.includes('🖥️ 美国 VPS 出口2'));
  assert.equal(group(name).proxies[0], base['proxy-groups'].find(g=>g.name===name).proxies[0]);
}
const rerun = ctx.main(structuredClone(output), 'repeat');
assert.deepEqual(Array.from(rerun['proxy-groups'].slice(0,3), g=>g.name), pinnedNames);
assert.deepEqual(Array.from(rerun['proxy-groups'].slice(-2), g=>g.name), trailingNames);
assert.equal(rerun['proxy-groups'].filter(g => g.name === '🖥️ 美国 VPS 出口').length, 1);
assert.equal(rerun['proxy-groups'].filter(g => g.name === '🖥️ 美国 VPS 出口2').length, 1);
assert.equal(new Set(group('🛫 出国前置').proxies).size, group('🛫 出国前置').proxies.length);
const inline = ctx.main({ ...structuredClone(input), proxies: input.proxies.concat([
  {name:'美国-Sunflare-原始',type:'socks5'},
  {name:'美国-Sunflare｜链式',type:'socks5','dialer-proxy':'🛫 出国前置'}
]) }, 'inline-residential');
const inlineFront = inline['proxy-groups'].find(g=>g.name==='🛫 出国前置');
assert(inlineFront.proxies.includes('美国-Sunflare-原始'));
assert(inlineFront.proxies.includes('美国-Sunflare｜链式'));
assert.throws(() => ctx.main({ 'proxy-providers': { 'private-residential-manual': providers['private-residential-manual'] } }, 'no-transit'));
const plain = ctx.main({ proxies: [{ name: '美国-普通', type: 'ss' }] }, 'no-residential');
assert(!plain['proxy-groups'].some(g => g.name === '🖥️ 美国 VPS 出口'));
const template = fs.readFileSync(path.join(root, 'templates/clash-global-private.example.yaml'), 'utf8');
assert(!/^rules:|^proxy-groups:/m.test(template));
assert(template.includes('REPLACE_LOCALLY'));
assert(template.includes('additional-suffix: ｜链式'));
console.log('PASS: residential groups, US choices, automatic exclusion, unrestricted manual transit, defaults and generated file');

for (const name of ["♻️ LisaVPS 自动","📋 LisaVPS 全部节点","🇭🇰 香港全部节点","🇸🇬 新加坡全部节点","🇯🇵 日本全部节点","🇮🇱 以色列全部节点"]) assert(group("🛫 出国前置").proxies.includes(name));

for (const n of ['🖥️ 美国 VPS 出口','🖥️ 美国 VPS 出口2']) {
  assert(group(n).proxies.includes('♻️ LisaVPS 自动'));
  assert(group(n).proxies.includes('📋 LisaVPS 全部节点'));
  assert.equal(group(n).filter, group('🇺🇸 美国全部节点').filter);
  assert(!group(n).use.includes('airport'));
  assert(!group(n).proxies.includes('🇺🇸 美国全部节点'));
  assert(!group(n).proxies.includes('♻️ 美国自动'));
}

const twoDefaults = ctx.main({...structuredClone(input), 'freeroad-defaults': {
  'egress1-provider':'private-fixed-ip', 'egress2-provider':'private-residential-manual'
}}, 'two-egress-defaults');
for (const [name, helper, provider] of [
  ['🖥️ 美国 VPS 出口','🇺🇸 美国 VPS 默认线路','private-fixed-ip'],
  ['🖥️ 美国 VPS 出口2','🇺🇸 美国 VPS 出口2默认线路','private-residential-manual']
]) {
  assert.equal(twoDefaults['proxy-groups'].find(g=>g.name===name).proxies[0],helper);
  assert.deepEqual(Array.from(twoDefaults['proxy-groups'].find(g=>g.name===helper).use),[provider]);
}

assert.deepEqual(Array.from(group('🖥️ 自建 VPS').proxies),['📋 LisaVPS 全部节点','♻️ LisaVPS 自动']);
assert.deepEqual(Array.from(group('🖥️ 自建 VPS').use),['private-vps-direct']);
const bothVps=ctx.main({...structuredClone(input),'proxy-providers':{
  ...structuredClone(providers),'private-akicloud-direct':{type:'file',path:'./aki.yaml'}
}},'both-self-hosted');
const selfGroup=bothVps['proxy-groups'].find(g=>g.name==='🖥️ 自建 VPS');
assert.deepEqual(Array.from(selfGroup.proxies),['📋 LisaVPS 全部节点','♻️ LisaVPS 自动','📋 AkiVPS 全部节点','♻️ AkiVPS 自动']);
assert(!selfGroup.proxies.includes('🖥️ 自建 VPS'));
assert.deepEqual(Array.from(selfGroup.use),['private-vps-direct','private-akicloud-direct']);
