import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

export interface InternalCase {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  feedback_text: string | null;
  rating: number;
  is_addressed: boolean | null;
  case_status: 'new' | 'in_progress' | 'resolved';
  qr_code_id: string | null;
  qr_name: string | null;
  responsible_name: string | null;
  resolution_note: string | null;
  resolution_outcome: 'recovered' | 'contacted' | 'operational_fix' | 'no_response' | 'not_applicable' | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export type CaseUpdate = Partial<Pick<
  InternalCase,
  | 'case_status'
  | 'responsible_name'
  | 'resolution_note'
  | 'resolution_outcome'
  | 'acknowledged_at'
  | 'resolved_at'
>>;

export const useInternalFeedback = (userId: string) => {
  const { t } = useOwnerTranslation();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<InternalCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('internal_feedback')
        .select('id, customer_name, customer_email, feedback_text, rating, is_addressed, case_status, qr_code_id, responsible_name, resolution_note, resolution_outcome, acknowledged_at, resolved_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const qrIds = [...new Set((data || []).map((item) => item.qr_code_id).filter(Boolean))] as string[];
      const qrNames = new Map<string, string>();

      if (qrIds.length) {
        const { data: qrs, error: qrError } = await supabase
          .from('qr_codes')
          .select('id, name')
          .in('id', qrIds);
        if (qrError) throw qrError;
        (qrs || []).forEach((qr) => qrNames.set(qr.id, qr.name));
      }

      setCases((data || []).map((item) => ({
        ...item,
        case_status: (item.case_status || (item.is_addressed ? 'resolved' : 'new')) as InternalCase['case_status'],
        resolution_outcome: item.resolution_outcome as InternalCase['resolution_outcome'],
        qr_name: item.qr_code_id ? qrNames.get(item.qr_code_id) || null : null,
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar os casos.';
      console.error('Error loading internal feedback:', message);
      setError(t('reviews.cases.loadError'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  const updateCase = useCallback(async (id: string, updates: CaseUpdate) => {
    setResolvingId(id);
    try {
      const now = new Date().toISOString();
      const next = {
        ...updates,
        ...(updates.case_status
          ? { is_addressed: updates.case_status === 'resolved' }
          : {}),
        updated_at: now,
      };

      const { error: updateError } = await supabase
        .from('internal_feedback')
        .update(next)
        .eq('id', id);

      if (updateError) throw updateError;

      setCases(prev => prev.map(c => (
        c.id === id
          ? {
              ...c,
              ...updates,
              ...(updates.case_status
                ? { is_addressed: updates.case_status === 'resolved' }
                : {}),
            }
          : c
      )));
      toast.success(t('reviews.cases.savedToast'));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar o caso.';
      console.error('Error updating internal feedback:', message);
      toast.error(t('reviews.cases.updateError'));
      return false;
    } finally {
      setResolvingId(null);
    }
  }, [t]);

  const startCase = useCallback(async (id: string) => {
    return updateCase(id, {
      case_status: 'in_progress',
      acknowledged_at: new Date().toISOString(),
      resolved_at: null,
    });
  }, [updateCase]);

  const reopenCase = useCallback(async (id: string) => {
    return updateCase(id, {
      case_status: 'in_progress',
      resolved_at: null,
    });
  }, [updateCase]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return { loading, cases, error, resolvingId, updateCase, startCase, reopenCase, refresh: fetchCases };
};
