#!/usr/bin/env node
// O convite para avaliar no Google nao pode depender da nota.
//
// Convidar so quem deu 4 ou 5 e solicitacao seletiva, e a politica do Google
// proibe. Ate 02/09/2026 o aviso do comentario privado escrevia "Agradeca e
// convide a publicar no Google" apenas quando `especie = 'feedback-praise'`,
// ou seja, so para nota 4 ou 5. Quem deu 3 ou menos nunca era convidado.
//
// Duas analises independentes de concorrentes apontaram o nao-filtrar como a
// melhor vantagem de venda do Binno. Nao se vende isso enquanto o produto
// sugere o contrario.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { tipoDoContacto, apenasDigitos } = await import(
  pathToFileURL(resolve(process.cwd(), 'src/lib/contactoDoCliente.ts')).href
);
const { mensagemDoConvite, linkDeWhatsApp } = await import(
  pathToFileURL(resolve(process.cwd(), 'src/lib/convite.ts')).href
);

const MIGRACAO = 'supabase/migrations/20260902120000_convite_sem_filtro.sql';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const semComentariosSql = (fonte) => fonte.replace(/^\s*--[^\n]*$/gm, '');
const migracao = semComentariosSql(readFileSync(MIGRACAO, 'utf8'));

// O bloco que escreve o convite nao pode estar dentro de um `if` sobre a
// especie. Le-se o corpo entre o fecho do bloco da citacao e o link final.
const inicio = migracao.indexOf("linhas := array_append(linhas, '');\n\n    if especie");
exigir(
  'o convite deixou de estar dentro de um if sobre a especie do aviso',
  inicio === -1,
);
exigir(
  'o convite ao Google continua a existir, para toda a gente',
  /convide a publicar no Google/.test(migracao),
);
exigir(
  'a regra de quando avisar nao mudou: nota ausente continua a nao avisar',
  /if new\.rating is null then\s+return new;/.test(migracao),
);

// ---------------------------------------------------------------------------
// O contacto, CORRIDO. A coluna `internal_feedback.customer_email` guarda
// telefones: cinco das seis linhas reais em 02/09/2026 comecam por "+55". O
// nome da coluna mente, e essa mentira nao pode espalhar-se pelo produto.
// ---------------------------------------------------------------------------
exigir('um numero com indicativo e telefone', tipoDoContacto('+5579998380767') === 'telefone');
exigir('um numero com espacos e travessoes tambem e telefone', tipoDoContacto('(79) 99838-0767') === 'telefone');
exigir('um endereco de email e email', tipoDoContacto('carol@exemplo.com') === 'email');
exigir('vazio nao e nada', tipoDoContacto('') === 'nenhum');
exigir('nulo nao e nada', tipoDoContacto(null) === 'nenhum');
// Curto demais para ser telefone e sem arroba para ser email.
exigir('lixo curto nao vira telefone', tipoDoContacto('123') === 'nenhum');
exigir('os digitos saem limpos', apenasDigitos('+55 (79) 99838-0767') === '5579998380767');

// ---------------------------------------------------------------------------
// A MENSAGEM. A asserção que sustenta este plano inteiro: ela nao pode mudar
// com a nota, porque a nota nao entra nela.
// ---------------------------------------------------------------------------
const base = { nomeDoCliente: 'Carol', nomeDoNegocio: 'Noá Digital', linkDeAvaliacao: 'https://g.page/r/abc/review', idioma: 'pt-BR' };
exigir('a mensagem nomeia o cliente', mensagemDoConvite(base).includes('Carol'));
exigir('a mensagem nomeia o negocio', mensagemDoConvite(base).includes('Noá Digital'));
exigir('a mensagem leva o link', mensagemDoConvite(base).includes('https://g.page/r/abc/review'));
exigir('a mensagem nao usa travessao', !/[—–]/.test(mensagemDoConvite(base)));
exigir(
  'sem link nao ha convite: devolve vazio em vez de convidar para lado nenhum',
  mensagemDoConvite({ ...base, linkDeAvaliacao: null }) === '',
);
exigir(
  'sem nome, a mensagem abre sem nome em vez de dizer "null"',
  !mensagemDoConvite({ ...base, nomeDoCliente: null }).includes('null'),
);
exigir('o portugues de Portugal e diferente do do Brasil',
  mensagemDoConvite({ ...base, idioma: 'pt-PT' }) !== mensagemDoConvite({ ...base, idioma: 'pt-BR' }));
exigir('o ingles existe', /review|Google/i.test(mensagemDoConvite({ ...base, idioma: 'en' })));

// ---------------------------------------------------------------------------
// O LINK. O Binno nao envia: monta o endereco e o dono toca.
// ---------------------------------------------------------------------------
const msg = mensagemDoConvite(base);
exigir('um telefone vira link de whatsapp',
  linkDeWhatsApp('+5579998380767', msg)?.startsWith('https://wa.me/5579998380767?text=') === true);
exigir('a mensagem vai codificada no link',
  linkDeWhatsApp('+5579998380767', msg)?.includes(encodeURIComponent('Carol')) === true);
exigir('um email nao vira link de whatsapp', linkDeWhatsApp('carol@exemplo.com', msg) === null);
exigir('sem contacto nao ha link', linkDeWhatsApp(null, msg) === null);
exigir('sem mensagem nao ha link', linkDeWhatsApp('+5579998380767', '') === null);

if (falhas.length) {
  console.error('Convite sem filtro: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Convite sem filtro: ${verificadas} protecoes verdes.`);
