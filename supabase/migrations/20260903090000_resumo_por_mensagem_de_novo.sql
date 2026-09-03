-- O resumo semanal volta a sair por mensagem, por decisao de produto.
--
-- Marcelo, em 02/09/2026, depois de ver o relatorio por e-mail pronto:
-- "vou deixar apenas whatsapp inicialmente".
--
-- O QUE MUDA E O QUE NAO MUDA
--
-- Muda uma coisa so: o PADRAO de `weekly_channel` passa de `email` para
-- `mensagem`. Uma conta nova volta a receber o resumo pelo canal que
-- `canal_do_aviso` decidir — Telegram para quem o ligou, OpenWA para os outros.
--
-- Nao muda mais nada. O canal de e-mail continua inteiro: a coluna, a
-- restricao por canal, o drenador, o agendamento e a funcao `email-dispatch`
-- ficam onde estao, e o campo "Onde receber o relatorio" continua no painel.
-- Ligar o e-mail volta a ser uma escolha no painel mais a chave do Resend, e
-- nao um ramo para reconstruir.
--
-- POR QUE NAO SE APAGA O QUE FOI FEITO ONTEM
--
-- Porque nada disto foi trabalho perdido, e apagar codigo que funciona para
-- "limpar" e como se paga duas vezes pela mesma coisa. O e-mail e o unico canal
-- que serve um cliente enquanto o WhatsApp oficial nao for aprovado, e o dia em
-- que for preciso ele esta a uma chave de distancia.
--
-- E porque o RESTO daquele trabalho continua a ser o que segura o resumo de pe:
-- o compositor unico, o agendamento que faltava (o resumo semanal nao estava a
-- acontecer de todo, ver `20260902230000`), o canal escolhido em vez de assumido
-- e os `revoke` da fila. Nada disso depende do e-mail.
alter table public.whatsapp_notification_preferences
  alter column weekly_channel set default 'mensagem';

-- E a conta que ja existe volta ao canal que ela usa hoje. Sem esta linha, a
-- unica conta viva ficava em `email` — um canal sem chave — enquanto o padrao
-- novo so valeria para quem se inscrevesse a seguir.
update public.whatsapp_notification_preferences
   set weekly_channel = 'mensagem', updated_at = now()
 where weekly_channel = 'email';
