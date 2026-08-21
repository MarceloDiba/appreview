import { supabase } from '@/integrations/supabase/client';

export type PublicQrBusiness = {
  qrCodeId: string;
  qrName: string;
  userId: string;
  businessName: string;
  googleReviewUrl: string;
  tripAdvisorUrl: string;
};

/** The only anonymous lookup used by public QR routes. */
export const loadPublicQrBusiness = async (identifier: string): Promise<PublicQrBusiness | null> => {
  const { data, error } = await supabase.rpc('get_public_qr_business', {
    p_identifier: identifier,
  });

  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  return {
    qrCodeId: row.qr_code_id,
    qrName: row.qr_name,
    userId: row.user_id,
    businessName: row.business_name,
    googleReviewUrl: row.google_review_url || '',
    tripAdvisorUrl: row.tripadvisor_review_url || '',
  };
};
