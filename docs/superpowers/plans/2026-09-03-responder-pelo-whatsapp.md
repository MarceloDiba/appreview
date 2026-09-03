# Responder à avaliação pelo WhatsApp — Plano de execução

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use
> superpowers:subagent-driven-development. Os passos usam caixas (`- [ ]`).

**Goal:** Tornar verdadeira a frase que Marcelo quer usar para vender:
*"Responda às avaliações do Google Maps direto do seu WhatsApp em 1 clique"*.

**Architecture:** A fundação já existe e está implantada — canal `meta-cloud` na
fila, janela de 24h, tabela `respostas_a_confirmar`, webhook de entrada,
publicador, dois agendamentos. **Falta a peça que liga tudo:** nada ainda CRIA
uma resposta à espera. O webhook escuta um "1" que nunca vai chegar.

**Tech Stack:** Postgres + pg_cron, Deno (Supabase Edge Functions), React/Vite,
guardas em Node ligados ao `npm run verify`.

**Spec:** Não há documento de spec. O que faz as vezes dele é a frase de venda
acima, mais o handoff da Cloud API que Marcelo colou em 03/09/2026, mais o
commit `b2f32c6` (a fundação), cuja mensagem descreve as decisões já tomadas.
Quem executar deve ler esse commit antes de começar.

---

## O estado real, hoje

| Peça | Estado |
|---|---|
| Canal `meta-cloud` na fila | **pronto**, implantado |
| Janela de 24h (texto livre vs. modelo) | **pronto**, implantado |
| `respostas_a_confirmar` + confirmar + expirar | **escrito**, migração NÃO aplicada |
| `whatsapp-cloud-dispatch` (enviar) | **pronto**, implantado, dormente sem token |
| `whatsapp-cloud-webhook` (escutar) | **pronto**, implantado, dormente sem segredo |
| `publicar-respostas-confirmadas` | **pronto**, implantado |
| **Quem cria a resposta à espera** | **NÃO EXISTE** ← Task 1 |
| `canal_do_aviso` preferir `meta-cloud` | **NÃO EXISTE** ← Task 2 |
| O painel mostrar "esperando no WhatsApp" | **NÃO EXISTE** ← Task 3 |
| Modelo aprovado na Meta | **do Marcelo** |
| Três segredos | **do Marcelo** |
| Webhook registado na Meta | **do Marcelo** |

## Global Constraints

- **Nunca regredir.** O Telegram é hoje o único canal que funciona. Nada pode
  fazê-lo parar antes de a Cloud API estar provada.
- **Toda asserção provada VERMELHA**, com a mutação registada no commit.
- **`npm run verify` verde antes de qualquer commit.**
- **Não modificar `package.json`** — o controlador liga os guardas ao `verify`.
- **Não aplicar migrações nem implantar funções** — o controlador faz, na ordem.
- **Nunca publicar no Google sem confirmação explícita do dono.** É perfil
  público e não se desfaz.
- **Segredos nunca passam pela conversa.**
- Comentários em português, explicando o *porquê*. Sem acentos em comentários de
  código; acentos permitidos em texto visível.

### Coordenação

- Tasks 1 e 3 tocam ficheiros diferentes e correm **em paralelo**.
- Task 2 depende da 1 (só faz sentido preferir o canal depois de haver o que
  enviar por ele) e corre **depois**.
- Task 4 é do controlador, no fim.

---

## Task 1: O aviso passa a oferecer o rascunho e a esperar um "1"

**Esta é a peça que falta.** Sem ela nada do resto acontece.

**Files:**
- Create: `supabase/migrations/20260903210000_aviso_oferece_o_rascunho.sql`
- Create: `scripts/check-aviso-que-espera-resposta.mjs`

**Interfaces:**
- Consumes: `public.respostas_a_confirmar` (colunas `user_id`, `review_id`,
  `rascunho`, `expira_em`), `public.confirmar_resposta_do_dono(uuid)`, ambas já
  criadas na migração `20260903200000`.
- Produces: uma função `public.oferecer_rascunho(p_user_id uuid, p_review_id uuid, p_rascunho text)`
  que enfileira o aviso e grava a resposta à espera, **na mesma transação**.

- [ ] **Step 1: Entender por que isto é uma função de banco, e não de aplicação**

Leia `supabase/migrations/20260829124017_alerta_imediato_comentario_privado.sql`
— o gatilho que já avisa de comentário privado. Ele enfileira dentro da mesma
transação do `insert`, e é isso que garante que um aviso nunca se perde.

O mesmo vale aqui: enfileirar o aviso e gravar a resposta à espera têm de ser
**atómicos**. Se o aviso sair e a linha não gravar, o dono responde "1" e o
Binno não sabe do que ele está a falar.

- [ ] **Step 2: Escrever a função**

```sql
create or replace function public.oferecer_rascunho(
  p_user_id uuid,
  p_review_id uuid,
  p_rascunho text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_nota integer;
  v_autor text;
  v_canal text;
  v_destino text;
  v_corpo text;
begin
  -- Uma de cada vez. O indice unico ja impede duas, mas falhar com excepcao
  -- deixaria o chamador sem saber porque; devolver nulo diz "ja ha uma".
  if exists (
    select 1 from public.respostas_a_confirmar
     where user_id = p_user_id and confirmado_em is null and recusado_em is null
  ) then
    return null;
  end if;

  select rating, coalesce(reviewer_name, 'um cliente')
    into v_nota, v_autor
    from public.google_business_reviews
   where id = p_review_id and user_id = p_user_id;
  if v_nota is null then
    return null;
  end if;

  insert into public.respostas_a_confirmar (user_id, review_id, rascunho)
  values (p_user_id, p_review_id, p_rascunho)
  returning id into v_id;

  select public.canal_do_aviso(p_user_id) into v_canal;
  select recipient_e164 into v_destino
    from public.whatsapp_notification_preferences where user_id = p_user_id;

  -- O ASTERISCO SAI do que nao e nosso: o nome do autor emparelha com o
  -- negrito e po-lo no sitio errado, ou parte a mensagem no Telegram.
  v_corpo := format(
    E'⭐ *Avaliacao de %s estrela%s* de %s\n\n✍️ *Rascunho da resposta:*\n"%s"\n\n👉 Responda *1* para publicar no Google.\nOu abra %s para mudar o texto.',
    v_nota,
    case when v_nota = 1 then '' else 's' end,
    replace(v_autor, '*', ''),
    replace(p_rascunho, '*', ''),
    'https://binno.pro/reviews'
  );

  insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
  values (p_user_id, 'alert', v_canal, v_destino, v_corpo, 'rascunho:' || v_id::text)
  on conflict (user_id, idempotency_key) do nothing;

  return v_id;
end;
$function$;

revoke all on function public.oferecer_rascunho(uuid, uuid, text) from public, anon, authenticated;
```

- [ ] **Step 3: Escrever o guarda, com as asserções que importam**

Criar `scripts/check-aviso-que-espera-resposta.mjs`. Cada asserção abaixo tem de
existir e ser provada vermelha:

1. `oferecer_rascunho` grava a resposta à espera **e** enfileira o aviso — as
   duas coisas na mesma função (procure os dois `insert`).
2. Devolve `null` quando já há uma à espera, em vez de lançar excepção.
3. A mensagem contém a instrução literal `Responda *1* para publicar`.
4. O asterisco é retirado do nome do autor **e** do rascunho (dois `replace`).
5. A função é revogada de `anon` e `authenticated`.
6. A chave de idempotência liga o aviso à resposta (`'rascunho:' || v_id`), para
   o mesmo rascunho não gerar dois avisos.

- [ ] **Step 4: Provar cada asserção vermelha**

Para cada uma, mutar a migração, correr o guarda, confirmar que fica vermelho
**na asserção certa**, desfazer. Registar as seis mutações no commit.

- [ ] **Step 5: Commitar**

```bash
git add supabase/migrations/20260903210000_aviso_oferece_o_rascunho.sql scripts/check-aviso-que-espera-resposta.mjs
git commit -m "O aviso passa a oferecer o rascunho e a esperar um 1"
```

---

## Task 2: O canal do aviso prefere o WhatsApp oficial

**Depende da Task 1.**

**Files:**
- Create: `supabase/migrations/20260903220000_canal_prefere_whatsapp_oficial.sql`

- [ ] **Step 1: Ler a função actual**

`public.canal_do_aviso` está em
`supabase/migrations/20260831030000_telegram_como_ponte.sql`. Hoje devolve
`telegram` para quem tem `telegram_chat_id`, e `openwa` para os outros — e o
`openwa` está morto desde 31/08.

- [ ] **Step 2: A nova ordem, com o motivo escrito**

```sql
-- A ORDEM E: WhatsApp oficial, depois Telegram, e nunca mais OpenWA.
--
-- O `openwa` deixa de ser o recuo porque o recuo estava morto: o numero foi
-- bloqueado em 31/08 e o retransmissor da VPS nao serve ninguem. Devolver um
-- canal morto e enfileirar avisos que nao chegam.
--
-- O WhatsApp oficial vem primeiro porque e onde o dono JA esta, e porque e o
-- unico canal onde ele pode responder "1" e publicar no Google. O Telegram
-- continua a servir quem o ligou e ainda nao tem o WhatsApp registado.
create or replace function public.canal_do_aviso(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when exists (
      select 1 from public.whatsapp_notification_preferences
       where user_id = p_user_id
         and nullif(btrim(coalesce(recipient_e164, '')), '') is not null
         and whatsapp_oficial_ligado
    ) then 'meta-cloud'
    when exists (
      select 1 from public.whatsapp_notification_preferences
       where user_id = p_user_id
         and nullif(btrim(coalesce(telegram_chat_id, '')), '') is not null
    ) then 'telegram'
    else 'telegram'
  end;
$function$;
```

E a coluna que o interruptor precisa:

```sql
-- Um interruptor por dono, e nao global: a migracao para a Cloud API acontece
-- cliente a cliente, e o primeiro a mudar nao pode arrastar os outros.
alter table public.whatsapp_notification_preferences
  add column if not exists whatsapp_oficial_ligado boolean not null default false;
```

- [ ] **Step 3: Guarda**

Acrescentar a `scripts/check-responder-pelo-whatsapp.mjs`:

1. `canal_do_aviso` nunca devolve `openwa` (o canal está morto).
2. O WhatsApp oficial vem antes do Telegram na ordem.
3. O interruptor é por dono (`whatsapp_oficial_ligado`), com `default false`.

- [ ] **Step 4: Provar as três vermelhas, e commitar**

---

## Task 3: O painel mostra o que está à espera no WhatsApp

**Pode correr em paralelo com a Task 1.**

**Files:**
- Create: `src/hooks/useRespostaAEsperar.ts`
- Modify: `src/components/dashboard/reviews/FilaDeRespostas.tsx`

**Interfaces:**
- Consumes: `public.respostas_a_confirmar`, lida pela política de RLS do dono
  (`auth.uid() = user_id`), já criada.

- [ ] **Step 1: O hook**

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * O que o Binno mandou para o WhatsApp e ainda espera um "1".
 *
 * O painel precisa de o mostrar para o dono nao mandar duas respostas para a
 * mesma avaliacao — uma pelo telemovel e outra pelo painel — e para ele
 * perceber que a mensagem que recebeu ainda esta de pe.
 */
export type RespostaAEsperar = {
  id: string;
  reviewId: string;
  rascunho: string;
  expiraEm: string;
};

export const useRespostaAEsperar = (userId?: string) => {
  const [aEsperar, setAEsperar] = useState<RespostaAEsperar | null>(null);

  useEffect(() => {
    if (!userId) { setAEsperar(null); return; }
    let activo = true;
    void supabase
      .from('respostas_a_confirmar')
      .select('id, review_id, rascunho, expira_em')
      .is('confirmado_em', null)
      .is('recusado_em', null)
      .gt('expira_em', new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return;
        setAEsperar(data ? {
          id: data.id,
          reviewId: data.review_id,
          rascunho: data.rascunho,
          expiraEm: data.expira_em,
        } : null);
      });
    return () => { activo = false; };
  }, [userId]);

  return aEsperar;
};
```

- [ ] **Step 2: Mostrar na fila**

Em `FilaDeRespostas.tsx`, quando `aEsperar?.reviewId` for a avaliação a ser
mostrada, apresentar uma linha acima do rascunho, com estas três informações e
nada mais: que foi enviado ao WhatsApp, o texto que foi enviado, e que responder
"1" publica. Textos nos três idiomas, em `settings` ou `reviews`, conforme o
ficheiro onde o resto da fila já busca.

- [ ] **Step 3: Guarda**

Criar as asserções em `scripts/check-responder-pelo-whatsapp.mjs`:

1. O painel lê `respostas_a_confirmar` e filtra por não confirmada, não recusada
   e não expirada (três condições — uma mutação por cada).
2. O painel **não** escreve nessa tabela: uma confirmação vinda do navegador não
   prova que a pessoa respondeu no WhatsApp.

- [ ] **Step 4: Provar vermelhas, `npx tsc --noEmit -p tsconfig.app.json`, commitar**

---

## Task 4: Aplicar, ligar e registar (controlador)

- [ ] Aplicar as migrações em produção, na ordem: `20260903200000`, depois a da
  Task 1, depois a da Task 2.
- [ ] Ligar os guardas novos ao `verify`.
- [ ] Registar no contrato de produto: a janela de 24h, por que o webhook não
  publica, a proteção contra publicar duas vezes, e que `openwa` saiu.
- [ ] Escrever para o Marcelo o que falta do lado dele, com os valores exactos:
  os três segredos, o modelo a criar na Meta, e o endereço do webhook a
  registar.

---

## Auto-revisão

**Cobertura:** as três lacunas da tabela de estado (criar a resposta à espera,
preferir o canal, mostrar no painel) têm uma tarefa cada. As quatro linhas
"do Marcelo" não são tarefas de código e estão na Task 4 como comunicação.

**Placeholders:** nenhum. As três tarefas trazem o SQL e o TypeScript completos.

**Consistência de nomes:** `respostas_a_confirmar`, `confirmar_resposta_do_dono`,
`oferecer_rascunho`, `whatsapp_oficial_ligado` e `canal_do_aviso` são usados com
o mesmo sentido nas quatro tarefas e batem com a migração `20260903200000` já
escrita.

**Lacuna conhecida:** nada aqui prova que publicar no Google funciona. Isso é a
Task 4 do plano da varredura, depende de uma avaliação real sincronizada e de
Marcelo escolher em qual publicar. Enquanto não for provado, **a frase de venda
não deve ser usada.**
