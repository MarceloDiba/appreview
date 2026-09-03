#!/usr/bin/env node
// O login com o Google, e o buraco que ele podia abrir.
//
// POR QUE ESTE GUARDA EXISTE
//
// O botao "Continuar com o Google" tem tres formas de virar defeito que nao
// aparecem ao olhar so para ele:
//
//   Duas copias da mesma decisao. O login e o cadastro sao paginas diferentes,
//   e as duas precisam de decidir a mesma coisa depois de a sessao chegar: vai
//   para o painel, ou para o assistente de configuracao? Escrever isso duas
//   vezes e escrever uma bomba-relogio: a primeira vez que alguem mudar uma
//   copia e nao a outra, um caminho fica desactualizado, e a diferenca so
//   aparece quando um cliente real cai no lado errado.
//
//   O Google nao manda `businessName`. O cadastro por e-mail pede o nome do
//   negocio no proprio formulario; o Google devolve nome e e-mail, mais nada.
//   Sem o assistente de configuracao a cobrir essa falta, uma conta criada
//   pelo Google aterrava num painel vazio sem nome nenhum, para sempre.
//
//   Um clique sem saida. `signInWithOAuth` bem sucedido navega o navegador
//   INTEIRO para o Google — nao ha "sucesso" para mostrar depois disso, so
//   falha (rede, bloqueio de popup). Um botao que trata isso como qualquer
//   outro pedido assincrono mostraria "carregando" para sempre num clique que
//   nunca volta.
//
// O QUE ESTE GUARDA NAO APANHA
//
// Se a conta do Google FICA LIGADA a uma conta de e-mail e senha existente com
// o mesmo endereco — isso e decidido pelo Supabase Auth no servidor, nao por
// codigo desta aplicacao, e nao ha como correr um fluxo OAuth de verdade aqui.
// Fica escrito no contrato de produto como o unico ponto deste recurso que so
// se prova com um clique real.
import { readFileSync } from 'node:fs';

const CONTEXTO = 'src/context/AuthContext.tsx';
const BOTAO = 'src/components/auth/BotaoDoGoogle.tsx';
const LOGIN = 'src/pages/Login.tsx';
const CADASTRO = 'src/pages/Signup.tsx';
const SETUP = 'src/hooks/useSetupStatus.ts';
const ONBOARDING = 'src/pages/Onboarding.tsx';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const ler = (caminho) => semComentarios(readFileSync(caminho, 'utf8'));

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const contexto = ler(CONTEXTO);
const botao = ler(BOTAO);
const login = ler(LOGIN);
const cadastro = ler(CADASTRO);
const setup = ler(SETUP);
const onboarding = ler(ONBOARDING);

// 1. A chamada existe, e usa o provedor certo.
exigir('o contexto expoe signInWithGoogle',
  /signInWithGoogle: \(\) => Promise<\{ error: AuthError \| null \}>;/.test(contexto));
exigir('a chamada usa o provedor google',
  /supabase\.auth\.signInWithOAuth\(\{\s*provider: 'google',/.test(contexto));
// Sem `redirectTo` explicito, o Supabase manda para a pagina em que o clique
// aconteceu — que no cadastro seria `/signup`, e essa pagina nao decide para
// onde ir depois. O redirecionamento tem de ser fixo em `/login`.
exigir('o redirecionamento aponta sempre para /login, mesmo a partir do cadastro',
  /redirectTo: `\$\{window\.location\.origin\}\/login`/.test(contexto));

// 2. O BOTAO E UM SO, e as duas telas usam o MESMO ficheiro. Dois botoes
// escritos a mao divergiam no texto ou no icone na primeira alteracao.
exigir('o login usa o componente partilhado do botao',
  /<BotaoDoGoogle \/>/.test(login));
exigir('o cadastro usa o mesmo componente, e nao uma copia',
  /<BotaoDoGoogle \/>/.test(cadastro)
  && /import BotaoDoGoogle from '@\/components\/auth\/BotaoDoGoogle';/.test(cadastro));
exigir('o botao nao mostra um estado de sucesso: um clique que funciona nunca volta',
  !/entrando \? .*sucesso/i.test(botao));
exigir('o botao so mostra erro quando a propria redireccao falha',
  /if \(error\) \{[\s\S]{0,120}toast\.error/.test(botao));

// 3. A DECISAO POS-LOGIN E UMA SO, exportada de Login.tsx e usada pelos DOIS
// caminhos daquela pagina — o clique manual e o `useEffect` que reage a
// sessao chegar do Google.
exigir('a decisao pos-login e uma funcao exportada, e nao duplicada',
  /export const navegarDepoisDoLogin = async \(userId: string\) => \{/.test(login));
// `navegarDepoisDoLogin(` so aparece nas CHAMADAS: a definicao usa
// `navegarDepoisDoLogin = async`, sem parenteses logo a seguir ao nome.
const usosDaDecisao = (login.match(/navegarDepoisDoLogin\(/g) || []).length;
exigir('a funcao e usada pelos dois caminhos da pagina de login, e nao definida e ignorada',
  usosDaDecisao >= 2);
exigir('quem ja tinha sessao (ou acabou de voltar do Google) tambem passa pela decisao',
  /if \(user\) \{[\s\S]{0,120}navegarDepoisDoLogin\(user\.id\)/.test(login));

// 4. O CADASTRO NAO TEM UMA SEGUNDA COPIA da decisao. Se ele a reescrever, as
// duas vao divergir na primeira alteracao que toque so numa.
exigir('o cadastro nao redefine a decisao pos-login',
  !/const navegarDepoisDoLogin|isComplete/.test(cadastro));

// 5. O GOOGLE NAO MANDA NOME DE NEGOCIO. Sem o assistente de configuracao a
// exigir isso antes de considerar a conta pronta, uma conta criada pelo Google
// aterrava num painel vazio, sem nome, para sempre.
exigir('o estado de configuracao exige nome de negocio para se considerar completo',
  /isComplete: !!businessName/.test(setup));
exigir('o assistente pede o nome do negocio a quem chega sem ele',
  /businessNameLabel/.test(onboarding));

if (falhas.length) {
  console.error('Login com o Google: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Login com o Google: ${verificadas} protecoes verdes.`);
