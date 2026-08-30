-- A nota passa a ser opcional, para deixar de existir a nota que ninguem deu.
--
-- POR QUE EXISTE
--
-- `Feedback.tsx` assumia 'neutral' quando a pessoa chegava ao formulario sem ter
-- escolhido nada, e 'neutral' virava nota 3. Tres e nota baixa: ficava gravada
-- como opiniao do cliente e disparava o aviso de reclamacao no WhatsApp do dono,
-- que era avisado de um cliente insatisfeito que nunca disse nada.
--
-- A correcao no formulario e nao pre-selecionar nota nenhuma. Mas o formulario
-- sozinho nao resolvia: verificado no banco em 30/08/2026, `rating` era
-- `not null`, entao gravar sem nota falhava com violacao de not null, o insert
-- inteiro era recusado e o comentario do cliente se perdia. A coluna precisa
-- aceitar a ausencia de nota para que a ausencia de nota possa ser gravada.
--
-- POR QUE NULL, E NAO 0 NEM UM VALOR SENTINELA
--
-- Zero seria uma nota fora da escala circulando por todo lugar que le `rating`,
-- e cedo ou tarde alguem faria media com ele. Null e o unico valor que diz "nao
-- ha opiniao aqui" sem participar de contas: `avg` ignora, `count(rating)`
-- ignora, e comparacao com null nunca da verdadeiro.
--
-- O QUE ISTO NAO PRECISA MUDAR
--
-- A constraint `internal_feedback_rating_check` continua como esta. Ela e
-- `rating >= 1 and rating <= 5`, e uma constraint CHECK que resulta em null e
-- considerada satisfeita pelo Postgres, entao ela segue barrando 0 e 6 e passa
-- a deixar passar a ausencia de nota. Nao ha nada a reescrever nela.
--
-- O gatilho de aviso no WhatsApp tambem ja esta pronto para isto: a primeira
-- coisa que ele faz e sair quando `new.rating is null`. Nenhum aviso falso e
-- enviado por um comentario sem nota. Conferido em
-- `20260830180000_limite_de_avisos_de_comentario.sql`.
--
-- QUAL DADO EXISTENTE MUDA
--
-- Nenhum. Isto so afrouxa a coluna: as linhas ja gravadas continuam com a nota
-- que tem. So os comentarios enviados a partir daqui, por quem nao escolheu
-- nota, chegam com null.

alter table public.internal_feedback
  alter column rating drop not null;

comment on column public.internal_feedback.rating is
  'Nota de 1 a 5 dada pelo cliente. Null quando o cliente escreveu sem avaliar: '
  'a ausencia de nota e um estado real, nao um 3 presumido.';
