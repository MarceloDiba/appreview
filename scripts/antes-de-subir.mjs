#!/usr/bin/env node
// A Vercel ja tinha reprovado este ramo? Perguntar ANTES de mergear.
//
// POR QUE ISTO EXISTE
//
// Em 05/09/2026 a home nova entrou em producao e nao foi servida. A causa foi
// um campo `_comentario` que escrevi no `vercel.json`: a Vercel recusa qualquer
// chave que nao conheca e falha a build inteira. O site continuou a servir o
// pacote de doze horas antes, e eu disse ao Marcelo que a home estava no ar.
//
// O `npm run verify` esteve VERDE o tempo todo, e continuaria a estar. Nenhum
// guarda deste repositorio consegue saber se a VERCEL aceita a configuracao —
// isso e uma opiniao de um servico de fora, e so ele a pode dar.
//
// E ELE JA A TINHA DADO. A sessao de QA foi ver o correio do Marcelo e achou
// tres avisos de PREVIEW falhada, as 10:03, 10:04 e 10:22, antes de a producao
// cair as 10:34. Trinta minutos de aviso, entregues por e-mail a uma pessoa que
// nao le e-mail tecnico, em vez de estarem a frente de quem ia mergear.
//
// Confirmado por medicao propria: `vercel ls --meta githubCommitRef=<ramo>`
// mostra as previews com `Error` no ramo `feat/home-nova-binno`.
//
// O QUE ISTO NAO E: um guarda do `verify`. Precisa de rede e de credencial da
// Vercel, e um `verify` que falha porque a internet caiu ensina a ignora-lo.
// E um passo a correr a mao antes de subir para `main`.
//
//   node scripts/antes-de-subir.mjs            (o ramo actual)
//   node scripts/antes-de-subir.mjs meu-ramo

import { execFileSync } from 'node:child_process';

const ramo = process.argv[2]
  || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();

if (ramo === 'main') {
  console.log('Estas em `main`. Este passo e para conferir um RAMO antes de o mergear.');
  process.exit(0);
}

let saida;
try {
  saida = execFileSync('npx',
    ['vercel', 'ls', '--yes', '--json', '--meta', `githubCommitRef=${ramo}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (erro) {
  // NAO DIZ QUE ESTA TUDO BEM. Se a pergunta nao chegou a ser feita, a resposta
  // nao e "sim" — e "nao sei", e quem le tem de perceber a diferenca.
  console.error('Nao consegui perguntar a Vercel. Isto NAO quer dizer que o ramo esta bom.');
  console.error(String(erro.stderr || erro.message).slice(0, 400));
  process.exit(2);
}

const { deployments = [] } = JSON.parse(saida);

if (!deployments.length) {
  console.log(`A Vercel nao tem nenhuma publicacao para o ramo \`${ramo}\`.`);
  console.log('Ou o ramo nunca foi empurrado, ou o nome esta errado.');
  process.exit(2);
}

// A MAIS RECENTE E A QUE VALE. Uma preview antiga que falhou e depois foi
// corrigida nao pode bloquear; uma recente que falhou tem de bloquear mesmo que
// haja dez verdes atras dela.
const porData = [...deployments].sort((a, b) => b.createdAt - a.createdAt);
const ultima = porData[0];
const quando = new Date(ultima.createdAt).toLocaleString('pt-BR');
const falhadas = porData.filter((d) => d.state === 'ERROR').length;

console.log(`Ramo \`${ramo}\`: ${deployments.length} publicacoes, ${falhadas} com erro.`);
console.log(`A mais recente e de ${quando} e esta ${ultima.state}.`);
console.log(`  https://${ultima.url}`);

if (ultima.state === 'ERROR') {
  console.error('\nA VERCEL RECUSOU A ULTIMA PUBLICACAO DESTE RAMO.');
  console.error('Mergear agora poe em producao uma configuracao que ela ja recusou,');
  console.error('e o site continuara a servir o pacote anterior sem dizer nada.');
  console.error(`\n  npx vercel inspect ${ultima.url} --logs`);
  process.exit(1);
}

if (ultima.state !== 'READY') {
  console.error(`\nAinda esta ${ultima.state}. Esperar que termine antes de mergear.`);
  process.exit(1);
}

console.log('\nA Vercel aceitou. Pode subir.');
