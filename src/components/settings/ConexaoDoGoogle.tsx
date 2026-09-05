import { useState } from 'react';
import { AlertTriangle, Building2, Check, Loader2, MapPin, ShieldCheck, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { usePreparacaoDoGoogle } from '@/hooks/usePreparacaoDoGoogle';
import GoogleBusinessConnection from '@/components/settings/GoogleBusinessConnection';

/**
 * Um cartão só, contando o que está acontecendo.
 *
 * Antes eram QUATRO cartões — conectar, buscar locais, escolher o negócio,
 * buscar avaliações — em ordem, sem nada dizer que existia uma ordem. Marcelo,
 * ao ver a tela: *"não é claro para o cliente, ele não vai saber que é preciso
 * isso"*.
 *
 * O dono já disse o que queria quando autorizou o Google. O resto é
 * consequência, e consequência não se pede em cartão separado: mostra-se a
 * acontecer. Ver `usePreparacaoDoGoogle` para o encadeado.
 */
const Linha = ({ estado, texto }: { estado: 'a-fazer' | 'feito'; texto: string }) => (
  <p className="flex items-center gap-2 text-sm text-slate-700">
    {estado === 'feito'
      ? <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#2457D6]" aria-hidden="true" />}
    {texto}
  </p>
);

const ConexaoDoGoogle = () => {
  const { t } = useOwnerTranslation();
  const { user } = useAuth();
  const [aConfirmar, setAConfirmar] = useState(false);
  const [aDesligar, setADesligar] = useState(false);

  const desligar = async () => {
    setADesligar(true);
    const { error } = await supabase.functions.invoke('sync-google-business-profile', {
      body: { action: 'disconnect' },
    });
    setADesligar(false);
    if (error) {
      toast.error(t('settings.googlePreparacao.desligarFalhou'));
      return;
    }
    toast.success(t('settings.googlePreparacao.desligado'));
    // RECARREGA A PAGINA em vez de mexer no estado a mao. Meia duzia de
    // ganchos leem a ligacao — o radar, a fila, a preparacao — e sincroniza-los
    // um a um seria inventar seis formas de esquecer um.
    window.location.reload();
  };

  const preparacao = usePreparacaoDoGoogle(user?.id);

  // Sem ligação, o cartão de convite manda — é ele que sabe pedir o
  // consentimento, e não há nada a preparar antes disso.
  if (preparacao.passo === 'a-verificar') return null;
  if (preparacao.passo === 'sem-ligacao') return <GoogleBusinessConnection />;

  if (preparacao.passo === 'falhou') {
    return (
      <Card className="mb-6 border-red-200 bg-red-50/50 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-950">{t('settings.googlePreparacao.falhouTitulo')}</h2>
              {/*
                O motivo do Google, e não uma frase genérica. Foi um `502` mudo
                que custou uma ida e volta inteira em 03/09/2026.
              */}
              <p className="mt-1 break-words text-sm text-slate-700">
                {preparacao.erro || t('settings.googlePreparacao.falhouSemMotivo')}
              </p>
              <Button variant="outline" className="mt-4" onClick={preparacao.recomecar}>
                {t('settings.googlePreparacao.tentarDeNovo')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // A ÚNICA PERGUNTA QUE SOBRA, e só quando existe: quem administra mais de um
  // negócio precisa dizer qual alimenta o painel.
  if (preparacao.passo === 'a-escolher-negocio') {
    return (
      <Card className="mb-6 border-slate-200 shadow-none">
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-950">{t('settings.googlePreparacao.qualNegocio')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {preparacao.aEscolher.length === 0
              ? t('settings.googlePreparacao.nenhumNegocio')
              : t('settings.googlePreparacao.qualNegocioAjuda')}
          </p>
          {preparacao.aEscolher.length > 0 && (
            <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {preparacao.aEscolher.map((negocio) => (
                <button
                  type="button"
                  key={negocio.id}
                  onClick={() => void preparacao.escolher(negocio.id)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#2457D6]">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{negocio.title}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const pronto = preparacao.passo === 'pronto';

  return (
    <Card className={`mb-6 shadow-none ${pronto ? 'border-emerald-200 bg-emerald-50/40' : 'border-blue-100'}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${pronto ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-50 text-blue-700'}`}>
            {pronto
              ? <Check className="h-5 w-5" aria-hidden="true" />
              : <Building2 className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950">
              {pronto
                ? t('settings.googlePreparacao.prontoTitulo', { negocio: preparacao.negocio || '' })
                : t('settings.googlePreparacao.aPrepararTitulo')}
            </h2>

            <div className="mt-3 space-y-1.5">
              <Linha estado="feito" texto={t('settings.googlePreparacao.passoLigado')} />
              <Linha
                estado={preparacao.passo === 'a-procurar-locais' ? 'a-fazer' : 'feito'}
                texto={preparacao.negocio
                  ? t('settings.googlePreparacao.passoNegocioFeito', { negocio: preparacao.negocio })
                  : t('settings.googlePreparacao.passoNegocio')}
              />
              <Linha
                estado={pronto ? 'feito' : 'a-fazer'}
                texto={pronto
                  ? t('settings.googlePreparacao.passoAvaliacoesFeito', { total: preparacao.avaliacoes })
                  : t('settings.googlePreparacao.passoAvaliacoes')}
              />
            </div>

            {pronto && (
              <p className="mt-4 flex max-w-2xl items-start gap-2 text-xs leading-5 text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {t('settings.googlePreparacao.nuncaPublica')}
              </p>
            )}

            {/*
              DESLIGAR EXISTE PORQUE LIGAR NAO PODE SER SO DE IDA.
              Ate 05/09/2026 nao havia forma nenhuma: uma vez ligado, ligado
              para sempre, e a unica saida era mexer no banco. Quem trocar de
              conta Google, vender o negocio, ou simplesmente querer sair,
              precisa de uma porta — e quem tem uma ligacao PARTIDA precisa
              dela ainda mais.

              PEDE CONFIRMACAO PORQUE APAGA A AUTORIZACAO. Voltar a ligar e
              possivel, mas passa pelo Google outra vez, e um toque sem querer
              no telemovel nao pode custar isso. Nao apaga avaliacoes nem
              respostas ja publicadas: isso e historico do negocio, nao da
              ligacao.
            */}
            <div className="mt-5 border-t border-slate-200 pt-4">
              {aConfirmar ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-slate-700">
                    {t('settings.googlePreparacao.desligarPergunta')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="min-h-11"
                      disabled={aDesligar}
                      onClick={() => void desligar()}
                    >
                      {aDesligar
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        : null}
                      {t('settings.googlePreparacao.desligarConfirmar')}
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={aDesligar}
                      onClick={() => setAConfirmar(false)}
                    >
                      {t('settings.googlePreparacao.desligarCancelar')}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAConfirmar(true)}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                >
                  <Unplug className="h-4 w-4" aria-hidden="true" />
                  {t('settings.googlePreparacao.desligar')}
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConexaoDoGoogle;
