-- O dono pode recusar um rascunho sem publicar nada.
--
-- So existia `recusar_respostas_expiradas()`, que corre sozinha ao fim do
-- prazo. Nao havia forma NENHUMA de o dono dizer "esse nao" — e como o produto
-- so oferece um rascunho de cada vez, um que ele nao queira publicar tranca a
-- fila inteira ate expirar.
--
-- Marcelo, 05/09/2026, preso nesse estado: "nao tem como recusar em review,
-- apenas no painel" — e no painel a unica saida era publicar.
--
-- MARCA, NAO APAGA. `recusado_em` deixa o rasto de que houve uma oferta e que
-- ela foi rejeitada; apagar a linha faria o proximo passe oferecer a mesma
-- avaliacao outra vez, e o dono recusaria em ciclo sem perceber porque.
--
-- ESTA VERSAO ESTAVA INSEGURA, e a migracao seguinte conserta-a. Fica escrita
-- porque foi o que correu em producao, e porque o erro dela e o assunto da
-- outra.
create or replace function public.recusar_rascunho(p_user_id uuid, p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.respostas_a_confirmar
     set recusado_em = now()
   where user_id = p_user_id
     and review_id = p_review_id
     and confirmado_em is null
     and recusado_em is null
  returning id into v_id;

  -- Sem linha aberta nao ha nada a recusar, e isso nao e erro: e alguem a
  -- carregar duas vezes, ou a recusar o que ja tinha expirado.
  return v_id is not null;
end;
$$;

revoke all on function public.recusar_rascunho(uuid, uuid) from public, anon;
grant execute on function public.recusar_rascunho(uuid, uuid) to authenticated;
