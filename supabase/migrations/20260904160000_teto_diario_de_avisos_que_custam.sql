-- Um teto diario para o que CUSTA, e nao para o que e util.
--
-- POR QUE ESTE FICHEIRO EXISTE
--
-- Marcelo baixou o produto para 99 no lote fundador e levantou o risco certo:
-- se cada avaliacao virar uma mensagem, o custo por cliente escala com o
-- movimento dele — e o mais movimentado e o que mais paga, ao contrario do que
-- a mensalidade fixa promete.
--
-- A MECANICA DA META decide o desenho. Uma mensagem enviada DENTRO da janela de
-- 24 horas (depois de o dono nos escrever) e de servico e nao e cobrada. FORA da
-- janela exige modelo aprovado e e cobrada por mensagem.
--
-- Entao o teto conta so o que custa. Contar as gratuitas contra o limite calava
-- o produto sem poupar nada — seria um teto que so faz mal.
--
-- QUEM DECIDE SE CUSTA E O ENVIADOR, na hora de enviar, porque so ali se sabe
-- se a janela ainda esta aberta. Por isso a coluna e escrita por ele, e nao por
-- quem enfileira.

alter table public.whatsapp_outbox
  add column if not exists cobravel boolean;

comment on column public.whatsapp_outbox.cobravel is
  'true quando a mensagem saiu como modelo aprovado (fora da janela de 24h, cobrada pela Meta); false quando saiu como texto livre dentro da janela (gratuita). Nulo enquanto nao foi enviada.';

alter table public.whatsapp_notification_preferences
  add column if not exists limite_diario_de_avisos integer not null default 5;

comment on column public.whatsapp_notification_preferences.limite_diario_de_avisos is
  'Quantos avisos COBRAVEIS este dono pode receber por dia. Os gratuitos, dentro da janela de 24h, nao contam.';

-- Quantos avisos cobraveis ja sairam hoje para este dono.
--
-- Conta o dia em UTC de proposito: o teto e uma protecao de custo, e nao uma
-- promessa ao dono sobre horarios. Um fuso por dono complicaria a leitura sem
-- mudar a conta.
create or replace function public.avisos_cobraveis_hoje(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::integer
    from public.whatsapp_outbox
   where user_id = p_user_id
     and cobravel is true
     and updated_at >= date_trunc('day', now());
$function$;

-- Ha espaco para mais um aviso hoje?
--
-- Devolve `true` quando a janela esta ABERTA, seja qual for a contagem: nesse
-- caso a mensagem nao custa, e travar seria travar de graca. Este e o ponto
-- inteiro deste ficheiro.
create or replace function public.cabe_mais_um_aviso(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.janela_de_texto_livre_aberta(p_user_id)
      or public.avisos_cobraveis_hoje(p_user_id)
         < coalesce((select limite_diario_de_avisos
                       from public.whatsapp_notification_preferences
                      where user_id = p_user_id), 5);
$function$;

revoke all on function public.avisos_cobraveis_hoje(uuid) from public, anon, authenticated;
revoke all on function public.cabe_mais_um_aviso(uuid) from public, anon, authenticated;
