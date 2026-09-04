#!/usr/bin/env node
// A assinatura tem uma porta visivel, no computador e no telemovel.
//
// POR QUE ESTE GUARDA EXISTE
//
// A aba de cobranca existe em `/profile` desde sempre — com o estado da
// assinatura, a data de renovacao e o botao que abre o portal de cancelamento.
// E nada no painel levava ate la.
//
// Na primeira compra real do produto, em 04/09/2026, o proprio Marcelo pagou,
// entrou, e disse: "dentro do app nao tem nada relacionado a assinatura. Logo,
// nao se sabe se esta ativa, ate quando e valida, quando renova".
//
// Uma funcionalidade que existe e que ninguem alcanca nao existe. E a promessa
// "cancele quando quiser", escrita na pagina de venda, depende de o dono achar
// esta porta sozinho.
import { readFileSync } from 'node:fs';

const NAV = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

if (/nao tem nada relacionado a assinatura/.test(NAV)) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (r, c) => { verificadas += 1; if (!c) falhas.push(r); };

// O ENDERECO LEVA A ABA JA ABERTA. Cair na pagina certa e ter de procurar a aba
// certa e o mesmo problema, menor.
const portas = [...NAV.matchAll(/to="\/profile\?aba=assinatura"/g)];
exigir(`a assinatura tem ${portas.length} porta(s) no menu; precisa de duas — computador e telemovel`,
  portas.length >= 2);

exigir('o item do menu perdeu o texto traduzido',
  /\{t\('nav\.subscription'\)\}/.test(NAV));

// E A ABA TEM DE ABRIR MESMO com esse endereco. Sem isto, os links acima
// levariam a pagina do perfil com a aba errada, e o guarda ficaria verde.
const PERFIL = readFileSync('src/pages/Profile.tsx', 'utf8');
exigir('o Perfil deixou de abrir na cobranca quando o endereco pede',
  /searchParams\.get\('aba'\) === 'assinatura' \? 'billing' : 'profile'/.test(PERFIL));

// E O BOTAO QUE CANCELA TEM DE ESTAR LA. Uma porta que abre numa sala sem
// saida nao cumpre "cancele quando quiser".
exigir('o Perfil deixou de oferecer o portal onde se cancela',
  /action: 'portal'/.test(PERFIL));

// O TEXTO EXISTE NOS TRES IDIOMAS. Um item de menu vazio e pior do que nenhum.
for (const idioma of ['pt-BR', 'pt-PT', 'en']) {
  const dicionario = JSON.parse(readFileSync(`src/i18n/owner/locales/${idioma}.json`, 'utf8'));
  exigir(`'${idioma}' nao tem nome para o item de assinatura`,
    Boolean(dicionario.nav?.subscription));
}

if (falhas.length) {
  console.error('A assinatura tem porta: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`A assinatura tem porta: ${verificadas} protecoes verdes.`);
