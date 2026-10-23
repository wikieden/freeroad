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
const group = name => output['proxy-groups'].find(g => g.name === name);
const homeProviders = ['private-residential-manual', 'private-residential-vps'];
assert.deepEqual(Array.from(group('🖥️ 美国 VPS 出口').use), homeProviders);
assert.deepEqual(Array.from(group('🛫 出国前置').use), Object.keys(providers));
assert.deepEqual(Array.from(group('♻️ 出国前置自动').use), ['airport']);
for (const g of output['proxy-groups'].filter(g => g.type === 'url-test')) {
  assert(group('🛫 出国前置').proxies.includes(g.name), `Missing automatic choice: ${g.name}`);
}
assert(!/住宅|IPIPGO|lychee|sunflare/i.test(group('🛫 出国前置')['exclude-filter']));
assert.equal(group('🛫 出国前置').proxies[0], '♻️ 出国前置自动');
assert.equal(group('🛫 出国前置')['empty-fallback'], 'REJECT');
for (const g of output['proxy-groups']) {
  if (!['🖥️ 美国 VPS 出口', '🛫 出国前置', '🧠 Claude', '✨ OpenAI/AI', '🔷 Google/Gemini/Antigravity'].includes(g.name)) assert(!(g.use || []).some(key => homeProviders.includes(key)));
  if (g.type === 'url-test') assert(!(g.use || []).some(key => key.startsWith('private-')));
}
assert(group('🇺🇸 美国全部节点').use.includes('private-fixed-ip'));
assert(group('🇺🇸 美国全部节点').use.includes('private-vps-direct'));
for (const name of ['🧠 Claude', '✨ OpenAI/AI', '🔷 Google/Gemini/Antigravity', '🤖 其他 AI 服务']) {
  const old = base['proxy-groups'].find(g => g.name === name);
  assert.deepEqual(Array.from(group(name).proxies).slice(0, -1), Array.from(old.proxies));
  assert.equal(group(name).proxies.at(-1), '🖥️ 美国 VPS 出口');
}
const rerun = ctx.main(structuredClone(output), 'repeat');
assert.equal(rerun['proxy-groups'].filter(g => g.name === '🖥️ 美国 VPS 出口').length, 1);
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
