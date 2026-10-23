const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {sections}=require('../scripts/build-private-config.cjs');
const root=path.resolve(__dirname,'..');
const countries=[['🇺🇸','美国'],['🌏','台湾'],['🇭🇰','香港'],['🇯🇵','日本'],['🇸🇬','新加坡'],['🇰🇷','韩国'],['🇪🇺','欧洲'],['🌐','其他国家']];
const legacy=countries.map(([icon,c])=>icon+' '+c+'节点').concat('🌐 其它地区');
const input={'proxy-providers':{airport:{type:'file',path:'./airport.yaml'},'private-residential-vps':{type:'file',path:'./vps.yaml',override:{'dialer-proxy':'🛫 出国前置'}}}};
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 const out=ctx.main(structuredClone(input),'flat-country-test'),groups=out['proxy-groups'];
 for(const [icon,c]of countries){
  const all=groups.find(g=>g.name===icon+' '+c+'全部节点'),auto=groups.find(g=>g.name==='♻️ '+c+'自动');
  assert(all&&auto);assert.equal(all.type,'select');assert.equal(auto.type,'url-test');
  assert(!(all.proxies||[]).some(p=>groups.some(g=>g.name===p)),'All-nodes group must list nodes only');
 }
 for(const g of groups){assert(!legacy.includes(g.name));for(const p of g.proxies||[])assert(!legacy.includes(p));}
 for(const name of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务','🎮 Steam','🎯 全局分流','❓ 未识别流量']){
  const g=groups.find(g=>g.name===name);assert(g);for(const p of ['♻️ 美国自动','🇺🇸 美国全部节点'])assert(g.proxies.includes(p),name+' missing '+p);
 }
 assert.equal(groups.find(g=>g.name==='🧠 Claude').proxies[0],'♻️ 美国自动');
}
const s=sections(fs.readFileSync(path.join(root,'shadowrocket-global.conf'),'utf8'));
const names=new Set(s['Proxy Group'].map(l=>l.split(' = ')[0]));
for(const old of legacy){assert(!names.has(old));assert(!s['Proxy Group'].some(l=>l.split(',').includes(old)));}
for(const [icon,c]of countries){assert(names.has(icon+' '+c+'全部节点'));assert(names.has('♻️ '+c+'自动'));}
for(const name of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务','🎮 Steam','🎯 国外代理','❓ 未识别流量']){
 const line=s['Proxy Group'].find(l=>l.startsWith(name+' = '));for(const p of ['♻️ 美国自动','🇺🇸 美国全部节点'])assert(line.split(',').includes(p),name+' missing '+p);
}
console.log('PASS: two country selectors only, no old references, all-nodes contains no nested groups, applications expose auto and all');
