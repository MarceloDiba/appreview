-- O dono marca uma avaliação pública do Google como já respondida (30/08/2026).
--
-- A fila única de `/reviews` soma três origens. Duas delas sabem sozinhas
-- quando um item deixa de esperar: o comentário privado tem
-- `internal_feedback.is_addressed`, e a fila oficial tem `reply_text` vindo do
-- próprio Google. A terceira, a leitura pública do perfil, não sabe: a Places
-- API devolve a avaliação mas não devolve a resposta que o dono publicou.
--
-- Sem esta tabela, esses itens ficavam na fila para sempre. Um dono com link
-- do Google configurado veria "N esperando resposta" indefinidamente, mesmo
-- tendo respondido todas, e o estado vazio nunca poderia aparecer. Um número
-- que nunca desce ensina o dono a ignorar o número, que é o contrário do que
-- a fila existe para fazer.
--
-- A marcação é do DONO, não do Binno. O Binno não publica resposta nenhuma no
-- Google (contrato de produto, secção 2): esta linha registra que o dono diz
-- ter respondido lá, na própria página dele. Por isso a coluna se chama
-- `answered_at` e não `replied_at` nem `published_at`, e por isso o texto do
-- painel diz "já respondi no Google", na primeira pessoa do dono.
--
-- Vive em tabela própria, e não numa coluna de `cached_reviews`, porque
-- `fetch-google-reviews` apaga e reinsere as linhas dessa tabela a cada
-- leitura: uma coluna ali seria apagada na atualização seguinte. `review_id` é
-- o identificador da avaliação na Places API, que sobrevive à troca das
-- linhas.
--
-- Não guarda nome, texto nem URL da avaliação: só o facto de o dono já a ter
-- tratado (contrato de produto, linhas 39 a 41).

create table if not exists public.google_public_reviews_answered (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id text not null check (char_length(review_id) between 1 and 512),
  answered_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

alter table public.google_public_reviews_answered enable row level security;

-- O RLS ja nega por omissao a quem nao tem politica, entao o `anon` nao passa.
-- As permissoes abaixo sao a segunda tranca, e existem para esta tabela ficar
-- igual as irmas (ver `cached_reviews`): se um dia alguem acrescentar uma
-- politica ampla sem pensar, a permissao ainda barra o anonimo.
revoke all on table public.google_public_reviews_answered from anon, authenticated;
grant select, insert, delete on table public.google_public_reviews_answered to authenticated;

drop policy if exists "google_public_reviews_answered_owner_select" on public.google_public_reviews_answered;
create policy "google_public_reviews_answered_owner_select"
on public.google_public_reviews_answered for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "google_public_reviews_answered_owner_insert" on public.google_public_reviews_answered;
create policy "google_public_reviews_answered_owner_insert"
on public.google_public_reviews_answered for insert
to authenticated
with check (auth.uid() = user_id);

-- Desmarcar apaga a linha: o dono que percebe que ainda não respondeu põe a
-- avaliação de volta na fila.
drop policy if exists "google_public_reviews_answered_owner_delete" on public.google_public_reviews_answered;
create policy "google_public_reviews_answered_owner_delete"
on public.google_public_reviews_answered for delete
to authenticated
using (auth.uid() = user_id);
