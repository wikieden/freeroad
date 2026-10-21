// Credentials stay in a gitignored source directory. No network or client writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const digest = body => crypto.createHash('sha256').update(body).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const loadYaml = file => JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load_file(ARGV[0]))', file], {encoding: 'utf8', maxBuffer: 20e6}));
const dumpYaml = data => execFileSync('ruby', ['-ryaml', '-rjson', '-e', 'STDOUT.write(JSON.parse(STDIN.read).to_yaml)'], {input: JSON.stringify(data), encoding: 'utf8', maxBuffer: 20e6});
function sections(text) {
  const out = {}; let name;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\[[^\]]+\]$/.test(line)) { name = line.slice(1, -1); assert(!out[name], 'Duplicate section'); out[name] = []; }
    else if (name && line && !/^[#;]/.test(line)) out[name].push(line);
  }
  return out;
}
const key = line => line.slice(0, line.indexOf('=')).trim();
const fold = line => line.toLowerCase();
function records(lines) {
  const result = {};
  for (const line of lines || []) { assert(line.includes('='), 'Expected keyed setting'); assert(!Object.hasOwn(result, key(line)), 'Duplicate setting'); result[key(line)] = line.slice(line.indexOf('=') + 1).trim(); }
  return result;
}
function delta(base, own) {
  const before = records(base), after = records(own), set = {}, remove = [];
  for (const [k,v] of Object.entries(after)) if (before[k] !== v) set[k] = v;
  for (const k of Object.keys(before)) if (!Object.hasOwn(after, k)) remove.push(k);
  return {set, remove};
}
function mergeRecords(base, patch = {}) {
  const result = records(base);
  for (const k of patch.remove || []) delete result[k];
  Object.assign(result, patch.set || {});
  return Object.entries(result).map(([k,v]) => `${k} = ${v}`);
}
function initialize(publicText, privateText) {
  const base = sections(publicText), own = sections(privateText);
  assert(Object.keys(own).every(s => Object.hasOwn(base, s) || s === 'Proxy'), 'Unknown private section requires manual migration');
  // Native exports may uppercase group names. Normalize exact identifiers only,
  // never perform replacements inside credentials, URLs or regular expressions.
  const canonical = new Map((base['Proxy Group'] || []).map(l => [fold(key(l)), key(l)]));
  own['Proxy Group'] = (own['Proxy Group'] || []).map(line => {
    const name = canonical.get(fold(key(line))) || key(line);
    const body = line.slice(line.indexOf('=') + 1).trim().split(',').map(t => canonical.get(fold(t)) || t).join(',');
    return `${name} = ${body}`;
  });
  const publicRules = base.Rule || [], privateRules = own.Rule || [];
  const same = new Set(publicRules.map(fold));
  const extra = privateRules.filter(l => !same.has(fold(l)));
  const missing = publicRules.filter(l => !privateRules.some(p => fold(p) === fold(l)));
  // Arbitrary rule-order changes cannot be safely represented as prepend/remove.
  assert.deepEqual(privateRules.filter(l => same.has(fold(l))).map(fold), publicRules.filter(l => !missing.includes(l)).map(fold), 'Reordered rules require explicit migration');
  assert.deepEqual(privateRules.slice(0, extra.length), extra, 'Non-prefix private rules require explicit migration');
  const general = delta(base.General, own.General);
  // A private compiled profile must never update itself to the public-only file.
  general.set['update-url'] = '';
  return {schemaVersion: 1, general, hosts: delta(base.Host, own.Host), proxies: own.Proxy || [], groups: delta(base['Proxy Group'], own['Proxy Group']), groupOrder: own['Proxy Group'].map(key), prependRules: extra, removeRules: missing};
}
function composeShadow(publicText, overlay) {
  assert.equal(overlay.schemaVersion, 1);
  const base = sections(publicText);
  const removals = new Set((overlay.removeRules || []).map(fold));
  const rules = [...(overlay.prependRules || []), ...(base.Rule || []).filter(l => !removals.has(fold(l)))];
  assert.equal(rules.filter(l => /^FINAL,/.test(l)).length, 1, 'Exactly one FINAL required');
  assert(/^FINAL,/.test(rules.at(-1)), 'FINAL must remain last');
  const result = {General: mergeRecords(base.General, overlay.general), Proxy: overlay.proxies || [], 'Proxy Group': mergeRecords(base['Proxy Group'], overlay.groups), Rule: rules, Host: mergeRecords(base.Host, overlay.hosts)};
  if (overlay.groupOrder) {
    const order = new Map(overlay.groupOrder.map((name,index) => [name,index]));
    result['Proxy Group'].sort((a,b) => (order.get(key(a)) ?? Infinity) - (order.get(key(b)) ?? Infinity));
  }
  const names = new Set(['DIRECT', 'REJECT', ...result['Proxy Group'].map(key), ...result.Proxy.map(key)]);
  for (const rule of rules) {
    const parts = rule.split(',');
    const policy = parts[/^FINAL$/.test(parts[0]) ? 1 : 2];
    assert(names.has(policy), 'Rule references missing policy: ' + policy);
  }
  return '#!name=Freeroad Private Generated\n# Generated from public source + private overlay; do not hand-edit.\n' + Object.entries(result).map(([s,lines]) => `\n[${s}]\n${lines.join('\n')}\n`).join('');
}
function composeClash(script, fragment) {
  assert(!fragment.rules && !fragment['proxy-groups'], 'Private source must not duplicate public routing');
  const context = vm.createContext({input: structuredClone(fragment)});
  vm.runInContext(script, context, {timeout: 5000});
  const output = JSON.parse(JSON.stringify(vm.runInContext('main(input,"Freeroad Private")', context, {timeout: 5000})));
  output['allow-lan'] = false;
  assert(output.rules?.length && output['proxy-groups']?.length);
  return output;
}
function put(dir, file, text) {
  const target = path.join(dir, file);
  fs.mkdirSync(path.dirname(target), {recursive: true, mode: 0o700});
  fs.writeFileSync(target, text, {mode: 0o600, flag: 'wx'});
}
function privatePath(file) {
  const resolved = path.resolve(file), root = path.join(repo, 'local-subscriptions') + path.sep;
  assert(resolved.startsWith(root), 'Use a gitignored local-subscriptions directory');
  assert(!fs.existsSync(resolved), 'Preserve existing sources and versions; choose a new directory');
  return resolved;
}
function cli(args) {
  const [mode, sourceArg, outputArg] = args;
  assert(['init','build'].includes(mode) && sourceArg && outputArg, 'Usage: node scripts/build-private-config.cjs init <old-package> <new-private-source> | build <private-source> <new-output>');
  const source = path.resolve(sourceArg), output = privatePath(outputArg);
  assert(source.startsWith(path.join(repo, 'local-subscriptions') + path.sep), 'Private inputs must remain local');
  const publicShadow = read(path.join(repo, 'shadowrocket-global.conf'));
  if (mode === 'init') {
    const fragment = read(path.join(source, 'global-extension.yaml'));
    composeClash(read(path.join(repo, 'clash-global-residential-extend-script.js')), loadYaml(path.join(source, 'global-extension.yaml')));
    const overlay = initialize(publicShadow, read(path.join(source, 'freeroad-shadowrocket-us-vps.conf')));
    composeShadow(publicShadow, overlay);
    put(output, 'clash-private.yaml', fragment);
    put(output, 'shadowrocket-private.json', JSON.stringify(overlay, null, 2) + '\n');
    console.log(JSON.stringify({source: output, privateRules: overlay.prependRules.length, removedPublicRules: overlay.removeRules.length, clientApplied: false}));
    return;
  }
  const privateYaml = read(path.join(source, 'clash-private.yaml'));
  const overlay = JSON.parse(read(path.join(source, 'shadowrocket-private.json')));
  const script = read(path.join(repo, 'clash-global-residential-extend-script.js'));
  // Do not publish a stale combined public script.
  execFileSync(process.execPath, [path.join(repo, 'scripts/build-residential-script.cjs'), '--check']);
  const full = composeClash(script, loadYaml(path.join(source, 'clash-private.yaml')));
  const shadow = composeShadow(publicShadow, overlay);
  const files = {'global-extension.yaml': privateYaml, 'global-extension.js': script, 'freeroad-flclash.yaml': dumpYaml(full), 'freeroad-shadowrocket-us-vps.conf': shadow};
  const receipt = {schemaVersion: 1, publicCommit: execFileSync('git', ['rev-parse','HEAD'], {cwd:repo, encoding:'utf8'}).trim(), publicSources: Object.fromEntries(['shadowrocket-global.conf','clash-goblal-extend-script.js','templates/clash-residential-overlay.js'].map(f => [f,digest(read(path.join(repo,f)))])), privateSourceHashes: {'clash-private.yaml':digest(privateYaml),'shadowrocket-private.json':digest(JSON.stringify(overlay))}, files: Object.fromEntries(Object.entries(files).map(([f,t]) => [f,digest(t)])), clientApplied:false, runtimeVerified:false};
  for (const [f,t] of Object.entries(files)) put(output, f, t);
  put(output, 'receipt.json', JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({output, clashRules: full.rules.length, shadowRules: sections(shadow).Rule.length, clientApplied:false, runtimeVerified:false}));
}
module.exports = {sections, initialize, composeShadow, composeClash};
if (require.main === module) cli(process.argv.slice(2));
