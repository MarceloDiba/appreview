-- O alerta de comentário privado é um tipo próprio, não um 'alert' genérico:
-- 'alert' já significa aviso de reputação vindo da coleta do Apify. Conflatar
-- os dois impediria o dono de ligar um e desligar o outro, e confundiria
-- qualquer leitura futura da fila.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_kind_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_kind_check
  check (kind = any (array['test','alert','weekly','reply-reminder','profile-reminder','feedback']));
