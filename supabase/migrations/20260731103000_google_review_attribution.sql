-- Preserve the author and source links required when displaying reviews
-- returned by Places API (New). Both fields are nullable so the migration is
-- backwards-compatible with cache rows created by the legacy endpoint.

alter table public.cached_reviews
  add column if not exists author_uri text,
  add column if not exists google_maps_uri text;
