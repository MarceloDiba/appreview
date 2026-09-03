import { AlertTriangle, Building2, Check, Loader2, MapPin, ShieldCheck } from 'lucide-react';
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConexaoDoGoogle;
