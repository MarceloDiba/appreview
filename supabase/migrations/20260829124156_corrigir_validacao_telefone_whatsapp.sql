-- A regra anterior era '^\\+[1-9][0-9]{7,14}$'. Num literal do Postgres, `\\`
-- vira uma barra invertida literal e o `+` seguinte vira quantificador dela.
-- Resultado: a regra exigia que o telefone começasse com barra invertida, e
-- nenhum número real jamais passou. Foi por isso que a tabela ficou vazia e o
-- WhatsApp nunca enviou nada.
--
-- Usar [+] em vez de escapar elimina a classe inteira do problema: dentro de
-- colchetes o sinal de mais é literal e não depende de escape nenhum.
alter table public.whatsapp_notification_preferences
  drop constraint if exists whatsapp_notification_preferences_recipient_e164_check;

alter table public.whatsapp_notification_preferences
  add constraint whatsapp_notification_preferences_recipient_e164_check
  check (recipient_e164 ~ '^[+][1-9][0-9]{7,14}$');
