-- Um rascunho a espera de "1" morre quando a avaliacao ganha resposta.
--
-- O QUE ACONTECIA
--
-- O rascunho ia para o WhatsApp e ficava a espera de "1". Se o dono, entretanto,
-- publicasse a resposta pelo painel — ou respondesse direto no Google, fora do
-- Binno — a linha em `respostas_a_confirmar` continuava aberta. E entao duas
-- coisas, nenhuma visivel:
--
--   1. A MENSAGEM NO CELULAR CONTINUAVA VALIDA. O dono corrigia o texto no
--      painel, publicava a versao corrigida, e depois — uma hora, um dia — via
--      a mensagem antiga na conversa e respondia "1". Isso confirmava o
--      rascunho VELHO, que era publicado por cima da correcao. O trabalho de
--      corrigir era desfeito por um toque que parecia inofensivo.
--
--   2. A FILA PARAVA. `proxima_avaliacao_a_oferecer` tem a regra "uma de cada
--      vez", que existe para o "1" nao ser ambiguo. Com a linha presa aberta,
--      essa regra lia "ja ha um a espera" e nao oferecia mais nada — durante as
--      24 horas ate `expira_em`. O produto ficava mudo e ninguem era avisado.
--
-- POR QUE UM GATILHO, E NAO UMA CHAMADA ONDE SE PUBLICA
--
-- Ha tres caminhos que dao resposta a uma avaliacao: o painel, o "1" no
-- WhatsApp, e a sincronizacao que traz do Google o que o dono respondeu por la.
-- Escrever a limpeza em cada um significa lembrar dela no quarto caminho que
-- aparecer. A coluna `reply_text` e o que os tres tem em comum: e ali que a
-- regra vive.
--
-- Nao toca no caminho do proprio WhatsApp: aquele ja tem `confirmado_em`
-- preenchido quando publica, e so linhas ainda por confirmar sao fechadas.

alter table public.respostas_a_confirmar
  add column if not exists dispensado_porque text;

comment on column public.respostas_a_confirmar.dispensado_porque is
  'Por que este rascunho foi fechado sem o dono responder "1". Informativo: '
  'nada decide por esta coluna — quem fecha e `recusado_em`, que todos os '
  'consumidores ja respeitam. Uma coluna nova para decidir significaria '
  'ensinar a mesma regra a quatro consumidores, e esquecer um deles.';

create or replace function public.dispensar_rascunho_superado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- So quando a avaliacao PASSA a ter resposta, ou a resposta muda. Um update
  -- que mexe noutra coluna qualquer nao fecha rascunho nenhum.
  if new.reply_text is null
     or new.reply_text is not distinct from old.reply_text then
    return new;
  end if;

  update public.respostas_a_confirmar
     set recusado_em = now(),
         dispensado_porque = 'A avaliacao ganhou resposta por outro caminho '
                             'antes de o dono responder "1".'
   where review_id = new.id
     and confirmado_em is null
     and recusado_em is null;

  return new;
end;
$function$;

drop trigger if exists dispensar_rascunho_superado on public.google_business_reviews;
create trigger dispensar_rascunho_superado
  after update of reply_text on public.google_business_reviews
  for each row
  execute function public.dispensar_rascunho_superado();
