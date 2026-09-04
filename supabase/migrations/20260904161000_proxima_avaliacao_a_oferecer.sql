-- Qual e a proxima avaliacao a oferecer a este dono, se houver alguma.
--
-- POR QUE ESTA FUNCAO EXISTE
--
-- Ate 04/09/2026 NADA chamava `oferecer_rascunho`: o ciclo inteiro funcionava e
-- ninguem o comecava. As duas mensagens que existiram foram disparadas a mao.
--
-- AS TRES REGRAS, e cada uma tem um motivo diferente:
--
--   UMA DE CADA VEZ. Enquanto houver um rascunho a espera, nao se oferece
--   outro. Nao e economia: e o que torna o "1" possivel. Com dois pendentes,
--   "1" nao diz qual, e desambiguar seria pedir ao dono que escrevesse mais —
--   o contrario exacto de um clique.
--
--   SO O QUE CUSTA E TRAVADO. Ver `cabe_mais_um_aviso`.
--
--   A MAIS ANTIGA PRIMEIRO. Uma avaliacao por responder envelhece mal: o
--   cliente ja se esqueceu, e quem le o perfil ve uma queixa sem resposta ha
--   duas semanas. A mais nova pode esperar; a mais velha ja esperou.
--
-- Devolve nulo quando nao ha nada a oferecer, e quem chama distingue "nao ha
-- avaliacoes" de "ha, mas o teto fechou" pelas funcoes acima.
create or replace function public.proxima_avaliacao_a_oferecer(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select r.id
    from public.google_business_reviews r
   where r.user_id = p_user_id
     and r.reply_text is null
     -- Nunca oferecer duas vezes a mesma, nem a que ja foi recusada: o dono
     -- decidiu, e insistir e ruido.
     and not exists (
       select 1 from public.respostas_a_confirmar c
        where c.review_id = r.id
     )
     -- Uma de cada vez.
     and not exists (
       select 1 from public.respostas_a_confirmar c
        where c.user_id = p_user_id
          and c.confirmado_em is null
          and c.recusado_em is null
     )
     and public.cabe_mais_um_aviso(p_user_id)
   order by r.review_updated_at asc nulls last, r.created_at asc
   limit 1;
$function$;

revoke all on function public.proxima_avaliacao_a_oferecer(uuid) from public, anon, authenticated;
