const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {sections,composeShadow}=require('../scripts/build-private-config.cjs');
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 const out=ctx.main({'proxy-providers':{airport:{type:'http',url:'https://example.invalid/sub',path:'./airport.yaml'}}},'test');
 const g=out['proxy-groups'].find(g=>g.name==='MS-Apple');assert(g&&g.proxies[0]==='DIRECT');assert(g.proxies.includes('🎯 全局分流'));
 for(const rule of ['GEOSITE,apple,MS-Apple','GEOSITE,microsoft,MS-Apple','DOMAIN-SUFFIX,windowsupdate.com,MS-Apple','DOMAIN-SUFFIX,onedrive.live.com,MS-Apple'])assert(out.rules.includes(rule));
 assert(out.rules.indexOf('GEOSITE,github,🎯 全局分流')<out.rules.indexOf('GEOSITE,microsoft,MS-Apple'));
 assert(out.rules.indexOf('GEOSITE,microsoft,MS-Apple')<out.rules.indexOf('GEOSITE,cn,DIRECT'));
 assert(!out.rules.includes('GEOSITE,microsoft@cn,DIRECT'),'No unconditional China bypass ahead of selector');
}
const text=fs.readFileSync('shadowrocket-global.conf','utf8');
const s=sections(composeShadow(text,{schemaVersion:1,groups:{},general:{},hosts:{},proxies:[]}));
assert(s['Proxy Group'].some(g=>g.startsWith('MS-Apple = select,DIRECT,')&&g.endsWith('select=0')));
const ms=s.Rule.findIndex(r=>r.includes('/Microsoft/Microsoft.list,MS-Apple'));
assert(ms>=0&&ms<s.Rule.findIndex(r=>r.includes('/China/China.list,')));
assert(s.Rule.findIndex(r=>r.includes('/GitHub/GitHub.list,'))<ms);
assert(s.Rule.includes('DOMAIN-SUFFIX,icloud-content.com,MS-Apple'));
console.log('PASS: MS-Apple defaults DIRECT, covers vendor services and preserves specific-service priority');
