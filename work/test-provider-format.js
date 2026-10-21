const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
for(const file of ['clash-goblal-extend-script.js','clash-global-residential-extend-script.js']){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
 const providers={ordinary:{type:'http',url:'https://example.invalid/sub'},custom:{type:'http',url:'https://example.invalid/custom',header:{'user-agent':['private-client'],'X-Test':['keep']}},disk:{type:'file',path:'./local.yaml'}};
 const output=ctx.main({'proxy-providers':providers},'format');
 assert.equal(output['proxy-providers'].ordinary.header?.['User-Agent']?.[0],'clash.meta','HTTP subscriptions must explicitly request Clash YAML');
 assert.equal(output['proxy-providers'].custom.header['user-agent'][0],'private-client');
 assert.equal(output['proxy-providers'].custom.header['User-Agent'],undefined,'Do not create duplicate case-insensitive header');
 assert.equal(output['proxy-providers'].custom.header['X-Test'][0],'keep');
 assert.equal(output['proxy-providers'].disk.header,undefined);
 const twice=ctx.main(output,'again');assert.equal(twice['proxy-providers'].ordinary.header['User-Agent'].length,1);
}
console.log('PASS: explicit Clash subscription format, preserved custom headers, file providers and repeated execution');
