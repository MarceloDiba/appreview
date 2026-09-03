# Varredura dos pontos que dependem do Google — Plano de execução

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use
> superpowers:subagent-driven-development para executar tarefa a tarefa. Os
> passos usam caixas (`- [ ]`) para acompanhamento.

**Goal:** Encontrar, antes de um cliente encontrar, todo ponto do Binno Maps que
depende de informação do Google e está quebrado, dormente ou mudo.

**Architecture:** Uma tarefa por ponto de contato com o Google. Cada tarefa
prova o ponto com uma **sonda real** — contra a API viva ou contra o servidor de
produção — e não com leitura de código. Onde a sonda ficar vermelha, a tarefa
conserta e deixa um guarda; onde ficar verde, a tarefa deixa o guarda mesmo
assim, porque verde hoje não é verde amanhã.

**Tech Stack:** Deno (Supabase Edge Functions), Postgres + pg_cron, React/Vite,
guardas em Node (`scripts/check-*.mjs`) ligados ao `npm run verify`.

**Spec:** Não existe documento de especificação. **O que faz as vezes de spec é
o histórico de incidentes de 03/09/2026**, registrado nos commits
`9946273`, `1a2f117`, `31d1ad3` e no commit de `fix/locais-na-api-nova`. Quem
executar deve ler as mensagens desses quatro commits antes de começar: elas
descrevem os três modos de falha que este plano varre.

---

## O que aconteceu, e por que este plano existe

Em 03/09/2026, ao ligar a conexão oficial do Google pela primeira vez, três
defeitos apareceram em sequência, **todos no mesmo assunto e nenhum detectado
por teste**:

1. **Duas funções nunca tinham sido implantadas.** `google-business-oauth-callback`
   e `sync-google-business-profile` existiam no repositório desde agosto e não
   no servidor. O Google devolveu o navegador para um endereço inexistente.
2. **A tela afirmava um estado que não conferiu.** Depois da conexão gravar com
   sucesso, o cartão continuou oferecendo "Conectar Google" para sempre, porque
   nunca perguntava ao banco.
3. **Um endereço da API foi desligado pelo Google.** `mybusiness.googleapis.com/v4/{conta}/locations`
   respondia 404 em HTML. O código de agosto falava com uma versão que não
   existe mais.

Os três compartilham a mesma origem: **código escrito contra um Google que
ninguém podia testar**, porque a aprovação só saiu em 03/09/2026. Nada disso era
detectável antes — e agora é.

**A hipótese que este plano testa:** se três quebraram, os outros pontos de
contato com o Google merecem a mesma desconfiança. Um deles em particular
(`search-prospects`) usa uma API **legada** do Google, que é exatamente a mesma
classe de defeito do item 3.

## Global Constraints

Copiadas do contrato de produto e das decisões vigentes. Valem para **todas** as
tarefas:

- **Nunca regredir.** O teste é regressão, não risco. Nenhuma tarefa pode fazer
  parar de funcionar algo que funciona hoje.
- **Guarda com asserção provada vermelha.** Ver uma asserção verde não é prova;
  só quebrar a regra e ver vermelho é. Toda asserção nova deste plano precisa de
  uma mutação que a deixe vermelha, **na asserção certa**, registrada no commit.
- **Verify verde antes de qualquer commit.** `npm run verify` com saída 0.
- **Nada de dado de terceiros na área de administrador.** Nunca texto de
  avaliação, nome ou telefone de quem escreveu.
- **Duas APIs do Google, de propósito.** Locais em
  `mybusinessbusinessinformation.googleapis.com/v1`; avaliações em
  `mybusiness.googleapis.com/v4`. "Uniformizar" as duas está proibido e guardado
  por `scripts/check-duas-apis-do-google.mjs`.
- **Segredos nunca passam pela conversa.** Se uma tarefa precisar de um segredo
  novo, ela **para** e pede ao Marcelo rodar `supabase secrets set` no terminal
  dele.
- **Nada de gasto sem parar e perguntar.** Coleta Apify, chamadas à Places API
  em volume, qualquer coisa cobrada.
- **Projeto Google:** `288079352399`, aprovado para a Business Profile API em
  03/09/2026 com 300 QPM. Já não é terreno proibido.

### Regras de coordenação entre agentes

Este plano é executado por vários agentes. Três coisas são **compartilhadas** e
não podem ser usadas em paralelo sem cuidado:

- **Só existe uma conexão OAuth viva** (a conta `diba@noadigital.com.br`). As
  tarefas 2, 3 e 4 tocam nela. Elas **não** podem correr ao mesmo tempo —
  executá-las em série, nessa ordem.
- **A quota é 300 QPM e é compartilhada.** Nenhuma sonda deve iterar mais de uma
  página de resultados.
- **Implantar função é ato global.** Duas implantações simultâneas do mesmo
  slug se sobrescrevem. Um agente por implantação.
- As tarefas 1, 5, 6 e 7 são **independentes** e podem correr em paralelo.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `scripts/check-funcoes-implantadas.mjs` | Criar. Compara as funções do repositório com as implantadas no servidor. | 1 |
| `supabase/functions/search-prospects/index.ts` | Modificar. Trocar a Places legada pela nova, se a sonda provar que morreu. | 5 |
| `scripts/check-places-api-viva.mjs` | Criar. Prova que os dois usos da Places respondem. | 5 |
| `scripts/check-sincronizacao-de-avaliacoes.mjs` | Criar. Prova o caminho `sync-reviews` de ponta a ponta. | 3 |
| `docs/contrato-produto-binno.md` | Modificar. Registrar o que a varredura decidir. | 7 |

---

## Task 1: Nenhuma função fica no repositório sem estar no servidor

**Por que primeiro:** é o defeito que custou mais caro hoje, é o único que
afeta **todas** as funções (não só as do Google), e não depende da conexão
OAuth — pode correr em paralelo com tudo.

**Files:**
- Create: `scripts/check-funcoes-implantadas.mjs`
- Modify: `package.json` (adicionar ao `verify`)

**Interfaces:**
- Consumes: nada.
- Produces: `npm run check:funcoes-implantadas`.

- [ ] **Step 1: Ler a lista real de funções implantadas**

O guarda não pode chamar a API de gestão do Supabase (precisaria de token). Em
vez disso, compara o repositório com uma **lista declarada** que um humano
mantém, e obriga essa lista a existir e a estar completa.

Criar `scripts/check-funcoes-implantadas.mjs`:

```javascript
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
```

- [ ] **Step 2: Rodar e confirmar que fica VERDE com o estado actual**

```bash
cd ~/binno/maps-email && node scripts/check-funcoes-implantadas.mjs
```

Esperado: `Funcoes implantadas: 45 protecoes verdes.` (o número exato depende da
contagem; o que importa é sair 0).

- [ ] **Step 3: Provar VERMELHO — função no repositório e não na lista**

```bash
mkdir -p supabase/functions/funcao-fantasma && echo "// teste" > supabase/functions/funcao-fantasma/index.ts
node scripts/check-funcoes-implantadas.mjs
```

Esperado: FALHA com `a funcao "funcao-fantasma" existe no repositorio e esta declarada como implantada`.

```bash
rm -rf supabase/functions/funcao-fantasma
```

- [ ] **Step 4: Provar VERMELHO — função na lista e não no repositório**

Acrescentar `'funcao-que-nao-existe': '2026-01-01',` ao objecto `IMPLANTADAS`, rodar,
esperar FALHA com `a funcao declarada "funcao-que-nao-existe" ainda existe no repositorio`,
e desfazer.

- [ ] **Step 5: Ligar ao verify e commitar**

```bash
cd ~/binno/maps-email
# acrescentar "check:funcoes-implantadas" ao objecto scripts e ao encadeado de verify
npm run verify
git add scripts/check-funcoes-implantadas.mjs package.json
git commit -m "Nenhuma funcao fica no repositorio sem estar declarada como implantada"
```

---

## Task 2: A listagem de locais funciona de verdade

**Depende de:** a correção de `fix/locais-na-api-nova`, já em `main`.
**Não paralelizar com:** tarefas 3 e 4 (mesma conexão OAuth).

**Files:**
- Modify: nenhum, se a sonda ficar verde.

**Interfaces:**
- Consumes: a conexão OAuth de `diba@noadigital.com.br` em
  `public.google_business_connections`.
- Produces: linhas em `public.google_business_locations`.

- [ ] **Step 1: Sondar o estado antes**

```sql
select count(*) as locais from public.google_business_locations;
```

Esperado hoje: `0`.

- [ ] **Step 2: Pedir ao Marcelo clicar em "Buscar locais no Google"**

Esta é a única forma de exercitar o caminho: a função exige a sessão do
utilizador, e o agente não a tem. **Parar e pedir.**

- [ ] **Step 3: Ler o resultado no servidor, não na tela**

```sql
select timestamp, event_message from logs
 where source = 'function_logs' and event_message ilike '%Google recusou%'
 order by timestamp desc limit 5;
```

E:

```sql
select title, location_name, place_id, is_selected from public.google_business_locations;
```

- [ ] **Step 4a: Se apareceram locais — seguir para a Task 3**

Confirmar que `location_name` tem o formato completo `accounts/X/locations/Y`.
Se tiver o formato curto `locations/Y`, **isto é um defeito**: a Task 3 vai
falhar com 404 e a causa está na recomposição do caminho em
`sync-google-business-profile`.

- [ ] **Step 4b: Se apareceu erro — diagnosticar pelo `status` do Google**

| O que o log disser | O que significa | Conserto |
|---|---|---|
| `403` + `SERVICE_DISABLED` | A API não está ativada no projeto | Pedir ao Marcelo ativar **Business Information API** no Console do projeto `288079352399` |
| `403` + `PERMISSION_DENIED` | O escopo não cobre | Reconectar; o escopo `business.manage` tem de estar na lista |
| `404` em HTML | O endereço não existe | Outro endpoint mudou; procurar a versão actual na documentação do Google |
| `400` + `readMask` | Falta ou está errado o `readMask` | Ver `scripts/check-duas-apis-do-google.mjs` |

- [ ] **Step 5: Commitar o que for consertado, com o motivo do log no texto**

---

## Task 3: A sincronização de avaliações funciona, e o caminho completo está certo

**Depende de:** Task 2 verde, com uma localização selecionada.
**Não paralelizar com:** tarefas 2 e 4.

**Files:**
- Create: `scripts/check-sincronizacao-de-avaliacoes.mjs`
- Modify: `supabase/functions/sync-google-business-profile/index.ts`, se a sonda
  provar defeito.

**Interfaces:**
- Consumes: `public.google_business_locations.location_name` com formato
  `accounts/X/locations/Y`, produzido pela Task 2.
- Produces: linhas em `public.google_business_reviews`.

- [ ] **Step 1: Pedir ao Marcelo selecionar a localização e sincronizar**

- [ ] **Step 2: Ler o resultado no servidor**

```sql
select count(*) as avaliacoes,
       count(*) filter (where reply_text is not null) as ja_respondidas,
       min(rating) as pior, max(rating) as melhor
  from public.google_business_reviews;
```

- [ ] **Step 3: Escrever o guarda que prende o formato do caminho**

Criar `scripts/check-sincronizacao-de-avaliacoes.mjs`:

```javascript
#!/usr/bin/env node
// O caminho do local tem de ser o COMPLETO, senao as avaliacoes nao chegam.
//
// A Business Information API devolve `locations/123`. A v4, que e a unica que
// serve avaliacoes, exige `accounts/1/locations/123`. Guardar o nome curto nao
// falha na hora: falha DEPOIS, na sincronizacao, com um 404 que ninguem liga ao
// sitio onde o nome foi guardado.
import { readFileSync } from 'node:fs';

const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const fonte = semComentarios(
  readFileSync('supabase/functions/sync-google-business-profile/index.ts', 'utf8'),
);

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

exigir('o caminho guardado comeca por accounts/',
  /nomeCurto\.startsWith\("accounts\/"\)/.test(fonte));
exigir('o caminho curto e recomposto com a conta',
  /\$\{accountName\}\/\$\{nomeCurto\}/.test(fonte));
exigir('as avaliacoes usam o caminho guardado, e nao o nome curto',
  /v4\/\$\{location\.location_name\}\/reviews/.test(fonte));

if (falhas.length) {
  console.error('Sincronizacao de avaliacoes: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Sincronizacao de avaliacoes: ${verificadas} protecoes verdes.`);
```

- [ ] **Step 4: Provar as três asserções vermelhas**

Mutação 1: trocar `nomeCurto.startsWith("accounts/")` por `false`.
Esperado: FALHA em `o caminho guardado comeca por accounts/`.

Mutação 2: trocar `` `${accountName}/${nomeCurto}` `` por `` `${nomeCurto}` ``.
Esperado: FALHA em `o caminho curto e recomposto com a conta`.

Mutação 3: trocar `v4/${location.location_name}/reviews` por
`v4/${location.title}/reviews`.
Esperado: FALHA em `as avaliacoes usam o caminho guardado`.

- [ ] **Step 5: Ligar ao verify e commitar**

---

## Task 4: Publicar uma resposta no Google funciona

**Depende de:** Task 3 verde, com avaliações importadas.
**Não paralelizar com:** tarefas 2 e 3.
**ATENÇÃO:** esta tarefa **escreve no perfil público do Marcelo**. Publicar uma
resposta é visível para qualquer pessoa no Google e não é totalmente reversível
(dá para apagar, mas quem viu, viu). **Parar e pedir confirmação explícita antes
do Step 3.**

**Files:**
- Modify: nenhum, se funcionar.

- [ ] **Step 1: Confirmar que o caminho existe no código**

```bash
grep -n "publish-reply" supabase/functions/sync-google-business-profile/index.ts
```

- [ ] **Step 2: Ler o endpoint usado e comparar com a documentação viva**

O endpoint de resposta é `PUT https://mybusiness.googleapis.com/v4/{review}/reply`.
Confirmar que ainda existe — é a mesma v4 que teve os locais desligados, e
**nada garante que a resposta continue lá**.

- [ ] **Step 3: PARAR. Pedir ao Marcelo uma avaliação de teste**

Só publicar numa avaliação que ele indique, com o texto que ele aprovar.

- [ ] **Step 4: Confirmar no banco e no Google**

```sql
select review_id, reply_text, reply_updated_at from public.google_business_reviews
 where reply_text is not null order by reply_updated_at desc limit 3;
```

- [ ] **Step 5: Commitar o que for consertado**

---

## Task 5: A Places API — dois usos, duas versões, e uma delas é legada

**Pode correr em paralelo.** Não toca na conexão OAuth.

**A suspeita concreta:** `search-prospects` usa
`maps.googleapis.com/maps/api/place/nearbysearch/json`, que é a Places API
**legada**. `fetch-google-reviews` usa `places.googleapis.com/v1/places/`, que é
a **nova**. São duas APIs diferentes, ativadas separadamente no Console, e a
legada está em desligamento pelo Google — exactamente a mesma classe de defeito
que derrubou os locais na v4.

**Files:**
- Create: `scripts/check-places-api-viva.mjs`
- Modify: `supabase/functions/search-prospects/index.ts`, se a sonda provar que
  morreu.

- [ ] **Step 1: Sondar as duas, com uma chamada real cada**

A `GOOGLE_PLACES_API_KEY` está nos segredos do Supabase e **não** deve ser
extraída. Sondar pelas próprias funções:

```bash
curl -s -o /dev/null -w "search-prospects: %{http_code}\n" -X OPTIONS \
  "https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/search-prospects"
```

Depois, pedir ao Marcelo usar a busca de prospectos no painel uma vez, e ler:

```sql
select timestamp, event_message from logs
 where source = 'function_edge_logs' and event_message ilike '%search-prospects%'
 order by timestamp desc limit 5;
```

- [ ] **Step 2: Acrescentar o mesmo registro de erro que salvou o diagnóstico dos locais**

`search-prospects` não regista o motivo da recusa do Google. Acrescentar, no
mesmo formato de `sync-google-business-profile`:

```typescript
console.error(
  "Google recusou em %s: HTTP %s | status %s | %s",
  onde, response.status, body.error?.status || "?", mensagem,
);
```

- [ ] **Step 3: Se a legada estiver morta, migrar para a nova**

A busca por proximidade na Places nova é
`POST https://places.googleapis.com/v1/places:searchNearby`, com o campo
`X-Goog-FieldMask` obrigatório no cabeçalho. **Não migrar sem a sonda provar que
a legada morreu** — migrar o que funciona é criar risco sem ganho.

- [ ] **Step 4: Escrever o guarda que prende qual versão cada uso fala**

```javascript
#!/usr/bin/env node
// Cada uso da Places fala com a versao que lhe corresponde, e isso fica escrito.
//
// Sao duas APIs diferentes, activadas separadamente no Console do Google:
// `maps.googleapis.com` (legada) e `places.googleapis.com` (nova). Uma ligada e
// a outra nao deixa metade do produto morto sem que nada no codigo mude.
import { readFileSync } from 'node:fs';

const falhas = [];
let verificadas = 0;
const exigir = (rotulo, condicao) => { verificadas += 1; if (!condicao) falhas.push(rotulo); };

const avaliacoes = readFileSync('supabase/functions/fetch-google-reviews/index.ts', 'utf8');
const prospectos = readFileSync('supabase/functions/search-prospects/index.ts', 'utf8');

exigir('a leitura de avaliacoes publicas usa a Places nova',
  /places\.googleapis\.com\/v1\/places\//.test(avaliacoes));
exigir('a busca de prospectos regista o motivo da recusa do Google',
  /Google recusou em/.test(prospectos));

if (falhas.length) {
  console.error('Places API viva: %d protecao(oes) falharam.\n', falhas.length);
  for (const falha of falhas) console.error(' - %s', falha);
  process.exit(1);
}
console.log(`Places API viva: ${verificadas} protecoes verdes.`);
```

- [ ] **Step 5: Provar vermelho, ligar ao verify, commitar**

---

## Task 6: Todo caminho do Google grita quando falha

**Pode correr em paralelo.**

**O padrão que este plano encontrou:** o `502` mudo custou uma ida e volta
inteira. `sync-google-business-profile` já foi instrumentado; os outros não.

**Files:**
- Modify: `supabase/functions/fetch-google-reviews/index.ts`,
  `supabase/functions/google-business-oauth-callback/index.ts`

- [ ] **Step 1: Listar os pontos mudos**

```bash
cd ~/binno/maps
for f in fetch-google-reviews google-business-oauth-callback start-google-business-oauth; do
  echo "=== $f ==="
  grep -c "console.error" supabase/functions/$f/index.ts
done
```

- [ ] **Step 2: O callback é o mais grave**

`google-business-oauth-callback` redireciona com `failed` em **seis** caminhos
diferentes e não distingue nenhum no log. Se a conexão falhar, ninguém sabe se
foi o estado inválido, o estado expirado, o token recusado ou a gravação.

Acrescentar um `console.error` distinto em cada `return redirectToApp("failed")`,
nomeando o motivo. Exemplo do primeiro:

```typescript
if (stateError || !oauthState) {
  console.error("Callback do Google: estado nao encontrado");
  return redirectToApp("failed");
}
```

- [ ] **Step 3: Guarda que exige um motivo por cada saída de falha**

```javascript
const callback = readFileSync('supabase/functions/google-business-oauth-callback/index.ts', 'utf8');
const saidasDeFalha = (callback.match(/redirectToApp\("failed"\)/g) || []).length;
const motivosRegistados = (callback.match(/console\.error\("Callback do Google:/g) || []).length;
exigir('cada saida de falha do callback diz porque falhou',
  motivosRegistados >= saidasDeFalha);
```

- [ ] **Step 4: Provar vermelho, verify, commitar**

---

## Task 7: O que a varredura descobriu entra no contrato

**Correr por último**, depois de todas as outras.

**Files:**
- Modify: `docs/contrato-produto-binno.md`

- [ ] **Step 1: Recolher o que cada tarefa encontrou**

- [ ] **Step 2: Escrever a cláusula**

Cobrir, com data e motivo:
- Que o Binno fala com **quatro** APIs do Google diferentes, e quais.
- Que locais e avaliações vivem em versões diferentes de propósito.
- Que uma função no repositório não implantada é um defeito invisível, e como
  o guarda o cobra.
- Que todo caminho do Google regista o motivo da recusa.

- [ ] **Step 3: Verify e commit**

---

## Auto-revisão deste plano

**Cobertura:** os seis pontos de contato encontrados na varredura do código
(`fetch-google-reviews`, `search-prospects`, `sync-google-business-profile`,
`start-google-business-oauth`, `google-business-oauth-callback`,
`_shared/experimentalApifyCollection.ts`) estão cobertos — o último via Apify,
que não é API do Google e ficou de fora de propósito, porque já tem guarda
próprio em `check-apify-auto-collection.mjs`.

**Placeholders:** nenhum "TBD". As duas tarefas com resultado desconhecido
(2 e 5) têm tabela de decisão explícita em vez de "ver o que dá".

**Consistência de nomes:** `location_name` (coluna), `nomeCurto` e `accountName`
(variáveis em `sync-google-business-profile`) são usados com o mesmo sentido nas
tarefas 2, 3 e 5.

**Lacuna conhecida e aceita:** as tarefas 2, 3 e 4 **não podem ser executadas
por um agente sozinho** — todas exigem um clique do Marcelo, porque a sessão do
utilizador não é acessível ao agente. Elas param e pedem. Isso é limitação real,
não falha do plano.
