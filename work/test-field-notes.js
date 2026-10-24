const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('docs/evidence/public-test-data.json'));
assert.equal(data.benchmark.nodes.length,180);
assert.equal(data.benchmark.nodes.reduce((s,r)=>s+r.probesPassed,0),743);
assert.equal(data.benchmark.nodes.reduce((s,r)=>s+r.probesAttempted,0),900);
assert.equal(data.benchmark.nodes.reduce((s,r)=>s+r.downloadsPassed,0),133);
assert.equal(data.benchmark.nodes.filter(r=>r.probesPassed===5&&r.downloadsPassed===2).length,48);
assert.equal(data.chainMatrix.rows.length,35);assert.equal(data.newAddressChains.rows.length,24);
for(const r of data.chainMatrix.rows){assert(r.openaiReachable>=0&&r.openaiReachable<=3);assert(r.claudeReachable>=0&&r.claudeReachable<=3);assert(!Object.hasOwn(r,'ip'));assert(!Object.hasOwn(r,'exitIps'));}
for(const r of data.benchmark.nodes)if(!r.downloadsPassed)assert.equal(r.medianMbps,null);
const publicDns=new Set(data.dnspy.rows.map(r=>r.resolver));
for(const file of ['docs/field-notes.md','docs/test-results.md','docs/evidence/public-test-data.json']){
 const text=read(file);
 assert.doesNotMatch(text,/\/Users\/|socks5?:\/\/|vless:\/\/|tuic:\/\/|\/sub\/[A-Za-z0-9]|sub\.resip|vimovox|hisense|password\s*[:=]|username\s*[:=]/i);
 if(file!=='docs/field-notes.md')for(const ip of text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)||[])assert(publicDns.has(ip),'Unexpected endpoint '+ip+' in '+file);
}
const siteFiles=['.nojekyll','manifest.json','index.html','test-results.html','field-notes.md','test-results.md','style.css','evidence/public-test-data.json'].sort();
function walk(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);}
assert.deepEqual(walk(path.join(root,'site')).sort(),siteFiles);
const crypto=require('node:crypto');for(const entry of JSON.parse(read('site/manifest.json')).files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'site',entry.file))).digest('hex'),entry.sha256);
for(const file of ['site/index.html','site/test-results.html']){
 const html=read(file);assert.match(html,/<html lang="zh-CN">/);assert(!html.includes('<script'));assert(!html.includes('/Users/'));
 for(const match of html.matchAll(/href="\.\/([^"#]*)(?:#([^"]+))?"/g)){
  const target=match[1];assert(fs.existsSync(path.join(root,'site',target)),'Missing link '+target);
  if(match[2])assert(read('site/'+target).includes('id="'+decodeURIComponent(match[2])+'"'),'Missing anchor '+match[2]);
 }
}
console.log('PASS: shareable metrics, nulls, endpoint redaction, static-only allowlist, manifest and cross-page anchors');
