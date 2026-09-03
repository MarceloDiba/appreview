import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Depois de conectar, o Binno faz o resto sozinho.
 *
 * O DEFEITO QUE ISTO CORRIGE (03/09/2026)
 *
 * Marcelo, ao ver a tela pronta: *"isso que você me pediu aqui não é claro para
 * o cliente, ele não vai saber que é preciso isso"*. Ele tinha razão, e o
 * problema não era o texto — era a sequência.
 *
 * Conectar o Google era só o primeiro de quatro passos manuais. Depois era
 * preciso clicar em "Buscar locais", depois escolher a localização na lista, e
 * depois ainda pedir para sincronizar as avaliações. Quatro cliques, em cartões
 * diferentes, sem nada dizer que existia uma ordem entre eles — e cada um
 * parecendo opcional. Um dono de negócio conectava, via uma tela sem avaliação
 * nenhuma, e concluía que não tinha funcionado.
 *
 * Nada disso é decisão do dono. Ele já disse o que queria quando autorizou o
 * Google; buscar o local dele e trazer as avaliações é consequência, não
 * escolha.
 *
 * A ÚNICA PERGUNTA QUE SOBRA, e só quando existe de verdade: quem administra
 * mais de um negócio precisa dizer qual alimenta o painel. Com um só, não há
 * pergunta a fazer — e a esmagadora maioria tem um só.
 *
 * POR QUE UM `useRef` A GUARDAR QUE JÁ CORREU
 *
 * Este encadeado dispara a partir de um `useEffect` que observa o estado. Sem a
 * trava, cada passo muda o estado, o efeito corre outra vez, e o encadeado
 * recomeça — um laço que gastaria quota do Google em círculos. A trava é por
 * montagem da tela, não por sessão: recarregar a página permite tentar de novo,
 * que é o que alguém faria depois de um erro.
 */
export type PassoDaPreparacao =
  | 'a-verificar'
  | 'sem-ligacao'
  | 'a-procurar-locais'
  | 'a-escolher-negocio'
  | 'a-trazer-avaliacoes'
  | 'pronto'
  | 'falhou';

export type PreparacaoDoGoogle = {
  passo: PassoDaPreparacao;
  /** Quantas avaliações oficiais já entraram. */
  avaliacoes: number;
  /** O negócio que alimenta o painel, quando já há um escolhido. */
  negocio: string | null;
  /** Só preenchido quando há mais de um negócio e é preciso perguntar. */
  aEscolher: Array<{ id: string; title: string }>;
  erro: string | null;
  escolher: (id: string) => Promise<void>;
  recomecar: () => void;
};

const motivoDoErro = async (erro: unknown): Promise<string | null> => {
  const detalhe = await (erro as { context?: { json?: () => Promise<{ error?: string }> } })
    ?.context?.json?.().catch(() => null);
  return detalhe?.error || (erro instanceof Error ? erro.message : null);
};

export const usePreparacaoDoGoogle = (userId?: string): PreparacaoDoGoogle => {
  const [passo, setPasso] = useState<PassoDaPreparacao>('a-verificar');
  const [avaliacoes, setAvaliacoes] = useState(0);
  const [negocio, setNegocio] = useState<string | null>(null);
  const [aEscolher, setAEscolher] = useState<Array<{ id: string; title: string }>>([]);
  const [erro, setErro] = useState<string | null>(null);
  const jaCorreu = useRef(false);

  const preparar = useCallback(async () => {
    if (!userId || jaCorreu.current) return;
    jaCorreu.current = true;
    setErro(null);

    try {
      const { data: ligacao } = await supabase
        .from('google_business_connections')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (ligacao?.status !== 'connected') {
        setPasso('sem-ligacao');
        return;
      }

      // 1. Os locais. Só se busca quando ainda não há nenhum: quem já tem a
      // lista não precisa de a pedir outra vez ao Google a cada visita.
      let locais = (await supabase
        .from('google_business_locations')
        .select('id, title, is_selected')
        .eq('user_id', userId)
        .order('title')).data || [];

      if (locais.length === 0) {
        setPasso('a-procurar-locais');
        const { error } = await supabase.functions.invoke('sync-google-business-profile', {
          body: { action: 'list-locations' },
        });
        if (error) throw error;
        locais = (await supabase
          .from('google_business_locations')
          .select('id, title, is_selected')
          .eq('user_id', userId)
          .order('title')).data || [];
      }

      // 2. A escolha. Com um só negócio não há escolha a fazer — perguntar
      // seria inventar uma decisão que não existe.
      let escolhido = locais.find((local) => local.is_selected) || null;
      if (!escolhido && locais.length === 1) {
        const { error } = await supabase.functions.invoke('sync-google-business-profile', {
          body: { action: 'select-location', location_id: locais[0].id },
        });
        if (error) throw error;
        escolhido = { ...locais[0], is_selected: true };
      }

      if (!escolhido) {
        // Zero locais é um caso real: a conta do Google não administra nenhum
        // negócio. Dizer "escolha" com uma lista vazia seria mentir.
        setAEscolher(locais.map((local) => ({ id: local.id, title: local.title })));
        setPasso('a-escolher-negocio');
        return;
      }

      setNegocio(escolhido.title);

      // 3. As avaliações. Só na primeira vez: a partir daí a lista já existe e
      // trazer tudo de novo a cada visita gastaria quota sem ganho.
      const { count: jaTem } = await supabase
        .from('google_business_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', escolhido.id);

      if (!jaTem) {
        setPasso('a-trazer-avaliacoes');
        const { error } = await supabase.functions.invoke('sync-google-business-profile', {
          body: { action: 'sync-reviews' },
        });
        if (error) throw error;
      }

      const { count: total } = await supabase
        .from('google_business_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', escolhido.id);

      setAvaliacoes(total || 0);
      setPasso('pronto');
    } catch (problema) {
      console.error('Preparacao do Google falhou:', problema);
      setErro(await motivoDoErro(problema));
      setPasso('falhou');
    }
  }, [userId]);

  useEffect(() => { void preparar(); }, [preparar]);

  const escolher = async (id: string) => {
    setPasso('a-trazer-avaliacoes');
    try {
      const { error } = await supabase.functions.invoke('sync-google-business-profile', {
        body: { action: 'select-location', location_id: id },
      });
      if (error) throw error;
      jaCorreu.current = false;
      await preparar();
    } catch (problema) {
      console.error('Nao consegui escolher o negocio:', problema);
      setErro(await motivoDoErro(problema));
      setPasso('falhou');
    }
  };

  const recomecar = () => {
    jaCorreu.current = false;
    setPasso('a-verificar');
    void preparar();
  };

  return { passo, avaliacoes, negocio, aEscolher, erro, escolher, recomecar };
};
