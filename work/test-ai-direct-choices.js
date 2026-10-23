const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 const names=['美国普通02','新加坡高倍01 3x流量','日本普通03','美国新增出口','美国新增出口｜链式'];
 const input={proxies:names.map(name=>({name,type:'socks5',...(name.endsWith('｜链式')?{'dialer-proxy':'🛫 出国前置'}:{})})),'proxy-providers':{airport:{type:'file',path:'./airport.yaml'},'private-resip-direct':{type:'file',path:'./resip.yaml'},'private-residential-resip':{type:'file',path:'./resip-chain.yaml',override:{'dialer-proxy':'🛫 出国前置','additional-suffix':'｜链式'}}}};
 const out=ctx.main(input,'direct-ai');
 for(const app of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity']){
  const group=out['proxy-groups'].find(g=>g.name===app);
  for(const name of names)assert(group.proxies.includes(name),app+' missing inline choice '+name);
  for(const key of Object.keys(input['proxy-providers']))assert(group.use.includes(key),app+' missing provider '+key);
  assert.equal(group.proxies[0],'♻️ 美国自动');
  assert(group.proxies.includes('🇺🇸 美国全部节点'));
  for(const name of ['美国 Verizon · 主线','美国 Verizon · 备用｜链式','新加坡高倍01 3x流量','日本普通03']){
   assert(new RegExp(group.filter.replace(/^\(\?i\)/,''),'i').test(name));
   assert(!new RegExp(group['exclude-filter'].replace(/^\(\?i\)/,''),'i').test(name));
  }
  assert(!new RegExp(group.filter.replace(/^\(\?i\)/,''),'i').test('香港普通01'));
 }
 if(file.includes('residential'))for(const group of out['proxy-groups'].filter(g=>g.type==='url-test'))assert(!(group.use||[]).includes('private-residential-resip'));
}
console.log('PASS: Claude/OpenAI/Google direct inline and provider choices, chained copies, country filters and existing defaults');
