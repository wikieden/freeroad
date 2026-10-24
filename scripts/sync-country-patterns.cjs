// Public country aliases mirror the reviewed generic Shadowrocket selectors.
// Never read private overlays here: they may contain per-node names or addresses.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sections}=require('./build-private-config.cjs');
function europeExclusion(shadow){
 const patterns=['美国','香港','日本','新加坡','台湾','韩国'].map(country=>{
  const row=shadow['Proxy Group'].find(l=>l.startsWith('♻️ '+country+'自动 = '));
  const marker='policy-regex-filter=(?i)^(?=.*',start=row.indexOf(marker)+marker.length,end=row.indexOf(')(?!(?:.*(?:支持',start);assert(end>start);return row.slice(start,end);
 });
 return '(?!(?:.*(?:'+patterns.join('|')+')))';
}
function alignEuropePriority(body,exclusion){
 if(body.includes(exclusion))return body;
 const at=body.lastIndexOf('.*$');assert(at>=0,'Unknown Europe suffix');
 return body.slice(0,at)+exclusion+body.slice(at);
}
function generate(check=false){
 const root=path.resolve(__dirname,'..'),shadow=sections(fs.readFileSync(path.join(root,'shadowrocket-global.conf'),'utf8'));
 const file=path.join(root,'clash-goblal-extend-script.js'),before=fs.readFileSync(file,'utf8');let next=before;
 for(const [key,country]of [['🇺🇸 美国','美国'],['🌏 台湾','台湾'],['🇭🇰 香港','香港'],['🇯🇵 日本','日本'],['🇸🇬 新加坡','新加坡'],['🇰🇷 韩国','韩国']]){
  const row=shadow['Proxy Group'].find(l=>l.startsWith('♻️ '+country+'自动 = '));assert(row);
  const marker='policy-regex-filter=(?i)^(?=.*',start=row.indexOf(marker)+marker.length,end=row.indexOf(')(?!(?:.*(?:支持',start);assert(start>=marker.length&&end>start);
  const pattern=row.slice(start,end);assert(!pattern.includes('/'),'Escape regex delimiter explicitly');
  const prefix='    { key: '+JSON.stringify(key)+',';
  let found=false;next=next.split('\n').map(line=>{if(!line.startsWith(prefix))return line;found=true;return prefix+' re: /'+pattern+'/i, auto: true },';}).join('\n');assert(found,key);
 }
 const sf=path.join(root,'shadowrocket-global.conf'),sb=fs.readFileSync(sf,'utf8'),exclusion=europeExclusion(shadow);
 const sa=sb.split('\n').map(l=>{const at=l.indexOf(' = ');if(!['🇪🇺 欧洲全部节点','♻️ 欧洲自动'].includes(l.slice(0,at)))return l;return l.slice(0,at+3)+alignEuropePriority(l.slice(at+3),exclusion);}).join('\n');
 if(check){assert.equal(next,before,'Run node scripts/sync-country-patterns.cjs');assert.equal(sa,sb,'Run node scripts/sync-country-patterns.cjs');}
 else {if(next!==before)fs.writeFileSync(file,next);if(sa!==sb)fs.writeFileSync(sf,sa);}
 console.log(check?'PASS: public generic country aliases synchronized':'Generated public country aliases from generic Shadowrocket selectors');
}
module.exports={generate,europeExclusion,alignEuropePriority};
if(require.main===module)generate(process.argv.includes('--check'));
