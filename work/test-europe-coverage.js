const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {sections}=require('../scripts/build-private-config.cjs');
const root=path.resolve(__dirname,'..');
// First four reproduce omissions in the current SSONE subscription (2026-10-23).
const european=['pro-瑞士-5x','pro-波兰','pro-希腊-5x','pro-爱尔兰-2x','Sweden-01','Norway-2X','Finland-01','Denmark-01','Austria-01','Belgium-01','Portugal-01','Czechia-01','Hungary-01','Romania-01','Bulgaria-01','Ukraine-01','Serbia-01','Croatia-01','Iceland-01','Luxembourg-01','Estonia-01','Latvia-01','Lithuania-01','Slovakia-01','Slovenia-01','Malta-01','Cyprus-01','🇨🇭 01','🇸🇪 01','🇵🇱 01','CH01','CH-01','线路01_CH','SE01','PL01','Dublin-01','Zurich-01','Stockholm-01','Warsaw-01'];
const other=['Russia-01','Turkey-01','Canada-01','Australia-01','Brazil-01','Chile-01','US-01','Fukuoka-01','Seoul-01','瑞士-剩余流量 50GB'];
other.push('lite-家庭宽带-韩国sk-2x');
european.push('pro-乌克兰-2x','pro-立陶宛-5x','pro-保加利亚-1x','pro-塞尔维亚-2x','pro-克罗地亚-2x','pro-阿尔巴尼亚-2x');
const failures=[];
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 const nodes=Array.from(new Set(['美国-control','德国-control',...european,...other])).map(name=>({name,type:'ss'}));
 const inline=ctx.main({proxies:nodes},'eu-inline');
 const provider=ctx.main({'proxy-providers':{test:{type:'file',path:'./test.yaml'}}},'eu-provider');
 const accepts=(g,n)=>{const re=p=>new RegExp(p.replace(/^\(\?i\)/,''),'i');return (!g.filter||re(g.filter).test(n))&&(!g['exclude-filter']||!re(g['exclude-filter']).test(n));};
 for(const name of european){
  for(const group of ['🇪🇺 欧洲全部节点','♻️ 欧洲自动']){
   if(!inline['proxy-groups'].find(g=>g.name===group).proxies.includes(name))failures.push(file+' inline '+group+' misses '+name);
   if(!accepts(provider['proxy-groups'].find(g=>g.name===group),name))failures.push(file+' provider '+group+' misses '+name);
  }
  if(accepts(provider['proxy-groups'].find(g=>g.name==='🌐 其他国家全部节点'),name))failures.push(file+' other includes '+name);
 }
 for(const name of other)if(accepts(provider['proxy-groups'].find(g=>g.name==='🇪🇺 欧洲全部节点'),name))failures.push(file+' Europe misclassifies '+name);
}
const s=sections(fs.readFileSync(path.join(root,'shadowrocket-global.conf'),'utf8'));
const matches=(group,n)=>{const line=s['Proxy Group'].find(l=>l.startsWith(group+' = '));const p=line.slice(line.indexOf('policy-regex-filter=')+20).replace(/,select=0$/,'');return new RegExp(p.replace(/^\(\?i\)/,''),'i').test(n);};
for(const name of european){for(const group of ['🇪🇺 欧洲全部节点','♻️ 欧洲自动'])if(!matches(group,name))failures.push('Shadowrocket '+group+' misses '+name);for(const group of ['🌐 其他国家全部节点','♻️ 其他国家自动'])if(matches(group,name))failures.push('Shadowrocket '+group+' includes '+name);}
for(const name of other)if(matches('🇪🇺 欧洲全部节点',name))failures.push('Shadowrocket Europe misclassifies '+name);
assert.equal(failures.length,0,failures.slice(0,16).join('\n')+'\nTotal failures: '+failures.length);
console.log('PASS: European country, flag, city and bounded-code names; inline/provider/Shadowrocket membership is exclusive');
