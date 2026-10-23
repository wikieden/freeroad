const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const shadow=fs.readFileSync(path.join(root,'shadowrocket-global.conf'),'utf8').split(/\r?\n/);
const rule='RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Proxy/Proxy.list,🎯 国外代理';
const domain='DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Proxy/Proxy_Domain.list,🎯 国外代理';
for(const r of [rule,domain]){
 assert.equal(shadow.filter(l=>l===r).length,1,'Shadowrocket Proxy rule must occur once');
 assert(shadow.indexOf(r)>shadow.indexOf('GEOIP,CN,DIRECT'),'Domestic direct routes retain priority');
 assert(shadow.indexOf(r)<shadow.indexOf('FINAL,❓ 未识别流量'));
}
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 const input={proxies:[{name:'美国-test',type:'ss'}],'rule-providers':{personal:{type:'file',behavior:'domain',path:'./personal.yaml'}}};
 const out=ctx.main(input,'test'),providers=out['rule-providers'];
 assert.equal(providers.personal.path,'./personal.yaml');
 assert.equal(providers['freeroad-proxy'].behavior,'classical');
 assert.equal(providers['freeroad-proxy'].url,'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Proxy/Proxy_Classical.yaml');
 const r='RULE-SET,freeroad-proxy,🎯 全局分流';
 assert.equal(out.rules.filter(v=>v===r).length,1);
 for(const previous of ['GEOSITE,cn,DIRECT','GEOIP,cn,DIRECT','DOMAIN-SUFFIX,openai.com,✨ OpenAI/AI','DOMAIN-SUFFIX,steampowered.com,🎮 Steam'])assert(out.rules.indexOf(previous)<out.rules.indexOf(r));
 assert(out.rules.indexOf(r)<out.rules.indexOf('MATCH,❓ 未识别流量'));
 const twice=ctx.main(out,'repeat');assert.equal(twice.rules.filter(v=>v===r).length,1);
 assert.equal(twice['proxy-groups'].find(g=>g.name==='🎯 全局分流').proxies[0],'♻️ 全局自动');
}
console.log('PASS: Proxy coverage, domestic/service priority, preserved providers, defaults and repeated execution');
