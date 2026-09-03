#!/usr/bin/env node
// Nenhuma funcao fica no repositorio sem estar declarada como implantada.
//
// Em 03/09/2026, `google-business-oauth-callback` e `sync-google-business-profile`
// existiam no repositorio desde agosto e nao no servidor. O Google devolveu o
// navegador para um endereco inexistente, e o defeito so apareceu quando o
// primeiro utilizador real tentou usar.
//
// Este guarda nao consegue perguntar ao servidor (nao tem credenciais). O que
// ele faz e obrigar a lista abaixo a acompanhar a pasta: uma funcao nova no
// repositorio fica vermelha ate alguem a implantar E a declarar aqui. E uma
// promessa humana, mas e uma promessa que o `verify` cobra.
import { readdirSync, readFileSync } from 'node:fs';

// Actualizar SEMPRE que implantar uma funcao nova, com a data.
const IMPLANTADAS = {
  'apify-auto-collect-on-signup': '2026-09-03',
  'billing-checkout': '2026-08-27',
  'email-dispatch': '2026-09-02',
  'fetch-google-reviews': '2026-07-13',
  'google-business-oauth-callback': '2026-09-03',
  'materialize-whatsapp-notifications': '2026-09-02',
  'search-prospects': '2026-08-25',
  'start-google-business-oauth': '2026-08-27',
  'stripe-billing-webhook': '2026-08-27',
  'sugerir-resposta': '2026-09-02',
  'sync-experimental-apify': '2026-09-01',
  'sync-google-business-profile': '2026-09-03',
  'telegram-dispatch': '2026-09-01',
  'temas-das-avaliacoes': '2026-09-02',
  'whatsapp-notifications': '2026-09-03',
};

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const noRepositorio = readdirSync('supabase/functions', { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory() && !entrada.name.startsWith('_'))
  .map((entrada) => entrada.name)
  .sort();

for (const funcao of noRepositorio) {
  exigir(
    `a funcao "${funcao}" existe no repositorio e esta declarada como implantada`,
    Object.prototype.hasOwnProperty.call(IMPLANTADAS, funcao),
  );
}
for (const funcao of Object.keys(IMPLANTADAS)) {
  exigir(
    `a funcao declarada "${funcao}" ainda existe no repositorio`,
    noRepositorio.includes(funcao),
  );
}
// Uma data por funcao, para a lista nao virar um conjunto de nomes sem
// significado que alguem preenche sem pensar.
for (const [funcao, data] of Object.entries(IMPLANTADAS)) {
  exigir(`a funcao "${funcao}" tem data de implantacao no formato AAAA-MM-DD`,
    /^\d{4}-\d{2}-\d{2}$/.test(data));
}

if (falhas.length) {
  console.error('Funcoes implantadas: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Funcoes implantadas: ${verificadas} protecoes verdes.`);
