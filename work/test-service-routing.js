const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {sections}=require('../scripts/build-private-config.cjs');
const cases={'registry.npmjs.org':'🛠️ GitHub/开发工具','files.pythonhosted.org':'🛠️ GitHub/开发工具','registry-1.docker.io':'🛠️ GitHub/开发工具','ghcr.io':'🛠️ GitHub/开发工具','youtube.com':'🔷 Google/Gemini/Antigravity','r1.googlevideo.com':'🔷 Google/Gemini/Antigravity','netflix.com':'🎬 国际媒体','open.spotify.com':'🎬 国际媒体','video.ttvnw.net':'🎬 国际媒体','www.amazon.com':'🛒 购物/支付','www.paypal.com':'🛒 购物/支付','js.stripe.com':'🛒 购物/支付','onedrive.live.com':'MS-Apple','icloud.com':'MS-Apple'};
function explicit(rules,host){for(const rule of rules){const [type,value,policy]=rule.split(',');if(type==='DOMAIN'&&host===value||type==='DOMAIN-SUFFIX'&&(host===value||host.endsWith('.'+value)))return policy;}}
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 const input={'proxy-providers':{airport:{type:'http',url:'https://example.invalid/sub',path:'./airport.yaml'},'private-vps-direct':{type:'file',path:'./vps.yaml'},'private-residential-vps':{type:'file',path:'./chain.yaml'}}};
 const out=ctx.main(input,'services');
 for(const [host,policy]of Object.entries(cases))assert.equal(explicit(out.rules,host),policy,host);
 assert(out.rules.indexOf('GEOSITE,youtube,🔷 Google/Gemini/Antigravity')<out.rules.indexOf('GEOSITE,google,🔷 Google/Gemini/Antigravity'));
 for(const host of ['amazonaws.com','cloudflare.com','alipay.com','amazon.cn'])assert(!explicit(out.rules,host),'No shared-cloud or domestic payment capture');
 assert.equal(out['proxy-groups'].find(g=>g.name==='🎬 国际媒体').proxies[0],'♻️ 全局自动');
 assert.equal(out['proxy-groups'].find(g=>g.name==='MS-Apple').proxies[0],'DIRECT');
}
const s=sections(fs.readFileSync('shadowrocket-global.conf','utf8'));
for(const [host,policy]of Object.entries(cases))assert.equal(explicit(s.Rule,host),policy,host);
assert(s.Rule.findIndex(r=>r.includes('/YouTube/YouTube.list,🔷 Google/Gemini/Antigravity'))<s.Rule.findIndex(r=>r.includes('/Google/Google.list,')));
console.log('PASS: developer/media/payment routing, YouTube priority, preserved MS-Apple and shared-domain exclusions');
