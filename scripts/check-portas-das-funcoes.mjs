#!/usr/bin/env node
// Toda funcao de servidor recusa quem nao devia entrar.
//
// POR QUE ESTE GUARDA EXISTE
//
// `verify_jwt = true` NAO exige sessao. Exige uma credencial valida — e a
// chave publicavel do site e uma, impressa dentro do JavaScript que qualquer
// pessoa baixa.
//
// `search-prospects` viveu seis dias assim. O cabecalho dela dizia, desde
// 29/08/2026, que "passou a exigir sessao de usuario (verify_jwt)". Em
// 04/09 chamei o endereco com a chave publicavel e sem login: devolveu 24
// prospects qualificados, tendo varrido 60 estabelecimentos na conta paga do
// Google. Escreveu-se o comentario, acreditou-se nele, e ninguem testou.
//
// Este guarda le a config e o codigo e exige que cada funcao declare como se
// defende. Nao substitui bater na porta em producao — substitui ACREDITAR.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const CONFIG = readFileSync('supabase/config.toml', 'utf8');
const seccaoDe = (nome) => {
  const inicio = CONFIG.indexOf(`[functions.${nome}]`);
  if (inicio === -1) return '';
  const seguinte = CONFIG.indexOf('\n[', inicio + 1);
  return CONFIG.slice(inicio, seguinte === -1 ? undefined : seguinte);
};

// COMO CADA FUNCAO SE DEFENDE. Toda funcao tem de constar aqui: uma que
// apareca sem estar declarada faz este guarda ficar vermelho, e e assim que a
// proxima e obrigada a decidir a sua porta em vez de herdar uma aberta.
const PORTAS = {
  // Sessao do dono, conferida com `auth.getUser()`.
  'billing-checkout': 'sessao',
  'fetch-google-reviews': 'sessao',
  'start-google-business-oauth': 'sessao',
  'sync-experimental-apify': 'sessao',
  'sync-google-business-profile': 'sessao',
  'temas-das-avaliacoes': 'sessao',
  'whatsapp-notifications': 'sessao',
  'sugerir-resposta': 'sessao',
  // Sessao E pertencer a `admins`. Ferramenta interna da Noa, nao do produto.
  'search-prospects': 'administrador',
  // So o servidor: segredo de trabalhador no cabecalho.
  'apify-auto-collect-on-signup': 'trabalhador',
  'email-dispatch': 'trabalhador',
  'materialize-whatsapp-notifications': 'trabalhador',
  'oferecer-rascunhos': 'trabalhador',
  'publicar-respostas-confirmadas': 'trabalhador',
  'telegram-dispatch': 'trabalhador',
  'whatsapp-cloud-dispatch': 'trabalhador',
  // Assinatura criptografica de quem envia.
  'stripe-billing-webhook': 'assinatura',
  'whatsapp-cloud-webhook': 'assinatura',
  // O Google devolve o navegador aqui; a defesa e o `state` que so o Binno emitiu.
  'google-business-oauth-callback': 'state',
};

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const existentes = readdirSync('supabase/functions', { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_shared'
    && existsSync(`supabase/functions/${e.name}/index.ts`))
  .map((e) => e.name);

exigir(`a varredura achou so ${existentes.length} funcoes; deixou de medir o que diz medir`,
  existentes.length >= 15);

for (const nome of existentes) {
  const porta = PORTAS[nome];
  if (!porta) {
    falhas.push(`a funcao '${nome}' nao declara como se defende; acrescente-a a PORTAS`);
    verificadas += 1;
    continue;
  }
  const fonte = readFileSync(`supabase/functions/${nome}/index.ts`, 'utf8');
  const seccao = seccaoDe(nome);
  const abertaNoPortao = seccao.includes('verify_jwt = false');

  if (porta === 'sessao' || porta === 'administrador') {
    exigir(`'${nome}' devia conferir a sessao com auth.getUser() e nao confere`,
      /auth\.getUser\(\)/.test(fonte));
    // A ARMADILHA EXACTA de `search-prospects`: `verify_jwt` sozinho deixa
    // passar a chave publicavel do site.
    exigir(`'${nome}' devia recusar quem nao tem utilizador, e nao recusa`,
      /(!user|user === null|erroDeSessao \|\| !user)/.test(fonte));
  }
  if (porta === 'administrador') {
    exigir(`'${nome}' e ferramenta interna e devia exigir estar em 'admins'`,
      /from\('admins'\)/.test(fonte));
  }
  if (porta === 'trabalhador') {
    exigir(`'${nome}' devia exigir o segredo de trabalhador no cabecalho`,
      /BINNO_WORKER_SECRET/.test(fonte)
      && /x-binno-worker-secret/.test(fonte));
  }
  if (porta === 'assinatura') {
    exigir(`'${nome}' devia recusar quem nao assina o pedido`,
      /signature|assinatura/i.test(fonte));
  }
  if (porta === 'state') {
    exigir(`'${nome}' devia validar o 'state' que so o Binno emitiu`,
      /oauth_states|state/.test(fonte));
  }
  // E QUEM ESTA ABERTA NO PORTAO TEM DE SE DEFENDER SOZINHA. Uma funcao com
  // `verify_jwt = false` e sem defesa propria e um endereco publico.
  if (abertaNoPortao) {
    exigir(`'${nome}' esta com verify_jwt = false e nao declara defesa propria`,
      ['trabalhador', 'assinatura', 'state'].includes(porta));
  }
}

if (falhas.length) {
  console.error('Portas das funcoes: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Portas das funcoes: ${existentes.length} funcoes, ${verificadas} protecoes verdes.`);
