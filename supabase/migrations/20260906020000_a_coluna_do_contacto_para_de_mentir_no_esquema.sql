-- A coluna do contacto para de mentir a quem le o esquema.
--
-- `internal_feedback.customer_email` guarda telefones: cinco das seis linhas
-- reais em 02/09/2026 comecavam por "+55". O nome e historia — o campo do
-- formulario ja foi e-mail e hoje e WhatsApp.
--
-- POR QUE NAO SE RENOMEIA. O nome certo tocaria 39 sitios em 17 ficheiros,
-- incluindo o gatilho que avisa o dono e a fila de respostas, e nao entrega
-- nada a quem usa o produto. A mentira ja esta contida atras de um nome
-- honesto dos dois lados: `tipoDoContacto` no produto, e a propria funcao de
-- aviso no banco, que decide o canal pelo conteudo e nao pelo nome da coluna.
--
-- Fica por fazer de proposito, e o comentario ocupa o lugar da mentira para
-- quem abrir o esquema antes de abrir o codigo.
comment on column public.internal_feedback.customer_email is
  'O contacto que o cliente deixou, e hoje quase sempre um NUMERO DE WHATSAPP: cinco das seis linhas reais em 02/09/2026 comecavam por +55. O nome e historia — o campo do formulario ja foi e-mail. Quem le esta coluna tem de decidir o canal pelo conteudo, e quem o faz e public.tipoDoContacto no lado do produto (src/lib/contactoDoCliente.ts) e a propria funcao de aviso no lado do banco. Renomea-la toca 39 sitios em 17 ficheiros, incluindo o gatilho que avisa o dono, e nao entrega nada a quem usa o produto; fica por fazer de propósito, com este comentario no lugar da mentira.';
