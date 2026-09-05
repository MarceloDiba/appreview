import { chromium } from 'playwright';
import { CHROMIUM } from './navegador.mjs';

const alvo = process.argv[2] || 'https://binno.pro/';
const nav = await chromium.launch({ executablePath: CHROMIUM });
const ctx = await nav.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(alvo, { waitUntil: 'networkidle', timeout: 40000 });
const r = await p.evaluate(() => {
  const d = document.documentElement;
  const vazam = [...document.querySelectorAll('*')]
    .filter((e) => e.getBoundingClientRect().right > d.clientWidth + 1)
    .slice(0, 8)
    .map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${(e.className || '').toString().split(' ').slice(0, 2).join('.')} → ${Math.round(e.getBoundingClientRect().right)}px`);
  const pequenos = [...document.querySelectorAll('a,button,input,select,textarea')]
    .filter((e) => { const c = e.getBoundingClientRect(); return c.height > 0 && c.height < 44; })
    .slice(0, 8)
    .map((e) => `${e.tagName.toLowerCase()} "${(e.textContent || '').trim().slice(0, 24)}" → ${Math.round(e.getBoundingClientRect().height)}px`);
  return { pagina: d.scrollWidth, tela: d.clientWidth, vazam, pequenos, controles: document.querySelectorAll('a,button,input').length };
});
console.log(`${alvo}`);
console.log(`  tela ${r.tela}px · pagina ${r.pagina}px · ${r.controles} controles`);
console.log(r.pagina > r.tela ? `  ROLAGEM HORIZONTAL: sobra ${r.pagina - r.tela}px` : '  sem rolagem horizontal');
if (r.vazam.length) { console.log('  passam da borda:'); r.vazam.forEach((v) => console.log('    ' + v)); }
console.log(r.pequenos.length ? `  alvos abaixo de 44px: ${r.pequenos.length}` : '  todos os alvos com 44px ou mais');
r.pequenos.forEach((v) => console.log('    ' + v));
await nav.close();
