// Generate the optional global script from the common public rules and overlay.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'sync-country-patterns.cjs'), '--check']);
execFileSync(process.execPath, [path.join(__dirname, 'sync-europe-pattern.cjs'), '--check']);
const base = fs.readFileSync(path.join(root, 'clash-goblal-extend-script.js'), 'utf8');
const overlay = fs.readFileSync(path.join(root, 'templates/clash-residential-overlay.js'), 'utf8');
assert.equal((base.match(/function main\(/g) || []).length, 1);
const output = base.replace(/function main\(/, 'function freeroadBaseMain(') + '\n' + overlay;
const target = path.join(root, 'clash-global-residential-extend-script.js');
if (process.argv.includes('--check')) {
  assert.equal(fs.readFileSync(target, 'utf8'), output, 'Regenerate the residential script after changing its sources');
  console.log('PASS: generated residential script matches its sources');
} else {
  fs.writeFileSync(target, output);
  console.log('Generated clash-global-residential-extend-script.js');
}
