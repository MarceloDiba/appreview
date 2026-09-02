-- O histórico semanal passa a viver no banco, e não só no navegador que coletou.
--
-- Marcelo, em 02/09/2026, ao abrir o painel a partir de outro endereço:
-- "Esses campos estão vazios: Volume de avaliações, Cada nota separada."
--
-- O QUE ESTAVA ERRADO
--
-- A tabela guarda o total de avaliações, a nota média, a divisão por estrelas,
-- os temas e o tempo de resposta. Não guarda o histórico semanal. Ele era
-- calculado durante a coleta, desenhado na tela, e morria ali: sobrevivia
-- apenas no `localStorage` do navegador que fez a coleta.
--
-- O preço só aparece quando se sai desse navegador. Trocar de computador,
-- limpar o navegador, abrir no telemóvel, ou uma coleta feita pelo SERVIDOR
-- (que é o caminho da coleta diária) entregam números e nenhum gráfico. E a
-- frase de vazio culpava o número de buscas, dizendo "depois da segunda
-- busca", quando a segunda busca já tinha acontecido: o histórico é calculado
-- dentro de UMA coleta, das datas das avaliações da amostra, e nunca dependeu
-- de haver duas.
--
-- É o mesmo defeito, na mesma tabela, que a fila de respostas teve em
-- 31/08/2026: "uma coleta feita pelo servidor entregava números e nenhuma
-- fila". Corrigimos a fila e não olhámos para o histórico ao lado dela.
--
-- POR QUE UMA COLUNA JSONB E NÃO UMA TABELA DE SEMANAS
--
-- O histórico é sempre lido inteiro, com o retrato a que pertence, e nunca
-- consultado por semana. Uma tabela filha daria junções e uma chave a mais
-- para manter, sem nenhuma pergunta que ela respondesse melhor. `topics` já
-- vive assim nesta mesma tabela, pela mesma razão.
--
-- A coluna aceita nulo de propósito: as linhas que já existem foram gravadas
-- sem histórico e não há como o inventar para trás. Nulo diz "esta coleta não
-- guardou", que é a verdade, e é diferente de "esta coleta viu zero semanas".
alter table public.google_business_reputation_snapshots
  add column if not exists weekly_history jsonb;

comment on column public.google_business_reputation_snapshots.weekly_history is
  'As semanas de `insights.history` da coleta que gerou esta linha. Nulo nas linhas anteriores a 02/09/2026, que foram gravadas antes de o histórico ser guardado.';
