import { useMemo } from 'react';
import type { InternalCase } from '@/hooks/useInternalFeedback';

export type AlertLevel = 'critical' | 'serious' | 'warning' | 'good' | 'neutral';

export interface AttentionAlert {
  id: string;
  level: AlertLevel;
  /** Short label shown beside the icon — carries the state in text, not only in colour. */
  label: string;
  title: string;
  detail: string;
  /** Concrete next step. Shown as the practice tip. */
  action: string;
}

export interface AttentionInsights {
  hasData: boolean;
  /** The single most important thing right now. Never null once there is data. */
  priority: AttentionAlert;
  /** Everything else worth knowing, already ordered by severity. */
  alerts: AttentionAlert[];
  stats: {
    openCases: number;
    awaitingContact: number;
    oldestOpenDays: number | null;
    weekCount: number;
    weekAverage: number | null;
    baselineAverage: number | null;
    baselineWeeklyCount: number | null;
    resolvedTotal: number;
    resolutionRate: number | null;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

const daysSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / DAY_MS);
};

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Turns the raw internal cases into one clear priority plus supporting signals.
 *
 * Deliberately deterministic: no external API, no AI, no key required. The rules
 * are ordered by how much the owner loses by ignoring them — an unanswered
 * customer who left contact details outranks a statistical wobble.
 */
export const useAttentionInsights = (cases: InternalCase[]): AttentionInsights => {
  return useMemo(() => {
    const now = Date.now();
    const open = cases.filter((c) => !c.is_addressed);
    const resolvedTotal = cases.length - open.length;

    const awaitingContact = open.filter(
      (c) => !!c.customer_email && c.customer_email.trim() !== ''
    );

    const openWithDates = open
      .map((c) => ({ item: c, days: daysSince(c.created_at) }))
      .filter((entry): entry is { item: InternalCase; days: number } => entry.days !== null)
      .sort((a, b) => b.days - a.days);

    const oldestOpen = openWithDates[0] ?? null;

    const inWindow = (c: InternalCase, fromDaysAgo: number, toDaysAgo: number) => {
      if (!c.created_at) return false;
      const t = new Date(c.created_at).getTime();
      if (Number.isNaN(t)) return false;
      const age = now - t;
      return age >= toDaysAgo * DAY_MS && age < fromDaysAgo * DAY_MS;
    };

    const week = cases.filter((c) => inWindow(c, 7, 0));
    const baseline = cases.filter((c) => inWindow(c, 35, 7));

    const weekAverage = mean(week.map((c) => c.rating));
    const baselineAverage = mean(baseline.map((c) => c.rating));
    const baselineWeeklyCount = baseline.length ? baseline.length / 4 : null;

    const resolutionRate = cases.length ? resolvedTotal / cases.length : null;

    const stats: AttentionInsights['stats'] = {
      openCases: open.length,
      awaitingContact: awaitingContact.length,
      oldestOpenDays: oldestOpen?.days ?? null,
      weekCount: week.length,
      weekAverage,
      baselineAverage,
      baselineWeeklyCount,
      resolvedTotal,
      resolutionRate,
    };

    const alerts: AttentionAlert[] = [];

    // 1. Someone left their contact and is still waiting. The most costly silence.
    if (awaitingContact.length > 0) {
      const names = awaitingContact
        .map((c) => c.customer_name)
        .filter((n): n is string => !!n && n.trim() !== '');
      alerts.push({
        id: 'awaiting-contact',
        level: 'critical',
        label: 'Sem retorno',
        title: `${awaitingContact.length} ${plural(
          awaitingContact.length,
          'cliente deixou contacto e ainda não teve retorno',
          'clientes deixaram contacto e ainda não tiveram retorno'
        )}`,
        detail: names.length
          ? `Inclui ${names.slice(0, 3).join(', ')}${names.length > 3 ? ' e outros' : ''}.`
          : 'Eles esperaram tempo para escrever e deixaram como falar com eles.',
        action:
          'Responda hoje, mesmo que ainda não tenha solução. Um contacto no mesmo dia costuma recuperar o cliente; uma semana de silêncio raramente recupera.',
      });
    }

    // 2. A case has been sitting open for too long.
    if (oldestOpen && oldestOpen.days >= 2) {
      const who = oldestOpen.item.customer_name?.trim() || 'Um cliente';
      alerts.push({
        id: 'stale-case',
        level: oldestOpen.days >= 7 ? 'critical' : 'serious',
        label: 'Caso parado',
        title: `${who} está à espera há ${oldestOpen.days} ${plural(
          oldestOpen.days,
          'dia',
          'dias'
        )}`,
        detail: oldestOpen.item.feedback_text?.trim()
          ? `"${oldestOpen.item.feedback_text.trim()}"`
          : 'O caso continua aberto no seu painel.',
        action:
          'Resolva ou marque como resolvido com uma nota do que foi feito. O registo é o que prova que você agiu.',
      });
    }

    // 3. This week is meaningfully worse than the recent baseline.
    if (
      weekAverage !== null &&
      baselineAverage !== null &&
      week.length >= 3 &&
      baseline.length >= 3 &&
      baselineAverage - weekAverage >= 0.5
    ) {
      alerts.push({
        id: 'rating-drop',
        level: 'serious',
        label: 'Fora do padrão',
        title: `A média desta semana caiu para ${weekAverage.toFixed(1)}`,
        detail: `Nas quatro semanas anteriores estava em ${baselineAverage.toFixed(
          1
        )}. A queda é de ${(baselineAverage - weekAverage).toFixed(1)} ponto.`,
        action:
          'Leia os casos desta semana à procura do que se repete. Uma queda súbita costuma ter uma causa única: um turno, um prato, uma pessoa.',
      });
    }

    // 4. Volume spike — more complaints than usual, regardless of the average.
    if (
      baselineWeeklyCount !== null &&
      baselineWeeklyCount >= 1 &&
      week.length >= 3 &&
      week.length >= baselineWeeklyCount * 2
    ) {
      alerts.push({
        id: 'volume-spike',
        level: 'warning',
        label: 'Volume acima',
        title: `${week.length} casos esta semana, contra uma média de ${baselineWeeklyCount.toFixed(
          1
        )}`,
        detail: 'O número de clientes insatisfeitos subiu em relação às semanas anteriores.',
        action:
          'Verifique se algo mudou na operação nos últimos sete dias — equipa, fornecedor, horário, menu.',
      });
    }

    // 5. Open cases without contact details — still worth closing.
    const openWithoutContact = open.length - awaitingContact.length;
    if (openWithoutContact > 0) {
      alerts.push({
        id: 'open-cases',
        level: 'warning',
        label: 'Em aberto',
        title: `${openWithoutContact} ${plural(
          openWithoutContact,
          'caso aberto sem contacto do cliente',
          'casos abertos sem contacto do cliente'
        )}`,
        detail: 'Não dá para responder a estes, mas o relato continua a valer como sinal.',
        action:
          'Leia, corrija o que for operacional e marque como resolvido para manter o painel limpo.',
      });
    }

    // 6. Nothing is wrong — say so plainly and keep one useful habit in view.
    if (alerts.length === 0) {
      alerts.push({
        id: 'all-clear',
        level: 'good',
        label: 'Em dia',
        title:
          cases.length === 0
            ? 'Ainda não há casos registados'
            : 'Nenhum caso em aberto esta semana',
        detail:
          cases.length === 0
            ? 'Assim que alguém avaliar como "Ruim" no QR code, o caso aparece aqui na hora.'
            : `Você já resolveu ${resolvedTotal} ${plural(
                resolvedTotal,
                'caso',
                'casos'
              )} no total.`,
        action:
          cases.length === 0
            ? 'Confirme que o QR code está visível na mesa ou no balcão — é ele que alimenta esta página.'
            : 'Aproveite para pedir avaliação pública a quem teve boa experiência. É o melhor momento.',
      });
    }

    const order: Record<AlertLevel, number> = {
      critical: 0,
      serious: 1,
      warning: 2,
      neutral: 3,
      good: 4,
    };
    alerts.sort((a, b) => order[a.level] - order[b.level]);

    return {
      hasData: cases.length > 0,
      priority: alerts[0],
      alerts: alerts.slice(1),
      stats,
    };
  }, [cases]);
};
