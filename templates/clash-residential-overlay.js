// Optional fixed VPS egress overlay. Legacy provider keys remain compatible.
// Group labels do not establish residential IP status. Keep credentials private.
function main(config, name) {
  const homeProvider = key => /^private-(?:residential(?:-|$)|ipipgo-chain$)/.test(key);
  const originalProviders = config['proxy-providers'] || {};
  const homeProviders = Object.keys(originalProviders).filter(homeProvider);
  const ordinaryProviders = Object.keys(originalProviders).filter(key => !/^private-/.test(key));
  const output = freeroadBaseMain(config, name);
  const defaults = output['freeroad-defaults'];
  delete output['freeroad-defaults'];
  if (!homeProviders.length) return output;
  // These manual AI selectors expose original and chained exits directly.
  // Snapshot before generic cleanup, which still isolates automatic pools.
  const directAiApps = ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity'];
  const directAiChoices = new Map(output['proxy-groups']
    .filter(g => directAiApps.includes(g.name))
    .map(g => [g.name, g.proxies.slice()]));
  const front = '🛫 出国前置', frontAuto = '♻️ 出国前置自动', home = '🖥️ 美国 VPS 出口', home2 = '🖥️ 美国 VPS 出口2';
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
  if (ordinaryProviders.length) Object.assign(auto,{use:ordinaryProviders.slice(),'exclude-filter':exclude,'empty-fallback':'REJECT'});
  // The manual selector intentionally exposes every automatic group and provider,
  // including residential chained copies. The user owns loop avoidance here.
  // Keep the existing default and the automatic transit pool unchanged.
  const allAutomatic = output['proxy-groups'].filter(g => g.type === 'url-test').map(g => g.name);
  const allCountryNodes = output['proxy-groups'].filter(g => g.name.endsWith('全部节点')).map(g => g.name);
  const inlineChoices = (output.proxies || []).map(p => p.name).filter(Boolean);
  const select = {
    name:front,type:'select',
    proxies:Array.from(new Set([frontAuto].concat(allAutomatic,allCountryNodes,inlineChoices))),
    use:Object.keys(originalProviders),
    'exclude-filter':'(?i)支持[ _-]*AI[ :：]|流量(?:剩余|不足|耗尽|重置|用尽)|重置|过期|到期|套餐|官网|公告|剩余|续费|购买|客服',
    'empty-fallback':'REJECT'
  };
  output['proxy-groups'].push(auto,select,
    {name:home,type:'select',proxies:[],use:homeProviders.slice(),'empty-fallback':'REJECT'},
    {name:home2,type:'select',proxies:[],use:homeProviders.slice(),'empty-fallback':'REJECT'});
  for (const app of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务']) {
    const g = output['proxy-groups'].find(g => g.name === app);
    if (!g) throw new Error('Missing AI application group');
    // Keep the old default; users explicitly choose residential egress when needed.
    if (directAiApps.includes(app)) {
      g.proxies = Array.from(new Set(directAiChoices.get(app).concat(home)));
      g.use = Object.keys(originalProviders);
    } else g.proxies = g.proxies.filter(p => p !== home).concat(home);
  }
  // Each selector stores its own choice while reusing the same live providers.
  // Append only: existing application defaults and routing rules stay intact.
  for (const app of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务','🎮 Steam','🎯 全局分流','🎬 国际媒体','❓ 未识别流量']) {
    const g = output['proxy-groups'].find(g => g.name === app);
    if (g) g.proxies = Array.from(new Set((g.proxies || []).concat(home2)));
  }
  const pinnedNames = [front, home, home2];
  const trailingNames = ['♻️ 其他国家自动', frontAuto];
  const pinned = pinnedNames.map(name => output['proxy-groups'].find(g => g.name === name)).filter(Boolean);
  const trailing = trailingNames.map(name => output['proxy-groups'].find(g => g.name === name)).filter(Boolean);
  output['proxy-groups'] = pinned.concat(output['proxy-groups'].filter(g => !pinnedNames.concat(trailingNames).includes(g.name)), trailing);
  // Original self-hosted providers form a separate, non-chained global choice.
  // Never put this group in its own transit pool.
  const selfHostedProviders = Object.keys(originalProviders).filter(key => /^private-(?:vps|akicloud)-direct$/.test(key));
  for (const name of [home,home2]) {
    const g = output['proxy-groups'].find(g => g.name === name);
    g.use = Array.from(new Set(g.use.concat(selfHostedProviders)));
  }
  const vpsAutos = [];
  for (const [provider,name] of [['private-vps-direct','♻️ LisaVPS 自动'],['private-akicloud-direct','♻️ AkiVPS 自动']]) {
    if (!originalProviders[provider]) continue;
    vpsAutos.push(name);
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      name,type:'url-test',proxies:[],use:[provider],url:'https://www.gstatic.com/generate_204',interval:600,tolerance:50,'empty-fallback':'REJECT'
    });
  }
  for (const name of ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务','🎮 Steam','🛠️ GitHub/开发工具','🎬 国际媒体','🛒 购物/支付','MS-Apple','🎯 全局分流','❓ 未识别流量']) {
    const g = output['proxy-groups'].find(g => g.name === name);
    if (g) g.proxies = Array.from(new Set(g.proxies.concat(vpsAutos)));
  }
  // Keep all three VPS selectors ahead of application selectors in the UI.
  if (selfHostedProviders.length) output['proxy-groups'].splice(pinned.length, 0, {
    name:'🖥️ 自建 VPS',type:'select',proxies:[],use:selfHostedProviders,'empty-fallback':'REJECT'
  });
  for (const name of ['🛠️ GitHub/开发工具','🛒 购物/支付']) {
    const g = output['proxy-groups'].find(g => g.name === name);
    if (!g) throw new Error('Missing service selector');
    g.proxies = Array.from(new Set(g.proxies.concat(home, home2)));
    g.use = ['private-fixed-ip'].filter(k => originalProviders[k]).concat(selfHostedProviders);
  }
  const frontGroup = output['proxy-groups'].find(g => g.name === front);
  const extraFront = vpsAutos.slice();
  for (const [provider,name] of [['private-vps-direct','📋 LisaVPS 全部节点'],['private-akicloud-direct','📋 AkiVPS 全部节点']]) {
    if (!originalProviders[provider]) continue;
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{name,type:'select',proxies:[],use:[provider],'empty-fallback':'REJECT'});
    extraFront.push(name);
  }
  const israel = '🇮🇱 以色列全部节点';
  output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
    name:israel,type:'select',proxies:[],use:Object.keys(originalProviders),
    filter:'(?i)🇮🇱|以色列|Israel|Tel[ _-]?Aviv|特拉维夫|Jerusalem|耶路撒冷|(?:^|[^A-Za-z])(?:IL|ISR)(?:$|[^A-Za-z])',
    'exclude-filter':select['exclude-filter'],'empty-fallback':'REJECT'
  });
  extraFront.push(israel);
  frontGroup.proxies = Array.from(new Set(frontGroup.proxies.concat(extraFront)));
  frontGroup.proxies = Array.from(new Set(frontGroup.proxies.concat(
    output['proxy-groups'].filter(g => g.type === 'url-test' || g.name.endsWith('全部节点')).map(g => g.name)
  )));
  // Independent US VPS selectors exclude ordinary airport subscriptions.
  // Keep original and chained private exits and the Lisa/Aki selectors.
  const usPool = output['proxy-groups'].find(g => g.name === '🇺🇸 美国全部节点');
  const vpsChoices = ['♻️ LisaVPS 自动','📋 LisaVPS 全部节点','♻️ AkiVPS 自动','📋 AkiVPS 全部节点']
    .filter(name => output['proxy-groups'].some(g => g.name === name));
  const selfHostedGroup = output['proxy-groups'].find(g => g.name === '🖥️ 自建 VPS');
  if (selfHostedGroup) {
    // Keep the first original provider as the default through its all-node group.
    selfHostedGroup.proxies = ['📋 LisaVPS 全部节点','♻️ LisaVPS 自动','📋 AkiVPS 全部节点','♻️ AkiVPS 自动']
      .filter(name => output['proxy-groups'].some(g => g.name === name));
  }
  for (const name of [home,home2]) {
    const g = output['proxy-groups'].find(g => g.name === name);
    g.use = Array.from(new Set(g.use.concat(Object.keys(originalProviders).filter(k => /^private-/.test(k)))));
    g.filter = usPool.filter;
    g['exclude-filter'] = select['exclude-filter'];
    g.proxies = Array.from(new Set(g.proxies.concat(vpsChoices, ['🖥️ 自建 VPS'],
      (output.proxies || []).filter(p => /美国|USA|United[ _-]?States|🇺🇸/i.test(p.name)).map(p => p.name))));
  }
  // RESIP is the provider of the existing Verizon endpoints.
  if (originalProviders['private-resip-direct']) {
    const resipGroup = '📋 RESIP 全部节点';
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      name:resipGroup,type:'select',proxies:[],use:['private-resip-direct'],'empty-fallback':'REJECT'
    });
    const resipAuto = '♻️ RESIP 自动';
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      name:resipAuto,type:'url-test',proxies:[],use:['private-resip-direct'],
      url:'https://www.gstatic.com/generate_204',interval:600,tolerance:50,'empty-fallback':'REJECT'
    });
    for (const name of [home,home2,front,'🖥️ 自建 VPS']) {
      const g = output['proxy-groups'].find(g => g.name === name);
      if (g) g.proxies = Array.from(new Set(g.proxies.concat(name === '🖥️ 自建 VPS' ? [] : [resipGroup],resipAuto)));
    }
  }
  if (defaults) {
    const targets = {claude:'🧠 Claude',openai:'✨ OpenAI/AI',global:'🎯 全局分流',developer:'🛠️ GitHub/开发工具',shopping:'🛒 购物/支付'};
    for (const [key, choice] of Object.entries(defaults)) {
      if (key === 'egress1-provider' || key === 'egress2-provider') {
        const g = output['proxy-groups'].find(g => g.name === (key === 'egress1-provider' ? home : home2));
        if (!originalProviders[choice]) throw new Error('Missing default egress provider');
        g.use = [choice].concat(g.use.filter(p => p !== choice));
        // A provider selector keeps its original first endpoint as the default
        // even after adding nested group choices before provider expansion.
        const defaultName = key === 'egress1-provider' ? '🇺🇸 美国 VPS 默认线路' : '🇺🇸 美国 VPS 出口2默认线路';
        output['proxy-groups'].push({name:defaultName,type:'select',proxies:[],use:[choice],'empty-fallback':'REJECT'});
        g.proxies = [defaultName].concat(g.proxies);
        continue;
      }
      const target = output['proxy-groups'].find(g => g.name === targets[key]);
      if (!target || !output['proxy-groups'].some(g => g.name === choice)) throw new Error('Unknown private routing default');
      target.proxies = [choice].concat((target.proxies || []).filter(p => p !== choice));
    }
  }
  // Nested choices precede directly listed servers; provider nodes follow them.
  const groupNames = new Set(output['proxy-groups'].map(g => g.name));
  for (const name of [front,home,home2]) {
    const g = output['proxy-groups'].find(g => g.name === name);
    g.proxies = g.proxies.filter(n => groupNames.has(n)).concat(g.proxies.filter(n => !groupNames.has(n)));
  }
  return output;
}
