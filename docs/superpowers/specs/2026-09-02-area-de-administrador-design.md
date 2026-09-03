# Área de administrador do Binno — desenho

**Data:** 02/09/2026
**Aprovado por:** Marcelo, em conversa, respondendo a três perguntas de escopo.
**Estado:** desenho aprovado; falta o plano de execução.

## Para quem é isto

Três pessoas diferentes aparecem neste documento e confundi-las é o erro mais
caro que se pode cometer aqui:

| Quem | O que vê hoje | O que este desenho muda |
|---|---|---|
| **Marcelo**, dono do Binno | nada — não existe área nenhuma | passa a ver **números** de todas as contas |
| **O cliente**, dono do negócio | só a conta dele | nada |
| **O funcionário do cliente** | não existe | nada — é outro projeto |

Este documento é só sobre a primeira linha.

## O problema

O que quebra no Binno quebra **em silêncio**. Três casos em três dias, todos
encontrados por acaso ao ler o banco à mão:

1. A ponte do Telegram existia no servidor e não no repositório (01/09).
2. O resumo semanal não estava a falhar — não estava a **acontecer**, porque
   nada o chamava (02/09).
3. A coleta automática do cadastro estava morta de duas maneiras: sem
   agendamento e com um interruptor que nunca existiu (02/09).

Nenhum dos três deixou um alarme. Os dois primeiros deixaram, no máximo, uma
linha `failed` numa tabela que ninguém abre. Um cliente que se cadastrasse no
dia 1 abriria o painel vazio e ninguém saberia.

**Sem cliente pagante isto é constrangedor. Com cinco, é o produto.**

## O que foi decidido

**Serve para ver quem travou.** Não é painel comercial, não é suporte com acesso
à conta do cliente, não é gestão de planos. Essas três são features próprias,
para quando fizerem falta.

**Página mais aviso.** A página existe para investigar; o aviso procura o
Marcelo quando algo trava. Uma página só avisa quem a abre — com um cliente ele
lembra-se de abrir, com dez não.

**Só números e saúde.** Nome do negócio, nota, contagens, datas, o que falhou.
**Nunca** o texto de uma avaliação, o texto de um comentário privado, nem o nome
ou telefone de quem escreveu. Os clientes do nosso cliente são pessoas reais, e
Portugal — que nunca sai do mapa — trata isso como dado pessoal com regra
própria. É também a fronteira mais fácil de defender numa conversa com um
cliente desconfiado.

## Arquitetura

### A decisão que estruturou tudo

No plano inicial afirmei que "ser administrador" e "ser da equipe" eram a mesma
pergunta — *de quais contas posso ver os dados?* — e que uma peça partilhada
serviria as duas. **A decisão de "só números" desmente isso.**

Um funcionário precisa de ver **as linhas** da empresa dele: o texto das
avaliações, os comentários, tudo. Pôr o administrador na mesma peça dar-lhe-ia
acesso de linha a todas as contas, e esconder o conteúdo na tela seria
decoração, não fronteira.

Por isso o administrador **não passa pelas regras de acesso por linha**. Ele lê
por uma função de agregação, e as 44 políticas de RLS ficam **intocadas**. A
peça partilhada continua a ser o caminho certo para vários utilizadores por
negócio, e nasce nesse projeto, sozinha.

### A função

```
public.saude_das_contas() returns setof registo_de_saude
```

`security definer`, com `set search_path = public`. Primeira instrução:

```sql
if not exists (select 1 from public.admins where user_id = auth.uid()) then
  raise exception 'nao autorizado';
end if;
```

`revoke all on function public.saude_das_contas() from public, anon;` e
`grant execute on function public.saude_das_contas() to authenticated;` — a
função é chamável por qualquer sessão autenticada e recusa-se a devolver seja o
que for a quem não está em `admins`. `anon` fica de fora porque uma sessão
anónima nunca tem `auth.uid()`, e deixá-la chamar seria dar a qualquer pessoa um
caminho para medir o tempo de resposta da tabela `admins`. A verificação é dentro, e não numa
política, porque não há linha para governar: o que sai são contagens.

**A fronteira dos dados é a lista de colunas do tipo de retorno**, e mais nada.
Uma coluna nova com texto de terceiros teria de ser escrita ali, à vista, e o
guarda compara a lista com uma lista permitida.

### O que ela devolve, por conta

`user_id`, `negocio`, `email_da_conta`, `criada_em`, `nota`, `total_de_avaliacoes`,
`avaliacoes_lidas`, `comentarios_privados`, `fila_de_respostas`,
`ultima_coleta_em`, `dias_desde_a_coleta`, `sinais` (array de texto),
`gravidade` (`travado` | `atencao` | `ok`).

`email_da_conta` é o único dado pessoal na lista, e é do **cliente** — a pessoa
com quem o Marcelo tem contrato — não de terceiros. Sem ele a página não
consegue dizer de quem está a falar.

## Os oito sinais

Cada um é um acidente que já aconteceu neste projeto.

| Sinal | Condição | Gravidade |
|---|---|---|
| `coleta_parada_na_fila` | `apify_auto_collection_queue.status = 'queued'` há mais de 30 min | travado |
| `nunca_coletou` | tem `business_name` e link do Google, conta com mais de 1 h, e nenhuma coleta `succeeded` | travado |
| `mensagem_falhou` | `whatsapp_outbox.status = 'failed'` nas últimas 72 h | travado |
| `fila_presa_no_envio` | `status = 'sending'` e `claimed_at` há mais de 15 min | travado |
| `fila_parada_na_saida` | `status = 'queued'` e `scheduled_at` há mais de 30 min | travado |
| `sem_canal_de_aviso` | consentiu, sem `telegram_chat_id`, e o canal resolve para `openwa` | travado |
| `resumo_nao_saiu` | `weekly_enabled`, consentiu, passou o dia escolhido, e nenhuma linha `weekly` nos últimos 7 dias | atenção |
| `coleta_antiga` | dias desde a última coleta bem-sucedida | informação |

`coleta_antiga` **não é alarme**, e isso é deliberado: hoje não existe coleta
recorrente agendada, só a do cadastro. Marcá-la a vermelho seria alarme falso
permanente, e um painel que está sempre vermelho deixa de ser lido.

`gravidade` é `travado` se houver um sinal travado, `atencao` se houver só de
atenção, e `ok` nos restantes casos. Uma conta cujo único sinal é
`coleta_antiga` fica **`ok`**: ele viaja na lista de sinais como informação, e
não conta para a gravidade. Sem esta frase, a primeira pessoa a implementar
escolhe ao acaso, e metade das contas nasce amarela.

## A página

Rota `/admin`, dentro do mesmo aplicativo. Quem não estiver em `admins` recebe a
mesma tela de "não encontrado" de qualquer rota inválida — não uma recusa, que
confirmaria que a rota existe.

Em cima, uma faixa: quantas contas, quantas travadas.
Abaixo, uma linha por conta, ordenada por gravidade: negócio, estado, dias desde
a coleta, nota, total, comentários privados, fila de respostas. Abrir a linha
mostra **quais** sinais dispararam, com a frase do que fazer.

Ordenada por gravidade e não por nome porque a pergunta que a página responde é
"o que preciso de resolver", e não "quem são os meus clientes".

## O aviso

Sai pela fila que já existe, pelo canal do Marcelo — hoje o Telegram.

- `kind` novo: `admin-alerta`. Entra no `check` de `whatsapp_outbox.kind`.
- Uma verificação por dia. O `pg_cron` corre em UTC, logo o agendamento é
  `0 11 * * *`, que são 08:00 em `America/Sao_Paulo`. Escrever `0 8 * * *` ali
  entregaria o aviso às 05:00 — é o tipo de engano que só se descobre a receber
  a mensagem de madrugada.
- **Só quando muda.** Uma tabela `admin_health_alerts (id uuid primary key default gen_random_uuid(), assinatura text not null, enviado_em timestamptz not null default now())` guarda o que foi enviado. A assinatura é a lista ordenada de pares `(user_id, sinal)`, unida por `;`. Igual à última linha gravada — não envia.
- A tabela é de operação interna: `enable row level security` sem política
  nenhuma, `revoke all from anon, authenticated`. Só a chave de serviço lê e
  escreve, tal como `experimental_apify_runs`.

Sem essa regra ele recebe o mesmo aviso todos os dias até deixar de o ler, e um
aviso que se deixa de ler é pior do que nenhum. Uma tabela e não uma coluna
porque o histórico de alertas é o que permite responder "desde quando isto está
assim".

## Como o Marcelo vira administrador

Por **migração**, com o motivo escrito, inserindo o `user_id` dele em
`public.admins`. Não há tela.

A tabela está fechada à escrita do navegador desde 31/07, e a migração que a
fechou explica porquê: a versão original deixava qualquer pessoa autenticada
declarar-se administrador. Virar administrador continua a ser um ato deliberado
com rastro em git, e não um botão.

## Como se prova

`scripts/check-area-de-administrador.mjs`, num Postgres descartável, com contas
fabricadas — uma saudável e uma para cada sinal:

1. Cada sinal acende **só** no caso dele. Oito contas, oito verificações.
2. Quem não está em `admins` recebe exceção, e não uma lista vazia — uma lista
   vazia é indistinguível de "não há problemas".
3. A lista de colunas devolvida é **exatamente** a permitida. Acrescentar
   `comment` ou `customer_name` fica vermelho.
4. `anon` não consegue executar a função.
5. Assinatura igual à anterior não gera aviso; assinatura diferente gera.
6. Um sinal que é corrigido e volta a acontecer **volta** a avisar — a regra de
   "só quando muda" não pode transformar-se em "só uma vez na vida".

## Fora de escopo, de propósito

- Entrar na conta do cliente.
- Ver texto de avaliações ou de comentários privados.
- Criar contas, mexer em planos ou suspender clientes.
- Qualquer escrita. A área é **só de leitura**; o único efeito colateral é o
  registo do aviso enviado.

## Decisões tomadas por omissão

Ficam registadas para poderem ser contrariadas sem arqueologia:

- **Uma verificação por dia, às 08:00**, e não de hora a hora. Nada nos oito
  sinais melhora por ser sabido quatro horas mais cedo, e a frequência é o que
  transforma um aviso em ruído.
- **A página não filtra nem procura.** Com uma dúzia de contas, uma lista
  ordenada por gravidade é mais rápida do que qualquer filtro. Quando houver
  cinquenta, isso muda.
- **Nenhum gráfico.** A pergunta é "o que está travado agora", e um gráfico
  responde "como foi ao longo do tempo" — que é a pergunta do painel comercial,
  que ficou de fora.
