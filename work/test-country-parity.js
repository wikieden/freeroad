const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {sections}=require('../scripts/build-private-config.cjs');
const root=path.resolve(__dirname,'..'),shadow=sections(fs.readFileSync(path.join(root,'shadowrocket-global.conf'),'utf8'));
const cases=[['🇺🇸','美国',['🇺🇸 01','线路-USA01','US-01','United_States01','New-York01']],['🌏','台湾',['🇹🇼 01','TWN-01','Taipei-01','Kaohsiung01']],['🇭🇰','香港',['🇭🇰 01','HK-01','Hong_Kong01']],['🇯🇵','日本',['🇯🇵 01','JP-01','Tokyo-01','Fukuoka01']],['🇸🇬','新加坡',['🇸🇬 01','SG-01','Singapore01']],['🇰🇷','韩国',['🇰🇷 01','KR-01','Seoul01']],['🇪🇺','欧洲',['🇨🇭 01','瑞士01','PL01','Dublin01']],['🌐','其他国家',['Canada01','Russia-01','Turkey-01','巴西01']]];
const tips=['美国-剩余流量','支持AI:美国/日本','中国-上海','回国-01','Mainland01','China01','🇨🇳 01'];
const getShadow=(name,n)=>{const l=shadow['Proxy Group'].find(l=>l.startsWith(name+' = '));assert(l);const p=l.slice(l.indexOf('policy-regex-filter=')+20).replace(/,select=0$/,'');return new RegExp(p.replace(/^\(\?i\)/,''),'i').test(n);};
const accepts=(g,n)=>{const re=p=>new RegExp(p.replace(/^\(\?i\)/,''),'i');return(!g.filter||re(g.filter).test(n))&&(!g['exclude-filter']||!re(g['exclude-filter']).test(n));};
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 const all=cases.flatMap(c=>c[2]).concat(tips);
 const inline=ctx.main({proxies:all.map(name=>({name,type:'ss'}))},'country-parity');
 const provider=ctx.main({'proxy-providers':{airport:{type:'file',path:'./airport.yaml'}}},'country-parity');
 for(const [icon,c,names]of cases)for(const name of names)for(const group of [icon+' '+c+'全部节点','♻️ '+c+'自动']){
  assert(getShadow(group,name),'Shadowrocket '+group+' misses '+name);
  assert(inline['proxy-groups'].find(g=>g.name===group).proxies.includes(name),file+' inline '+group+' misses '+name);
  assert(accepts(provider['proxy-groups'].find(g=>g.name===group),name),file+' provider '+group+' misses '+name);
  if(c!=='其他国家')assert(!accepts(provider['proxy-groups'].find(g=>g.name==='🌐 其他国家全部节点'),name));
 }
 for(const name of tips){const group='🌐 其他国家全部节点';assert(!getShadow(group,name));assert(!accepts(provider['proxy-groups'].find(g=>g.name===group),name));assert(!inline['proxy-groups'].find(g=>g.name===group).proxies.includes(name));}
}
console.log('PASS: public Shadowrocket/Clash inline/provider country flags, aliases, codes, cities and complementary other-country exclusions');
