import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import BusinessInfoSettings, { type BusinessInfo } from '@/components/settings/BusinessInfoSettings';
import ExternalLinksSettings from '@/components/settings/ExternalLinksSettings';
import ConexaoDoGoogle from '@/components/settings/ConexaoDoGoogle';
import { useNegocioOficial } from '@/hooks/useNegocioOficial';
import ExperimentalApifySnapshot from '@/components/settings/ExperimentalApifySnapshot';
import { useExternalLinks } from '@/hooks/useExternalLinks';
import GoogleReviews from '@/components/dashboard/GoogleReviews';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const EMPTY: BusinessInfo = { name: '', ownerName: '', phone: '', country: '' };

/**
 * As definições passaram a ler e a gravar o que existe na base de dados.
 *
 * Antes o estado inicial era um "Restaurante Exemplo" inventado com morada em
 * São Paulo, e o botão de guardar só mostrava um aviso de sucesso. O dono
 * apagava campo a campo aquilo que nunca foi dele, e o que escrevia
 * desaparecia ao recarregar a página.
 *
 * Saiu também o separador "Avaliações": eram cinco interruptores que não
 * faziam nada, e o primeiro — "Permitir Avaliações Negativas: se desativado,
 * avaliações negativas serão enviadas apenas para formulário interno" —
 * anunciava exactamente o modelo que é proibido. Ver
 * `src/components/forms/FeedbackForm.tsx`.
 *
 * O separador de notificações também saiu enquanto não houver um motor real
 * de entrega. Guardar interruptores sem enviar email, push ou resumo semanal
 * daria ao dono uma confirmação falsa de que os alertas estão ativos.
 */
const Settings = () => {
  const navigate = useNavigate();
  const { t } = useOwnerTranslation();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(EMPTY);
  /**
   * Se a ligacao oficial ao Google ja alimenta o painel.
   *
   * `false` ate se saber, e nao `null`: enquanto nao se sabe, mostra-se a
   * coleta do Apify — que e o que serve quem nao tem ligacao, e e a maioria.
   * Escondê-la durante meio segundo a quem precisa dela seria pior do que
   * mostrá-la durante meio segundo a quem nao precisa.
   */
  const [temLigacaoOficial, setTemLigacaoOficial] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const {
    externalLinks,
    isLoading,
    isValidating,
    handleExternalLinkChange,
    handleExternalLinkCommit,
    handleAddExternalLink,
    handleDeleteExternalLink,
    refreshGooglePlaceData,
    saveExternalLinks,
    refreshLinks,
    error,
  } = useExternalLinks(userId);
  // O negocio que a ligacao oficial escolheu. Com ele, o campo do Google deixa
  // de pedir o que o Binno ja sabe.
  const { negocio: negocioOficial } = useNegocioOficial(userId);

  useEffect(() => {
    if (!userId) return;
    void supabase
      .from('google_business_connections')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setTemLigacaoOficial(data?.status === 'connected'));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const load = async () => {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('business_name, first_name, last_name, phone, business_country')
        .eq('id', userId)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        console.error('Erro ao carregar o perfil:', profileError.message);
      } else if (data) {
        setBusinessInfo({
          name: data.business_name || '',
          ownerName: [data.first_name, data.last_name].filter(Boolean).join(' ').trim(),
          phone: data.phone || '',
          country: data.business_country || '',
        });
      }

    };

    // Falhar a leitura não pode deixar o ecrã preso a carregar.
    load()
      .catch((loadError) => console.error('Erro ao carregar o perfil:', loadError))
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBusinessInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBusinessInfo = async () => {
    if (!userId) return;
    setSavingProfile(true);

    try {
      const [firstName, ...rest] = businessInfo.ownerName.trim().split(/\s+/);
      const { error: saveError } = await supabase.from('profiles').upsert({
        id: userId,
        business_name: businessInfo.name.trim(),
        first_name: firstName || null,
        last_name: rest.length ? rest.join(' ') : null,
        phone: businessInfo.phone.trim() || null,
        business_country: businessInfo.country || null,
        updated_at: new Date().toISOString(),
      });

      if (saveError) throw saveError;
      toast.success(t('settings.saved'));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Erro ao guardar';
      console.error('Erro ao guardar o perfil:', message);
      toast.error(t('settings.saveError'));
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || !userId || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  const googleReviewUrl = externalLinks.find((link) => link.platform.toLowerCase() === 'google reviews')?.url;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar userRole="business" businessName={businessInfo.name || undefined} />

      <main className="flex-1 pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('settings.subtitlePrefix')}{' '}
              <Link to="/configuracao" className="text-primary underline">
                {t('settings.guidedLink')}
              </Link>
              .
            </p>
          </header>

          {/*
            "Links externos" e "Google Reviews" viraram uma aba só, chamada
            "Google" (pedido de Marcelo, 03/09/2026). As duas falavam da mesma
            coisa em telas diferentes: o link que alimenta a coleta, e o que
            essa coleta traz de volta. Separadas, quem chegava à segunda sem
            ter passado pela primeira via avisos sobre um link que nunca tinha
            visto.

            A ORDEM DENTRO DA ABA é a ordem em que a informação nasce: primeiro
            o link (é dele que tudo depende), depois a conexão oficial, depois
            as duas formas de leitura que esse link alimenta.
          */}
          <Tabs defaultValue="business">
            <TabsList className="mb-6">
              <TabsTrigger value="business">{t('settings.tabBusiness')}</TabsTrigger>
              <TabsTrigger value="google">{t('settings.tabGoogle')}</TabsTrigger>
            </TabsList>

            <TabsContent value="business">
              <BusinessInfoSettings
                businessInfo={businessInfo}
                onBusinessInfoChange={handleBusinessInfoChange}
                onPhoneChange={(phone) => setBusinessInfo((current) => ({ ...current, phone }))}
                onCountryChange={(country) => setBusinessInfo((current) => ({ ...current, country }))}
                onSaveBusinessInfo={handleSaveBusinessInfo}
                onCancel={() => navigate(-1)}
                saving={savingProfile}
              />
            </TabsContent>

            <TabsContent value="google">
              {/*
                UM CARTAO, E NAO QUATRO (03/09/2026).
                Conectar, buscar locais, escolher o negocio e buscar avaliacoes
                eram quatro cartoes em ordem, sem nada dizer que existia uma
                ordem. Marcelo: "nao e claro para o cliente, ele nao vai saber
                que e preciso isso". Agora conectar faz o resto sozinho e o
                cartao conta o que esta a acontecer.

                E ELE VEM PRIMEIRO desde 05/09/2026. Estava depois do formulario
                do link colado, entao a primeira coisa que o dono via era um
                pedido — "cole aqui o seu link do Google" — antes de o produto
                lhe dizer que ja estava ligado e ja sabia o endereco. Marcelo
                apanhou-o duas vezes: "ele ainda pede link externos, nao ja
                tinhamos falado para eliminar isso".
              */}
              <ConexaoDoGoogle />

              {/*
                O LINK COLADO A MAO DEIXA DE SER PEDIDO A QUEM JA LIGOU, mas nao
                desaparece. Quem colou um `g.page` curto escolheu aquele endereco
                e pode te-lo IMPRESSO numa mesa; `get_public_qr_business` prefere
                o colado, de proposito, para nao trocar por baixo o destino de um
                QR que ja esta no mundo. Entao recolhe-se atras de um botao em vez
                de se apagar: quem precisa continua a chegar la em um toque, e
                quem nao precisa deixa de ser interrogado.
              */}
              {negocioOficial ? (
                <details className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-slate-600 hover:text-slate-900">
                    {t('settings.links.colarProprio')}
                  </summary>
                  <div className="mt-4">
                    <ExternalLinksSettings
                      negocioOficial={negocioOficial}
                      externalLinks={externalLinks}
                      onExternalLinkChange={handleExternalLinkChange}
                      onExternalLinkCommit={handleExternalLinkCommit}
                      onDeleteExternalLink={handleDeleteExternalLink}
                      onAddExternalLink={handleAddExternalLink}
                      onSaveExternalLinks={saveExternalLinks}
                      onRefreshPlaceData={refreshGooglePlaceData}
                      isLoading={isLoading}
                      isValidating={isValidating}
                      error={error}
                      refreshLinks={refreshLinks}
                    />
                  </div>
                </details>
              ) : (
                <div className="mt-6">
                  <ExternalLinksSettings
                    negocioOficial={negocioOficial}
                    externalLinks={externalLinks}
                    onExternalLinkChange={handleExternalLinkChange}
                    onExternalLinkCommit={handleExternalLinkCommit}
                    onDeleteExternalLink={handleDeleteExternalLink}
                    onAddExternalLink={handleAddExternalLink}
                    onSaveExternalLinks={saveExternalLinks}
                    onRefreshPlaceData={refreshGooglePlaceData}
                    isLoading={isLoading}
                    isValidating={isValidating}
                    error={error}
                    refreshLinks={refreshLinks}
                  />
                </div>
              )}
              {/*
                A COLETA DO APIFY SO APARECE PARA QUEM NAO TEM A LIGACAO OFICIAL.
                Dois botoes a prometer "trazer as suas avaliacoes" e a propria
                confusao — e o do Apify traz menos (50, raspadas) e custa
                dinheiro. Continua a existir porque e o que serve quem ainda nao
                ligou o Google, que e todo prospecto numa demonstracao.
              */}
              {!temLigacaoOficial && <ExperimentalApifySnapshot googleReviewUrl={googleReviewUrl} />}
              {/*
                O RETRATO NAO PODE OFERECER RESPOSTA QUANDO A LIGACAO OFICIAL
                MANDA. Esta lista vem do retrato da Apify, tirado num instante;
                ele nao sabe o que aconteceu depois de ser tirado — inclusive
                quem ja foi respondido. Marcelo apanhou-o: "avaliacoes ja
                respondidas tem os mesmos botoes das nao respondidas".

                A decisao ja existia, tomada em 03/09 na fila de `/reviews`:
                "so a oficial devolve a resposta publicada, entao so ela pode
                dizer quem ainda espera". La o retrato sai inteiro da fila. Aqui
                ele fica — e util para VER o que o Google mostra — mas deixa de
                convidar a responder.
              */}
              <GoogleReviews
                userId={userId}
                businessCountry={businessInfo.country || null}
                podeSugerirResposta={!temLigacaoOficial}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;
