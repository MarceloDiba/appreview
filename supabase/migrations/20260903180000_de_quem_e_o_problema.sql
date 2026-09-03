-- Cada sinal passa a dizer de quem e o problema.
--
-- Marcelo, em 03/09/2026, olhando para a primeira versao do painel: "a conta
-- travado eu nao posso intervir em nada, correto?"
--
-- Correto, e isso era um defeito do desenho. A pagina dizia o que estava
-- partido e dava um "passo" que, na maioria dos sinais, ELE nao consegue
-- executar: ninguem que nao mexa no banco desentope uma fila presa em `sending`.
-- Um painel que pede accoes impossiveis ensina a nao abrir o painel.
--
-- DOS NOVE SINAIS, DOIS SAO DELE:
--
--   `sem_canal_de_aviso` — o cliente tem de ligar o Telegram, e quem lhe pede
--   isso e o Marcelo. Nenhuma linha de codigo resolve.
--
--   `dono_sumido` — e uma conversa, por definicao.
--
-- Os outros sete sao meus: fila parada, coleta travada, mensagem presa, resumo
-- que nao saiu. Sao avarias do produto.
--
-- POR QUE ISTO IMPORTA MAIS DO QUE PARECE
--
-- Nao e so rotulo. Muda o que o Marcelo faz ao abrir a pagina: ele passa a
-- distinguir num relance "tres travadas, duas sao para eu resolver falando com
-- o cliente, uma e para o Binno consertar". Sem essa divisao, as tres parecem
-- iguais e nenhuma se mexe.
create or replace function public.quem_resolve_o_sinal(p_sinal text)
returns text
language sql
immutable
as $function$
  select case p_sinal
    -- Do Marcelo: pedem uma conversa com o cliente, e nada mais.
    when 'sem_canal_de_aviso' then 'voce'
    when 'dono_sumido' then 'voce'
    -- Informacao: ninguem resolve, porque nao ha nada partido.
    when 'coleta_antiga' then 'informacao'
    -- Do Binno: sao avarias do produto. Se um sinal novo aparecer sem ser
    -- classificado, cai aqui — e um problema por classificar e mais
    -- provavelmente uma avaria do que um pedido ao cliente.
    else 'binno'
  end;
$function$;
