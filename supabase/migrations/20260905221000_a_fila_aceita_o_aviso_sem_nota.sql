-- A fila passa a aceitar o aviso do comentário sem nota.
--
-- O DEFEITO, E ELE E MEU, DE HOJE DE MANHA.
--
-- Em 05/09/2026 nasceu a especie `feedback-sem-nota`: quem escreve um comentario
-- privado sem tocar nas estrelas passa a avisar o dono, em cor neutra. Escrevi o
-- gatilho, escrevi a mensagem, escrevi o guarda, provei tres mutacoes vermelhas
-- — e nao acrescentei `feedback-sem-nota` a lista de `kind` que a
-- `whatsapp_outbox` aceita.
--
-- Entao o `insert` violava a restricao, a excepcao era APANHADA pelo bloco de
-- tratamento do proprio gatilho, e virava um `raise warning` que ninguem le. O
-- comentario era gravado, o dono nao era avisado, e nao havia erro em lado
-- nenhum: nem na tela do cliente, nem na fila, nem para mim.
--
-- COMO APARECEU: o Marcelo mandou um comentario de teste as 22:20 sem dar nota,
-- e nada chegou. Reproduzido com nota (avisa) e sem nota (nao avisa), o que
-- isolou o caminho num passo.
--
-- O QUE ISTO ENSINA, e vale mais do que a linha corrigida: eu provei o gatilho
-- por MUTACAO — apaguei regras e vi vermelho — e a mutacao nunca podia apanhar
-- isto, porque ela mede o que o codigo DIZ e nao o que a base ACEITA. Um
-- `insert` que o esquema recusa parece correcto em qualquer leitura.
--
-- E o `exception when others` que existe para o gatilho nunca derrubar uma
-- gravacao de cliente foi o que tornou a falha muda. Ele esta certo — perder o
-- comentario seria pior do que perder o aviso — mas transforma qualquer engano
-- de esquema em silencio.
alter table public.whatsapp_outbox drop constraint if exists whatsapp_outbox_kind_check;

alter table public.whatsapp_outbox add constraint whatsapp_outbox_kind_check
  check (kind = any (array[
    'test', 'alert', 'weekly', 'reply-reminder', 'profile-reminder',
    'feedback', 'feedback-praise', 'feedback-sem-nota', 'admin-alerta'
  ]));
