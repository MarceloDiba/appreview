import { chromium } from 'playwright';
const nav = await chromium.launch();
const ctx = await nav.newContext();
const p = await ctx.newPage();
const passos = [];
try {
  await p.goto('http://localhost:4321/', { waitUntil: 'networkidle', timeout: 30000 });
  passos.push(['abriu a home', p.url()]);
  const botao = p.getByRole('button', { name: /começar agora/i }).first();
  await botao.waitFor({ timeout: 10000 });
  passos.push(['achou o botao "Começar agora"', 'sim']);
  await Promise.all([
    p.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 }),
    botao.click(),
  ]);
  passos.push(['DESLOGADO, o botao levou a', new URL(p.url()).host]);
  await p.waitForLoadState('networkidle');
  const texto = await p.locator('body').innerText();
  const preco = (texto.match(/R\$\s?[\d.,]+/) || ['(nao achei)'])[0];
  passos.push(['preco na tela do Stripe', preco]);
  passos.push(['pede email na propria tela', /e-?mail/i.test(texto) ? 'sim' : 'nao']);
} catch (erro) {
  passos.push(['FALHOU', erro.message.split('\n')[0].slice(0, 160)]);
} finally {
  for (const [k, v] of passos) console.log(`  ${k.padEnd(38)} ${v}`);
  await nav.close();
}
