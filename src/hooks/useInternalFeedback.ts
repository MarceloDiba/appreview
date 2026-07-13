import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InternalCase {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  feedback_text: string | null;
  rating: number;
  is_addressed: boolean | null;
  created_at: string | null;
}

export const useInternalFeedback = (userId: string) => {
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
        .select('id, customer_name, customer_email, feedback_text, rating, is_addressed, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCases(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar os casos.';
      console.error('Error loading internal feedback:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const resolveCase = useCallback(async (id: string, addressed: boolean) => {
    setResolvingId(id);
    try {
      const { error: updateError } = await supabase
        .from('internal_feedback')
        .update({ is_addressed: addressed })
        .eq('id', id);

      if (updateError) throw updateError;

      setCases(prev => prev.map(c => (c.id === id ? { ...c, is_addressed: addressed } : c)));
      toast.success(addressed ? 'Caso marcado como resolvido!' : 'Caso reaberto.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar o caso.';
      console.error('Error updating internal feedback:', message);
      toast.error(message);
    } finally {
      setResolvingId(null);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return { loading, cases, error, resolvingId, resolveCase, refresh: fetchCases };
};
