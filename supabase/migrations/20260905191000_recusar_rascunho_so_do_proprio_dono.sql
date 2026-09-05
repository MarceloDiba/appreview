-- A recusa vale so para a propria conta.
--
-- A primeira versao desta funcao, escrita minutos antes, aceitava `p_user_id`
-- de quem a chamasse e era `security definer` com execucao para
-- `authenticated`. Qualquer pessoa com sessao podia recusar o rascunho de
-- OUTRA — passar o id de outro dono e trancar-lhe a fila.
--
-- Foi um `grant` escrito no automatico, a copiar a forma das funcoes que sao
-- chamadas pelo servidor com a chave de servico, onde o `p_user_id` vem de uma
-- sessao ja validada na borda. Aqui quem chama e o navegador, e o navegador
-- diz o que quiser.
--
-- Agora o dono vem de `auth.uid()`, que o Postgres le do token e o navegador
-- nao escolhe. O parametro desaparece: um parametro que nao pode ser confiavel
-- e melhor nao existir do que ser ignorado — quem o vir escrito assume que faz
-- alguma coisa.
drop function if exists public.recusar_rascunho(uuid, uuid);

create or replace function public.recusar_rascunho(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_dono uuid := auth.uid();
begin
  if v_dono is null then
    return false;
  end if;

  update public.respostas_a_confirmar
     set recusado_em = now()
   where user_id = v_dono
     and review_id = p_review_id
     and confirmado_em is null
     and recusado_em is null
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function public.recusar_rascunho(uuid) from public, anon;
grant execute on function public.recusar_rascunho(uuid) to authenticated;
