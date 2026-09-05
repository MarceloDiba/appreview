-- O dono pode desligar o Google sozinho.
--
-- POR QUE ISTO EXISTE
--
-- Não havia forma nenhuma de desligar. Zero ocorrências de "desconectar" no
-- produto inteiro: uma vez ligado, ligado para sempre, e a única saída era
-- alguém mexer no banco. Marcelo apanhou-o em 05/09/2026 ao tentar reconectar.
--
-- E ELE PRECISAVA DISSO NESSE DIA. O app saiu do modo Teste nessa tarde, o que
-- acaba com a expiração de 7 dias — mas só para autorizações NOVAS. A que já
-- existia nasceu em Teste e leva o prazo carimbado. Sem desligar, não há como
-- pedir uma nova, e publicar não teria servido de nada.
--
-- APAGA O SEGREDO, e não só a linha. O `refresh_token` vive no Vault; deixar lá
-- um token vivo de uma ligação que o dono desfez é guardar uma chave da casa de
-- alguém depois de ele pedir a chave de volta. A ordem importa: lê-se o id,
-- apaga-se a linha que lhe aponta, e só então o segredo — ao contrário, a
-- referência ficaria a apontar para o vazio se algo falhasse no meio.
--
-- APAGA TAMBÉM OS LOCAIS. Eles vieram da conta Google que acabou de sair; se
-- ficassem, uma reconexão com outra conta mostraria ao dono uma lista com o
-- negócio de antes misturado com o novo.
--
-- O QUE NÃO APAGA: as avaliações já trazidas e as respostas já publicadas.
-- Isso é histórico do negócio dele, não da ligação. Desligar o Google não pode
-- apagar o trabalho que ele já fez.
--
-- É `security definer` porque só o dono da linha pode desligá-la, e a checagem
-- é o `p_user_id` que a função de borda já validou contra a sessão.

create or replace function public.desligar_do_google(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_segredo uuid;
begin
  select refresh_token_secret_id into v_segredo
    from public.google_business_connections
   where user_id = p_user_id;

  -- Sem linha não há nada a desligar, e isso não é erro: é alguém a carregar
  -- duas vezes no mesmo botão.
  if not found then
    return false;
  end if;

  delete from public.google_business_locations where user_id = p_user_id;
  delete from public.google_business_connections where user_id = p_user_id;

  if v_segredo is not null then
    delete from vault.secrets where id = v_segredo;
  end if;

  return true;
end;
$$;

revoke all on function public.desligar_do_google(uuid) from public;
revoke all on function public.desligar_do_google(uuid) from anon;
revoke all on function public.desligar_do_google(uuid) from authenticated;
grant execute on function public.desligar_do_google(uuid) to service_role;
