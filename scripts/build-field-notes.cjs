// Build only reviewed public documents. Never walk the repo or read private inputs.
// Requires the authenticated gh CLI for GitHub's Markdown renderer.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'site');
const pages = [
  { source:'docs/field-notes.md', target:'index.html', title:'Freeroad 实践复盘' },
  { source:'docs/test-results.md', target:'test-results.html', title:'Freeroad 测试附录' }
];
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const slug = s => s.replace(/[`*]/g,'').trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s/g,'-');
fs.mkdirSync(output, {recursive:true});
for (const page of pages) {
  const markdown = fs.readFileSync(path.join(root,page.source),'utf8');
  const rendered = cp.spawnSync('gh',['api','markdown','--input','-'],{
    input:JSON.stringify({text:markdown,mode:'gfm',context:'wikieden/freeroad'}),encoding:'utf8',maxBuffer:8*1024*1024
  });
  if (rendered.status !== 0 || !rendered.stdout.startsWith('<')) throw new Error('GitHub Markdown rendering failed: '+rendered.stderr);
  let html = rendered.stdout.replaceAll('./field-notes.md','./index.html').replaceAll('./test-results.md','./test-results.html');
  const headings = [...markdown.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  let at = 0;
  html = html.replace(/<h([1-6])(?:\s[^>]*)?>/g, (tag, level) => {
    const h=headings[at++];
    if (!h || h[1].length!==Number(level)) throw new Error('Heading order changed');
    return `<h${level} id="${esc(slug(h[2]))}">`;
  });
  const toc = headings.filter(h=>h[1].length===2).map(h=>`<a href="#${esc(slug(h[2]))}">${esc(h[2])}</a>`).join('');
  const document = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Freeroad 多客户端分流、链式出口、DNS 与测试经验的脱敏复盘；区分真实观测与待验证结论。">
<title>${esc(page.title)}</title><link rel="stylesheet" href="./style.css"></head>
<body><header><a class="brand" href="./index.html">Freeroad <span>实践手册</span></a><nav aria-label="文档导航"><a href="./index.html">经验复盘</a><a href="./test-results.html">测试全表</a><a href="https://github.com/wikieden/freeroad">GitHub</a></nav></header>
<div class="shell"><aside aria-label="本页目录"><div class="aside-title">本页目录</div>${toc}<div class="downloads"><a href="./${path.basename(page.source)}" download>下载 Markdown</a><a href="./evidence/public-test-data.json" download>下载脱敏数据 JSON</a></div></aside>
<main><div class="eyebrow">FIELD NOTES · 2026-10-24 · 历史观察，非实时榜单</div><article>${html}</article><footer>只发布脱敏文档与统计。不提供节点、不保证账号安全；原始私人配置不公开。</footer></main></div></body></html>\n`;
  fs.writeFileSync(path.join(output,page.target),document);
  fs.copyFileSync(path.join(root,page.source),path.join(output,path.basename(page.source)));
}
fs.copyFileSync(path.join(root,'docs/field-notes.css'),path.join(output,'style.css'));
fs.mkdirSync(path.join(output,'evidence'),{recursive:true});
fs.copyFileSync(path.join(root,'docs/evidence/public-test-data.json'),path.join(output,'evidence/public-test-data.json'));
fs.writeFileSync(path.join(output,'.nojekyll'),'');
const files=['index.html','test-results.html','field-notes.md','test-results.md','style.css','evidence/public-test-data.json','.nojekyll'];
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({preparedDate:'2026-10-24',files:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex')}))},null,2)+'\n');
console.log('Built static-only site: '+files.length+' reviewed files plus manifest');
