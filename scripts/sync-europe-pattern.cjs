// Generate matching Europe selectors and complementary "other countries" filters.
// Keep this source private-data-free; generated clients cannot import Node modules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const aliases='欧洲|歐洲|德国|德國|法国|法國|英国|英國|荷兰|荷蘭|意大利|義大利|西班牙|瑞士|瑞典|挪威|芬兰|芬蘭|丹麦|丹麥|奥地利|奧地利|比利时|比利時|爱尔兰|愛爾蘭|波兰|波蘭|捷克|匈牙利|葡萄牙|希腊|希臘|罗马尼亚|羅馬尼亞|保加利亚|保加利亞|乌克兰|烏克蘭|塞尔维亚|塞爾維亞|克罗地亚|克羅地亞|冰岛|冰島|卢森堡|盧森堡|爱沙尼亚|愛沙尼亞|拉脱维亚|拉脫維亞|立陶宛|斯洛伐克|斯洛文尼亚|斯洛文尼亞|马耳他|馬耳他|塞浦路斯|阿尔巴尼亚|阿爾巴尼亞|北马其顿|北馬其頓|波黑|波斯尼亚|波斯尼亞|白俄罗斯|白俄羅斯|摩尔多瓦|摩爾多瓦|黑山|科索沃|列支敦士登|摩纳哥|摩納哥|安道尔|安道爾|圣马力诺|聖馬利諾|梵蒂冈|梵蒂岡|Germany|France|Britain|United[ _-]?Kingdom|Europe|Italy|Spain|Netherlands|Switzerland|Swiss|Sweden|Norway|Finland|Denmark|Austria|Belgium|Ireland|Poland|Czechia|Czech[ _-]?Republic|Hungary|Portugal|Greece|Romania|Bulgaria|Ukraine|Serbia|Croatia|Iceland|Luxembourg|Estonia|Latvia|Lithuania|Slovakia|Slovenia|Malta|Cyprus|Albania|North[ _-]?Macedonia|Bosnia|Herzegovina|Belarus|Moldova|Montenegro|Kosovo|Liechtenstein|Monaco|Andorra|San[ _-]?Marino|Vatican|London|Frankfurt|Milan|Madrid|Rome|Amsterdam|Paris|Berlin|Zurich|Zürich|Geneva|Stockholm|Oslo|Helsinki|Copenhagen|Vienna|Brussels|Dublin|Warsaw|Prague|Budapest|Lisbon|Athens|Bucharest|Sofia|Kyiv|Kiev|Belgrade|Zagreb|Reykjavik|Tallinn|Riga|Vilnius|Bratislava|Ljubljana|米兰|米蘭|马德里|馬德里|罗马|羅馬|伦敦|倫敦|巴黎|柏林|法兰克福|法蘭克福|阿姆斯特丹|苏黎世|蘇黎世|日内瓦|日內瓦|斯德哥尔摩|斯德哥爾摩|奥斯陆|奧斯陸|赫尔辛基|赫爾辛基|哥本哈根|维也纳|維也納|布鲁塞尔|布魯塞爾|都柏林|华沙|華沙|布拉格|布达佩斯|布達佩斯|里斯本|雅典';
const flags='🇪🇺|🇩🇪|🇫🇷|🇬🇧|🇳🇱|🇮🇹|🇪🇸|🇨🇭|🇸🇪|🇳🇴|🇫🇮|🇩🇰|🇦🇹|🇧🇪|🇮🇪|🇵🇱|🇨🇿|🇭🇺|🇵🇹|🇬🇷|🇷🇴|🇧🇬|🇺🇦|🇷🇸|🇭🇷|🇮🇸|🇱🇺|🇪🇪|🇱🇻|🇱🇹|🇸🇰|🇸🇮|🇲🇹|🇨🇾|🇦🇱|🇲🇰|🇧🇦|🇧🇾|🇲🇩|🇲🇪|🇽🇰|🇱🇮|🇲🇨|🇦🇩|🇸🇲|🇻🇦';
const codes='EU|UK|GB|DE|FR|NL|IT|ES|CH|SE|NO|FI|DK|AT|BE|IE|PL|CZ|HU|PT|GR|RO|BG|UA|RS|HR|IS|LU|EE|LV|LT|SK|SI|MT|CY|AL|MK|BA|BY|MD|ME|XK|LI|MC|AD|SM|VA';
const pattern='(?:'+aliases+'|'+flags+'|(?:^|[^A-Za-z])(?:'+codes+')(?:$|[^A-Za-z]))';
function updateShadowGroup(name,body){
 if(['🇪🇺 欧洲全部节点','♻️ 欧洲自动'].includes(name)){
  const start=body.indexOf('policy-regex-filter=(?i)^(?=.*(?:');
  if(start<0){assert(body.includes(pattern),'Unknown Europe selector format');return body;}
  const at=start+'policy-regex-filter=(?i)^(?=.*(?:'.length,end=body.indexOf('))(?!(?:.*(?:支持',at);assert(end>at,'Unknown Europe exclusion format');
  return body.slice(0,at)+pattern+body.slice(end);
 }
 if(['🌐 其他国家全部节点','♻️ 其他国家自动'].includes(name)&&!body.includes(pattern)){
  const marker=')))(?!.*(?:^|[ _-])';const at=body.indexOf(marker);assert(at>=0,'Unknown other-country exclusion format');
  return body.slice(0,at)+'|'+pattern+body.slice(at);
 }
 return body;
}
function generate(check=false){
 const root=path.resolve(__dirname,'..');
 const clash=path.join(root,'clash-goblal-extend-script.js'),shadow=path.join(root,'shadowrocket-global.conf');
 const original=fs.readFileSync(clash,'utf8');
 const updated=original.replace(/^    \{ key: "🇪🇺 欧洲",.*$/m,'    { key: "🇪🇺 欧洲",  re: /'+pattern+'/i, auto: true }');assert(updated.includes(pattern));
 const shadowOriginal=fs.readFileSync(shadow,'utf8');
 const shadowUpdated=shadowOriginal.split('\n').map(line=>{const at=line.indexOf(' = ');return at<0?line:line.slice(0,at+3)+updateShadowGroup(line.slice(0,at),line.slice(at+3));}).join('\n');
 for(const [file,a,b]of [[clash,original,updated],[shadow,shadowOriginal,shadowUpdated]]){if(check)assert.equal(a,b,'Run node scripts/sync-europe-pattern.cjs');else if(a!==b)fs.writeFileSync(file,b);}
 console.log(check?'PASS: generated Europe filters up to date':'Generated shared Europe filters');
}
module.exports={pattern,updateShadowGroup};
if(require.main===module)generate(process.argv.includes('--check'));
