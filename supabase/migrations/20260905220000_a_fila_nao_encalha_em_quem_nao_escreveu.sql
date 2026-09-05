-- A fila de rascunhos deixa de encalhar numa avaliação sem texto.
--
-- O QUE ACONTECIA
--
-- `proxima_avaliacao_a_oferecer` escolhia a mais antiga sem resposta. A mais
-- antiga do Marcelo é de 2018: cinco estrelas e NENHUM comentário.
--
-- E `sugerir-resposta` recusa-se a escrever para quem não escreveu — decisão de
-- 03/09/2026, protegida por `check-so-estrelas-sem-palavras`, e certa: o
-- gerador tinha inventado *"obrigado pelas suas palavras... gostado da visita"*
-- para uma avaliação muda, e isso ia para a página pública do negócio.
--
-- AS DUAS REGRAS ESTÃO CERTAS E NUNCA SE FALARAM. De 5 em 5 minutos, durante
-- horas, o cron escolhia a mesma avaliação muda, pedia o rascunho, recebia
-- `sem-rascunho`, e desistia. Medido em `net._http_response`: 21:30, 21:35,
-- 21:40, 21:45, 21:50 — todos idênticos.
--
-- E ATRÁS DELA HAVIA UMA COM TEXTO. Três mudas a bloquear uma real. O Marcelo
-- não recebia nada e não havia erro nenhum a mostrar: `sem-rascunho` é uma saída
-- com nome, e ninguém a estava a ler.
--
-- O CONSERTO É NA ESCOLHA, E NÃO NO GERADOR. Quem escolhe passa a saber o que o
-- gerador recusa. A alternativa — fazer o gerador aceitar avaliações mudas —
-- desfaria a decisão de 03/09 e devolveria a invenção à página do cliente.
--
-- Uma avaliação muda não se perde: continua a contar na reputação, aparece no
-- painel, e o dono responde-a à mão se quiser. O que ela deixa de fazer é
-- prender a fila de quem escreveu.
create or replace function public.proxima_avaliacao_a_oferecer(p_user_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select r.id
    from public.google_business_reviews r
   where r.user_id = p_user_id
     and r.reply_text is null
     -- QUEM SÓ DEU ESTRELAS NÃO TEM RASCUNHO POSSÍVEL. `sugerir-resposta`
     -- recusa, e sem esta linha a escolha volta a ela para sempre.
     and nullif(btrim(coalesce(r.comment, '')), '') is not null
     -- Nunca oferecer duas vezes a mesma, nem a que já foi recusada: o dono
     -- decidiu, e insistir é ruído.
     and not exists (
       select 1 from public.respostas_a_confirmar c
        where c.review_id = r.id
     )
     -- Uma de cada vez.
     and not exists (
       select 1 from public.respostas_a_confirmar c
        where c.user_id = p_user_id
          and c.confirmado_em is null
          and c.recusado_em is null
     )
     and public.cabe_mais_um_aviso(p_user_id)
   order by r.review_updated_at asc nulls last, r.created_at asc
   limit 1;
$$;
