// Optional fixed VPS egress overlay. Legacy provider keys remain compatible.
// Group labels do not establish residential IP status. Keep credentials private.
function main(config, name) {
  const homeProvider = key => /^private-(?:residential(?:-|$)|ipipgo-chain$)/.test(key);
  const originalProviders = config['proxy-providers'] || {};
  const homeProviders = Object.keys(originalProviders).filter(homeProvider);
  const ordinaryProviders = Object.keys(originalProviders).filter(key => {
    const p = originalProviders[key];
    return !/^private-/.test(key) && !p.override?.['dialer-proxy'] &&
      !(p.payload || []).some(node => node['dialer-proxy']);
  });
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
  // Manual and automatic transit only use sources independent of the VPS dialer.
  const select = {
    name:front,type:'select',proxies:[frontAuto,...transit],
    use:ordinaryProviders.slice(),'exclude-filter':exclude,'empty-fallback':'REJECT'
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
  for (const [provider,name] of [['private-vps-direct','📋 LisaVPS 全部节点'],['private-akicloud-direct','📋 AkiVPS 全部节点']]) {
    if (!originalProviders[provider]) continue;
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{name,type:'select',proxies:[],use:[provider],'empty-fallback':'REJECT'});
  }
  const israel = '🇮🇱 以色列全部节点';
  output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
    name:israel,type:'select',proxies:[],use:Object.keys(originalProviders),
    filter:'(?i)🇮🇱|以色列|Israel|Tel[ _-]?Aviv|特拉维夫|Jerusalem|耶路撒冷|(?:^|[^A-Za-z])(?:IL|ISR)(?:$|[^A-Za-z])',
    'exclude-filter':select['exclude-filter'],'empty-fallback':'REJECT'
  });
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
  const resipProviders = ['private-resip-direct','private-resip-2-direct'].filter(key => originalProviders[key]);
  if (resipProviders.length) {
    const resipGroup = '📋 RESIP 全部节点';
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      name:resipGroup,type:'select',proxies:[],use:resipProviders.slice(),'empty-fallback':'REJECT'
    });
    const resipAuto = '♻️ RESIP 自动';
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      name:resipAuto,type:'url-test',proxies:[],use:resipProviders.slice(),
      url:'https://www.gstatic.com/generate_204',interval:600,tolerance:50,'empty-fallback':'REJECT'
    });
    for (const name of [home,home2,'🖥️ 自建 VPS']) {
      const g = output['proxy-groups'].find(g => g.name === name);
      if (g) g.proxies = Array.from(new Set(g.proxies.concat([resipGroup],resipAuto)));
    }
  }
  if (defaults) {
    const targets = {claude:'🧠 Claude',openai:'✨ OpenAI/AI',global:'🎯 全局分流',developer:'🛠️ GitHub/开发工具',shopping:'🛒 购物/支付',google:'🔷 Google/Gemini/Antigravity',otherAi:'🤖 其他 AI 服务',steam:'🎮 Steam',media:'🎬 国际媒体'};
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
  // VPS selectors are chain-only. Original groups remain available elsewhere.
  const chainProviderMap = {
    'private-fixed-ip':'private-residential-manual',
    'private-vps-direct':'private-residential-vps',
    'private-akicloud-direct':'private-residential-akicloud',
    'private-resip-direct':'private-residential-resip',
    'private-resip-2-direct':'private-residential-resip-2'
  };
  const chainedProvider = key => {
    const mapped = homeProvider(key) ? key : chainProviderMap[key];
    if (!mapped || !originalProviders[mapped]) throw new Error('Missing chained counterpart for ' + key);
    return mapped;
  };
  const chainGroups = new Map();
  for (const rawName of ['♻️ LisaVPS 自动','📋 LisaVPS 全部节点','♻️ AkiVPS 自动','📋 AkiVPS 全部节点','♻️ RESIP 自动','📋 RESIP 全部节点']) {
    const raw = output['proxy-groups'].find(g => g.name === rawName);
    if (!raw) continue;
    const chainedName = rawName + '｜链式';
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      ...raw,name:chainedName,proxies:[],use:Array.from(new Set(raw.use.map(chainedProvider)))
    });
    chainGroups.set(rawName,chainedName);
  }
  for (const name of ['🇺🇸 美国 VPS 默认线路','🇺🇸 美国 VPS 出口2默认线路']) {
    const g = output['proxy-groups'].find(g => g.name === name);
    if (g) g.use = Array.from(new Set(g.use.map(chainedProvider)));
  }
  const validChainGroups = new Set([...chainGroups.values(),'🖥️ 自建 VPS','🇺🇸 美国 VPS 默认线路','🇺🇸 美国 VPS 出口2默认线路']);
  for (const name of [home,home2,'🖥️ 自建 VPS']) {
    const g = output['proxy-groups'].find(g => g.name === name);
    if (!g) continue;
    g.use = name === '🖥️ 自建 VPS' ? [] : homeProviders.filter(key => !Object.values(chainProviderMap).includes(key) || key === 'private-residential-manual');
    g.proxies = Array.from(new Set(g.proxies.map(n => chainGroups.get(n) || n).filter(n =>
      validChainGroups.has(n) || (output.proxies || []).some(p => p.name === n && p['dialer-proxy'] === front)
    )));
  }
  if (originalProviders['private-residential-resip-2']) {
    const resip = chainGroups.get('📋 RESIP 全部节点');
    if (resip) {
      const claude = output['proxy-groups'].find(g => g.name === '🧠 Claude');
      claude.proxies = Array.from(new Set(claude.proxies.concat(resip)));
    }
  }
  const lychee = '📋 Lychee 全部节点｜链式';
  const manualProvider = originalProviders['private-residential-manual'];
  const onlyLychee = manualProvider?.payload?.length && manualProvider.payload.every(p => /lychee/i.test(p.name));
  if (manualProvider && (!manualProvider.payload || manualProvider.payload.some(p => /lychee/i.test(p.name)))) {
    output['proxy-groups'].splice(output['proxy-groups'].length-trailing.length,0,{
      name:lychee,type:'select',proxies:[],use:['private-residential-manual'],filter:'(?i)lychee','empty-fallback':'REJECT'
    });
    for (const name of [home,home2,'🖥️ 自建 VPS']) {
      const g = output['proxy-groups'].find(group => group.name === name);
      if (g) {
        g.proxies.push(lychee);
        if (onlyLychee) g.use = g.use.filter(key => key !== 'private-residential-manual');
      }
    }
  }
  const global = '🎯 全局分流', globalAuto = '♻️ 全局自动';
  const vpsChoicesForApps = [home,home2,...(selfHostedGroup ? [selfHostedGroup.name] : [])];
  const regions = [['美国','🇺🇸'],['台湾','🌏'],['香港','🇭🇰'],['日本','🇯🇵'],['新加坡','🇸🇬'],['韩国','🇰🇷'],['欧洲','🇪🇺'],['其他国家','🌐']];
  const applications = ['🧠 Claude','✨ OpenAI/AI','🔷 Google/Gemini/Antigravity','🤖 其他 AI 服务','🎮 Steam','🛠️ GitHub/开发工具','🎬 国际媒体','🛒 购物/支付','MS-Apple'];
  const available = new Set(output['proxy-groups'].map(g => g.name).concat('DIRECT'));
  const globalGroup = output['proxy-groups'].find(g => g.name === global);
  globalGroup.proxies = Array.from(new Set([globalGroup.proxies[0],...vpsChoicesForApps,...globalGroup.proxies]));
  for (const [i,name] of applications.entries()) {
    const g = output['proxy-groups'].find(group => group.name === name);
    if (!g) continue;
    const regional = regions.filter(([region]) => i >= 4 || ['美国','台湾','日本','新加坡'].includes(region) || (i === 3 && region === '欧洲'))
      .flatMap(([region,flag]) => ['♻️ '+region+'自动',flag+' '+region+'全部节点']);
    const choices = [g.proxies[0],...vpsChoicesForApps,...(i >= 2 ? [global,globalAuto] : []),
      ...(i === 0 ? ['📋 RESIP 全部节点｜链式'] : []),...regional,...(i >= 4 ? ['DIRECT'] : [])];
    g.proxies = Array.from(new Set(choices.filter(choice => available.has(choice))));
    delete g.use;
  }
  // Nested choices precede directly listed servers; provider nodes follow them.
  const groupNames = new Set(output['proxy-groups'].map(g => g.name));
  for (const name of [front,home,home2]) {
    const g = output['proxy-groups'].find(g => g.name === name);
    g.proxies = g.proxies.filter(n => groupNames.has(n)).concat(g.proxies.filter(n => !groupNames.has(n)));
  }
  return output;
}
