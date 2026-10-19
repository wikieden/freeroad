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
assert.deepEqual(Array.from(group('🏠 家宅出口').use), homeProviders);
for (const name of ['🛫 出国前置', '♻️ 出国前置自动']) {
  assert.deepEqual(Array.from(group(name).use), ['airport']);
  assert(!group(name).proxies.includes('美国01-手工'));
  assert.equal(group(name)['empty-fallback'], 'REJECT');
}
for (const g of output['proxy-groups']) {
  if (g.name !== '🏠 家宅出口') assert(!(g.use || []).some(key => homeProviders.includes(key)));
  if (g.type === 'url-test') assert(!(g.use || []).some(key => key.startsWith('private-')));
}
assert(group('🇺🇸 美国节点').use.includes('private-fixed-ip'));
assert(group('🇺🇸 美国节点').use.includes('private-vps-direct'));
for (const name of ['🧠 Claude', '✨ OpenAI/AI', '🔷 Google/Gemini/Antigravity', '🤖 其他 AI 服务']) {
  const old = base['proxy-groups'].find(g => g.name === name);
  assert.deepEqual(Array.from(group(name).proxies).slice(0, -1), Array.from(old.proxies));
  assert.equal(group(name).proxies.at(-1), '🏠 家宅出口');
}
const rerun = ctx.main(structuredClone(output), 'repeat');
assert.equal(rerun['proxy-groups'].filter(g => g.name === '🏠 家宅出口').length, 1);
assert.throws(() => ctx.main({ 'proxy-providers': { 'private-residential-manual': providers['private-residential-manual'] } }, 'no-transit'));
const plain = ctx.main({ proxies: [{ name: '美国-普通', type: 'ss' }] }, 'no-residential');
assert(!plain['proxy-groups'].some(g => g.name === '🏠 家宅出口'));
const template = fs.readFileSync(path.join(root, 'templates/clash-global-private.example.yaml'), 'utf8');
assert(!/^rules:|^proxy-groups:/m.test(template));
assert(template.includes('REPLACE_LOCALLY'));
assert(template.includes('additional-suffix: ｜链式'));
console.log('PASS: residential groups, US direct choices, automatic/transit exclusion, defaults, repeated execution and generated file');
