import { supabase } from '@/integrations/supabase/client';

export type ReviewFunnelEvent = 'qr_open' | 'public_click' | 'private_feedback';
export type PublicReviewPlatform = 'google' | 'tripadvisor';
export type ReviewPlatform = PublicReviewPlatform;

interface TrackReviewEventInput {
  eventKey?: string;
  eventType: ReviewFunnelEvent;
  platform?: PublicReviewPlatform;
  qrCodeId: string;
  userId: string;
}

const randomEventKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getQrOpenEventKey = (qrCodeId: string) => {
  const storageKey = `appreview:qr-open:${qrCodeId}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const created = randomEventKey();
  window.sessionStorage.setItem(storageKey, created);
  return created;
};

/**
 * Best-effort analytics. Tracking must never delay or block a public review.
 * The database trigger derives the owner from the QR code instead of trusting
 * the public client.
 */
export const trackReviewEvent = async ({
  eventKey = randomEventKey(),
  eventType,
  platform,
  qrCodeId,
  userId,
}: TrackReviewEventInput) => {
  const { error } = await supabase.from('review_funnel_events').insert({
    event_key: eventKey,
    event_type: eventType,
    platform: platform || null,
    qr_code_id: qrCodeId,
    user_id: userId,
  });

  if (error && error.code !== '23505') {
    console.error('Error tracking review funnel event:', error.message);
  }
};
