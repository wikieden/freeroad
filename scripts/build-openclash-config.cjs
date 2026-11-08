// Build a standalone, credential-free OpenClash starter from the common rules.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function build(){
 execFileSync(process.execPath,[path.join(__dirname,'build-residential-script.cjs'),'--check']);
 const input=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e','puts JSON.generate(YAML.load_file(ARGV[0]))',path.join(root,'templates/openclash-providers.example.yaml')],{encoding:'utf8'}));
 assert.deepEqual(Object.keys(input),['proxy-providers']);
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'clash-goblal-extend-script.js'),'utf8'),ctx);
 const config=JSON.parse(JSON.stringify(ctx.main(input,'Freeroad OpenClash Public')));
 Object.assign(config,{'mixed-port':7890,'redir-port':7892,'tproxy-port':7893,'allow-lan':true,'bind-address':'*','lan-allowed-ips':['127.0.0.0/8','10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','100.64.0.0/10','169.254.0.0/16','::1/128','fc00::/7','fe80::/10'],'external-controller':'127.0.0.1:9090',secret:'CHANGE_ME_BEFORE_USE','find-process-mode':'off','log-level':'info'});
 // OpenClash owns firewall/DNS forwarding and may overwrite these router ports.
 config.dns.listen='127.0.0.1:7874';
 const yaml=execFileSync('ruby',['-ryaml','-rjson','-e','STDOUT.write(JSON.parse(STDIN.read).to_yaml)'],{input:JSON.stringify(config),encoding:'utf8',maxBuffer:20e6});
 return '# Freeroad OpenClash PUBLIC starter (Mihomo/Meta).\n# Replace proxy-providers.airport.url and secret LOCALLY before use.\n# Not a working subscription; never publish your filled copy.\n# Upload this full YAML, not the JS or the FlClash split bootstrap.\n# OpenClash must configure firewall, traffic capture and DNS forwarding.\n# Router integration is not verified by desktop syntax validation.\n'+yaml;
}
function cli(){const output=build(),target=path.join(root,'openclash-public.yaml');if(process.argv.includes('--check')){assert.equal(fs.readFileSync(target,'utf8'),output,'Run node scripts/build-openclash-config.cjs');console.log('PASS: OpenClash public YAML matches common public rules');}else{fs.writeFileSync(target,output);console.log('Generated openclash-public.yaml');}}
module.exports={build};
if(require.main===module)cli();
