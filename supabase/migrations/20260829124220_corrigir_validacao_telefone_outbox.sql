-- Mesmo defeito de escape da tabela de preferências, repetido aqui. Mesmo que
-- um número fosse salvo na preferência, a mensagem seria recusada ao entrar na
-- fila. Duas travas, o mesmo engano nas duas.
alter table public.whatsapp_outbox
  drop constraint if exists whatsapp_outbox_recipient_e164_check;

alter table public.whatsapp_outbox
  add constraint whatsapp_outbox_recipient_e164_check
  check (recipient_e164 ~ '^[+][1-9][0-9]{7,14}$');
