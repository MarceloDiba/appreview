#!/usr/bin/env node
// O nono digito brasileiro nao pode fazer o Binno desconhecer o dono.
//
// POR QUE ESTE GUARDA EXISTE
//
// Um telemovel no Brasil e `55` + DDD + 9 digitos, e o primeiro desses nove e
// um `9` acrescentado a numeracao antiga. A Meta guarda e devolve muitos
// numeros brasileiros SEM esse `9`. As duas formas sao a mesma linha.
//
// Em 04/09/2026 isto custou uma tarde, e apareceu DAS DUAS PONTAS:
//
//   O numero do Binno estava no handoff como +55 79 99198-6091 e no painel da
//   Meta como +55 79 9198-6091. O dono mandava mensagem para um numero que nao
//   existe, e o WhatsApp respondia "essa pessoa nao esta mais no WhatsApp".
//
//   E a resposta dele chegava ao webhook como 5579 9140-7447, enquanto a
//   preferencia guardava 5579 9 9140-7447. A comparacao exigia digitos
//   identicos, nao casava, e a mensagem era descartada com "numero que nao e de
//   nenhum dono" — o webhook aceitava e nao acontecia nada.
//
// O SINTOMA E MUDO NOS DOIS CASOS. Ninguem ve um erro: uma mensagem apenas nao
// chega, e a janela de 24 horas nunca abre.
import { readFileSync } from 'node:fs';

const CAMINHO = 'supabase/functions/whatsapp-cloud-webhook/index.ts';
const fonte = readFileSync(CAMINHO, 'utf8');

// Recorta a funcao e corre-a. Procurar o nome dela provaria que a linha existe;
// correr prova que ela junta as duas formas e nao junta o que nao deve.
const inicio = fonte.indexOf('const mesmaLinha');
const fim = fonte.indexOf('Deno.serve');
if (inicio === -1 || fim <= inicio) {
  console.error('Nao achei `mesmaLinha` no webhook. Sem ela, nada abaixo mede o que diz medir.');
  process.exit(1);
}
const corpo = fonte.slice(inicio, fim)
  .replace("const mesmaLinha = (guardado: string, recebido: string): 'exato' | 'nono-digito' | null =>",
           'const mesmaLinha = (guardado, recebido) =>')
  .replace(/: 'exato' \| 'nono-digito' \| null/g, '');
const { mesmaLinha } = await import(
  'data:text/javascript,' + encodeURIComponent(corpo + '\nexport { mesmaLinha };')
);

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

// Os numeros REAIS que causaram o defeito.
const GUARDADO = '+5579991407447';
const DA_META = '5579991407447';
const DA_META_SEM_NOVE = '557991407447';

// 1. AS DUAS FORMAS SAO A MESMA PESSOA.
exigir(`o mesmo numero nas duas formas nao casa (deu ${mesmaLinha(GUARDADO, DA_META_SEM_NOVE)})`,
  mesmaLinha(GUARDADO, DA_META_SEM_NOVE) === 'nono-digito');
exigir('o numero identico deixou de casar',
  mesmaLinha(GUARDADO, DA_META) === 'exato');
// Simetrico: tanto faz de que lado vem o mais longo.
exigir('a comparacao depende da ordem dos argumentos',
  mesmaLinha('+' + DA_META_SEM_NOVE, DA_META) === 'nono-digito');

// 2. E DUAS PESSOAS DIFERENTES CONTINUAM DIFERENTES. Esta e a assercao que
//    impede o conserto de ir longe de mais: um comparador demasiado generoso
//    mandaria o rascunho de um dono para o telefone de outro.
exigir('dois numeros diferentes passaram a ser a mesma pessoa',
  mesmaLinha('+5579991407447', '+5579991407448') === null);
exigir('um numero de outro DDD passou a casar',
  mesmaLinha('+5579991407447', '+5511991407447') === null);
// O `9` removido tem de ser o NONO digito, e nao um `9` qualquer.
exigir('tirar um 9 de qualquer sitio passou a casar',
  mesmaLinha('+5579991407447', '557999140744') === null);
// DDD DIFERENTE, MESMO FINAL. Este caso existe porque sem ele a assercao de
// cima nao provava nada: um comparador que so olhasse para os ultimos digitos
// passava por ela. Sao 13 contra 12 digitos, entao a regra do nono digito e
// mesmo consultada — e tem de dizer que sao pessoas diferentes.
exigir('um numero de outro DDD com o mesmo final passou a casar; o rascunho de um dono iria para o telefone de outro',
  mesmaLinha('+5579991407447', '551191407447') === null);
// FORA DO BRASIL, com os mesmos comprimentos que disparariam a regra. Sem este
// caso, apagar a verificacao do `55` nao mudava nada em teste nenhum.
exigir('a regra do nono digito foi aplicada a um numero que nao e brasileiro',
  mesmaLinha('+4479912345678', '447912345678') === null);
// Fora do Brasil nao se mexe em digito nenhum: seria inventar uma pessoa.
exigir('a regra do nono digito foi aplicada fora do Brasil',
  mesmaLinha('+351912345678', '35191234567') === null);
exigir('um numero vazio passou a casar com alguma coisa',
  mesmaLinha('', '5579991407447') === null && mesmaLinha('+5579991407447', '') === null);

// 3. E O WEBHOOK USA-A. Sem isto, tudo acima fica verde com o defeito de pe.
exigir('o webhook nao usa `mesmaLinha` para achar o dono; a comparacao antiga voltou',
  /const r = mesmaLinha\(linha\.recipient_e164 \|\| '', de\)/.test(fonte));
exigir('o webhook deixou de registar por que regra casou',
  /registarBatida\('dono-encontrado'/.test(fonte));
exigir('o webhook deixou de registar quando NAO acha dono; o sintoma volta a ser mudo',
  /registarBatida\('sem-dono'/.test(fonte));

if (falhas.length) {
  console.error('Nono digito brasileiro: %d protecao(oes) falharam.\n', falhas.length);
  for (const f of falhas) console.error(' - %s', f);
  process.exit(1);
}
console.log(`Nono digito brasileiro: ${verificadas} protecoes verdes.`);
