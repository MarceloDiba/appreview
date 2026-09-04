#!/usr/bin/env node
// Gera `dist/privacidade.html` e `dist/termos.html` a partir dos componentes React.
//
// POR QUE ISTO EXISTE
//
// `binno.pro` e uma aplicacao de pagina unica: qualquer endereco devolve a
// mesma casca HTML, e o texto so aparece depois de o JavaScript correr. O robo
// da Meta nao corre JavaScript. Em 04/09/2026 ele leu `/privacidade`, viu zero
// ocorrencias da palavra "dados" e recusou publicar o app do WhatsApp.
//
// Nesse mesmo dia, ao preparar a verificacao do Google, os TERMOS mostraram o
// mesmo defeito: `binno.pro/termos` devolvia 200 com zero palavras. O revisor
// do Google abriria uma pagina em branco e recusaria pela mesma razao.
//
// AS PAGINAS SAO GERADAS, E NAO ESCRITAS A MAO, de proposito. Um segundo texto
// legal escrito a parte divergiria do primeiro sem ninguem ver — e o que o robo
// le, que e o que vale como compromisso, seria o errado. Ha um so texto de cada.
import { build } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const raiz = process.cwd();
const saidaSsr = resolve(raiz, 'node_modules/.cache/binno-legais');

await build({
  logLevel: 'error',
  build: {
    ssr: resolve(raiz, 'scripts/prerender/legais.tsx'),
    outDir: saidaSsr,
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'legais.mjs' } },
  },
});

const { renderPolitica, renderTermos } = await import(`${saidaSsr}/legais.mjs`);

const molde = ({ titulo, descricao, ficheiro, corpo }) => `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo} — Binno</title>
<meta name="description" content="${descricao}" />
<link rel="canonical" href="https://binno.pro/${ficheiro}" />
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

// Cada pagina traz a palavra que prova que ELA foi gerada, e nao a vizinha. Um
// molde que recebesse o corpo errado passaria numa verificacao generica de
// tamanho e escreveria a politica dentro do ficheiro dos termos.
const PAGINAS = [
  {
    ficheiro: 'privacidade.html',
    titulo: 'Política de Privacidade',
    descricao: 'Que dados o Binno recolhe, para que servem, onde ficam e como os apagar.',
    render: renderPolitica,
    provaDeQueEEsta: /dados/i,
  },
  {
    ficheiro: 'termos.html',
    titulo: 'Termos de Serviço',
    descricao: 'As regras de uso do Binno, incluindo a proibição de filtrar avaliações.',
    render: renderTermos,
    provaDeQueEEsta: /termos/i,
  },
];

for (const pagina of PAGINAS) {
  const corpo = pagina.render();
  if (!pagina.provaDeQueEEsta.test(corpo) || corpo.length < 2000) {
    console.error(
      `A pagina "${pagina.ficheiro}" nao parece o que devia (${corpo.length} caracteres). `
      + 'Nao vou escrever um ficheiro que o robo vai ler como valido sem o ser.',
    );
    process.exit(1);
  }
  const html = molde({ ...pagina, corpo });
  const destino = resolve(raiz, 'dist', pagina.ficheiro);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html, 'utf8');
  console.log(`Pagina legal gerada: dist/${pagina.ficheiro} (${html.length} caracteres)`);
}
