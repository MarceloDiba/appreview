**Comparison target**

- Source visual truth: `/var/folders/jy/f70jwlvs5pv08dc69m_yfpr40000gn/T/TemporaryItems/NSIRD_screencaptureui_2EIoQZ/Captura de Tela 2026-08-18 às 11.19.33.png`, `.../Captura de Tela 2026-08-18 às 11.20.05.png`, `.../Captura de Tela 2026-08-18 às 11.20.50.png`, and `.../Captura de Tela 2026-08-18 às 11.22.05.png`.
- Implementation route: `http://127.0.0.1:4173/dashboard`.
- Implementation capture: `/private/tmp/binno-approved-dashboard.png`.
- Intended desktop viewport: 1728 × 1050 CSS px. The local browser reported a 1571 × 954 CSS viewport with device scale factor 1.1. Its generated raster capture was reduced/corrupted to a narrow strip, so it cannot be normalized against the reference images.
- State checked: authenticated Mania dashboard, first observed review selected; queue advance, edit toggle and full WhatsApp settings were exercised.

**Findings**

- [P1] Final pixel-level comparison is not yet valid.
  Location: local browser capture surface.
  Evidence: the DOM confirms the expected desktop structure and controls, but the rendered PNG does not preserve the reported viewport width.
  Impact: spacing, typography, card proportion and responsive density cannot be judged faithfully against the approved references.
  Fix: open `/dashboard` in a desktop viewport that returns an unscaled raster capture, then compare the queue, volume, rating rows and sidebar as one normalized image.

- [P2] The current browser-local Apify reading predates public reviewer-name,
  deep-link and historical-aggregate support.
  Location: response queue, volume, rating trend and weekly-change cards.
  Evidence: the visible reading has review text/dates but no public reviewer name, individual URL or 12-week aggregate.
  Impact: the approved layout is present, but those fields correctly remain neutral until a new allowed collection runs.
  Fix: publish the updated Edge Function and perform one new manual collection after the existing 24-hour limit.

**Implementation checklist**

1. Re-run the local visual comparison at a valid desktop capture size.
2. Deploy the approved Edge Function revision only with explicit authorization.
3. Run one permitted Apify collection and validate a public name, direct Google URL and aggregate trend cards.

**Follow-up polish**

- Recheck empty-data card height after the first aggregate reading; no fallback value should be added merely to mimic the reference.

final result: blocked
