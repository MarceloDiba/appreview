-- O aviso passa a mostrar o que o cliente escreveu.
--
-- POR QUE ESTE FICHEIRO EXISTE
--
-- Em 04/09/2026 o Marcelo recebeu o primeiro rascunho de verdade no WhatsApp e
-- reparou: a mensagem trazia a nota, o nome e a RESPOSTA, mas nao trazia UMA
-- palavra do que a cliente tinha escrito.
--
-- Ou seja: pedia-se-lhe para publicar um texto no perfil publico dele, com um
-- clique, sem lhe mostrar aquilo a que estava a responder. Nao da para julgar
-- se uma resposta serve sem ler a avaliacao — e foi exactamente assim que a
-- frase inventada da "visita" quase foi publicada.
--
-- A NOTA SOZINHA NAO CHEGA. Quatro estrelas cabem num elogio e numa ressalva, e
-- a resposta certa e diferente nos dois casos.
--
-- QUEM SO DEIXOU ESTRELAS tem direito a que isso seja dito, e nao a um espaco
-- em branco: um bloco vazio le-se como falha do produto, e nao como facto sobre
-- a avaliacao.

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
  v_comentario text;
  v_canal text;
  v_destino text;
  v_corpo text;
  v_autor_limpo text;
  v_comentario_limpo text;
  v_rascunho_limpo text;
begin
  if exists (
    select 1 from public.respostas_a_confirmar
     where user_id = p_user_id and confirmado_em is null and recusado_em is null
  ) then
    return null;
  end if;

  select rating, coalesce(reviewer_name, 'um cliente'), comment
    into v_nota, v_autor, v_comentario
    from public.google_business_reviews
   where id = p_review_id and user_id = p_user_id;
  if v_nota is null then
    return null;
  end if;

  select public.canal_do_aviso(p_user_id) into v_canal;
  select recipient_e164 into v_destino
    from public.whatsapp_notification_preferences where user_id = p_user_id;
  if nullif(btrim(coalesce(v_destino, '')), '') is null then
    return null;
  end if;

  insert into public.respostas_a_confirmar (user_id, review_id, rascunho)
  values (p_user_id, p_review_id, p_rascunho)
  returning id into v_id;

  v_autor_limpo := left(btrim(regexp_replace(replace(v_autor, '*', ''), '\s+', ' ', 'g')), 60);
  v_rascunho_limpo := left(btrim(regexp_replace(replace(p_rascunho, '*', ''), '\s+', ' ', 'g')), 600);

  -- O texto do cliente, com o mesmo tratamento: sem asterisco, sem quebras, e
  -- cortado. A Meta recusa variaveis com quebra de linha.
  v_comentario_limpo := left(btrim(regexp_replace(replace(coalesce(v_comentario, ''), '*', ''), '\s+', ' ', 'g')), 400);
  if v_comentario_limpo = '' then
    v_comentario_limpo := 'Sem comentario escrito, so a nota.';
  end if;

  v_corpo := format(
    E'⭐ *Avaliação de %s estrela%s* de %s\n\n💬 *O que o cliente escreveu:*\n"%s"\n\n✍️ *Rascunho da resposta:*\n"%s"\n\n👉 Responda *1* para publicar no Google.\n✏️ Para mudar o texto antes de publicar, abra https://binno.pro/reviews',
    v_nota,
    case when v_nota = 1 then '' else 's' end,
    replace(v_autor, '*', ''),
    v_comentario_limpo,
    replace(p_rascunho, '*', '')
  );

  insert into public.whatsapp_outbox (
    user_id, kind, provider, recipient_e164, body, idempotency_key,
    template_name, template_variables
  )
  values (
    p_user_id, 'alert', v_canal, v_destino, v_corpo, 'rascunho:' || v_id::text,
    'binno_rascunho_de_resposta',
    -- QUATRO VARIAVEIS, e a ordem importa: nota, autor, o que ele escreveu, e
    -- so entao o rascunho. O modelo na Meta tem de ser criado com esta ordem.
    jsonb_build_array(v_nota::text, v_autor_limpo, v_comentario_limpo, v_rascunho_limpo)
  )
  on conflict (user_id, idempotency_key) do nothing;

  return v_id;
end;
$function$;

revoke all on function public.oferecer_rascunho(uuid, uuid, text) from public, anon, authenticated;
