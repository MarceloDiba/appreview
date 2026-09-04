#!/usr/bin/env node
// "Cada nota separada" mostra cada nota separada.
//
// POR QUE ESTE GUARDA EXISTE
//
// O cartao escondia TUDO abaixo de 20 avaliacoes. Ao lado dele, o cartao da
// reputacao mostrava a mesma divisao — 70% de cinco estrelas, 30% de quatro —
// com as MESMAS 10 avaliacoes. Um cartao dizia "espere por 20" enquanto o
// vizinho ja mostrava a resposta. Marcelo reclamou cinco vezes antes de isto
// ser resolvido, e tinha razao das cinco.
//
// SAO DUAS PERGUNTAS, e so uma precisa de volume:
//
//   A DIVISAO DE HOJE e uma contagem. Com 10 avaliacoes, 70% e 70%: exacto.
//   Nao ha ruido nenhum em dizer o que se tem.
//
//   A COMPARACAO (esta janela contra a anterior, e o alerta que sai dela)
//   precisa das 20. Com 10, o degrau e de 10 pontos e a chegada de UMA
//   avaliacao aparece como uma mudanca do negocio. Esse era o motivo original
//   do limiar, e continua valido — so estava aplicado a coisa errada.
//
// O RISCO DE ESTE CONSERTO SE PERDER e alguem voltar a somar `poucasAvaliacoes`
// ao vazio, "para o cartao nao mentir". Nao mente: quem mentia era o vizinho a
// mostrar o que este escondia.
import { readFileSync } from 'node:fs';

// O CARTAO SAIU DO PAINEL em 04/09/2026, quando o painel passou o tecto de 350
// linhas e foi cortado pela segunda costura: os cartoes de leitura. Este guarda
// e inteiramente sobre o cartao, entao seguiu-o.
const CAMINHO = 'src/components/dashboard/reputacao/CartoesDeLeitura.tsx';
const bruto = readFileSync(CAMINHO, 'utf8');
const fonte = bruto
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

// Os comentarios deste ficheiro citam `poucasAvaliacoes` e `semEvidencia` varias
// vezes ao explicar a decisao. Sem o strip, as asserções casariam com a
// explicacao e ficariam verdes depois de alguem desfazer o conserto.
if (fonte.includes('DUAS PERGUNTAS DIFERENTES')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. O VAZIO SO OLHA PARA A AUSENCIA DE LEITURA. Se `poucasAvaliacoes` voltar
//    a entrar aqui, o cartao volta a esconder a divisao que ja tem.
exigir('`poucasAvaliacoes` voltou a esconder o cartao inteiro; a divisao de hoje e exacta em qualquer numero',
  /const semEvidencia = semLeitura;/.test(fonte));

// 2. A COMPARACAO E QUE DEPENDE DAS 20.
exigir('a comparacao deixou de depender do numero de avaliacoes',
  /const comparacaoDisponivel = hasHistory && !poucasAvaliacoes;/.test(fonte));

// 3. E TUDO O QUE E COMPARACAO PASSA POR ELA. Cada um destes, ligado a
//    `hasHistory` em vez de `comparacaoDisponivel`, faz reaparecer o ruido que
//    o limiar existia para evitar: a chegada de uma avaliacao como se fosse uma
//    mudanca do negocio.
exigir('a percentagem anterior voltou a ser calculada sem o limiar',
  /previous: comparacaoDisponivel \?/.test(fonte));
exigir('o alerta de atencao voltou a disparar sem o limiar',
  /const needsAttention = comparacaoDisponivel &&/.test(fonte));
exigir('a marca de risco por linha voltou a aparecer sem o limiar',
  /const risk = comparacaoDisponivel &&/.test(fonte));
exigir('o grafico de linha voltou a ser desenhado sem o limiar',
  /\{comparacaoDisponivel &&\s*<ResponsiveContainer/.test(fonte));

// 4. E QUANDO A COMPARACAO NAO EXISTE, DIZ-SE PORQUE. Mostrar a divisao sem
//    explicar por que falta a comparacao deixaria o dono a achar que o cartao
//    esta incompleto.
exigir('o cartao mostra a divisao mas nao explica por que falta a comparacao',
  /distributionComparisonFrom/.test(fonte));

// 5. A CHAVE EXISTE NOS TRES IDIOMAS, com os dois numeros que a frase promete.
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const d = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  const texto = d?.dashboard?.cockpit?.approved?.distributionComparisonFrom;
  exigir(`${locale}: falta a chave distributionComparisonFrom`,
    typeof texto === 'string' && texto.trim().length > 0);
  exigir(`${locale}: a frase nao usa os dois numeros ({{count}} e {{minimo}})`,
    typeof texto === 'string' && texto.includes('{{count}}') && texto.includes('{{minimo}}'));
}

if (falhas.length) {
  console.error('Cada nota separada aparece: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Cada nota separada aparece: ${verificadas} protecoes verdes.`);
