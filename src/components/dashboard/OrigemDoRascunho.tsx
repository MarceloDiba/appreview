import React from 'react';
import type { ReplyChannel } from '@/lib/replySuggestions';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import type { OrigemNaTela } from '@/lib/rascunhoDoModelo';

/**
 * Regra 5: o dono tem de saber se está a ler o modelo ou o texto padrão.
 *
 * Três palavras, sem jargão: ninguém precisa de saber o que é um modelo de
 * linguagem para decidir se confia no parágrafo que tem à frente. O que ele
 * precisa de saber é se aquilo foi escrito a partir da avaliação dele ou
 * montado a partir de um molde.
 *
 * POR QUE ISTO VIVE NUM ARQUIVO PRÓPRIO
 *
 * As duas telas que rascunham resposta (a fila do painel e a fila de
 * `/reviews`) dizem a MESMA coisa sobre a MESMA avaliação. Enquanto cada uma
 * tinha as suas frases, elas podiam divergir sem que ninguém reparasse: a
 * mesma avaliação lida do painel diria uma coisa e lida de `/reviews` diria
 * outra. Um vocabulário só, num lugar só, e `scripts/check-rascunho-que-le.mjs`
 * exige que as duas o usem.
 *
 * Com rascunho do próprio dono não há etiqueta nenhuma. Depois de ele escrever,
 * o texto é dele, e qualquer uma das três frases abaixo seria mentira sobre a
 * origem do que está na caixa.
 */
/**
 * `canal` existe por uma palavra. Num comentário privado, deixado no formulário
 * do QR, não há avaliação nenhuma: dizer "escrito a partir desta avaliação" ali
 * é a etiqueta a nomear errado o que ela descreve, e foi o que Marcelo viu em
 * 01/09/2026 no primeiro comentário privado com rascunho do modelo. O padrão é
 * `public` para o chamador que não tem canal (o cockpit, cuja fila só tem
 * avaliações do Google) continuar igual.
 */
const OrigemDoRascunho = ({ origem, canal = 'public' }: { origem: OrigemNaTela; canal?: ReplyChannel }) => {
  const { t } = useOwnerTranslation();
  if (origem === 'dono') return null;
  return <span className="text-xs text-slate-500">{origem === 'modelo'
    ? t(canal === 'private' ? 'reply.draftFromComment' : 'reply.draftFromReview')
    : origem === 'pedindo'
      ? t('reply.draftReading')
      : t('reply.draftStandard')}</span>;
};

export default OrigemDoRascunho;
