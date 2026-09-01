#!/usr/bin/env node
// O rascunho do modelo tem dois canais, e as regras deles sao diferentes.
//
// Em publico, prometer reembolso ou refeicao gratis ensina o proximo leitor
// que uma avaliacao de uma estrela vale dinheiro: por isso o canal publico
// recusa reparacao. Em privado, oferecer resolver e a coisa certa a dizer, e o
// molde ja tem uma variante inteira para isso: por isso o canal privado
// PERMITE reparacao, e ganha no lugar a proibicao de trocar seja o que for por
// apagar, mudar ou melhorar uma avaliacao publica, que viola as politicas do
// Google e pode custar a ficha do cliente.
//
// POR QUE ESTE GUARDA NAO PROCURA NOMES
//
// Procurar `PEDIDO_PRIVADO` no arquivo prova que a palavra esta escrita, nao
// que o texto certo e recusado. Vinte e uma levas de assercoes que nao podiam
// falhar sairam deste repositorio nesta semana por causa exactamente disso.
//
// Este guarda EXTRAI as listas de recusa do proprio arquivo da funcao e passa
// texto por elas. Se alguem enfraquecer um padrao, o texto que devia ser
// recusado passa a passar e a assercao fica vermelha. Se alguem apagar a
// diferenca entre os canais, a prova de que a reparacao passa em privado e nao
// passa em publico cai junto.
//
// Cada caso abaixo foi provado vermelho quebrando exactamente a regra que ele
// nomeia, em 01/09/2026.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const FUNCAO = 'supabase/functions/sugerir-resposta/index.ts';
const CLIENTE = 'src/lib/sugerirResposta.ts';
const POLITICA = 'src/lib/rascunhoDoModelo.ts';

const fonte = readFileSync(FUNCAO, 'utf8');

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// 1. As listas, tiradas do arquivo e executadas.
//
// A extracao vai do primeiro `const` das regras ate ao comentario que abre a
// escolha do modelo. Se o arquivo for reorganizado e o bloco deixar de ser
// encontrado, isto morre em vez de ficar verde por nao ter o que testar.
const inicio = fonte.indexOf('const TRAVESSAO =');
const fim = fonte.indexOf('// Escolhido em 31/08/2026');
if (inicio < 0 || fim < 0 || fim <= inicio) {
  console.error('Canal do rascunho: nao encontrei o bloco de regras em %s. O guarda nao pode provar nada assim.', FUNCAO);
  process.exit(1);
}
const bloco = fonte
  .slice(inicio, fim)
  .replace(/^type .*$/gm, '')
  .replace(/: Regra\[\]/g, '')
  .replace(/: Record<Canal, Regra\[\]>/g, '');

let PROIBIDO;
try {
  PROIBIDO = new Function(`${bloco}\nreturn PROIBIDO;`)();
} catch (erro) {
  console.error('Canal do rascunho: o bloco de regras nao executa (%s).', String(erro).slice(0, 120));
  process.exit(1);
}

const recusa = (canal, texto) => (PROIBIDO[canal] || []).some(({ padrao }) => padrao.test(texto));

exigir('a funcao define os dois canais', Boolean(PROIBIDO?.public) && Boolean(PROIBIDO?.private));

const TRAVESSAO = String.fromCharCode(0x2014);

// 2. O que os DOIS canais recusam sempre.
for (const [canal] of [['public'], ['private']]) {
  exigir(`${canal}: o travessao e recusado, porque e a marca mais reconhecivel de texto gerado`,
    recusa(canal, `Lamento o atraso ${TRAVESSAO} vamos melhorar.`));
  exigir(`${canal}: revelar automacao e recusado, porque quebra a voz do dono`,
    recusa(canal, 'Sou uma inteligencia artificial a responder por este negocio.'));
  exigir(`${canal}: revelar automacao tambem e recusado em ingles`,
    recusa(canal, 'I am an AI assistant replying on behalf of the owner.'));
}

// 3. O que SO o publico recusa: prometer reparacao em nome do dono.
exigir('publico: prometer devolver o valor e recusado (pt)',
  recusa('public', 'Lamento muito. Vamos devolver o valor da refeicao.'));
exigir('publico: prometer desconto e recusado (es)',
  recusa('public', 'Lo siento mucho. Te damos un descuento en tu proxima visita.'));
exigir('publico: prometer reembolso e recusado (en)',
  recusa('public', 'I am sorry. We will issue a full refund for your order.'));

// 4. E a prova que da sentido ao canal privado: o MESMO texto passa em privado.
//
// Se estas quatro ficarem verdes por o privado ter herdado a lista do publico,
// o dono recebe um recado proibido de oferecer o que ele quer oferecer, que e
// a razao inteira de este canal existir.
exigir('privado: oferecer devolver o valor PASSA, porque em privado e a coisa certa (pt)',
  !recusa('private', 'Lamento muito. Vamos devolver o valor da refeicao.'));
exigir('privado: oferecer desconto PASSA (es)',
  !recusa('private', 'Lo siento mucho. Te damos un descuento en tu proxima visita.'));
exigir('privado: oferecer reembolso PASSA (en)',
  !recusa('private', 'I am sorry. We will issue a full refund for your order.'));
exigir('privado: convidar de volta por conta da casa PASSA, que e a variante com-reparacao do molde',
  !recusa('private', 'Gostaria de receber voce de novo, por nossa conta, e mostrar como deveria ter sido.'));

// 5. O que SO o privado recusa: falar da avaliacao publica, de todo.
//
// As frases abaixo NAO sao inventadas para o guarda passar. Sao as que uma
// auditoria adversarial escreveu em 01/09/2026 contra a versao anterior desta
// lista, que tentava apanhar a TROCA por proximidade de verbo e alvo. Dezoito
// trocas plausiveis, dezoito a passar. Ficam aqui porque uma assercao que usa
// os textos que ja derrotaram a regra vale mais do que uma que usa os textos
// que a regra foi escrita para apanhar.
for (const [idioma, frase] of [
  ['pt', 'Ofereco-lhe um jantar por nossa conta se puder tirar a avaliacao do Google.'],
  ['pt', 'Damos-lhe a proxima refeicao se quiser baixar a nota que nos deu.'],
  ['pt', 'Damos-lhe um vale se puder editar o que escreveu na avaliacao.'],
  ['pt', 'Depois de resolvermos, pode reconsiderar a avaliacao que nos deixou?'],
  ['pt', 'Se aceitar o jantar por nossa conta, agradecia que apagasse depois aquilo que escreveu de nos na pagina publica do Google.'],
  ['es', 'Te invitamos a cenar si puedes borrar la resena que dejaste.'],
  ['es', 'Te devolvemos el dinero si retiras la puntuacion que nos pusiste.'],
  ['es', 'Con gusto te compensamos si cambias tu valoracion.'],
  ['en', 'We would love to comp your next dinner if you could take that review down.'],
  ['en', 'We will send you a gift card if you withdraw the review from our page.'],
  ['en', 'Happy to refund you, and I would appreciate it if you bumped us to five stars.'],
  ['en', 'Once we sort this out, would you consider updating your rating?'],
]) {
  exigir(`privado: "${frase.slice(0, 46)}..." e recusado (${idioma})`, recusa('private', frase));
}

// 6. E o que TEM de continuar a passar. Cada um destes foi um falso positivo
// medido na versao anterior: o alvo sem fronteira de palavra apanhava
// "starter", "start" e "Subway", e o cliente que se chamasse "Cinco Estrelas"
// tinha o canal partido para sempre por se assinar.
for (const [porque, frase] of [
  ['starter nao e star', 'I am sorry the starter was cold, I will improve what comes out of the kitchen.'],
  ['start nao e star', 'Let me change how we start the evening service so this does not happen again.'],
  ['Subway nao e subir', 'Lamento pela espera, aqui no Subway queremos fazer melhor.'],
  ['tomar nota nao e a nota', 'Vou tomar nota disso e falar com a equipa do turno da noite.'],
  ['um recado bom em pt', 'Ola Joao, lamento muito pela espera de 40 minutos. Gostaria de entender melhor o que aconteceu. Pode dizer-me em que dia veio ate ca? Quero resolver isto consigo.'],
  ['um recado bom em es', 'Hola, lamento que la comida llegara fria. Quiero entender que paso para poder mejorarlo. Podrias decirme a que hora hiciste el pedido?'],
  ['um recado bom em en', 'Hi Sarah, I am sorry you could not log in. I would like to fix this for you. Could you tell me what happens when you try?'],
]) {
  exigir(`privado: ${porque}, e o recado passa`, !recusa('private', frase));
}

// O nome do negocio sai do texto ANTES da conferencia, e isso nao vive na
// lista: vive no corpo da funcao. Sem isso, um negocio chamado "Cinco
// Estrelas" e recusado por se assinar, e o pedido MANDA assinar.
const recorteDoNome = fonte.match(/const paraConferir = ([^;]+);/);
exigir('o nome do negocio sai do texto antes de ser conferido', recorteDoNome !== null);
if (recorteDoNome) {
  exigir(
    'o recorte tira mesmo o nome, em vez de copiar o texto inteiro',
    recorteDoNome[1].replace(/\s+/g, ' ').trim() === "negocio ? rascunho.split(negocio).join(' ') : rascunho",
  );
  // E a lista tem de ser aplicada ao TEXTO RECORTADO. Recortar e depois
  // conferir o original deixa a linha no lugar e nao muda nada.
  exigir(
    'a lista e aplicada ao texto sem o nome do negocio, e nao ao original',
    /padrao\.test\(paraConferir\)/.test(fonte) && !/padrao\.test\(rascunho\)/.test(fonte),
  );
}

// 7. Um recado privado real, dos que o modelo devolveu no teste de 01/09/2026,
// tem de atravessar a lista inteira sem ser recusado. Sem isto, um canal
// apertado de mais entregaria o template sempre e ninguem daria por ela.
exigir('privado: um recado real do modelo atravessa a lista',
  !recusa('private', 'Ola, sinto muito por ter esperado 40 minutos e ter saido sem ser atendido. Gostaria de entender melhor o que aconteceu para que isso nao se repita. Pode dizer-me em que dia e a que horas veio ate ca? Quero fazer o possivel para melhorar.'));

// 8. O canal chega no corpo do pedido e o PADRAO e o publico, que e o canal com
// as regras mais apertadas. Um chamador antigo que nao saiba do campo tem de
// continuar a receber o que recebia.
const escolhaDoCanal = fonte.match(/const canal: Canal = ([^;]+);/);
exigir('a funcao le o canal do corpo do pedido', escolhaDoCanal !== null);
if (escolhaDoCanal) {
  exigir(
    'qualquer valor que nao seja exactamente private cai no publico',
    escolhaDoCanal[1].replace(/\s+/g, ' ').trim() === "corpo.channel === 'private' ? 'private' : 'public'",
  );
}

// 9. Os dois pedidos existem e dizem coisas opostas sobre reparacao. Aqui a
// verificacao e mesmo textual, porque um pedido ao modelo E texto: o que se
// prova e que a instrucao que separa os canais nao foi apagada.
const pedidoPrivado = fonte.slice(fonte.indexOf('const PEDIDO_PRIVADO'), fonte.indexOf('Deno.serve'));
const pedidoPublico = fonte.slice(fonte.indexOf('const PEDIDO_PUBLICO'), fonte.indexOf('const PEDIDO_PRIVADO'));
exigir('o pedido publico continua a proibir prometer reparacao',
  /Never promise a refund, discount, voucher, free item or any compensation/.test(pedidoPublico));
exigir('o pedido privado autoriza oferecer resolver',
  /You MAY offer to fix it/.test(pedidoPrivado));
exigir('o pedido privado proibe negociar a avaliacao publica',
  /NEVER write the words review, rating, stars, score, Google/.test(pedidoPrivado)
  && /never offer anything in exchange for changing one/.test(pedidoPrivado));
exigir('o pedido privado diz ao modelo que isto nao e publicado',
  /not published anywhere/.test(pedidoPrivado));
// Os dois pedidos existirem no ficheiro nao prova que o privado e USADO. A
// auditoria de 01/09/2026 trocou `PEDIDO_PRIVADO` por `PEDIDO_PUBLICO` na
// escolha e os dois guardas ficaram verdes: o canal privado receberia o pedido
// que diz "Write the owner's PUBLIC reply" e que proibe oferecer reparacao,
// que e o defeito que este trabalho inteiro existe para resolver.
const escolhaDoPedido = fonte.match(/const pedido = canal === 'private'\s*\?\s*([A-Z_]+)\([^)]*\)\s*:\s*([A-Z_]+)\(/);
exigir('a funcao escolhe o pedido pelo canal, e a escolha e legivel', escolhaDoPedido !== null);
if (escolhaDoPedido) {
  exigir('o canal privado recebe o PEDIDO PRIVADO', escolhaDoPedido[1] === 'PEDIDO_PRIVADO');
  exigir('o canal publico recebe o PEDIDO PUBLICO', escolhaDoPedido[2] === 'PEDIDO_PUBLICO');
}

// I1 da mesma auditoria: a funcao pode deixar de LER os campos do corpo com
// tudo o resto verde. `const pais = null;` desfazia o commit inteiro da
// variante do portugues sem uma linha vermelha.
for (const [campo, nome] of [['businessCountry', 'o pais do negocio'], ['customerName', 'o nome de quem escreveu']]) {
  const leitura = new RegExp(`const (pais|cliente) = typeof corpo\\.${campo} === 'string'`);
  exigir(`a funcao le ${nome} do corpo do pedido, em vez de o fixar`, leitura.test(fonte));
}

// M1: o tecto do privado. Baixa-lo para 1 fazia o canal recusar tudo e
// entregar sempre o molde, em silencio.
const tecto = fonte.match(/const tecto = canal === 'private' \? (\d+) : (\d+);/);
exigir('os dois tectos de tamanho continuam declarados pelo canal', tecto !== null);
if (tecto) {
  exigir('o tecto do recado privado da para 3 a 6 frases', Number(tecto[1]) === 1600);
  exigir('o tecto da resposta publica nao mudou', Number(tecto[2]) === 1200);
}

exigir('os dois pedidos continuam a declarar o idioma antes de escrever',
  /Identify the language/.test(pedidoPublico) && /Identify the language/.test(pedidoPrivado));

// 9b. A variante do portugues segue o pais do NEGOCIO, com a mesma regra do
// molde. Ao provar o canal privado em 01/09/2026, os quatro rascunhos sairam em
// brasileiro para um negocio em Portugal: o modelo escreve na lingua do
// cliente, mas a lingua nao escolhe a variante. Para o piloto, que e em
// Portugal, um recado do dono escrito em brasileiro le-se como escrito por
// outra pessoa.
//
// A regra e EXECUTADA, e nao procurada: extrai-se a funcao do arquivo e
// pergunta-se-lhe por cada pais. Uma condicao invertida, ou um `toUpperCase`
// que fizesse 'br' passar a brasileiro, ficaria verde numa busca por nome.
const inicioVariante = fonte.indexOf('const VARIANTE_DO_PORTUGUES');
const fimVariante = fonte.indexOf('const PEDIDO_PUBLICO');
exigir('a variante do portugues continua a existir e a ser legivel',
  inicioVariante >= 0 && fimVariante > inicioVariante);
if (inicioVariante >= 0 && fimVariante > inicioVariante) {
  const VARIANTE = new Function(
    `${fonte.slice(inicioVariante, fimVariante).replace(/: string \| null/g, '')}\nreturn VARIANTE_DO_PORTUGUES;`,
  )();
  exigir('o pais BR pede portugues do Brasil', /Brazilian Portuguese/.test(VARIANTE('BR')));
  for (const pais of ['PT', 'ES', '', null]) {
    exigir(
      `o pais ${pais === null ? 'ausente' : `"${pais}"`} pede portugues de Portugal`,
      /European Portuguese/.test(VARIANTE(pais)),
    );
  }
  // A mesma exigencia que `check-reply-locale-br` faz ao molde: 'br' minusculo
  // NAO e 'BR'. Duas regras diferentes para a mesma decisao dariam ao dono um
  // molde numa variante e um rascunho noutra, na mesma tela.
  exigir('o pais "br" em minusculas nao vira brasileiro, como no molde',
    /European Portuguese/.test(VARIANTE('br')));
}
// ONDE a variante vive no pedido, e nao so QUE ela e aplicada.
//
// Em 01/09/2026 ela nasceu colada a frase do Step 2 ("write in that same
// language. If that language is Portuguese, write Brazilian Portuguese"), e
// mencionar uma variante do portugues ali ATRAI o modelo para o portugues:
// Marcelo abriu um comentario privado escrito em INGLES e recebeu o rascunho
// em portugues do Brasil, com o molde ao lado correctamente em ingles. Medido
// depois: 1 erro em 6 na forma antiga, 0 em 20 na nova.
//
// A assercao anterior so exigia que a variante fosse aplicada, e ficava verde
// com ela no sitio que causava o defeito.
for (const [nome, pedido] of [['publico', pedidoPublico], ['privado', pedidoPrivado]]) {
  exigir(`o pedido ${nome} aplica a variante do portugues`, /VARIANTE_DO_PORTUGUES\(pais\)/.test(pedido));
  // A frase que escolhe o idioma nao pode falar de portugues nenhum.
  const passoDoIdioma = (pedido.match(/Step 1\.[\s\S]*?Step 2\.[^\n]*/) || [''])[0];
  exigir(
    `o pedido ${nome} nao menciona portugues na frase que escolhe o idioma`,
    passoDoIdioma.length > 0 && !/VARIANTE_DO_PORTUGUES|Portuguese|Brazilian/.test(passoDoIdioma),
  );
  // E a variante tem de trazer o escape, senao ela volta a ser uma instrucao
  // incondicional escrita mais abaixo.
  exigir(
    `o pedido ${nome} manda ignorar a variante quando o idioma nao e portugues`,
    /applies ONLY if the language you identified in Step 1 is Portuguese[\s\S]{0,140}ignore it completely/.test(pedido),
  );
}

// 10. O canal tem de atravessar o cliente ate a funcao. Sem esta linha, tudo
// acima esta correcto e o painel continua a pedir sempre em publico.
const cliente = readFileSync(CLIENTE, 'utf8');
exigir('o cliente envia o canal no corpo do pedido', /channel: entrada\.channel/.test(cliente));
exigir('o cliente envia o nome de quem escreveu, que o recado privado usa para abrir',
  /customerName: entrada\.customerName/.test(cliente));

const politica = readFileSync(POLITICA, 'utf8');
const sugestoes = readFileSync('src/components/dashboard/ReplySuggestions.tsx', 'utf8');
exigir('a entrada do rascunho carrega o canal', /channel: ReplyChannel/.test(politica));
exigir('o cliente envia o pais do negocio, que escolhe a variante do portugues',
  /businessCountry: entrada\.businessCountry/.test(cliente));
exigir('a entrada do rascunho carrega o pais do negocio', /businessCountry: string \| null/.test(politica));
// A leitura tem de ser DENTRO da entrada de `pedirRascunho`, e nao no arquivo
// inteiro. A primeira versao procurava `businessCountry,` no ficheiro todo e
// ficava verde com a linha apagada do pedido, porque `buildReplySuggestions`
// tem uma propriedade com o mesmo nome umas linhas abaixo. Apanhado ao tentar
// prova-la vermelha em 01/09/2026.
for (const [tela, arquivo] of [
  ['/reviews', 'src/components/dashboard/ReplySuggestions.tsx'],
  ['o cockpit', 'src/components/dashboard/ApprovedCockpitDashboard.tsx'],
]) {
  const entrada = readFileSync(arquivo, 'utf8').match(/pedirRascunho\([\s\S]*?\{([\s\S]*?)\},/);
  exigir(`${tela}: a entrada do pedido continua legivel`, entrada !== null);
  if (entrada) {
    exigir(`${tela} passa o pais do negocio no pedido`, /\n\s*businessCountry,\n/.test(entrada[1]));
  }
}

// ---------------------------------------------------------------------------
// C4 da auditoria de 01/09/2026: QUEM escolhe o canal, e mais ninguem.
// ---------------------------------------------------------------------------
//
// Trocar `channel: 'public'` por `'private'` no cockpit deixava os dois guardas
// e o `tsc` verdes, e fazia a fila de avaliacoes do Google ser rascunhada pela
// lista do PRIVADO, que PERMITE prometer reembolso e refeicao gratis. O dono
// copiava para a pagina publica dele uma resposta a prometer dinheiro.
//
// A defesa e enumerar as telas e prender a expressao de cada uma. A contagem
// entra junto: uma tela nova que desenhe `ReplySuggestions` sem entrar nesta
// lista fica vermelha por existir, em vez de nascer desguardada.
const TELAS_COM_CANAL = [
  ['src/components/dashboard/reviews/FilaDeRespostas.tsx',
    "channel={item.origem === 'comentario-privado' ? 'private' : 'public'}",
    'a fila somada escolhe pela ORIGEM do item, que e a unica que mistura os dois'],
  ['src/components/dashboard/reviews/ReviewCard.tsx',
    'channel="public"',
    'a leitura publica do Google em Definicoes, que so tem avaliacoes do Google'],
];
for (const [arquivo, expressao, porque] of TELAS_COM_CANAL) {
  exigir(`${arquivo}: ${porque}`, readFileSync(arquivo, 'utf8').includes(expressao));
}
const telasQueDesenham = ['src/components/dashboard/reviews/FilaDeRespostas.tsx', 'src/components/dashboard/reviews/ReviewCard.tsx'];
// `<ReplySuggestions` casa tambem a declaracao do proprio componente
// (`const ReplySuggestions: React.FC<...`), que nao e uma tela que o desenhe.
// O ficheiro que o define sai da conta.
const encontradas = execSync("grep -rl '<ReplySuggestions' src/ || true", { encoding: 'utf8' })
  .split('\n').map((linha) => linha.trim())
  .filter((linha) => linha && linha !== 'src/components/dashboard/ReplySuggestions.tsx').sort();
exigir(
  `so as telas conhecidas desenham o painel de sugestoes (encontradas: ${encontradas.join(', ') || 'nenhuma'})`,
  encontradas.length === telasQueDesenham.length && telasQueDesenham.every((t) => encontradas.includes(t)),
);
// E o cockpit, que nao desenha o painel mas paga a chamada por conta propria.
exigir(
  'o cockpit pede em publico, porque a fila dele e so de avaliacoes do Google',
  /channel: 'public',/.test(readFileSync('src/components/dashboard/ApprovedCockpitDashboard.tsx', 'utf8')),
);

// ---------------------------------------------------------------------------
// C5 da mesma auditoria: o privado pode ser desligado outra vez.
// ---------------------------------------------------------------------------
//
// A assercao anterior negava UMA escrita exacta (`if (channel !== 'public')`).
// Acrescentar `if (channel === 'private') return;` uma linha abaixo deixava os
// dois guardas verdes e desligava a funcionalidade que Marcelo pediu. Passa a
// negar-se QUALQUER saida antecipada que olhe para o canal, dentro do efeito.
const efeitoDoPedido = sugestoes.slice(
  sugestoes.indexOf('useEffect(() => {'),
  sugestoes.indexOf('const suggestions = useMemo('),
);
exigir('o efeito que pede o rascunho continua legivel', efeitoDoPedido.length > 0);
exigir(
  'o efeito nao tem saida antecipada nenhuma que olhe para o canal',
  !/if \([^)]*\bchannel\b[^)]*\)\s*return/.test(efeitoDoPedido),
);
exigir(
  'o efeito continua a pedir o rascunho, em vez de nao fazer nada',
  /void pedirRascunho\(/.test(efeitoDoPedido),
);

// ---------------------------------------------------------------------------
// I2 da auditoria de 01/09/2026: nao pagar a chamada antes de saber o pais.
// ---------------------------------------------------------------------------
//
// `businessCountry` nasce `null` e so e preenchido depois de um `await` ao
// perfil, e `null` tambem e a resposta legitima de quem nao tem pais gravado:
// os dois estados eram o mesmo valor. A fila do piloto ja esta no retrato
// quando o painel monta, entao o pedido partia no primeiro quadro com o pais
// a `null`, e o cache do rascunho e por id: o primeiro resultado prende-se a
// sessao e nao se corrige quando o perfil chega. Um dono brasileiro ficava com
// a primeira avaliacao respondida em portugues de Portugal ao lado de um molde
// em pt-BR, na mesma tela.
const cockpit = readFileSync('src/components/dashboard/ApprovedCockpitDashboard.tsx', 'utf8');
exigir(
  'o cockpit distingue "ja se leu o pais" de "o pais e nulo"',
  /const \[paisLido, setPaisLido\] = useState\(false\);/.test(cockpit),
);
exigir(
  'o cockpit espera pelo pais antes de pagar a chamada',
  /if \(!paisLido\) return;/.test(cockpit),
);
// Sem isto o efeito nao reexecuta quando o perfil chega, e o rascunho nunca e
// pedido: a espera passa a ser permanente, que e pior do que o defeito.
exigir(
  'o efeito reexecuta quando o pais chega',
  /\}, \[selected\?\.id, demo, paisLido\]\);/.test(cockpit),
);
// E a leitura tem de terminar mesmo quando falha, senao uma rede em baixo
// deixa o painel a espera para sempre.
exigir(
  'uma leitura de perfil que falha tambem conta como lida',
  /finally \{[\s\S]{0,200}setPaisLido\(true\)/.test(cockpit),
);
// Sem sessao nao ha perfil para esperar.
exigir(
  'sem sessao o painel nao fica a espera de um perfil que nao vem',
  /if \(!userId\) \{ setPaisLido\(true\); return; \}/.test(cockpit),
);

if (falhas.length) {
  console.error('Canal do rascunho: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Canal do rascunho: ${verificadas} protecoes verdes.`);
