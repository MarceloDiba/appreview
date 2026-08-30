-- Persistir os agregados da coleta Apify (decisão de 30/08/2026).
--
-- Uma coleta bem-sucedida devolvia o resultado ao navegador e nada chegava ao
-- banco. Esta tabela, que é de onde o painel tira os números, tinha zero
-- linhas, e a coleta automática do cadastro, que roda sem navegador nenhum,
-- gastava dinheiro e descartava o agregado inteiro.
--
-- A tabela nasceu para a conexão oficial do Google e bloqueava o piloto Apify
-- de duas formas:
--
--   1. `source` estava presa a um único valor por CHECK, então a linha do
--      piloto não podia nem ser gravada com a proveniência correta.
--   2. `location_id` era obrigatória e aponta para uma localização criada pela
--      conexão oficial. Uma coleta Apify não tem nenhuma.
--
-- Nome do avaliador, texto da avaliação e URL pública da avaliação continuam
-- fora daqui: esta tabela guarda medição, nunca identidade (contrato de
-- produto, linhas 39 a 41).

-- O CHECK antigo foi criado junto da coluna, então o nome dele é gerado pelo
-- Postgres. Procurar pela definição, e não pelo nome, evita depender de uma
-- convenção de nomenclatura para a migração funcionar.
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.google_business_reputation_snapshots'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%official-google%'
  loop
    execute format('alter table public.google_business_reputation_snapshots drop constraint %I', v_constraint);
  end loop;
end
$$;

alter table public.google_business_reputation_snapshots
  add constraint google_business_reputation_snapshots_source_check
  check (source in ('official-google', 'apify-experimental'));

-- A chave estrangeira continua valendo para as linhas que têm localização
-- oficial. Nula passa a ser permitida porque é o que uma coleta Apify tem.
alter table public.google_business_reputation_snapshots
  alter column location_id drop not null;

-- `reviews_last_30_days` era `not null default 0`. No caminho oficial o valor
-- é sempre conhecido. No caminho Apify ele pode ser desconhecido, quando
-- nenhuma avaliação da amostra traz data. Gravar 0 nesse caso faria o painel
-- mostrar "nenhuma avaliação nova" onde a verdade é "não deu para saber", ou
-- seja, inferência apresentada como dado real. Nulo é o mesmo que
-- `average_response_hours` já usa para desconhecido.
alter table public.google_business_reputation_snapshots
  alter column reviews_last_30_days drop not null;

-- O painel lê a linha mais recente do negócio. Uma comparação ao longo do
-- tempo precisa ficar presa a uma única proveniência: distribuição de uma
-- amostra de 50 e distribuição de todas as avaliações não se comparam.
create index if not exists google_business_reputation_snapshots_user_source_captured_idx
  on public.google_business_reputation_snapshots(user_id, source, captured_at desc);
