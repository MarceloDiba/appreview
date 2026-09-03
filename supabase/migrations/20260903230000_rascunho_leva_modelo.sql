-- O rascunho passa a viajar tambem como modelo aprovado.
--
-- POR QUE ESTE FICHEIRO EXISTE
--
-- `oferecer_rascunho` enfileirava a mensagem sem `template_name`. O enviador le
-- assim:
--
--     const mensagem = janelaAberta || !modelo ? { texto livre } : { modelo }
--
-- Sem modelo, ele manda texto livre SEMPRE — inclusive fora da janela de 24
-- horas, onde a Meta recusa texto livre. E a primeira mensagem que um dono
-- recebe esta, por definicao, fora da janela: a janela so abre quando ELE
-- escreve, e ele ainda nao escreveu nada.
--
-- Ou seja: o primeiro aviso de cada cliente novo seria recusado. O produto
-- funcionaria so para quem ja tinha falado connosco nas ultimas 24 horas, que e
-- exactamente quem nao precisa de ser avisado.
--
-- AS VARIAVEIS NAO PODEM LEVAR QUEBRAS DE LINHA. A Meta recusa o envio se um
-- valor de variavel tiver quebra de linha, tabulacao ou mais de quatro espacos
-- seguidos. O texto fixo do modelo pode ter; o valor que se enfia nele nao. Por
-- isso o rascunho vai com os espacos colapsados — e so na COPIA que vai na
-- mensagem. O texto guardado em `respostas_a_confirmar`, que e o que vai para o
-- Google, continua intacto.

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
  v_autor_limpo text;
  v_rascunho_limpo text;
begin
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

  select public.canal_do_aviso(p_user_id) into v_canal;
  select recipient_e164 into v_destino
    from public.whatsapp_notification_preferences where user_id = p_user_id;
  if nullif(btrim(coalesce(v_destino, '')), '') is null then
    return null;
  end if;

  insert into public.respostas_a_confirmar (user_id, review_id, rascunho)
  values (p_user_id, p_review_id, p_rascunho)
  returning id into v_id;

  -- O asterisco sai do que nao e nosso: emparelha com o negrito e po-lo no
  -- sitio errado. O espaco colapsa por causa da regra da Meta acima. O corte em
  -- 600 caracteres protege o limite do corpo do modelo, que e curto.
  v_autor_limpo := left(btrim(regexp_replace(replace(v_autor, '*', ''), '\s+', ' ', 'g')), 60);
  v_rascunho_limpo := left(btrim(regexp_replace(replace(p_rascunho, '*', ''), '\s+', ' ', 'g')), 600);

  v_corpo := format(
    E'⭐ *Avaliação de %s estrela%s* de %s\n\n✍️ *Rascunho da resposta:*\n"%s"\n\n👉 Responda *1* para publicar no Google.\nOu abra https://binno.pro/reviews para mudar o texto.',
    v_nota,
    case when v_nota = 1 then '' else 's' end,
    replace(v_autor, '*', ''),
    replace(p_rascunho, '*', '')
  );

  -- O MESMO CONTEUDO, NAS DUAS FORMAS. Dentro da janela sai o texto completo,
  -- que e mais legivel; fora dela sai o modelo, que e o unico que a Meta
  -- aceita. Quem escolhe e o enviador, na hora de enviar, porque so ali se sabe
  -- se a janela ainda esta aberta.
  insert into public.whatsapp_outbox (
    user_id, kind, provider, recipient_e164, body, idempotency_key,
    template_name, template_variables
  )
  values (
    p_user_id, 'alert', v_canal, v_destino, v_corpo, 'rascunho:' || v_id::text,
    'binno_rascunho_de_resposta',
    jsonb_build_array(v_nota::text, v_autor_limpo, v_rascunho_limpo)
  )
  on conflict (user_id, idempotency_key) do nothing;

  return v_id;
end;
$function$;

revoke all on function public.oferecer_rascunho(uuid, uuid, text) from public, anon, authenticated;
