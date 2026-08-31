-- A fila de respostas passa a viver no banco.
--
-- POR QUE, E O QUE ISSO MUDA NO CONTRATO
--
-- Ate 31/08/2026 o contrato de produto (linhas 39 a 41) proibia isto: nome,
-- texto e URL publica de uma avaliacao ficavam so no navegador autenticado,
-- por ate 14 dias. A regra nasceu de cautela nossa, nao de exigencia externa.
--
-- Ela cobrava um preco que so ficou visivel quando a coleta passou a rodar
-- sozinha: uma coleta feita pelo servidor nao tem navegador, entao produzia
-- numeros e nenhuma fila. Um cliente pagando pela coleta diaria acordaria com
-- os graficos atualizados e a lista de avaliacoes a responder vazia, que e
-- exatamente o que ele comprou.
--
-- Marcelo autorizou a mudanca em 30/08/2026, com este raciocinio: estas
-- avaliacoes ja sao publicas no Google, qualquer pessoa as le no Maps, entao
-- guarda-las nao expoe nada que ja nao esteja exposto.
--
-- OS LIMITES QUE CONTINUAM VALENDO
--
-- 1. So as avaliacoes do proprio negocio do dono. A chave primaria e a politica
--    de leitura garantem isso; nao ha caminho para ler as de outro.
-- 2. Os mesmos 14 dias que ja governavam a copia do navegador. A regra nao pode
--    ficar mais permissiva de lado: `expires_at` e obrigatorio, quem le filtra
--    por ele, e cada gravacao apaga o que venceu daquele dono.
-- 3. Leitura so do dono, por RLS, com revoke e grant explicitos como em
--    `google_public_reviews_answered`.
-- 4. Brasil primeiro. Portugal trata dado pessoal com regime mais exigente
--    mesmo quando ele e publico. Vender em Portugal exige rever esta decisao;
--    a resposta brasileira nao vale como universal.
create table if not exists public.google_reviews_awaiting_reply (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id text not null check (char_length(review_id) between 1 and 512),
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  published_at timestamptz,
  reviewer_name text,
  review_url text,
  response_observed boolean not null default false,
  collected_at timestamptz not null default now(),
  -- Obrigatorio de proposito: sem prazo, a retencao vira promessa verbal.
  --
  -- O prazo nasce aqui, na primeira gravacao daquela avaliacao, e a coleta NAO
  -- o reenvia depois. Se ele fosse reescrito a cada coleta, uma avaliacao que
  -- continuasse entre as mais recentes seria reestampada todo dia e nunca
  -- venceria: com coleta diaria os 14 dias viravam ficcao, e o contrato, esta
  -- migracao e a politica de privacidade passariam a prometer um prazo que
  -- nada aplicava.
  expires_at timestamptz not null default (now() + interval '14 days'),
  primary key (user_id, review_id)
);

create index if not exists google_reviews_awaiting_reply_user_recente_idx
  on public.google_reviews_awaiting_reply (user_id, published_at desc nulls last);

alter table public.google_reviews_awaiting_reply enable row level security;

revoke all on table public.google_reviews_awaiting_reply from anon, authenticated;
grant select on table public.google_reviews_awaiting_reply to authenticated;

drop policy if exists "google_reviews_awaiting_reply_owner_select" on public.google_reviews_awaiting_reply;
create policy "google_reviews_awaiting_reply_owner_select"
on public.google_reviews_awaiting_reply for select
to authenticated
using (auth.uid() = user_id);
