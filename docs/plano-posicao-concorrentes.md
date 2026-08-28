# Sua posição diante dos concorrentes — plano de implementação

> **Para quem executa:** use `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam
> caixas (`- [ ]`) para acompanhamento.

**Objetivo:** mostrar ao dono, já no cadastro, onde o negócio dele está em
relação aos vizinhos da mesma categoria e quanto falta para passar quem lidera.

**Arquitetura:** duas Edge Functions autenticadas consultam a Places API nova,
um módulo puro em `supabase/functions/_shared/` faz toda a matemática e é
testado por vitest, duas tabelas guardam apenas números calculados por nós, e o
painel ganha um cartão aditivo na coluna lateral.

**Stack:** Vite + React + TypeScript, shadcn/ui, Supabase (Postgres + Edge
Functions em Deno), react-i18next, vitest.

**Spec:** [docs/spec-posicao-concorrentes.md](spec-posicao-concorrentes.md) —
leia antes de começar. O plano argumenta a partir dela.

## Restrições globais

Valem para todas as tarefas.

- Em nenhum lugar da interface pode aparecer "sua posição no Google". O rótulo
  obrigatório é indicador calculado a partir da Places API.
- O módulo é **aditivo**: não desloca, esconde nem substitui fila, volume,
  notas, QR, temas, reputação, WhatsApp, boas práticas, completude, Radar, Plano
  de hoje ou Resultado observado.
- Nenhum field mask pode conter `reviews` ou `photos`. Isso reclassifica a
  chamada para a faixa mais cara da tabela do Google.
- O `place_id` é sempre derivado no servidor, a partir de `platform_links` do
  usuário autenticado. Nunca aceitar `place_id` vindo do navegador.
- Não persistir nome, nota nem volume de concorrente identificável. Exceção
  única: `leader_rating` e `leader_review_count`, sem nome e sem `place_id`.
- Corte de volume da amostra elegível: 10 avaliações. Amostra elegível mínima: 5.
- Cooldown: 7 dias no benchmark, 30 dias na grelha. Teto de 800 chamadas
  Enterprise por mês, com corte automático.
- Primeira leitura não projeta meses. Ritmo exige duas leituras com pelo menos
  21 dias entre elas.
- Toda chave de texto entra nos três catálogos: `pt-BR.json`, `pt-PT.json`,
  `en.json`.
- `npm run verify` tem de passar antes de qualquer commit ser considerado pronto.
- **Não aplicar migration no Supabase e não fazer deploy de função.** Isso mexe
  em produção e depende de autorização do Marcelo. O executor entrega o arquivo
  versionado e para.

---

### Tarefa 1: Base de testes e módulo de cálculo

Traz o vitest para o projeto e escreve toda a matemática do recurso. É a única
tarefa com lógica de negócio pura, e é onde os erros silenciosos moram.

**Arquivos:**
- Criar: `vitest.config.ts`
- Criar: `supabase/functions/_shared/neighborhood.ts`
- Criar: `supabase/functions/_shared/neighborhood.test.ts`
- Modificar: `package.json` (devDependency `vitest`, script `test`, script `verify`)

**Interfaces:**
- Produz: `buildPortrait(input: NeighborhoodInput): NeighborhoodPortrait`,
  `monthlyVelocity(current, previous): number | null`,
  `monthsToLeader(reviewsBehind, velocity): number | null`, e os tipos
  `NeighborhoodPlace`, `NeighborhoodInput`, `NeighborhoodPortrait`.
- Consome: nada.

O arquivo `neighborhood.ts` **não pode usar nenhuma API do Deno** (`Deno.env`,
`serve`, fetch de rede). Ele é importado tanto pela Edge Function quanto pelo
vitest, que roda em Node.

- [ ] **Passo 1: Instalar o vitest**

```bash
npm install -D vitest@^2.1.0
```

- [ ] **Passo 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/functions/_shared/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Passo 3: Ligar o teste ao contrato de verificação**

Em `package.json`, adicionar o script `test` e incluí-lo no `verify`, antes do
`build`:

```json
"test": "vitest run",
"verify": "tsc --noEmit -p tsconfig.app.json && npm run check:i18n-owner && npm run check:product-contract && npm run check:public-qr-security && npm test && npm run build"
```

- [ ] **Passo 4: Escrever os testes que falham**

Criar `supabase/functions/_shared/neighborhood.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPortrait, monthlyVelocity, monthsToLeader } from './neighborhood';

const place = (placeId: string, rating: number | null, reviewCount: number | null) => ({
  placeId,
  displayName: placeId,
  rating,
  reviewCount,
});

const sampleOf = (count: number) =>
  Array.from({ length: count }, (_, index) => place(`p${index}`, 4.0, 50 + index));

describe('buildPortrait', () => {
  it('reporta amostra insuficiente com menos de 5 elegíveis', () => {
    const portrait = buildPortrait({ self: place('self', 4.6, 312), sample: sampleOf(4) });
    expect(portrait.status).toBe('insufficient-sample');
    expect(portrait.rank).toBeNull();
    expect(portrait.medianRating).toBeNull();
    expect(portrait.leaderRating).toBeNull();
  });

  it('ignora quem tem menos de 10 avaliações ao formar a amostra elegível', () => {
    const portrait = buildPortrait({
      self: place('self', 4.6, 312),
      sample: [...sampleOf(5), place('novato', 5.0, 2)],
    });
    expect(portrait.sampleSize).toBe(6);
    expect(portrait.eligibleSampleSize).toBe(5);
    expect(portrait.leaderRating).toBe(4.0);
  });

  it('coloca o próprio negócio na ordenação mesmo abaixo do corte', () => {
    const portrait = buildPortrait({ self: place('self', 5.0, 3), sample: sampleOf(5) });
    expect(portrait.status).toBe('ok');
    expect(portrait.rank).toBe(1);
  });

  it('ordena por nota, desempata por volume e depois por placeId', () => {
    const portrait = buildPortrait({
      self: place('self', 4.5, 100),
      sample: [
        place('b', 4.5, 100),
        place('a', 4.5, 100),
        place('c', 4.5, 200),
        place('d', 4.2, 999),
        place('e', 4.1, 999),
      ],
    });
    // c lidera (mesmo 4,5 mas 200); depois 'a', 'b' e 'self' empatados em 4,5/100,
    // resolvidos por placeId: a, b, self.
    expect(portrait.rank).toBe(4);
    expect(portrait.leaderReviewCount).toBe(200);
  });

  it('calcula a distância de avaliações até o líder', () => {
    const portrait = buildPortrait({
      self: place('self', 4.6, 312),
      sample: [place('l', 4.7, 480), ...sampleOf(4)],
    });
    expect(portrait.reviewsBehindLeader).toBe(168);
  });

  it('não mostra distância quando o próprio negócio lidera', () => {
    const portrait = buildPortrait({ self: place('self', 4.9, 900), sample: sampleOf(5) });
    expect(portrait.rank).toBe(1);
    expect(portrait.reviewsBehindLeader).toBeNull();
  });

  it('descarta da amostra elegível quem não tem nota', () => {
    const portrait = buildPortrait({
      self: place('self', 4.6, 312),
      sample: [...sampleOf(5), place('sem-nota', null, 400)],
    });
    expect(portrait.eligibleSampleSize).toBe(5);
  });

  it('usa a média dos dois centrais na mediana de amostra par', () => {
    const portrait = buildPortrait({
      self: place('self', 4.6, 312),
      sample: [
        place('a', 4.0, 10),
        place('b', 4.2, 20),
        place('c', 4.4, 30),
        place('d', 4.6, 40),
        place('e', 4.8, 50),
        place('f', 5.0, 60),
      ],
    });
    expect(portrait.medianRating).toBeCloseTo(4.5, 5);
    expect(portrait.medianReviewCount).toBe(35);
  });
});

describe('monthlyVelocity', () => {
  it('devolve null com menos de 21 dias entre leituras', () => {
    const velocity = monthlyVelocity(
      { capturedAt: '2026-08-28T00:00:00Z', reviewCount: 320 },
      { capturedAt: '2026-08-15T00:00:00Z', reviewCount: 312 },
    );
    expect(velocity).toBeNull();
  });

  it('projeta o ritmo para 30 dias', () => {
    const velocity = monthlyVelocity(
      { capturedAt: '2026-08-28T00:00:00Z', reviewCount: 342 },
      { capturedAt: '2026-07-29T00:00:00Z', reviewCount: 312 },
    );
    expect(velocity).toBeCloseTo(30, 5);
  });

  it('devolve ritmo negativo quando o volume cai', () => {
    const velocity = monthlyVelocity(
      { capturedAt: '2026-08-28T00:00:00Z', reviewCount: 300 },
      { capturedAt: '2026-07-29T00:00:00Z', reviewCount: 312 },
    );
    expect(velocity).toBeLessThan(0);
  });
});

describe('monthsToLeader', () => {
  it('arredonda para cima', () => {
    expect(monthsToLeader(168, 20)).toBe(9);
  });

  it('não projeta com ritmo zero ou negativo', () => {
    expect(monthsToLeader(168, 0)).toBeNull();
    expect(monthsToLeader(168, -3)).toBeNull();
  });

  it('não projeta sem distância', () => {
    expect(monthsToLeader(null, 20)).toBeNull();
  });
});
```

- [ ] **Passo 5: Rodar e confirmar que falha**

```bash
npx vitest run supabase/functions/_shared/neighborhood.test.ts
```

Esperado: falha ao resolver `./neighborhood`.

- [ ] **Passo 6: Escrever a implementação**

Criar `supabase/functions/_shared/neighborhood.ts`:

```ts
/**
 * Matemática do diagnóstico de vizinhança.
 *
 * Sem rede, sem Deno, sem Supabase: este arquivo é importado pela Edge Function
 * e pelo vitest, que roda em Node. As definições aqui são normativas e estão na
 * secção 5 de docs/spec-posicao-concorrentes.md.
 */

export type NeighborhoodPlace = {
  placeId: string;
  displayName: string;
  rating: number | null;
  reviewCount: number | null;
};

export type NeighborhoodInput = {
  self: NeighborhoodPlace;
  /** Amostra devolvida pela busca por proximidade, já sem o próprio negócio. */
  sample: NeighborhoodPlace[];
  minReviewCount?: number;
  minEligibleSample?: number;
};

export type NeighborhoodPortrait = {
  status: 'ok' | 'insufficient-sample';
  sampleSize: number;
  eligibleSampleSize: number;
  rank: number | null;
  leaderRating: number | null;
  leaderReviewCount: number | null;
  medianRating: number | null;
  medianReviewCount: number | null;
  reviewsBehindLeader: number | null;
};

export const DEFAULT_MIN_REVIEW_COUNT = 10;
export const DEFAULT_MIN_ELIGIBLE_SAMPLE = 5;

type Ranked = { placeId: string; rating: number; reviewCount: number };

const isRanked = (place: NeighborhoodPlace): place is NeighborhoodPlace & Ranked =>
  typeof place.rating === 'number' && typeof place.reviewCount === 'number';

/** Nota desc, volume desc, placeId asc. A última chave mantém a ordem estável. */
const compare = (a: Ranked, b: Ranked) =>
  b.rating - a.rating || b.reviewCount - a.reviewCount || a.placeId.localeCompare(b.placeId);

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const buildPortrait = (input: NeighborhoodInput): NeighborhoodPortrait => {
  const minReviewCount = input.minReviewCount ?? DEFAULT_MIN_REVIEW_COUNT;
  const minEligibleSample = input.minEligibleSample ?? DEFAULT_MIN_ELIGIBLE_SAMPLE;

  const eligible = input.sample.filter(
    (place): place is NeighborhoodPlace & Ranked =>
      isRanked(place) && place.reviewCount >= minReviewCount,
  );

  const empty: NeighborhoodPortrait = {
    status: 'insufficient-sample',
    sampleSize: input.sample.length,
    eligibleSampleSize: eligible.length,
    rank: null,
    leaderRating: null,
    leaderReviewCount: null,
    medianRating: null,
    medianReviewCount: null,
    reviewsBehindLeader: null,
  };

  if (eligible.length < minEligibleSample || !isRanked(input.self)) return empty;

  const self = input.self as NeighborhoodPlace & Ranked;
  const leader = [...eligible].sort(compare)[0];
  const ordered = [...eligible, self].sort(compare);
  const rank = ordered.findIndex((place) => place.placeId === self.placeId) + 1;
  const behind = leader.reviewCount - self.reviewCount;

  return {
    status: 'ok',
    sampleSize: input.sample.length,
    eligibleSampleSize: eligible.length,
    rank,
    leaderRating: leader.rating,
    leaderReviewCount: leader.reviewCount,
    medianRating: median(eligible.map((place) => place.rating)),
    medianReviewCount: median(eligible.map((place) => place.reviewCount)),
    reviewsBehindLeader: rank === 1 || behind <= 0 ? null : behind,
  };
};

export const MIN_DAYS_FOR_VELOCITY = 21;

export const monthlyVelocity = (
  current: { capturedAt: string; reviewCount: number },
  previous: { capturedAt: string; reviewCount: number },
): number | null => {
  const days =
    (new Date(current.capturedAt).getTime() - new Date(previous.capturedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  if (!Number.isFinite(days) || days < MIN_DAYS_FOR_VELOCITY) return null;
  return ((current.reviewCount - previous.reviewCount) / days) * 30;
};

export const monthsToLeader = (
  reviewsBehind: number | null,
  velocity: number | null,
): number | null => {
  if (reviewsBehind === null || velocity === null || velocity <= 0) return null;
  return Math.ceil(reviewsBehind / velocity);
};
```

- [ ] **Passo 7: Rodar e confirmar que passa**

```bash
npx vitest run supabase/functions/_shared/neighborhood.test.ts
```

Esperado: 15 testes passando.

- [ ] **Passo 8: Rodar a verificação completa**

```bash
npm run verify
```

- [ ] **Passo 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts supabase/functions/_shared/neighborhood.ts supabase/functions/_shared/neighborhood.test.ts
git commit -m "feat(vizinhança): matemática do diagnóstico com testes"
```

---

### Tarefa 2: Migration das tabelas

**Arquivos:**
- Criar: `supabase/migrations/20260828120000_neighborhood_diagnostics.sql`

**Interfaces:**
- Produz: tabelas `public.neighborhood_snapshots` e
  `public.neighborhood_grid_runs`, com RLS de leitura só do dono.
- Consome: nada.

Segue o padrão de `20260821100000_google_business_reputation_snapshots.sql`:
RLS ligada, `revoke` de `anon` e `authenticated`, depois `grant select` só a
`authenticated`. Escrita é exclusiva do `service_role`.

- [ ] **Passo 1: Escrever a migration**

```sql
-- Diagnóstico de vizinhança. Guarda apenas número calculado pelo Binno.
-- Nome, nota e volume de concorrente identificável não entram aqui; a única
-- exceção é o líder, sem nome e sem place_id, para permitir comparar se a
-- distância aumentou ou diminuiu entre duas leituras.

create table if not exists public.neighborhood_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  captured_at timestamptz not null default now(),
  radius_m integer not null check (radius_m > 0),
  category text,
  sample_size integer not null check (sample_size >= 0),
  eligible_sample_size integer not null check (eligible_sample_size >= 0),
  our_rank integer check (our_rank >= 1),
  our_rating numeric(2,1) check (our_rating between 0 and 5),
  our_review_count integer check (our_review_count >= 0),
  leader_rating numeric(2,1) check (leader_rating between 0 and 5),
  leader_review_count integer check (leader_review_count >= 0),
  median_rating numeric(3,2) check (median_rating between 0 and 5),
  median_review_count numeric(10,1) check (median_review_count >= 0),
  calls_made integer not null default 0 check (calls_made >= 0),
  source text not null default 'places-api' check (source = 'places-api')
);

create index if not exists neighborhood_snapshots_user_captured_idx
  on public.neighborhood_snapshots(user_id, captured_at desc);

create table if not exists public.neighborhood_grid_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  captured_at timestamptz not null default now(),
  keyword text not null,
  grid_size integer not null check (grid_size > 0),
  spacing_m integer not null check (spacing_m > 0),
  points jsonb not null default '[]'::jsonb,
  calls_made integer not null default 0 check (calls_made >= 0)
);

create index if not exists neighborhood_grid_runs_user_captured_idx
  on public.neighborhood_grid_runs(user_id, captured_at desc);

alter table public.neighborhood_snapshots enable row level security;
alter table public.neighborhood_grid_runs enable row level security;

drop policy if exists "neighborhood_snapshots_owner_select" on public.neighborhood_snapshots;
create policy "neighborhood_snapshots_owner_select"
on public.neighborhood_snapshots for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "neighborhood_grid_runs_owner_select" on public.neighborhood_grid_runs;
create policy "neighborhood_grid_runs_owner_select"
on public.neighborhood_grid_runs for select to authenticated
using (auth.uid() = user_id);

revoke all on table public.neighborhood_snapshots from anon, authenticated;
revoke all on table public.neighborhood_grid_runs from anon, authenticated;
grant select on table public.neighborhood_snapshots to authenticated;
grant select on table public.neighborhood_grid_runs to authenticated;
```

- [ ] **Passo 2: Conferir a leitura, sem aplicar**

Confirme item a item, lendo o arquivo: RLS ligada nas duas tabelas; política
apenas de `select`; `revoke` antes do `grant`; nenhuma coluna com nome ou
`place_id` de concorrente. **Não rode `supabase db push` nem aplique no
projeto remoto.** A aplicação em produção depende de autorização do Marcelo.

- [ ] **Passo 3: Commit**

```bash
git add supabase/migrations/20260828120000_neighborhood_diagnostics.sql
git commit -m "feat(vizinhança): tabelas do diagnóstico com RLS por dono"
```

---

### Tarefa 3: Edge Function do benchmark

**Arquivos:**
- Criar: `supabase/functions/diagnose-neighborhood/index.ts`
- Referência de padrão: `supabase/functions/fetch-google-reviews/index.ts:1-40` (cabeçalho, CORS, `jsonResponse`) e `:124-175` (autenticação e derivação do `place_id`)

**Interfaces:**
- Consome: `buildPortrait` de `../_shared/neighborhood.ts`.
- Produz: endpoint `POST /diagnose-neighborhood`, sem corpo obrigatório, que
  devolve `{ portrait, competitors, capturedAt }`, onde `competitors` é a lista
  do momento e **não é persistida**.

- [ ] **Passo 1: Escrever a função**

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPortrait, type NeighborhoodPlace } from "../_shared/neighborhood.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';

const radiusMeters = Number(Deno.env.get('NEIGHBORHOOD_RADIUS_M') || '1000');
const cooldownDays = Number(Deno.env.get('NEIGHBORHOOD_COOLDOWN_DAYS') || '7');
const monthlyCallCap = Number(Deno.env.get('NEIGHBORHOOD_MONTHLY_CALL_CAP') || '800');

// Sem `reviews` e sem `photos`: esses campos reclassificam a chamada para a
// faixa mais cara da tabela do Google.
const DETAILS_FIELD_MASK = 'id,displayName,location,primaryType,rating,userRatingCount';
const NEARBY_FIELD_MASK =
  'places.id,places.displayName,places.rating,places.userRatingCount';

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return jsonResponse({ error: 'Authentication required' }, 401);
    if (!googleApiKey) return jsonResponse({ code: 'NOT_CONFIGURED', error: 'Places key missing' }, 503);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Invalid session' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // O place_id vem sempre do link que o próprio dono configurou.
    const { data: link } = await supabase
      .from('platform_links')
      .select('place_id')
      .eq('user_id', user.id)
      .eq('platform', 'google reviews')
      .maybeSingle();

    const placeId = typeof link?.place_id === 'string' ? link.place_id.trim() : '';
    if (!placeId) return jsonResponse({ code: 'NO_PLACE_ID', error: 'Google link is not configured' }, 403);

    // Freio 1: cooldown por negócio.
    const { data: latest } = await admin
      .from('neighborhood_snapshots')
      .select('captured_at')
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.captured_at) {
      const days = (Date.now() - new Date(latest.captured_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days < cooldownDays) {
        const availableAt = new Date(new Date(latest.captured_at).getTime() + cooldownDays * 86400000);
        return jsonResponse({ code: 'COOLDOWN', availableAt: availableAt.toISOString() }, 429);
      }
    }

    // Freio 2: teto mensal global de chamadas pagas.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: monthRows } = await admin
      .from('neighborhood_snapshots')
      .select('calls_made')
      .gte('captured_at', monthStart.toISOString());
    const usedCalls = (monthRows || []).reduce((total, row) => total + (row.calls_made || 0), 0);
    if (usedCalls + 2 > monthlyCallCap) {
      return jsonResponse({ code: 'MONTHLY_CAP', error: 'Monthly call cap reached' }, 429);
    }

    // Chamada 1 — o próprio negócio.
    const detailsResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      { headers: { 'X-Goog-Api-Key': googleApiKey, 'X-Goog-FieldMask': DETAILS_FIELD_MASK } },
    );
    if (!detailsResponse.ok) return jsonResponse({ code: 'GOOGLE_PLACES_ERROR' }, 502);
    const details = await detailsResponse.json();
    const location = details?.location;
    const category = typeof details?.primaryType === 'string' ? details.primaryType : null;
    if (!location?.latitude || !location?.longitude || !category) {
      return jsonResponse({ code: 'NO_CATEGORY', error: 'Place has no usable category' }, 422);
    }

    // Chamada 2 — a vizinhança, mesma categoria.
    const nearbyResponse = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': NEARBY_FIELD_MASK,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        includedPrimaryTypes: [category],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: location.latitude, longitude: location.longitude },
            radius: radiusMeters,
          },
        },
      }),
    });
    if (!nearbyResponse.ok) return jsonResponse({ code: 'GOOGLE_PLACES_ERROR' }, 502);
    const nearby = await nearbyResponse.json();

    const toPlace = (raw: Record<string, any>): NeighborhoodPlace => ({
      placeId: String(raw?.id || ''),
      displayName: String(raw?.displayName?.text || ''),
      rating: typeof raw?.rating === 'number' ? raw.rating : null,
      reviewCount: typeof raw?.userRatingCount === 'number' ? raw.userRatingCount : null,
    });

    const self = toPlace({ ...details, id: placeId });
    const sample = (nearby?.places || []).map(toPlace).filter((place) => place.placeId !== placeId);
    const portrait = buildPortrait({ self, sample });

    const capturedAt = new Date().toISOString();
    await admin.from('neighborhood_snapshots').insert({
      user_id: user.id,
      place_id: placeId,
      captured_at: capturedAt,
      radius_m: radiusMeters,
      category,
      sample_size: portrait.sampleSize,
      eligible_sample_size: portrait.eligibleSampleSize,
      our_rank: portrait.rank,
      our_rating: self.rating,
      our_review_count: self.reviewCount,
      leader_rating: portrait.leaderRating,
      leader_review_count: portrait.leaderReviewCount,
      median_rating: portrait.medianRating,
      median_review_count: portrait.medianReviewCount,
      calls_made: 2,
    });

    // A lista com nomes vai para a tela e morre ali; não é persistida.
    return jsonResponse({ portrait, competitors: sample, capturedAt });
  } catch (error) {
    console.error('diagnose-neighborhood failed:', error);
    return jsonResponse({ error: 'Unexpected error' }, 500);
  }
});
```

- [ ] **Passo 2: Conferir os invariantes, lendo o arquivo**

Confirme: nenhum `place_id` vem do corpo da requisição; os dois field masks não
contêm `reviews` nem `photos`; existe cooldown e teto; o `insert` não grava nome
de concorrente; a resposta devolve `competitors` mas nada disso vai para o banco.

- [ ] **Passo 3: Rodar a verificação**

```bash
npm run verify
```

- [ ] **Passo 4: Commit**

```bash
git add supabase/functions/diagnose-neighborhood/index.ts
git commit -m "feat(vizinhança): função do benchmark com freio de custo"
```

---

### Tarefa 4: Cartão no painel

**Arquivos:**
- Criar: `src/hooks/useNeighborhoodPosition.ts`
- Criar: `src/components/dashboard/NeighborhoodPositionCard.tsx`
- Modificar: `src/components/dashboard/ApprovedCockpitDashboard.tsx` (inserir o cartão na `<aside>`, logo após `<ReputationCard snapshot={snapshot} />`)
- Modificar: `src/i18n/owner/locales/pt-BR.json`, `pt-PT.json`, `en.json`

**Interfaces:**
- Consome: tabela `neighborhood_snapshots` (Tarefa 2), função
  `diagnose-neighborhood` (Tarefa 3).
- Produz: `useNeighborhoodPosition(userId?: string)` devolvendo
  `{ snapshot, loading, error, refresh, refreshing }`, e o componente
  `<NeighborhoodPositionCard userId={...} />`.

O cartão **não dispara leitura ao abrir a página**. Ele lê o último retrato
gravado. Só o botão chama a função.

- [ ] **Passo 1: Escrever o hook**

Criar `src/hooks/useNeighborhoodPosition.ts`, seguindo o padrão de
`src/hooks/useReviewFunnelMetrics.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  monthlyVelocity,
  monthsToLeader,
} from '../../supabase/functions/_shared/neighborhood';

export type NeighborhoodNotice = 'cooldown' | 'cap' | 'no-link' | 'no-category' | null;

export interface NeighborhoodSnapshot {
  capturedAt: string;
  sampleSize: number;
  eligibleSampleSize: number;
  rank: number | null;
  ourRating: number | null;
  ourReviewCount: number | null;
  leaderRating: number | null;
  leaderReviewCount: number | null;
  reviewsBehindLeader: number | null;
  /** Só existe a partir da segunda leitura com 21 dias ou mais de intervalo. */
  monthsToLeader: number | null;
}

const NOTICE_BY_CODE: Record<string, NeighborhoodNotice> = {
  COOLDOWN: 'cooldown',
  MONTHLY_CAP: 'cap',
  NO_PLACE_ID: 'no-link',
  NO_CATEGORY: 'no-category',
};

/**
 * Lê os dois retratos mais recentes: o primeiro alimenta o cartão, e o par
 * permite calcular ritmo e projeção. Abrir o painel nunca dispara chamada paga;
 * `refresh` é o único caminho para uma leitura nova.
 */
export const useNeighborhoodPosition = (userId?: string) => {
  const [snapshot, setSnapshot] = useState<NeighborhoodSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<NeighborhoodNotice>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('neighborhood_snapshots')
      .select('captured_at, sample_size, eligible_sample_size, our_rank, our_rating, our_review_count, leader_rating, leader_review_count')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })
      .limit(2);

    if (queryError) {
      setError(queryError.message);
      setSnapshot(null);
      setLoading(false);
      return;
    }

    const [latest, previous] = data || [];
    if (!latest) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      return;
    }

    const behind =
      latest.leader_review_count !== null && latest.our_review_count !== null
        ? latest.leader_review_count - latest.our_review_count
        : null;
    const reviewsBehindLeader = behind !== null && behind > 0 ? behind : null;

    const velocity =
      previous && latest.our_review_count !== null && previous.our_review_count !== null
        ? monthlyVelocity(
            { capturedAt: latest.captured_at, reviewCount: latest.our_review_count },
            { capturedAt: previous.captured_at, reviewCount: previous.our_review_count },
          )
        : null;

    setSnapshot({
      capturedAt: latest.captured_at,
      sampleSize: latest.sample_size,
      eligibleSampleSize: latest.eligible_sample_size,
      rank: latest.our_rank,
      ourRating: latest.our_rating,
      ourReviewCount: latest.our_review_count,
      leaderRating: latest.leader_rating,
      leaderReviewCount: latest.leader_review_count,
      reviewsBehindLeader,
      monthsToLeader: monthsToLeader(reviewsBehindLeader, velocity),
    });
    setError(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setNotice(null);
    const { data, error: invokeError } = await supabase.functions.invoke('diagnose-neighborhood');
    setRefreshing(false);

    if (invokeError) {
      // A função responde 429 com `code` nas recusas previstas. Elas não são
      // erro: são estado honesto e têm mensagem própria no cartão.
      const code = (invokeError as { context?: { code?: string } })?.context?.code
        || (data as { code?: string })?.code
        || '';
      const mapped = NOTICE_BY_CODE[code] || null;
      if (mapped) setNotice(mapped);
      else setError(invokeError.message);
      return;
    }

    await load();
  }, [load]);

  return { snapshot, loading, refreshing, notice, error, refresh };
};
```

O import de `../../supabase/functions/_shared/neighborhood` é proposital: a
regra dos 21 dias e a projeção existem em um lugar só, testado por vitest. Por
isso aquele arquivo não pode ganhar nenhuma API do Deno — a Tarefa 7 coloca uma
guarda para isso.

- [ ] **Passo 2: Adicionar as chaves aos três catálogos**

As mesmas chaves nos três arquivos. Em `pt-BR.json`:

```json
"neighborhood": {
  "title": "Sua posição diante dos concorrentes",
  "indicatorNote": "Indicador calculado pelo Binno a partir da Places API. Não é a posição oficial no Google Maps.",
  "rank": "{{rank}}º de {{total}} por perto",
  "yours": "Você: {{rating}} com {{count}} avaliações",
  "leader": "Quem lidera: {{rating}} com {{count}} avaliações",
  "behind": "Faltam {{count}} avaliações para igualar quem lidera",
  "ahead": "Ninguém por perto está à sua frente",
  "insufficient": "A vizinhança é pequena demais para comparar.",
  "empty": "Ainda não fizemos essa leitura.",
  "noLink": "Configure o link do Google para comparar com a vizinhança.",
  "projection": "No ritmo atual, você alcança em {{months}} meses",
  "noProjection": "A projeção aparece na próxima leitura, daqui a algumas semanas.",
  "cooldown": "A próxima leitura fica disponível em alguns dias.",
  "cap": "O limite de leituras deste mês foi atingido.",
  "refresh": "Atualizar leitura",
  "refreshing": "Lendo…",
  "capturedAt": "Leitura de {{date}}"
},
```

Em `pt-PT.json`, o mesmo bloco com "Faltam {{count}} avaliações para igualar
quem lidera" e "A vizinhança é pequena demais para comparar." mantidos, e
`"title": "A sua posição face aos concorrentes"`, `"yours": "Você: {{rating}}
com {{count}} avaliações"` ajustado para `"O seu negócio: {{rating}} com
{{count}} avaliações"`.

Em `en.json`:

```json
"neighborhood": {
  "title": "Where you stand against nearby businesses",
  "indicatorNote": "Indicator calculated by Binno from the Places API. It is not your official Google Maps position.",
  "rank": "{{rank}} of {{total}} nearby",
  "yours": "You: {{rating}} with {{count}} reviews",
  "leader": "Leader: {{rating}} with {{count}} reviews",
  "behind": "{{count}} reviews behind the leader",
  "ahead": "Nobody nearby is ahead of you",
  "insufficient": "Too few comparable businesses nearby.",
  "empty": "We have not taken this reading yet.",
  "noLink": "Add your Google link to compare with nearby businesses.",
  "projection": "At the current pace, you catch up in {{months}} months",
  "noProjection": "The projection appears on the next reading, a few weeks from now.",
  "cooldown": "The next reading becomes available in a few days.",
  "cap": "This month's reading limit has been reached.",
  "refresh": "Refresh reading",
  "refreshing": "Reading…",
  "capturedAt": "Read on {{date}}"
},
```

- [ ] **Passo 3: Escrever o cartão**

Criar `src/components/dashboard/NeighborhoodPositionCard.tsx`. Segue o visual
dos cartões da coluna lateral (`Card` com `border-slate-200 bg-white` e
`CardContent className="p-5"`, como em `ApprovedCockpitDashboard.tsx:227`).

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import { useNeighborhoodPosition } from '@/hooks/useNeighborhoodPosition';

export const NeighborhoodPositionCard = ({ userId }: { userId?: string }) => {
  const { t, i18n } = useOwnerTranslation();
  const { snapshot, loading, refreshing, notice, refresh } = useNeighborhoodPosition(userId);

  const decimal = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const integer = new Intl.NumberFormat(i18n.language);
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  const noticeMessage = () => {
    if (notice === 'cooldown') return t('neighborhood.cooldown');
    if (notice === 'cap') return t('neighborhood.cap');
    if (notice === 'no-link') return t('neighborhood.noLink');
    if (notice === 'no-category') return t('neighborhood.insufficient');
    return null;
  };

  const body = () => {
    if (loading) return <p className="text-sm text-slate-500">—</p>;
    if (!snapshot) return <p className="text-sm text-slate-500">{t('neighborhood.empty')}</p>;
    if (snapshot.rank === null) return <p className="text-sm text-slate-500">{t('neighborhood.insufficient')}</p>;

    return (
      <div className="space-y-2">
        <p className="text-2xl font-medium tracking-tight text-slate-950">
          {t('neighborhood.rank', { rank: snapshot.rank, total: snapshot.eligibleSampleSize + 1 })}
        </p>
        {snapshot.ourRating !== null && snapshot.ourReviewCount !== null && (
          <p className="text-sm text-slate-600">
            {t('neighborhood.yours', {
              rating: decimal.format(snapshot.ourRating),
              count: integer.format(snapshot.ourReviewCount),
            })}
          </p>
        )}
        {snapshot.leaderRating !== null && snapshot.leaderReviewCount !== null && (
          <p className="text-sm text-slate-600">
            {t('neighborhood.leader', {
              rating: decimal.format(snapshot.leaderRating),
              count: integer.format(snapshot.leaderReviewCount),
            })}
          </p>
        )}
        <p className="text-sm font-medium text-slate-950">
          {snapshot.reviewsBehindLeader === null
            ? t('neighborhood.ahead')
            : t('neighborhood.behind', { count: integer.format(snapshot.reviewsBehindLeader) })}
        </p>
        <p className="text-sm text-slate-600">
          {snapshot.monthsToLeader === null
            ? t('neighborhood.noProjection')
            : t('neighborhood.projection', { months: snapshot.monthsToLeader })}
        </p>
        <p className="text-xs text-slate-500">
          {t('neighborhood.capturedAt', { date: date.format(new Date(snapshot.capturedAt)) })}
        </p>
      </div>
    );
  };

  return (
    <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <h2 className="font-semibold text-slate-950">{t('neighborhood.title')}</h2>
        <div className="mt-4">{body()}</div>
        {noticeMessage() && <p className="mt-3 text-sm text-slate-600">{noticeMessage()}</p>}
        <p className="mt-4 text-xs text-slate-500">{t('neighborhood.indicatorNote')}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? t('neighborhood.refreshing') : t('neighborhood.refresh')}
        </Button>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Passo 4: Inserir na coluna lateral**

Em `src/components/dashboard/ApprovedCockpitDashboard.tsx`, adicionar o import e
inserir o cartão **logo depois** de `<ReputationCard snapshot={snapshot} />`,
dentro da `<aside className="space-y-5">`. Nenhum outro cartão muda de lugar.

```tsx
import { NeighborhoodPositionCard } from '@/components/dashboard/NeighborhoodPositionCard';
```

```tsx
<ReputationCard snapshot={snapshot} />
<NeighborhoodPositionCard userId={demo ? undefined : userId} />
```

- [ ] **Passo 5: Rodar a verificação**

```bash
npm run verify
```

O `check:i18n-owner` falha se alguma chave existir em um catálogo e faltar em
outro. Se falhar, é chave faltando, não erro do script.

- [ ] **Passo 6: Commit**

```bash
git add src/hooks/useNeighborhoodPosition.ts src/components/dashboard/NeighborhoodPositionCard.tsx src/components/dashboard/ApprovedCockpitDashboard.tsx src/i18n/owner/locales
git commit -m "feat(vizinhança): cartão de posição na coluna lateral do painel"
```

---

### Tarefa 5: Diagnóstico no cadastro

**Arquivos:**
- Modificar: `src/pages/Onboarding.tsx` (função `saveLinks`, que hoje grava o link e chama `setStep(2)` por volta da linha 177)
- Modificar: `src/i18n/owner/locales/pt-BR.json`, `pt-PT.json`, `en.json`

**Interfaces:**
- Consome: `diagnose-neighborhood` (Tarefa 3), `NeighborhoodPositionCard` (Tarefa 4).
- Produz: nenhuma interface nova.

O diagnóstico **nunca bloqueia o cadastro**. Falha, demora ou ausência de
categoria não impedem o passo 2.

- [ ] **Passo 1: Disparar a leitura sem bloquear**

Em `saveLinks`, depois do `insert` em `platform_links` ter sucesso e antes de
`setStep(2)`, disparar a função sem esperar o resultado para avançar:

```tsx
// O diagnóstico é um bônus do cadastro: se falhar, o passo 2 segue igual.
void supabase.functions.invoke('diagnose-neighborhood').catch(() => undefined);
setStep(2);
```

- [ ] **Passo 2: Mostrar o resultado no passo 2**

Renderizar `<NeighborhoodPositionCard userId={userId} />` no topo do passo 2,
acima dos campos do negócio, com a chave de título do passo já existente
intacta. O cartão cuida sozinho dos estados de vazio, cooldown e amostra
insuficiente.

- [ ] **Passo 3: Rodar a verificação**

```bash
npm run verify
```

- [ ] **Passo 4: Commit**

```bash
git add src/pages/Onboarding.tsx src/i18n/owner/locales
git commit -m "feat(vizinhança): diagnóstico no cadastro, sem bloquear o fluxo"
```

---

### Tarefa 6: Grelha do mapa

**Arquivos:**
- Modificar: `supabase/functions/_shared/neighborhood.ts` (acrescentar `buildGridPoints`)
- Modificar: `supabase/functions/_shared/neighborhood.test.ts`
- Criar: `supabase/functions/diagnose-map-grid/index.ts`
- Criar: `src/components/dashboard/NeighborhoodGrid.tsx`
- Modificar: `src/components/dashboard/NeighborhoodPositionCard.tsx`
- Modificar: `src/i18n/owner/locales/pt-BR.json`, `pt-PT.json`, `en.json`

**Interfaces:**
- Consome: tabela `neighborhood_grid_runs` (Tarefa 2), `NeighborhoodPositionCard` (Tarefa 4).
- Produz: `buildGridPoints(center, size, spacingMeters): GridPoint[]` no módulo
  compartilhado, e o endpoint `POST /diagnose-map-grid` com corpo opcional
  `{ keyword?: string }`, devolvendo
  `{ points: Array<{ latitude: number; longitude: number; rank: number | null }>, keyword: string, capturedAt: string }`.

- [ ] **Passo 1: Escrever os testes que falham**

Acrescentar ao fim de `supabase/functions/_shared/neighborhood.test.ts`:

```ts
import { buildGridPoints } from './neighborhood';

describe('buildGridPoints', () => {
  const center = { latitude: 38.7223, longitude: -9.1393 };

  it('devolve size × size pontos', () => {
    expect(buildGridPoints(center, 3, 500)).toHaveLength(9);
  });

  it('coloca o centro exatamente no meio da lista', () => {
    const points = buildGridPoints(center, 3, 500);
    expect(points[4].latitude).toBeCloseTo(center.latitude, 10);
    expect(points[4].longitude).toBeCloseTo(center.longitude, 10);
  });

  it('afasta em latitude na proporção de 111320 metros por grau', () => {
    const points = buildGridPoints(center, 3, 500);
    expect(points[1].latitude - center.latitude).toBeCloseTo(500 / 111320, 8);
  });

  it('alarga o passo de longitude conforme a latitude sobe', () => {
    const perto = buildGridPoints({ latitude: 0, longitude: 0 }, 3, 500);
    const longe = buildGridPoints({ latitude: 60, longitude: 0 }, 3, 500);
    const passoPerto = perto[5].longitude - perto[4].longitude;
    const passoLonge = longe[5].longitude - longe[4].longitude;
    expect(passoLonge).toBeGreaterThan(passoPerto * 1.9);
  });

  it('devolve só o centro quando o tamanho é 1', () => {
    expect(buildGridPoints(center, 1, 500)).toEqual([center]);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

```bash
npx vitest run supabase/functions/_shared/neighborhood.test.ts
```

Esperado: falha com `buildGridPoints is not a function`.

- [ ] **Passo 3: Implementar `buildGridPoints`**

Acrescentar ao fim de `supabase/functions/_shared/neighborhood.ts`:

```ts
export type GridCenter = { latitude: number; longitude: number };

/** Metros por grau de latitude. Constante suficiente para uma grelha de bairro. */
const METERS_PER_DEGREE = 111320;

/**
 * Pontos de uma grelha quadrada centrada no negócio, do canto noroeste ao
 * sudeste, linha a linha. O passo de longitude cresce com a latitude porque os
 * meridianos se aproximam à medida que se sobe.
 */
export const buildGridPoints = (
  center: GridCenter,
  size: number,
  spacingMeters: number,
): GridCenter[] => {
  const latitudeStep = spacingMeters / METERS_PER_DEGREE;
  const longitudeStep =
    spacingMeters / (METERS_PER_DEGREE * Math.cos((center.latitude * Math.PI) / 180));
  const half = Math.floor(size / 2);
  const points: GridCenter[] = [];

  for (let row = half; row >= -half; row -= 1) {
    for (let column = -half; column <= half; column += 1) {
      points.push({
        latitude: center.latitude + row * latitudeStep,
        longitude: center.longitude + column * longitudeStep,
      });
    }
  }

  return points;
};
```

- [ ] **Passo 4: Rodar e confirmar que passa**

```bash
npx vitest run supabase/functions/_shared/neighborhood.test.ts
```

- [ ] **Passo 5: Escrever a função da grelha**

Criar `supabase/functions/diagnose-map-grid/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildGridPoints } from "../_shared/neighborhood.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';

const gridSize = Number(Deno.env.get('NEIGHBORHOOD_GRID_SIZE') || '3');
const spacingMeters = Number(Deno.env.get('NEIGHBORHOOD_GRID_SPACING_M') || '500');
const cooldownDays = Number(Deno.env.get('NEIGHBORHOOD_GRID_COOLDOWN_DAYS') || '30');
const monthlyCallCap = Number(Deno.env.get('NEIGHBORHOOD_MONTHLY_CALL_CAP') || '800');

// Sem `reviews` e sem `photos`: esses campos reclassificam a chamada para a
// faixa mais cara da tabela do Google. Aqui basta o id para achar a posição.
const DETAILS_FIELD_MASK = 'id,location,primaryType';
const NEARBY_FIELD_MASK = 'places.id';

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return jsonResponse({ error: 'Authentication required' }, 401);
    if (!googleApiKey) return jsonResponse({ code: 'NOT_CONFIGURED', error: 'Places key missing' }, 503);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Invalid session' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: link } = await supabase
      .from('platform_links')
      .select('place_id')
      .eq('user_id', user.id)
      .eq('platform', 'google reviews')
      .maybeSingle();

    const placeId = typeof link?.place_id === 'string' ? link.place_id.trim() : '';
    if (!placeId) return jsonResponse({ code: 'NO_PLACE_ID', error: 'Google link is not configured' }, 403);

    const { data: latest } = await admin
      .from('neighborhood_grid_runs')
      .select('captured_at')
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.captured_at) {
      const days = (Date.now() - new Date(latest.captured_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days < cooldownDays) {
        const availableAt = new Date(new Date(latest.captured_at).getTime() + cooldownDays * 86400000);
        return jsonResponse({ code: 'COOLDOWN', availableAt: availableAt.toISOString() }, 429);
      }
    }

    const pointCount = gridSize * gridSize;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [{ data: snapshotRows }, { data: gridRows }] = await Promise.all([
      admin.from('neighborhood_snapshots').select('calls_made').gte('captured_at', monthStart.toISOString()),
      admin.from('neighborhood_grid_runs').select('calls_made').gte('captured_at', monthStart.toISOString()),
    ]);
    const usedCalls = [...(snapshotRows || []), ...(gridRows || [])]
      .reduce((total, row) => total + (row.calls_made || 0), 0);
    if (usedCalls + pointCount > monthlyCallCap) {
      return jsonResponse({ code: 'MONTHLY_CAP', error: 'Monthly call cap reached' }, 429);
    }

    const detailsResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      { headers: { 'X-Goog-Api-Key': googleApiKey, 'X-Goog-FieldMask': DETAILS_FIELD_MASK } },
    );
    if (!detailsResponse.ok) return jsonResponse({ code: 'GOOGLE_PLACES_ERROR' }, 502);
    const details = await detailsResponse.json();
    const center = details?.location;
    const category = typeof details?.primaryType === 'string' ? details.primaryType : '';
    if (!center?.latitude || !center?.longitude) {
      return jsonResponse({ code: 'NO_CATEGORY', error: 'Place has no usable location' }, 422);
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }
    const requested = typeof payload?.keyword === 'string' ? payload.keyword.trim() : '';
    const keyword = requested || category;
    if (!keyword) return jsonResponse({ code: 'NO_KEYWORD', error: 'Keyword is required' }, 400);

    const points = [];
    for (const point of buildGridPoints(center, gridSize, spacingMeters)) {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': NEARBY_FIELD_MASK,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includedPrimaryTypes: [keyword],
          maxResultCount: 20,
          locationRestriction: {
            circle: { center: point, radius: spacingMeters },
          },
        }),
      });

      if (!response.ok) {
        points.push({ ...point, rank: null });
        continue;
      }

      const body = await response.json();
      const index = (body?.places || []).findIndex((place: { id?: string }) => place?.id === placeId);
      points.push({ ...point, rank: index >= 0 ? index + 1 : null });
    }

    const capturedAt = new Date().toISOString();
    await admin.from('neighborhood_grid_runs').insert({
      user_id: user.id,
      place_id: placeId,
      captured_at: capturedAt,
      keyword,
      grid_size: gridSize,
      spacing_m: spacingMeters,
      points,
      calls_made: pointCount,
    });

    return jsonResponse({ points, keyword, capturedAt });
  } catch (error) {
    console.error('diagnose-map-grid failed:', error);
    return jsonResponse({ error: 'Unexpected error' }, 500);
  }
});
```

- [ ] **Passo 6: Escrever a tela da grelha**

Criar `src/components/dashboard/NeighborhoodGrid.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

export type GridPoint = { latitude: number; longitude: number; rank: number | null };

const toneFor = (rank: number | null) => {
  if (rank === null) return 'bg-slate-100 text-slate-400';
  if (rank <= 3) return 'bg-emerald-100 text-emerald-900';
  if (rank <= 10) return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-600';
};

export const NeighborhoodGrid = ({
  points,
  size,
  keyword,
}: {
  points: GridPoint[];
  size: number;
  keyword: string;
}) => {
  const { t } = useOwnerTranslation();

  return (
    <Card className="border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <CardContent className="p-5">
        <h2 className="font-semibold text-slate-950">{t('neighborhood.gridTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('neighborhood.gridKeyword', { keyword })}</p>
        <div
          className="mt-4 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {points.map((point) => (
            <div
              key={`${point.latitude}-${point.longitude}`}
              className={`flex aspect-square items-center justify-center rounded-xl text-sm font-semibold ${toneFor(point.rank)}`}
            >
              {point.rank === null ? '—' : point.rank}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">{t('neighborhood.indicatorNote')}</p>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Passo 7: Acrescentar as chaves da grelha aos três catálogos**

Dentro do bloco `neighborhood` já existente, nos três arquivos.

Em `pt-BR.json`:

```json
"gridTitle": "Onde você aparece no mapa",
"gridKeyword": "Busca usada: {{keyword}}",
"gridOpen": "Ver onde apareço no mapa",
"gridEmpty": "Ainda não fizemos essa leitura do mapa."
```

Em `pt-PT.json`, o mesmo bloco com `"gridTitle": "Onde aparece no mapa"` e
`"gridOpen": "Ver onde apareço no mapa"`.

Em `en.json`:

```json
"gridTitle": "Where you show up on the map",
"gridKeyword": "Search used: {{keyword}}",
"gridOpen": "See where I show up on the map",
"gridEmpty": "We have not taken this map reading yet."
```

- [ ] **Passo 8: Ligar o botão no cartão**

Em `NeighborhoodPositionCard.tsx`, abaixo do botão de atualizar, acrescentar um
segundo botão que chama `diagnose-map-grid` e mostra `<NeighborhoodGrid />` com
o resultado. O botão respeita os mesmos estados de recusa já tratados em
`noticeMessage()`.

```tsx
const [grid, setGrid] = useState<{ points: GridPoint[]; keyword: string } | null>(null);
const [gridLoading, setGridLoading] = useState(false);

const openGrid = async () => {
  setGridLoading(true);
  const { data, error: invokeError } = await supabase.functions.invoke('diagnose-map-grid');
  setGridLoading(false);
  if (invokeError || !data) return;
  setGrid({ points: data.points, keyword: data.keyword });
};
```

```tsx
<Button type="button" variant="ghost" className="mt-2 w-full" disabled={gridLoading} onClick={() => void openGrid()}>
  {t('neighborhood.gridOpen')}
</Button>
{grid && <div className="mt-4"><NeighborhoodGrid points={grid.points} size={3} keyword={grid.keyword} /></div>}
```

- [ ] **Passo 9: Rodar a verificação**

```bash
npm run verify
```

- [ ] **Passo 10: Commit**

```bash
git add supabase/functions/_shared/neighborhood.ts supabase/functions/_shared/neighborhood.test.ts supabase/functions/diagnose-map-grid src/components/dashboard/NeighborhoodGrid.tsx src/components/dashboard/NeighborhoodPositionCard.tsx src/i18n/owner/locales
git commit -m "feat(vizinhança): grelha 3x3 de visibilidade no mapa"
```

---

### Tarefa 7: Guarda do contrato de produto

**Arquivos:**
- Modificar: `scripts/check-binno-product-contract.mjs`

**Interfaces:**
- Consome: os arquivos das tarefas 1, 4 e 6.
- Produz: falha do `npm run verify` se alguém quebrar os invariantes.

- [ ] **Passo 1: Acrescentar as leituras e as verificações**

Depois das leituras já existentes no topo do arquivo, acrescentar:

```js
const neighborhoodCard = read('src/components/dashboard/NeighborhoodPositionCard.tsx');
const neighborhoodGrid = read('src/components/dashboard/NeighborhoodGrid.tsx');
const neighborhoodMath = read('supabase/functions/_shared/neighborhood.ts');
const benchmarkFn = read('supabase/functions/diagnose-neighborhood/index.ts');
const gridFn = read('supabase/functions/diagnose-map-grid/index.ts');
```

E, ao fim do array `requirements`, acrescentar quatro entradas:

```js
  ['cartão de vizinhança é aditivo e não desloca a reputação', dashboard.includes('<NeighborhoodPositionCard') && dashboard.indexOf('<ReputationCard snapshot={snapshot} />') < dashboard.indexOf('<NeighborhoodPositionCard')],
  ['vizinhança declara que é indicador, não posição oficial no Google', [neighborhoodCard, neighborhoodGrid].every((file) => file.includes("t('neighborhood.indicatorNote')"))],
  ['chamadas de vizinhança não pedem reviews nem photos', [benchmarkFn, gridFn].every((file) => !/FIELD_MASK\s*=\s*'[^']*(reviews|photos)/.test(file))],
  ['matemática da vizinhança continua testável fora do Deno', !neighborhoodMath.includes('Deno.')],
```

- [ ] **Passo 2: Provar que a guarda pega o erro**

Remova temporariamente `t('neighborhood.indicatorNote')` de
`NeighborhoodPositionCard.tsx` e rode:

```bash
npm run check:product-contract
```

Esperado: sai com código 1 e imprime `vizinhança declara que é indicador, não
posição oficial no Google`. Reponha a linha e confirme que volta a passar.

- [ ] **Passo 3: Rodar a verificação completa**

```bash
npm run verify
```

- [ ] **Passo 4: Commit**

```bash
git add scripts/check-binno-product-contract.mjs
git commit -m "chore(vizinhança): guarda do contrato para o módulo novo"
```

---

## Depois do plano

Abrir um PR único com as sete tarefas, aguardar o CI e mandar o link ao Marcelo.
**Não fazer merge, não aplicar a migration no Supabase e não publicar as Edge
Functions.** Esses três passos são dele.
