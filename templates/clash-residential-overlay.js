// Optional residential overlay. Credentials and subscriptions belong in local global YAML.
function main(config, name) {
  const homeProvider = key => /^private-(?:residential(?:-|$)|ipipgo-chain$)/.test(key);
  const originalProviders = config['proxy-providers'] || {};
  const homeProviders = Object.keys(originalProviders).filter(homeProvider);
  const ordinaryProviders = Object.keys(originalProviders).filter(key => !/^private-/.test(key));
  const output = freeroadBaseMain(config, name);
  if (!homeProviders.length) return output;
  const front = '🛫 出国前置', frontAuto = '♻️ 出国前置自动', home = '🏠 家宅出口';
  const residential = /固定[ _-]*IP|家宅|住宅|IPIPGO|lychee|sunflare|(?:vless|tuic)(?:[｜-]+链式)?$/i;
  const blockedInline = new Set((output.proxies || []).filter(p => p['dialer-proxy'] || residential.test(p.name)).map(p => p.name));
  const validInline = new Set((output.proxies || []).filter(p => !blockedInline.has(p.name)).map(p => p.name));
  const automatic = output['proxy-groups'].find(g => g.name === '♻️ 全局自动');
  const transit = (automatic?.proxies || []).filter(p => validInline.has(p));
  if (!transit.length && !ordinaryProviders.length) throw new Error('Residential chaining needs an independent transit subscription');
  for (const g of output['proxy-groups']) {
    if (g.use) g.use = g.use.filter(key => !homeProvider(key) && !(g.type === 'url-test' && /^private-/.test(key)));
    if (g.proxies) g.proxies = g.proxies.filter(key => !blockedInline.has(key) || !(output.proxies || []).find(p => p.name === key)?.['dialer-proxy']);
  }
  const exclude = '(?i)固定[ _-]*IP|家宅|住宅|IPIPGO|lychee|sunflare|(?:vless|tuic)(?:[｜-]+链式)?$|支持[ _-]*AI[ :：]|剩余|到期|过期|套餐|官网|公告|客服|回国|中国';
  const auto = {name:frontAuto,type:'url-test',proxies:transit.slice(),url:'https://www.gstatic.com/generate_204',interval:600,tolerance:50};
  const select = {name:front,type:'select',proxies:[frontAuto].concat(transit)};
  if (ordinaryProviders.length) for (const g of [auto, select]) Object.assign(g,{use:ordinaryProviders.slice(),'exclude-filter':exclude,'empty-fallback':'REJECT'});
  output['proxy-groups'].push(auto,select,{name:home,type:'select',proxies:[],use:homeProviders,'empty-fallback':'REJECT'});
  for (const app of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务']) {
    const g = output['proxy-groups'].find(g => g.name === app);
    if (!g) throw new Error('Missing AI application group');
    // Keep the old default; users explicitly choose residential egress when needed.
    g.proxies = g.proxies.filter(p => p !== home).concat(home);
  }
  return output;
}
