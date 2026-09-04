#!/usr/bin/env node
// Gera `dist/privacidade.html` a partir do componente React da politica.
//
// POR QUE ISTO EXISTE
//
// `binno.pro` e uma aplicacao de pagina unica: qualquer endereco devolve a
// mesma casca HTML, e o texto so aparece depois de o JavaScript correr. O robo
// da Meta nao corre JavaScript. Em 04/09/2026 ele leu `/privacidade`, viu zero
// ocorrencias da palavra "dados" e recusou publicar o app com "URL de Politica
// de Privacidade valido" em falta.
//
// A PAGINA E GERADA, E NAO ESCRITA A MAO, de proposito. Uma segunda politica
// escrita a parte divergiria da primeira sem ninguem ver — e a que o robo le, e
// que vale como compromisso legal, seria a errada. Aqui ha um so texto.
import { build } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const raiz = process.cwd();
const saidaSsr = resolve(raiz, 'node_modules/.cache/binno-politica');

await build({
  logLevel: 'error',
  build: {
    ssr: resolve(raiz, 'scripts/prerender/politica.tsx'),
    outDir: saidaSsr,
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'politica.mjs' } },
  },
});

const { render } = await import(`${saidaSsr}/politica.mjs`);
const corpo = render();

if (!/dados/i.test(corpo) || corpo.length < 2000) {
  console.error(`A politica gerada nao parece uma politica (${corpo.length} caracteres). Nao vou escrever um ficheiro que o robo vai ler como valido sem o ser.`);
  process.exit(1);
}

const pagina = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Política de Privacidade — Binno</title>
<meta name="description" content="Que dados o Binno recolhe, para que servem, onde ficam e como os apagar." />
<link rel="canonical" href="https://binno.pro/privacidade.html" />
<style>
  body { margin: 0; background: #fff; color: #111827; font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main, .mx-auto { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
  h1 { font-size: 1.75rem; } h2 { font-size: 1.2rem; margin-top: 2.5rem; }
  a { color: #4f46e5; } ul { padding-left: 1.25rem; } li { margin: .4rem 0; }
</style>
</head>
<body>
${corpo}
</body>
</html>
`;

const destino = resolve(raiz, 'dist/privacidade.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, pagina, 'utf8');
console.log(`Politica estatica gerada: dist/privacidade.html (${pagina.length} caracteres)`);
