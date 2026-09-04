#!/usr/bin/env node
// A politica de privacidade tem de ser legivel por um robo.
//
// POR QUE ESTE GUARDA EXISTE
//
// Em 04/09/2026 a Meta recusou publicar o app do WhatsApp com "URL de Politica
// de Privacidade valido" em falta. O endereco devolvia 200 e a pagina abria
// perfeitamente num navegador — mas `binno.pro` e uma aplicacao de pagina
// unica: o HTML entregue nao continha UMA palavra da politica, porque o texto
// so aparece depois de o JavaScript correr. O robo da Meta nao corre JavaScript.
//
// O sintoma era o pior tipo: "esta la, eu estou a ver" para um humano, e
// "nao existe" para quem decide.
//
// A PAGINA ESTATICA E GERADA A PARTIR DO COMPONENTE, e nao escrita a parte.
// Duas politicas divergiriam sem ninguem ver, e a que o robo le — a que vale
// como compromisso legal perante a Meta e perante a lei — seria a errada.
import { existsSync, readFileSync } from 'node:fs';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. A GERACAO CORRE NA BUILD. Sem isto, a pagina estatica nao chega ao ar.
const pacote = JSON.parse(readFileSync('package.json', 'utf8'));
exigir('a build deixou de gerar a politica estatica; o robo voltaria a ler a casca vazia',
  /gerar-politica-estatica\.mjs/.test(pacote.scripts.build || ''));

// 2. E O SCRIPT GERA A PARTIR DO COMPONENTE, e nao de um texto proprio.
const gerador = readFileSync('scripts/prerender/politica.tsx', 'utf8');
exigir('a pagina estatica deixou de sair do componente da politica; sao duas politicas a divergir',
  /from '@\/pages\/Privacy'/.test(gerador) && /renderToStaticMarkup/.test(gerador));

// 3. O FICHEIRO GERADO TEM POLITICA DENTRO. Se a build correu, ele existe — e
//    se existir vazio e pior do que nao existir, porque parece resolvido.
const destino = 'dist/privacidade.html';
if (existsSync(destino)) {
  const html = readFileSync(destino, 'utf8');
  exigir(`a politica gerada tem so ${html.length} caracteres; nao e uma politica`,
    html.length > 5000);
  for (const termo of ['dados', 'LGPD', 'WhatsApp', 'Supabase']) {
    exigir(`a politica gerada nao menciona "${termo}"`, new RegExp(termo, 'i').test(html));
  }
  // O texto tem de estar no HTML servido, e nao atras de um script.
  exigir('o texto da politica nao esta no HTML entregue; e isso que o robo nao consegue ler',
    /Pol[íi]tica de Privacidade<\/h1>|<h1[^>]*>\s*Pol[íi]tica/i.test(html));
} else {
  // Nao falha: `dist/` so existe depois da build, e este guarda corre antes
  // dela na cadeia. Mas diz, para ninguem ler o verde como prova.
  console.error('  (nota: dist/privacidade.html ainda nao existe; as asserções sobre o conteudo correm depois da build)');
}

// 4. A POLITICA DESCREVE O QUE O PRODUTO FAZ HOJE. Uma politica que nao fala do
//    WhatsApp e do Google descreve um produto que ja nao existe — e e ela que a
//    Meta le para rever o caso de uso.
// ESPACOS COLAPSADOS ANTES DE MEDIR. O JSX quebra frases a meio para caber na
// largura do ficheiro, e uma frase partida em duas linhas nao casa com uma
// expressao regular escrita de seguida. Aconteceu logo a primeira vez, com
// "sem essa\n  confirmação": a promessa estava la e a assercao dizia que nao.
const fonte = readFileSync('src/pages/Privacy.tsx', 'utf8').replace(/\s+/g, ' ');
exigir('a politica nao fala do WhatsApp do dono, que e por onde o rascunho viaja',
  /WhatsApp do dono/i.test(fonte));
exigir('a politica nao fala das respostas a espera de confirmacao',
  /Respostas à espera de confirmação/i.test(fonte));
exigir('a politica nao promete que nada e publicado sem confirmacao',
  /sem essa confirmação/i.test(fonte));
const legal = readFileSync('src/lib/legal.ts', 'utf8');
exigir('a lista de subcontratantes nao inclui a Meta, que trata as mensagens',
  /WhatsApp Business Cloud API/.test(legal));
exigir('a lista de subcontratantes nao inclui a API do Google que PUBLICA a resposta',
  /Business Profile API/.test(legal));

if (falhas.length) {
  console.error('Politica que o robo le: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Politica que o robo le: ${verificadas} protecoes verdes.`);
