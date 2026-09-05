import { chromium } from 'playwright';
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://localhost:4322/', { waitUntil: 'networkidle', timeout: 30000 });
const r = await p.evaluate(() => {
  const d = document.documentElement;
  const vazam = [...document.querySelectorAll('*')]
    .filter((e) => e.getBoundingClientRect().right > d.clientWidth + 1)
    .slice(0, 6)
    .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ').slice(0, 3).join('.')} → ${Math.round(e.getBoundingClientRect().right)}px`);
  return { larguraDaPagina: d.scrollWidth, larguraDaTela: d.clientWidth, vazam };
});
console.log(`largura da tela : ${r.larguraDaTela}px`);
console.log(`largura da pagina: ${r.larguraDaPagina}px`);
console.log(r.larguraDaPagina > r.larguraDaTela ? `ROLAGEM HORIZONTAL: sobra ${r.larguraDaPagina - r.larguraDaTela}px` : 'sem rolagem horizontal');
if (r.vazam.length) { console.log('elementos que passam da borda:'); r.vazam.forEach((v) => console.log('  ' + v)); }
await nav.close();
