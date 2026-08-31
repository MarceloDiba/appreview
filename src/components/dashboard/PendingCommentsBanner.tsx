import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInternalFeedback } from '@/hooks/useInternalFeedback';
import { caseHasContact, orderPendingCasesByRecency } from '@/lib/internalCasePriority';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

/**
 * O comentário privado com nota baixa é a única coisa do produto que expira:
 * o cliente ainda está no restaurante, ou acabou de sair. Uma avaliação no
 * Google pode esperar até amanhã; este caso não pode.
 *
 * Por isso este bloco é a única exceção à Visão geral fixada pelo contrato de
 * produto: ele existe acima da fila de respostas somente enquanto houver pelo
 * menos um comentário sem tratar em `internal_feedback`, e desaparece por
 * completo assim que não houver nenhum. Sem caso pendente, retorna `null` e a
 * Visão geral fica idêntica à descrita no contrato.
 *
 * Reaproveita `useInternalFeedback`, a mesma fonte usada em `/reviews`, para
 * não criar um segundo caminho de leitura para o mesmo dado.
 *
 * A ordem (mais recente primeiro; contato só marca o selo, não reordena) vem
 * de `orderPendingCasesByRecency`, em `src/lib/internalCasePriority.ts`. O
 * caso que este bloco destaca é o primeiro item dessa ordem, e a fila única
 * de `/reviews` (`src/lib/filaDeRespostas.ts`) ordena pela mesma função: as
 * duas telas não podem divergir sobre qual comentário é o mais recente.
 *
 * O link leva à âncora da fila (`#fila-de-respostas`), onde o caso destacado
 * aparece somado às outras origens desde 30/08/2026.
 */
const PendingCommentsBanner = ({ userId }: { userId?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const { loading, cases } = useInternalFeedback(userId || '');

  if (loading) return null;

  const pendingOrdered = orderPendingCasesByRecency(cases);
  if (pendingOrdered.length === 0) return null;

  const highlighted = pendingOrdered[0];
  const quote = highlighted.feedback_text?.trim();
  const who = highlighted.customer_name?.trim() || t('dashboard.cockpit.layout.anonymousReviewer');
  const locale = i18n.resolvedLanguage || i18n.language;
  const dateLabel = highlighted.created_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(highlighted.created_at))
    : '';

  return (
    <Card className="border-red-200 bg-red-50/70 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        {/*
          O ícone saiu em 31/08/2026. O círculo de 36px mais o intervalo comiam
          48px dos 390 de um telemóvel, e era isso que partia o título em duas
          linhas. Ele também não dizia nada: o cartão inteiro já é vermelho.
        */}
        <div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950">
              {t('dashboard.cockpit.layout.pendingCommentsTitle')}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-700">
              {t('dashboard.cockpit.layout.pendingCommentsCount', { count: pendingOrdered.length })}
            </p>
            {/*
              Aqui havia um parágrafo explicando a diferença entre esta fila e a
              de baixo. Marcelo mandou tirá-lo em 31/08/2026, depois de o ler no
              telemóvel: numa tela pequena ele empurra o comentário de verdade
              para fora da primeira dobra, e o que o dono precisa de ver é o
              comentário, não a explicação da arquitetura do produto.
            */}
            <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm leading-5 text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">
                  {who}
                  {dateLabel ? ` · ${dateLabel}` : ''}
                </p>
                {caseHasContact(highlighted) && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {t('dashboard.cockpit.layout.pendingCommentsHasContact')}
                  </span>
                )}
              </div>
              {quote && (
                <p className="mt-1">
                  {t('dashboard.cockpit.layout.pendingCommentsQuote', { quote })}
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button asChild className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]">
                <Link to="/reviews#fila-de-respostas">{t('dashboard.cockpit.layout.pendingCommentsAction')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingCommentsBanner;
