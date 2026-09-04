#!/usr/bin/env node
// O cadastro nao tranca a porta em coisas que o Binno descobre sozinho.
//
// POR QUE ESTE GUARDA EXISTE
//
// Ate 04/09/2026 o cadastro exigia DUAS coisas antes de deixar o dono entrar:
// colar o endereco do negocio no Google, e criar um QR code. Marcelo apanhou
// as duas — "ele insiste com esse link" e "posso pular criar QR CODE?".
//
// O endereco deixou de ser a unica forma de o Binno saber para onde mandar o
// cliente: desde 03/09 a ligacao oficial devolve o mesmo identificador vindo do
// proprio Google. Trancar o cadastro num campo que o dono pode nao ter a mao —
// e que o produto descobre depois — e mandar embora quem ainda nem viu nada.
//
// E O QR E UM CANAL DE AQUISICAO, nao a porta do produto: com a ligacao oficial
// o dono ja tem o que responder no primeiro dia sem imprimir nada.
//
// MAS PULAR TEM UMA CONSEQUENCIA, e ela e o que este guarda mais protege: um QR
// criado sem endereco leva o cliente a uma pagina sem nada em que clicar. Pior
// do que nao ter QR. Sem endereco, o passo do QR nao pode oferecer criar.
import { readFileSync } from 'node:fs';

const CAMINHO = 'src/pages/Onboarding.tsx';
const fonte = readFileSync(CAMINHO, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

if (fonte.includes('UM QR SEM DESTINO E PIOR')) {
  console.error('O strip de comentarios nao funcionou; as asserções mediriam a explicacao.');
  process.exit(1);
}

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. DA PARA PASSAR SEM O ENDERECO.
exigir('o cadastro voltou a exigir o endereco do Google para deixar continuar',
  /onboarding\.googleDepois/.test(fonte));
// E pular NAO pode escrever: `saveLinks` apaga antes de inserir, e corre-lo com
// o campo vazio apagaria um link de uma passagem anterior.
exigir('pular o endereco passou a chamar saveLinks; com o campo vazio isso APAGA o link que o dono ja tinha',
  /onClick=\{\(\) => setStep\(2\)\} disabled=\{saving\}/.test(fonte));

// 2. DA PARA PULAR O QR.
exigir('o passo do QR voltou a ser obrigatorio',
  /onboarding\.qrDepois/.test(fonte));

// 3. E UM QR SEM DESTINO NAO E OFERECIDO. Esta e a assercao que impede o
//    conserto de criar um defeito pior do que o que resolve.
exigir('sem endereco, o cadastro ainda oferece criar um QR que nao leva a lado nenhum',
  /\{!googleUrl\.trim\(\) \? \(/.test(fonte));
exigir('o cadastro nao explica por que o QR nao pode ser criado sem endereco',
  /onboarding\.qrSemDestino/.test(fonte));

// 4. O CAMINHO RECOMENDADO CONTINUA A SER O PRINCIPAL. Um guarda que so
//    exigisse "da para pular" passaria com o botao de criar apagado.
exigir('o botao de criar o QR desapareceu; pular era para ser a saida, nao o caminho',
  /onboarding\.createQr/.test(fonte) && /onClick=\{createQr\}/.test(fonte));

// 5. AS CHAVES EXISTEM NOS TRES IDIOMAS.
for (const locale of ['pt-BR', 'pt-PT', 'en']) {
  const d = JSON.parse(readFileSync(`src/i18n/owner/locales/${locale}.json`, 'utf8'));
  for (const chave of ['googleDepois', 'qrDepois', 'qrSemDestino']) {
    exigir(`${locale}: falta a chave onboarding.${chave}`,
      typeof d?.onboarding?.[chave] === 'string' && d.onboarding[chave].trim().length > 0);
  }
}

if (falhas.length) {
  console.error('Onboarding que nao tranca: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Onboarding que nao tranca: ${verificadas} protecoes verdes.`);
