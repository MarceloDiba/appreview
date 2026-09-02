# Convidar para avaliar, sem filtrar — Plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans`, tarefa a tarefa. Os passos usam
> caixas (`- [ ]`) para acompanhamento.

**Objetivo:** fazer o Binno pedir avaliação a **todos** os clientes que deixaram
contacto, com uma mensagem que o dono envia com um toque, e tirar do produto o
único sítio onde ele hoje sugere convidar só quem deu nota alta.

**Arquitetura:** três peças pequenas e independentes. Uma migração que torna o
aviso neutro quanto à nota. Um módulo puro (`src/lib/convite.ts`) que escreve a
mensagem e monta o link de WhatsApp, sem React e sem rede, para poder ser
provado a correr. E a ligação disso ao cartão de comentários internos que já
existe. O Binno **não envia**: ele prepara e o dono toca em enviar, tal como já
faz com os rascunhos de resposta.

**Pilha:** React 19 + Vite + Tailwind no painel; Supabase (Postgres, gatilhos,
Edge Functions) no servidor; guardas em `scripts/check-*.mjs` ligados a
`npm run verify`, que é o único mecanismo de teste do projeto.

**Spec:** não existe documento de spec para este trabalho. O argumento está na
secção «Por que esta ordem» abaixo, e a decisão de produto que ele toca está em
`docs/contrato-produto-binno.md`. Quem executa lê os dois.

---

## Restrições globais

Valem para **todas** as tarefas, sem excepção.

- **NADA VAI PARA `main`.** O `main` é construído pelo Lovable e é o que o
  Marcelo mostra a clientes. Ele pediu, em 02/09/2026: «queria deixar a versão
  que está sem ser alterada. Não podemos correr risco.» Todo o trabalho vive no
  ramo `feat/convidar-sem-filtrar`. O merge é decisão dele, pedida
  explicitamente, e não acontece dentro deste plano.
- **Nenhuma migração é aplicada à produção dentro deste plano.** O ficheiro SQL
  é escrito e revisto; `supabase ... apply` fica para depois da autorização.
  Aplicar o gatilho novo mudaria as mensagens que ele recebe hoje.
- **Nenhuma função é reimplantada** (`supabase functions deploy`) dentro deste
  plano, pela mesma razão.
- **O Binno nunca envia nem publica em nome do dono.** Ele prepara texto e o
  dono decide. Está em `docs/contrato-produto-binno.md` e não se abre excepção.
- **Nunca condicionar o convite público à nota.** Convidar só quem deu 4 ou 5
  é solicitação seletiva e viola a política do Google. É a regra que este plano
  existe para cumprir.
- **Travessão (`—`) e meio-risco (`–`) são proibidos** em qualquer texto que o
  dono ou o cliente leiam. Decisão de Marcelo em 30/08/2026: «usam travessão,
  nunca usaria isso, já deixa claro que é IA.»
- **Os três catálogos de idioma têm de ter exactamente as mesmas chaves:**
  `src/i18n/owner/locales/pt-PT.json`, `pt-BR.json` e `en.json`. O guarda
  `check:i18n-owner` falha se divergirem.
- **Toda asserção nova tem de ser provada VERMELHA** quebrando exactamente a
  regra que ela nomeia, antes de ser dada como feita. Ver a regra do projeto:
  ver uma asserção verde não é prova; só quebrar a regra e ver vermelho é.
- **`npm run verify` tem de sair 0** no fim de cada tarefa.

---

## Por que esta ordem

Marcelo, em 02/09/2026: «prioridade pro cliente é o que ajuda a vender e
aumentar avaliações». As tarefas estão ordenadas por isso, e não por dificuldade.

Três análises independentes dos mesmos seis concorrentes (Weiver, GBPPromote,
FiveUp, Starboard-G, ReviewAutomate, Avisora) chegaram à mesma conclusão
estrutural: **eles empurram o pedido de avaliação; o Binno espera que o cliente
veja o QR.** É a diferença que mais afecta o número de avaliações, e é o que a
Tarefa 2 resolve.

Duas dessas análises também disseram que o Binno tem uma vantagem por **não
filtrar** quem é convidado ao Google, e que isso devia virar argumento de venda.
A verificação no código em 02/09/2026 mostrou que:

- **O QR não filtra.** `ReviewChooser.tsx` mostra as duas portas lado a lado, o
  Google e o comentário privado, sem perguntar a nota antes. `Feedback.tsx:38-43`
  tem até uma defesa deliberada contra filtrar *por omissão*.
- **Mas o aviso ao dono filtra.** Em
  `supabase/migrations/20260901200000_aviso_com_emoji_e_negrito.sql:135-136`, a
  linha «✅ Agradeça e convide a publicar no Google.» só é escrita quando
  `especie = 'feedback-praise'`, ou seja, quando a nota é 4 ou 5. Quem deu 3 ou
  menos nunca é convidado.

Não se pode vender «avaliações que o Google não vai apagar» enquanto o produto
sugere convidar só os contentes. Por isso a Tarefa 1 vem antes da Tarefa 2: ela
não aumenta avaliações sozinha, mas é o que torna a Tarefa 2 legítima e o
argumento verdadeiro.

**O que fica FORA deste plano**, e por quê:

| Ideia | Por que não agora |
|---|---|
| Envio automático pelo Binno (SMS/WhatsApp API) | Precisa de canal para o CLIENTE. O número foi bloqueado, o OpenWA viola os termos da Meta e a API oficial está em aprovação. A Tarefa 2 entrega o mesmo valor sem canal novo: o dono envia do telemóvel dele. |
| Alerta de mudança no perfil do Google | Ajuda a reter, não a vender nem a aumentar avaliações. Plano próprio. |
| Alerta em avaliação pública baixa | Depende da coleta diária, que ainda não existe. Plano próprio. |
| Denúncia de avaliação maliciosa | Diferenciado, mas não move o número de avaliações. Plano próprio. |
| Perguntas e Respostas, posts agendados | Dependem da API oficial do Google, em aprovação. |
| Ler avaliações dos concorrentes | Produto adjacente, mais perto do Binno Ads. |

---

## Estrutura de ficheiros

| Ficheiro | Responsabilidade |
|---|---|
| `supabase/migrations/20260902120000_convite_sem_filtro.sql` | **Criar.** Reescreve `notify_internal_feedback_whatsapp` para que o convite ao Google deixe de depender da nota. |
| `src/lib/convite.ts` | **Criar.** Puro, sem React e sem rede: escreve a mensagem do convite e monta o link de WhatsApp a partir de um contacto. |
| `src/lib/contactoDoCliente.ts` | **Criar.** Puro: diz se um contacto guardado é telefone ou e-mail. Existe separado porque a coluna `internal_feedback.customer_email` guarda os dois, e essa mentira não se espalha. |
| `src/components/dashboard/ConviteParaAvaliar.tsx` | **Criar.** O botão e o texto na tela, dentro do cartão de comentários internos. |
| `src/components/dashboard/PendingCommentsBanner.tsx` | **Modificar.** Passa a desenhar o convite em cada caso. |
| `src/i18n/owner/locales/{pt-PT,pt-BR,en}.json` | **Modificar.** As chaves do convite, iguais nos três. |
| `scripts/check-convite-sem-filtro.mjs` | **Criar.** Corre `convite.ts` e `contactoDoCliente.ts` de verdade, e lê a migração e o painel. |
| `package.json` | **Modificar.** Liga o guarda novo ao `verify`. |
| `docs/contrato-produto-binno.md` | **Modificar.** Regista a regra de não filtrar, com data e razão. |

---

## Tarefa 1: o aviso deixa de convidar só quem deu nota alta

**Ficheiros:**
- Criar: `supabase/migrations/20260902120000_convite_sem_filtro.sql`
- Criar: `scripts/check-convite-sem-filtro.mjs`
- Modificar: `package.json`
- Modificar: `docs/contrato-produto-binno.md`

**Interfaces:**
- Consome: a função `public.notify_internal_feedback_whatsapp()` como está hoje
  em `supabase/migrations/20260901200000_aviso_com_emoji_e_negrito.sql`.
- Produz: a mesma função, com o bloco final do corpo da mensagem já não
  dependente de `especie`. As tarefas seguintes não dependem desta.

- [ ] **Passo 1: escrever a asserção que falha**

Criar `scripts/check-convite-sem-filtro.mjs` com este conteúdo inicial:

```js
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

if (falhas.length) {
  console.error('Convite sem filtro: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Convite sem filtro: ${verificadas} protecoes verdes.`);
```

- [ ] **Passo 2: correr e ver falhar**

```bash
cd ~/binno/maps && node scripts/check-convite-sem-filtro.mjs
```

Esperado: FALHA com `ENOENT`, porque a migração ainda não existe. Isso é o
vermelho desta etapa: o guarda nomeia um ficheiro que ninguém escreveu.

- [ ] **Passo 3: escrever a migração**

Criar `supabase/migrations/20260902120000_convite_sem_filtro.sql`. Copiar
**inteira** a função de `20260901200000_aviso_com_emoji_e_negrito.sql` e trocar
apenas o bloco final, mantendo tudo o resto byte a byte. O bloco a substituir é:

```sql
    if especie = 'feedback-praise' then
      linhas := array_append(linhas, '✅ Agradeça e convide a publicar no Google.');
    else
      -- "ja preparou" seria falso: o rascunho e escrito quando o dono ABRE o
      -- painel, a partir do que a pessoa escreveu, e nao antes.
      linhas := array_append(linhas, '✍️ Abra e o Binno escreve um recado a partir do que ele disse.');
    end if;
```

e passa a ser:

```sql
    -- O CONVITE NAO DEPENDE DA NOTA (02/09/2026).
    --
    -- Ate esta data esta linha so era escrita para `feedback-praise`, ou seja
    -- nota 4 ou 5. Convidar so quem deu nota alta e solicitacao seletiva, e a
    -- politica do Google proibe: perfis apanhados nisso perdem avaliacoes.
    -- Quem deu 3 ou menos tambem e cliente, tambem escreveu, e tambem pode
    -- publicar se quiser.
    --
    -- As duas linhas sao escritas sempre, na mesma ordem, para qualquer nota:
    -- primeiro o que o Binno faz por ele, depois o convite.
    linhas := array_append(linhas, '✍️ Abra e o Binno escreve um recado a partir do que ele disse.');
    linhas := array_append(linhas, '📣 Depois de responder, convide a publicar no Google. Vale para qualquer nota.');
```

- [ ] **Passo 4: correr e ver passar**

```bash
cd ~/binno/maps && node scripts/check-convite-sem-filtro.mjs
```

Esperado: `Convite sem filtro: 3 protecoes verdes.`

- [ ] **Passo 5: provar cada asserção vermelha**

Guardar a migração, quebrar uma regra de cada vez, correr, restaurar:

```bash
cd ~/binno/maps
M=supabase/migrations/20260902120000_convite_sem_filtro.sql
cp $M /tmp/m.sql

# 1. O convite volta a depender da especie
python3 - <<'PY'
import pathlib
p = pathlib.Path('supabase/migrations/20260902120000_convite_sem_filtro.sql'); s = p.read_text()
a = "    linhas := array_append(linhas, '✍️ Abra e o Binno escreve"
b = "    linhas := array_append(linhas, '');\n\n    if especie = 'feedback-praise' then\n    linhas := array_append(linhas, '✍️ Abra e o Binno escreve"
p.write_text(s.replace(a, b, 1))
PY
node scripts/check-convite-sem-filtro.mjs   # esperado: VERMELHO na 1a
cp /tmp/m.sql $M

# 2. O convite desaparece
python3 -c "
import pathlib;p=pathlib.Path('$M');s=p.read_text()
p.write_text(s.replace('convide a publicar no Google','fale com ele'))"
node scripts/check-convite-sem-filtro.mjs   # esperado: VERMELHO na 2a
cp /tmp/m.sql $M

# 3. A regra de quando avisar e afrouxada
python3 -c "
import pathlib;p=pathlib.Path('$M');s=p.read_text()
p.write_text(s.replace('if new.rating is null then','if false then'))"
node scripts/check-convite-sem-filtro.mjs   # esperado: VERMELHO na 3a
cp /tmp/m.sql $M
node scripts/check-convite-sem-filtro.mjs   # esperado: 3 verdes
```

- [ ] **Passo 6: ligar o guarda ao verify**

Em `package.json`, dentro de `scripts`, acrescentar a seguir a
`"check:aviso-formatado"`:

```json
"check:convite-sem-filtro": "node scripts/check-convite-sem-filtro.mjs",
```

e em `"verify"`, trocar `npm run check:aviso-formatado` por
`npm run check:aviso-formatado && npm run check:convite-sem-filtro`.

- [ ] **Passo 7: registar no contrato**

Em `docs/contrato-produto-binno.md`, na secção «Leitura de reputação e
recomendações», acrescentar:

```markdown
- **O convite para avaliar no Google nunca depende da nota.**
  *Decidido em 02/09/2026.* Convidar só quem deu 4 ou 5 é solicitação seletiva,
  e a política do Google proíbe: perfis apanhados nisso perdem avaliações. O QR
  já não filtrava (o `ReviewChooser` mostra as duas portas lado a lado, sem
  perguntar a nota), mas o aviso ao dono filtrava: a linha que mandava convidar
  para o Google só era escrita quando a nota era 4 ou 5. Passa a ser escrita
  sempre. Guardado por `scripts/check-convite-sem-filtro.mjs`.
```

- [ ] **Passo 8: correr o verify inteiro**

```bash
cd ~/binno/maps && npm run verify
```

Esperado: sai 0.

- [ ] **Passo 9: commit**

```bash
cd ~/binno/maps
git checkout -b feat/convidar-sem-filtrar 2>/dev/null || git checkout feat/convidar-sem-filtrar
git commit -F - -- supabase/migrations/20260902120000_convite_sem_filtro.sql \
  scripts/check-convite-sem-filtro.mjs package.json docs/contrato-produto-binno.md <<'MSG'
o convite para avaliar deixa de depender da nota

Ate hoje o aviso do comentario privado so mandava convidar a publicar no Google
quando a nota era 4 ou 5. Convidar so quem deu nota alta e solicitacao
seletiva, e a politica do Google proibe.

O QR nunca filtrou: o ReviewChooser mostra as duas portas lado a lado, sem
perguntar a nota antes, e ha ate uma defesa contra filtrar por omissao. Era o
aviso ao dono que filtrava.

A migracao NAO foi aplicada. Marcelo pediu que a versao que esta no ar nao seja
tocada; aplicar isto muda as mensagens que ele recebe hoje.

Tres protecoes, todas provadas vermelhas.
MSG
```

**NÃO aplicar a migração.** Ela fica escrita e por aplicar, por decisão do
Marcelo. Quem executa avisa que ela está pronta e pára.

---

## Tarefa 2: o convite que o dono envia com um toque

**Ficheiros:**
- Criar: `src/lib/contactoDoCliente.ts`
- Criar: `src/lib/convite.ts`
- Modificar: `scripts/check-convite-sem-filtro.mjs`

**Interfaces:**
- Consome: nada das tarefas anteriores.
- Produz:
  - `tipoDoContacto(valor: string | null): 'telefone' | 'email' | 'nenhum'`
  - `apenasDigitos(valor: string): string`
  - `mensagemDoConvite(entrada: EntradaDoConvite): string`
  - `linkDeWhatsApp(contacto: string | null, mensagem: string): string | null`
  - `interface EntradaDoConvite { nomeDoCliente: string | null; nomeDoNegocio: string; linkDeAvaliacao: string | null; idioma: 'pt-PT' | 'pt-BR' | 'en' }`

- [ ] **Passo 1: escrever as asserções que falham**

Acrescentar a `scripts/check-convite-sem-filtro.mjs`, logo a seguir aos
`import`, a leitura dos módulos:

```js
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { tipoDoContacto, apenasDigitos } = await import(
  pathToFileURL(resolve(process.cwd(), 'src/lib/contactoDoCliente.ts')).href
);
const { mensagemDoConvite, linkDeWhatsApp } = await import(
  pathToFileURL(resolve(process.cwd(), 'src/lib/convite.ts')).href
);
```

e antes do bloco `if (falhas.length)`:

```js
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
```

- [ ] **Passo 2: correr e ver falhar**

```bash
cd ~/binno/maps && node --experimental-strip-types scripts/check-convite-sem-filtro.mjs
```

Esperado: FALHA a carregar `src/lib/contactoDoCliente.ts`, que não existe.

- [ ] **Passo 3: escrever `contactoDoCliente.ts`**

```ts
/**
 * O contacto que o cliente deixou, e o que ele é de facto.
 *
 * A coluna chama-se `internal_feedback.customer_email` e guarda TELEFONES:
 * em 02/09/2026, cinco das seis linhas reais começavam por `+55`. O formulário
 * do QR pede «contacto» e a pessoa escreve o que quiser.
 *
 * Este ficheiro existe para essa mentira parar aqui. Quem precisa de saber se
 * pode abrir o WhatsApp pergunta a este módulo, e não ao nome da coluna.
 */

/** Só os algarismos, para o endereço do WhatsApp. */
export const apenasDigitos = (valor: string): string => (valor || '').replace(/\D/g, '');

/**
 * Um telefone tem entre 8 e 15 algarismos: 8 é o mais curto que ainda é um
 * número local, e 15 é o máximo do padrão E.164. Abaixo disso é lixo, e acima
 * é outra coisa qualquer. Um e-mail reconhece-se pela arroba com texto dos dois
 * lados; não se valida mais do que isso, porque aqui só se decide qual botão
 * mostrar, e um endereço inválido dá erro no cliente de e-mail, não aqui.
 */
export const tipoDoContacto = (valor: string | null | undefined): 'telefone' | 'email' | 'nenhum' => {
  const limpo = (valor || '').trim();
  if (!limpo) return 'nenhum';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'email';
  const digitos = apenasDigitos(limpo);
  if (digitos.length >= 8 && digitos.length <= 15) return 'telefone';
  return 'nenhum';
};
```

- [ ] **Passo 4: escrever `convite.ts`**

```ts
import { tipoDoContacto, apenasDigitos } from '@/lib/contactoDoCliente';

/**
 * O convite para avaliar no Google, escrito para o dono enviar.
 *
 * O QUE ESTE MÓDULO NÃO SABE
 *
 * A nota. E isso é a regra, não um esquecimento: convidar só quem deu 4 ou 5 é
 * solicitação seletiva, e a política do Google proíbe. `EntradaDoConvite` não
 * tem campo de nota, para que ninguém possa condicionar a mensagem a ela sem
 * primeiro mudar esta interface e ter de explicar porquê.
 *
 * POR QUE O BINNO NÃO ENVIA
 *
 * Ele escreve e devolve um endereço; quem toca em enviar é o dono, do telemóvel
 * dele. É a mesma regra dos rascunhos de resposta, e resolve de caminho o
 * problema de canal: não é preciso número de empresa, nem API aprovada, nem
 * infraestrutura de envio.
 */
export interface EntradaDoConvite {
  nomeDoCliente: string | null;
  nomeDoNegocio: string;
  /** O link de avaliação do Google do próprio negócio. Sem ele não há convite. */
  linkDeAvaliacao: string | null;
  idioma: 'pt-PT' | 'pt-BR' | 'en';
}

const TEXTOS: Record<EntradaDoConvite['idioma'], (nome: string, negocio: string, link: string) => string> = {
  'pt-PT': (nome, negocio, link) => `${nome ? `Olá ${nome}, ` : 'Olá, '}obrigado por nos ter escrito. Se lhe apetecer, deixe a sua opinião no Google. Ajuda muito quem procura por nós.\n\n${link}\n\n${negocio}`,
  'pt-BR': (nome, negocio, link) => `${nome ? `Oi ${nome}, ` : 'Oi, '}obrigado por escrever pra gente. Se quiser, deixa sua opinião no Google. Ajuda muito quem procura por nós.\n\n${link}\n\n${negocio}`,
  en: (nome, negocio, link) => `${nome ? `Hi ${nome}, ` : 'Hi, '}thank you for writing to us. If you feel like it, leave your thoughts on Google. It helps a lot of people who are looking for us.\n\n${link}\n\n${negocio}`,
};

/**
 * Sem link não há mensagem. Devolver texto a convidar para lado nenhum seria
 * pôr o dono a mandar um convite que não leva a sítio algum.
 */
export const mensagemDoConvite = (entrada: EntradaDoConvite): string => {
  const link = (entrada.linkDeAvaliacao || '').trim();
  if (!link) return '';
  const nome = (entrada.nomeDoCliente || '').trim();
  const escrever = TEXTOS[entrada.idioma] || TEXTOS['pt-PT'];
  return escrever(nome, entrada.nomeDoNegocio, link);
};

/**
 * O endereço que abre o WhatsApp com a mensagem já escrita. `null` quando não
 * há por onde: sem contacto, sem mensagem, ou com um contacto que é e-mail.
 * Quem chama desenha outro botão nesse caso, em vez de um que não faz nada.
 */
export const linkDeWhatsApp = (contacto: string | null, mensagem: string): string | null => {
  if (!mensagem.trim()) return null;
  if (tipoDoContacto(contacto) !== 'telefone') return null;
  return `https://wa.me/${apenasDigitos(contacto || '')}?text=${encodeURIComponent(mensagem)}`;
};
```

- [ ] **Passo 5: correr e ver passar**

```bash
cd ~/binno/maps && node --experimental-strip-types scripts/check-convite-sem-filtro.mjs
```

Esperado: `Convite sem filtro: 23 protecoes verdes.` (as 20 desta tarefa mais as 3 da Tarefa 1)

- [ ] **Passo 6: provar as asserções vermelhas**

Uma de cada vez, restaurando entre elas:

```bash
cd ~/binno/maps
cp src/lib/convite.ts /tmp/c.ts

# A mensagem passa a depender de algo que não é o cliente
python3 -c "
import pathlib;p=pathlib.Path('src/lib/convite.ts');s=p.read_text()
p.write_text(s.replace('if (!link) return \'\';',''))"
node --experimental-strip-types scripts/check-convite-sem-filtro.mjs  # VERMELHO: sem link nao ha convite
cp /tmp/c.ts src/lib/convite.ts

# O travessão entra
python3 -c "
import pathlib;p=pathlib.Path('src/lib/convite.ts');s=p.read_text()
p.write_text(s.replace('obrigado por escrever pra gente.','— obrigado por escrever pra gente.'))"
node --experimental-strip-types scripts/check-convite-sem-filtro.mjs  # VERMELHO: nao usa travessao
cp /tmp/c.ts src/lib/convite.ts

# O e-mail passa a virar link de whatsapp
python3 -c "
import pathlib;p=pathlib.Path('src/lib/convite.ts');s=p.read_text()
p.write_text(s.replace(\"if (tipoDoContacto(contacto) !== 'telefone') return null;\",''))"
node --experimental-strip-types scripts/check-convite-sem-filtro.mjs  # VERMELHO: um email nao vira link
cp /tmp/c.ts src/lib/convite.ts
node --experimental-strip-types scripts/check-convite-sem-filtro.mjs  # 23 verdes
```

- [ ] **Passo 7: apontar o guarda para o interpretador certo**

Em `package.json`, trocar a linha do guarda por:

```json
"check:convite-sem-filtro": "node --experimental-strip-types scripts/check-convite-sem-filtro.mjs",
```

- [ ] **Passo 8: correr o verify e commitar**

```bash
cd ~/binno/maps && npm run verify
git commit -F - -- src/lib/convite.ts src/lib/contactoDoCliente.ts scripts/check-convite-sem-filtro.mjs package.json <<'MSG'
a mensagem do convite, escrita para o dono enviar

O Binno escreve e devolve um endereco; quem toca em enviar e o dono, do
telemovel dele. Resolve de caminho o problema de canal: nao e preciso numero de
empresa, nem API aprovada, nem infraestrutura de envio.

`EntradaDoConvite` NAO tem campo de nota, de proposito. Condicionar o convite a
nota e solicitacao seletiva; sem o campo, ninguem o faz sem mudar a interface e
ter de explicar porque.

`contactoDoCliente.ts` existe porque a coluna `customer_email` guarda
telefones: cinco das seis linhas reais comecam por "+55". A mentira do nome da
coluna para aqui.

25 protecoes, com os dois modulos CORRIDOS e nao procurados.
MSG
```

---

## Tarefa 3: o convite na tela, ao lado de cada comentário

**Ficheiros:**
- Criar: `src/components/dashboard/ConviteParaAvaliar.tsx`
- Modificar: `src/components/dashboard/PendingCommentsBanner.tsx`
- Modificar: `src/i18n/owner/locales/{pt-PT,pt-BR,en}.json`
- Modificar: `scripts/check-convite-sem-filtro.mjs`

**Interfaces:**
- Consome: `mensagemDoConvite`, `linkDeWhatsApp` de `@/lib/convite`;
  `tipoDoContacto` de `@/lib/contactoDoCliente`.
- Produz: o componente `ConviteParaAvaliar`, com as propriedades
  `{ nomeDoCliente: string | null; contacto: string | null; nomeDoNegocio: string; linkDeAvaliacao: string | null }`.

- [ ] **Passo 1: escrever as asserções que falham**

Acrescentar ao guarda, antes do `if (falhas.length)`:

```js
const convite = readFileSync('src/components/dashboard/ConviteParaAvaliar.tsx', 'utf8');
const cartao = readFileSync('src/components/dashboard/PendingCommentsBanner.tsx', 'utf8');

exigir('o convite na tela usa a mensagem partilhada, e nao escreve a propria',
  /mensagemDoConvite\(/.test(convite) && !/Oi \$\{|Olá \$\{/.test(convite));
exigir('o convite na tela monta o link pela funcao partilhada',
  /linkDeWhatsApp\(/.test(convite));
// A regra deste plano, na tela: o componente nao recebe a nota, logo nao pode
// esconder-se por causa dela.
exigir('o componente do convite nao recebe a nota',
  !/rating|nota/i.test(convite.slice(convite.indexOf('interface'), convite.indexOf('=> {'))));
exigir('o cartao desenha o convite em cada caso',
  /<ConviteParaAvaliar/.test(cartao));
// Sem condicional de nota a volta do convite dentro do cartao.
exigir('o cartao nao esconde o convite por causa da nota',
  !/rating\s*[><=]=?\s*\d[\s\S]{0,80}<ConviteParaAvaliar/.test(cartao));

for (const idioma of ['pt-PT', 'pt-BR', 'en']) {
  const catalogo = JSON.parse(readFileSync(`src/i18n/owner/locales/${idioma}.json`, 'utf8'));
  for (const chave of ['inviteTitle', 'inviteHint', 'inviteWhatsApp', 'inviteCopy', 'inviteNoLink']) {
    exigir(`${idioma}.json tem texto para invite.${chave}`,
      typeof catalogo?.invite?.[chave] === 'string' && catalogo.invite[chave].length > 0);
  }
}
```

- [ ] **Passo 2: correr e ver falhar**

```bash
cd ~/binno/maps && node --experimental-strip-types scripts/check-convite-sem-filtro.mjs
```

Esperado: FALHA com `ENOENT` em `ConviteParaAvaliar.tsx`.

- [ ] **Passo 3: escrever o componente**

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, MessageCircle } from 'lucide-react';
import { mensagemDoConvite, linkDeWhatsApp } from '@/lib/convite';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * O convite para avaliar no Google, ao lado de quem escreveu.
 *
 * NÃO RECEBE A NOTA, e isso é a regra. Convidar só quem deu 4 ou 5 é
 * solicitação seletiva e a política do Google proíbe. Sem a nota nas
 * propriedades, este componente não consegue esconder-se por causa dela.
 *
 * O Binno não envia: o botão abre o WhatsApp do dono com a mensagem escrita, e
 * é ele quem toca em enviar.
 */
interface ConviteParaAvaliarProps {
  nomeDoCliente: string | null;
  contacto: string | null;
  nomeDoNegocio: string;
  linkDeAvaliacao: string | null;
}

const ConviteParaAvaliar: React.FC<ConviteParaAvaliarProps> = ({
  nomeDoCliente, contacto, nomeDoNegocio, linkDeAvaliacao,
}) => {
  const { t, i18n } = useOwnerTranslation();
  const [copiado, setCopiado] = useState(false);
  const idioma = (['pt-PT', 'pt-BR', 'en'] as const).includes(i18n.language as never)
    ? (i18n.language as 'pt-PT' | 'pt-BR' | 'en')
    : 'pt-PT';

  const mensagem = mensagemDoConvite({ nomeDoCliente, nomeDoNegocio, linkDeAvaliacao, idioma });
  // Sem link de avaliação não há convite nenhum a fazer, e dizer porquê é mais
  // útil do que esconder o bloco: o dono tem uma acção clara a tomar.
  if (!mensagem) return <p className="mt-3 text-xs text-slate-500">{t('invite.inviteNoLink')}</p>;

  const paraWhatsApp = linkDeWhatsApp(contacto, mensagem);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
      toast.success(t('invite.inviteCopy'));
    } catch {
      toast.error(t('invite.inviteCopy'));
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-medium text-slate-900">{t('invite.inviteTitle')}</p>
      <p className="mt-0.5 text-xs text-slate-500">{t('invite.inviteHint')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {paraWhatsApp && (
          <Button asChild size="sm" className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">
            <a href={paraWhatsApp} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />{t('invite.inviteWhatsApp')}
            </a>
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => void copiar()}>
          <Copy className="mr-2 h-4 w-4" />{copiado ? t('invite.inviteCopy') : t('invite.inviteCopy')}
        </Button>
      </div>
    </div>
  );
};

export default ConviteParaAvaliar;
```

- [ ] **Passo 4: as chaves nos três catálogos**

Em cada um de `src/i18n/owner/locales/{pt-PT,pt-BR,en}.json`, acrescentar no
topo do objecto, ao lado das outras secções, um bloco `"invite"`:

`pt-PT.json`:
```json
"invite": {
  "inviteTitle": "Convidar a avaliar no Google",
  "inviteHint": "Vale para qualquer nota. Convidar só quem gostou é proibido pelo Google.",
  "inviteWhatsApp": "Enviar por WhatsApp",
  "inviteCopy": "Copiar mensagem",
  "inviteNoLink": "Ligue o link de avaliação do Google nas Definições para poder convidar."
},
```

`pt-BR.json`:
```json
"invite": {
  "inviteTitle": "Convidar a avaliar no Google",
  "inviteHint": "Vale para qualquer nota. Convidar só quem gostou é proibido pelo Google.",
  "inviteWhatsApp": "Enviar por WhatsApp",
  "inviteCopy": "Copiar mensagem",
  "inviteNoLink": "Ligue o link de avaliação do Google nas Configurações para poder convidar."
},
```

`en.json`:
```json
"invite": {
  "inviteTitle": "Invite them to review on Google",
  "inviteHint": "For any rating. Inviting only happy customers is against Google policy.",
  "inviteWhatsApp": "Send on WhatsApp",
  "inviteCopy": "Copy message",
  "inviteNoLink": "Add your Google review link in Settings to be able to invite."
},
```

- [ ] **Passo 5: ligar no cartão**

Em `src/components/dashboard/PendingCommentsBanner.tsx`, importar o componente
e desenhá-lo dentro do bloco de cada caso, **sem qualquer condição sobre a
nota**:

```tsx
import ConviteParaAvaliar from '@/components/dashboard/ConviteParaAvaliar';
```

e, a seguir à citação de cada caso:

```tsx
<ConviteParaAvaliar
  nomeDoCliente={caso.customer_name}
  contacto={caso.customer_email}
  nomeDoNegocio={nomeDoNegocio}
  linkDeAvaliacao={linkDeAvaliacao}
/>
```

`nomeDoNegocio` e `linkDeAvaliacao` entram como propriedades novas do
`PendingCommentsBanner`, passadas pelo painel a partir de
`snapshot.business.name` e do link do Google já lido por `useExternalLinks`.

- [ ] **Passo 6: correr e ver passar**

```bash
cd ~/binno/maps && npx tsc --noEmit -p tsconfig.app.json && node --experimental-strip-types scripts/check-convite-sem-filtro.mjs
```

Esperado: sem erros de tipo, e todas as protecções verdes.

- [ ] **Passo 7: provar vermelho**

```bash
cd ~/binno/maps
cp src/components/dashboard/PendingCommentsBanner.tsx /tmp/p.tsx
python3 -c "
import pathlib;p=pathlib.Path('src/components/dashboard/PendingCommentsBanner.tsx');s=p.read_text()
p.write_text(s.replace('<ConviteParaAvaliar','{caso.rating >= 4 && <ConviteParaAvaliar'))"
node --experimental-strip-types scripts/check-convite-sem-filtro.mjs  # VERMELHO: nao esconde por causa da nota
cp /tmp/p.tsx src/components/dashboard/PendingCommentsBanner.tsx
node --experimental-strip-types scripts/check-convite-sem-filtro.mjs  # verdes
```

- [ ] **Passo 8: ver na tela**

Construir e olhar, com um comentário de nota 1 e outro de nota 5. **As duas têm
de mostrar o convite.** Não aceitar o verde do guarda como prova de que a tela
está certa: em 01/09/2026 uma correção compilava, passava nos guardas e
continuava errada no ecrã.

```bash
cd ~/binno/maps && npx vite build && npx vite preview --port 4319
```

- [ ] **Passo 9: verify e commit**

```bash
cd ~/binno/maps && npm run verify
git commit -F - -- src/components/dashboard/ConviteParaAvaliar.tsx \
  src/components/dashboard/PendingCommentsBanner.tsx \
  src/i18n/owner/locales/pt-PT.json src/i18n/owner/locales/pt-BR.json src/i18n/owner/locales/en.json \
  scripts/check-convite-sem-filtro.mjs <<'MSG'
o convite aparece ao lado de quem escreveu, para qualquer nota

O componente NAO recebe a nota, e isso e a regra: sem ela nas propriedades, ele
nao consegue esconder-se por causa dela. O guarda fica vermelho se alguem
envolver o convite numa condicao de nota no cartao.

O botao abre o WhatsApp do dono com a mensagem escrita. O Binno nao envia.

Visto no ecra com nota 1 e nota 5: as duas mostram o convite.
MSG
```

---

## Depois deste plano

Estas ficam para planos próprios, na ordem em que ajudam a vender ou a aumentar
avaliações. Nenhuma entra neste.

1. **Lembrete do convite.** Segunda mensagem a quem não avaliou, alguns dias
   depois. Multiplica a Tarefa 2 e exige guardar que o convite foi enviado.
2. **Convite a quem não escreveu.** Hoje só há contacto de quem deixou
   comentário privado. Uma lista importada por CSV abre o resto da base.
3. **Alerta de mudança no perfil do Google.** Comparar duas coletas e avisar
   quando horário, telefone ou categoria mudarem. Barato, porque a coleta já
   existe. Ajuda a reter, não a vender.
4. **Alerta em avaliação pública baixa.** Depende da coleta diária.
5. **Denúncia de avaliação maliciosa.** Diferenciado; nenhum concorrente
   ocidental dos seis analisados o faz.
6. **Aprovar a resposta pela mensagem**, sem abrir o painel.

---

## Auto-revisão

**Cobertura.** As três tarefas cobrem o que o pedido nomeia: tirar o filtro
(Tarefa 1), pôr o pedido a sair depois do serviço em vez de esperar pelo QR
(Tarefas 2 e 3), e não tocar na versão que está no ar (restrições globais, e
nenhum passo aplica migração ou implanta função).

**Marcadores.** Nenhum «TBD», nenhum «tratar erros», nenhum «semelhante à
tarefa N». Todo o código está escrito.

**Tipos.** `EntradaDoConvite` é definida na Tarefa 2 e usada com os mesmos
quatro campos na Tarefa 3. `tipoDoContacto` devolve os mesmos três valores nos
dois sítios onde aparece. `linkDeWhatsApp(contacto, mensagem)` tem a mesma
assinatura no módulo, no guarda e no componente.

**Buraco conhecido, declarado.** O passo 5 da Tarefa 3 diz que `nomeDoNegocio` e
`linkDeAvaliacao` entram como propriedades novas do `PendingCommentsBanner`, mas
não mostra a mudança no painel que as passa. Quem executa lê
`src/hooks/useExternalLinks.ts` para o link e `snapshot.business.name` para o
nome, e essa ligação é parte da Tarefa 3.
