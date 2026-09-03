-- O aviso passa a oferecer o rascunho, e a esperar um "1".
--
-- POR QUE ESTE FICHEIRO EXISTE
--
-- A migracao 20260903200000 construiu o caminho de volta inteiro: a tabela do
-- que espera confirmacao, a funcao que marca o "1", o prazo de 24 horas, o
-- drenador que publica. Faltava a ponta de tras, e e a que sustenta tudo:
-- NADA criava a resposta a espera.
--
-- O webhook escutava um "1" que nunca ia chegar. Nenhum aviso oferecia
-- rascunho nenhum, e nenhuma linha guardava o que esse "1" significaria. As
-- pecas estavam todas construidas e nenhuma podia disparar.
--
-- Esta funcao fecha esse buraco. E o que falta para a frase que Marcelo quer
-- usar para vender — "Responda as avaliacoes do Google direto do seu WhatsApp
-- em 1 clique" — deixar de ser uma afirmacao sobre codigo que nunca corre.
--
-- POR QUE ISTO E UMA FUNCAO DE BANCO, E NAO DE APLICACAO
--
-- Enfileirar o aviso e gravar a resposta a espera tem de ser ATOMICO. Nao sao
-- dois passos de um processo: sao os dois lados da mesma promessa. A mensagem
-- diz "responda 1", e a linha na tabela e o unico sitio do mundo onde esta
-- escrito o que esse "1" quer dizer. Uma sem a outra e uma promessa partida:
--
--   Se o aviso SAI e a linha NAO grava, o dono responde "1", o webhook procura
--   o que confirmar, nao acha nada, e cala-se. Ele fica a olhar para o
--   telemovel convencido de que publicou no perfil publico dele.
--
--   Se a linha GRAVA e o aviso NAO sai, o indice unico de uma-por-dono fica
--   preso durante 24 horas com uma resposta que ninguem chegou a ver — e
--   nenhuma avaliacao nova consegue ser oferecida enquanto o prazo nao passa.
--
-- Em codigo de aplicacao os dois `insert` sao dois pedidos, e entre eles cabe
-- um timeout, um redeploy ou um 500 do lado do Supabase. Aqui sao a mesma
-- transacao: ou existem os dois, ou nao existe nenhum. E o mesmo raciocinio do
-- gatilho de comentario privado (20260829124017), que enfileira o aviso dentro
-- da propria transacao do `insert` do comentario.
--
-- A DIFERENCA PARA ESSE GATILHO, e ela e deliberada: la, falhar a avisar nunca
-- pode impedir o comentario do cliente de ser gravado — o comentario e o dado,
-- o aviso e conveniencia — e por isso o envio vai dentro de um `exception when
-- others` que engole tudo. Aqui NAO se engole nada. Se o aviso nao consegue
-- sair, a resposta a espera nao deve existir, porque so o aviso a explica.

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
  -- UMA DE CADA VEZ. O indice unico `respostas_a_confirmar_uma_por_dono` ja
  -- impede duas, mas bater nele lanca excepcao — e uma excepcao aqui aborta a
  -- transacao inteira de quem chamou, que pode estar no meio de gravar
  -- avaliacoes sincronizadas do Google. Devolver nulo diz a mesma coisa sem
  -- estragar o trabalho do chamador: "ja ha uma a espera, este fica para
  -- depois".
  --
  -- Duas ao mesmo tempo tornariam o "1" ambiguo, e desambiguar seria pedir ao
  -- dono que escrevesse mais — o contrario exacto de "1 clique".
  if exists (
    select 1 from public.respostas_a_confirmar
     where user_id = p_user_id and confirmado_em is null and recusado_em is null
  ) then
    return null;
  end if;

  -- A leitura da avaliacao vem ANTES de qualquer escrita, e o `user_id` no
  -- `where` nao e redundante: e ele que impede oferecer a um dono o rascunho
  -- de uma avaliacao de outro. `rating` e `not null` na tabela, entao um
  -- `v_nota` nulo aqui so pode significar uma coisa — a avaliacao nao existe,
  -- ou nao e deste dono.
  select rating, coalesce(reviewer_name, 'um cliente')
    into v_nota, v_autor
    from public.google_business_reviews
   where id = p_review_id and user_id = p_user_id;
  if v_nota is null then
    return null;
  end if;

  -- POR ONDE SAI, E PARA QUEM, decidido antes de gravar seja o que for.
  --
  -- `recipient_e164` e `not null` na fila de envio. Um dono que ligou o Google
  -- mas nunca configurou aviso nenhum nao tem linha em
  -- `whatsapp_notification_preferences`, e o `insert` la em baixo morreria com
  -- violacao de nao-nulo — arrastando consigo a resposta a espera, ja gravada,
  -- e devolvendo ao chamador uma excepcao em vez de uma resposta. Perguntar
  -- primeiro transforma isso numa saida limpa.
  select public.canal_do_aviso(p_user_id) into v_canal;
  select recipient_e164 into v_destino
    from public.whatsapp_notification_preferences where user_id = p_user_id;
  if nullif(btrim(coalesce(v_destino, '')), '') is null then
    return null;
  end if;

  insert into public.respostas_a_confirmar (user_id, review_id, rascunho)
  values (p_user_id, p_review_id, p_rascunho)
  returning id into v_id;

  -- O ASTERISCO SAI do que nao e nosso: o nome do autor emparelha com o
  -- negrito e po-lo no sitio errado, ou parte a mensagem no Telegram. O
  -- rascunho leva o mesmo tratamento porque tambem nao e texto nosso — sai de
  -- um modelo, a partir do comentario que o cliente escreveu.
  --
  -- O texto guardado em `respostas_a_confirmar` fica INTACTO: e esse que vai
  -- para o Google. Aqui so se limpa a copia que aparece na mensagem.
  v_corpo := format(
    E'⭐ *Avaliação de %s estrela%s* de %s\n\n✍️ *Rascunho da resposta:*\n"%s"\n\n👉 Responda *1* para publicar no Google.\nOu abra https://binno.pro/reviews para mudar o texto.',
    v_nota,
    case when v_nota = 1 then '' else 's' end,
    replace(v_autor, '*', ''),
    replace(p_rascunho, '*', '')
  );

  -- A CHAVE DE IDEMPOTENCIA CARREGA O ID DA RESPOSTA, e nao o da avaliacao.
  --
  -- E o que liga os dois lados: olhando para uma linha da fila sabe-se qual
  -- "1" ela espera, e olhando para uma resposta a espera sabe-se se o aviso
  -- dela chegou a sair ou falhou. Sem isso, um aviso entregue e uma resposta
  -- pendente sao duas linhas sem relacao nenhuma no meio de uma investigacao.
  --
  -- O `on conflict do nothing` fecha a porta a um segundo aviso para o mesmo
  -- rascunho: mandar a mesma oferta duas vezes faria o dono responder "1"
  -- duas vezes, e a segunda cairia sobre o rascunho seguinte.
  insert into public.whatsapp_outbox (user_id, kind, provider, recipient_e164, body, idempotency_key)
  values (p_user_id, 'alert', v_canal, v_destino, v_corpo, 'rascunho:' || v_id::text)
  on conflict (user_id, idempotency_key) do nothing;

  return v_id;
end;
$function$;

-- Quem chama isto decide publicar no perfil publico de alguem. Nao e coisa que
-- o navegador possa pedir: um `1` vindo do painel nao prova que a pessoa
-- respondeu no WhatsApp, e essa e a prova inteira que o produto oferece.
revoke all on function public.oferecer_rascunho(uuid, uuid, text) from public, anon, authenticated;
