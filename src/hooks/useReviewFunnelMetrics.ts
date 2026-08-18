import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReviewFunnelMetrics {
  qrOpens: number;
  googleClicks: number;
  privateFeedback: number;
  clickThroughRate: number | null;
}

/**
 * Counts only the events that Binno can observe directly. A click to Google is
 * intentionally not treated as a published review.
 */
export const useReviewFunnelMetrics = (userId?: string, days = 30) => {
  const [data, setData] = useState<ReviewFunnelMetrics | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setData(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: events, error: queryError } = await supabase
        .from('review_funnel_events')
        .select('event_type, platform')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString());

      if (!active) return;

      if (queryError) {
        console.error('Error loading review funnel metrics:', queryError);
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const observed = events || [];
      const qrOpens = observed.filter((event) => event.event_type === 'qr_open').length;
      const googleClicks = observed.filter(
        (event) => event.event_type === 'public_click' && event.platform === 'google'
      ).length;
      const privateFeedback = observed.filter((event) => event.event_type === 'private_feedback').length;

      setData({
        qrOpens,
        googleClicks,
        privateFeedback,
        clickThroughRate: qrOpens > 0 ? (googleClicks / qrOpens) * 100 : null,
      });
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [days, userId]);

  return { data, loading, error };
};
