import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Ferramenta INTERNA da NOÁ para prospecção — não é feature do produto.
 *
 * Varre uma zona geográfica e devolve os restaurantes que mais teriam a ganhar
 * com o AppReview: nota razoável mas não excelente, e poucas avaliações. Quem
 * já está em 4,8 com 1.500 avaliações não precisa de nós; quem está em 3,9 com
 * 60 precisa muito.
 *
 * A chave do Google fica no segredo do Supabase e nunca sai daqui.
 *
 * Nota sobre os termos do Google: o resultado é uma lista de trabalho
 * descartável para abordar negócios, não conteúdo para armazenar ou publicar.
 * Nada é gravado em base de dados.
 *
 * RECUPERADA EM 29/08/2026. Esta função rodava em produção sem existir em
 * nenhuma branch: ninguém tinha a fonte. O código abaixo foi baixado da função
 * ativa e commitado para que isso não se repita. Na mesma data ela passou a
 * exigir sessão de usuário (verify_jwt), porque estava aberta a qualquer
 * pessoa na internet e gasta a chave paga do Google Places a cada chamada.
 *
 * ESSE CONSERTO NÃO CONSERTOU NADA, e ficou assim de 29/08 a 04/09/2026.
 *
 * `verify_jwt = true` não exige sessão: exige uma credencial válida — e a
 * chave publicável do site é uma, impressa dentro do JavaScript que qualquer
 * pessoa baixa. Provado em 04/09 chamando este endereço com essa chave e sem
 * login nenhum: devolveu 24 prospects qualificados de Aracaju, tendo varrido
 * 60 estabelecimentos na conta paga do Google.
 *
 * Ninguém tinha testado. Escreveu-se o comentário, acreditou-se nele, e a
 * porta continuou aberta seis dias.
 *
 * AGORA É SÓ ADMINISTRADOR, e não "qualquer pessoa autenticada". Isto não é
 * funcionalidade do produto: é a ferramenta com que a Noá escolhe a quem
 * vender. Um cliente com conta paga não tem mais direito a ela do que um
 * estranho — e cada chamada continua a custar dinheiro.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';

interface PlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  business_status?: string;
}

/**
 * A forma da resposta da Nearby Search legada. O `status` da recusa vem no
 * CORPO, com HTTP 200 por cima — por isso `res.ok` nao serve para decidir aqui.
 */
interface NearbySearchResponse {
  status?: string;
  error_message?: string;
  results?: PlaceResult[];
  next_page_token?: string;
}

interface Prospect {
  place_id: string;
  name: string;
  rating: number;
  reviews: number;
  address: string;
  /** Quanto este negócio teria a ganhar, de 0 a 100. Maior = melhor alvo. */
  opportunity: number;
  reason: string;
}

/**
 * Pontuação de oportunidade. Duas forças:
 *
 * - Poucas avaliações => cada avaliação nova pesa muito. Este é o factor
 *   dominante, porque é onde o produto move a agulha de facto.
 * - Nota mediana => há insatisfação real a apanhar, e margem para subir.
 *   Nota muito baixa (< 3) costuma ser problema de operação, não de reputação;
 *   nota muito alta não precisa de ajuda.
 */
const scoreProspect = (rating: number, reviews: number): { score: number; reason: string } => {
  // Escassez de avaliações: 0 avaliações = 100, 400+ = 0
  const scarcity = Math.max(0, 100 - (reviews / 4));

  // Nota: pico em 3,9 — onde há problema a resolver e ainda há o que salvar
  const distanceFromSweetSpot = Math.abs(rating - 3.9);
  const ratingFit = Math.max(0, 100 - distanceFromSweetSpot * 55);

  const score = Math.round(scarcity * 0.6 + ratingFit * 0.4);

  let reason: string;
  if (reviews < 50 && rating >= 4.2) {
    reason = 'Boa reputação mas quase invisível — precisa de volume, não de recuperação';
  } else if (reviews < 100 && rating < 4.0) {
    reason = 'Poucas avaliações e nota a sofrer — é aqui que o produto mais rende';
  } else if (rating < 3.6) {
    reason = 'Nota baixa — vale confirmar se o problema é operação antes de abordar';
  } else if (reviews > 300) {
    reason = 'Muitas avaliações já — uma a mais move pouco';
  } else {
    reason = 'Perfil intermédio — vale uma conversa';
  }

  return { score, reason };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const recusar = (mensagem: string, status: number) => new Response(
    JSON.stringify({ error: mensagem }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
  );

  /**
   * A PORTA. Vem ANTES de qualquer coisa que gaste dinheiro — inclusive antes
   * de olhar para a chave do Google, para que um estranho não descubra sequer
   * se ela está configurada.
   */
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return recusar('Server configuration missing', 500);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return recusar('Authentication required', 401);
  const chamador = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: erroDeSessao } = await chamador.auth.getUser();
  // A chave publicável passa por `verify_jwt` mas NÃO tem utilizador: é aqui
  // que ela cai, e era exactamente por aqui que a porta estava aberta.
  if (erroDeSessao || !user) return recusar('Invalid session', 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: administrador } = await admin
    .from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!administrador) return recusar('Invalid session', 401);

  if (!googleApiKey) {
    return recusar('GOOGLE_PLACES_API_KEY não configurada', 500);
  }

  try {
    const {
      lat,
      lng,
      radius = 1200,
      max_reviews = 400,
      min_reviews = 5,
      zone_name = 'Zona',
    } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(
        JSON.stringify({ error: 'lat e lng são obrigatórios e numéricos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const all: PlaceResult[] = [];
    let pageToken: string | undefined;

    // Até 3 páginas (60 resultados) — o limite da Nearby Search.
    for (let page = 0; page < 3; page++) {
      /**
       * ESTE ENDERECO E DA PLACES LEGADA, E FICA ASSIM DE PROPOSITO.
       *
       * Em 03/09/2026, depois de o Google ter desligado os locais da v4, a
       * suspeita natural foi que esta busca seria a proxima a cair. A sonda diz
       * que nao: `maps.googleapis.com/maps/api/place/nearbysearch/json`
       * responde HTTP 200 com JSON (`REQUEST_DENIED`, por falta de chave),
       * enquanto o endereco que morreu de facto —
       * `mybusiness.googleapis.com/v4/{conta}/locations` — responde 404 em
       * HTML. Endereco que roteia esta vivo; endereco desligado nao sabe sequer
       * quem e.
       *
       * A documentacao confirma o mesmo: desde 01/03/2025 a Places legada esta
       * em estado "Legacy" — congelada, e impossivel de activar em projectos
       * NOVOS — mas os projectos que ja a tinham activada continuam a ser
       * servidos, com promessa de 12 meses de aviso antes do desligamento e sem
       * data anunciada ate hoje.
       *
       * Migrar para `places.googleapis.com/v1/places:searchNearby` sem prova de
       * morte seria trocar o que funciona por risco. O que fica no lugar da
       * migracao e o registo mais abaixo: no dia em que o Google desligar isto,
       * o log diz o motivo, em vez de um 502 mudo.
       *
       * O risco que sobra nao se conserta com codigo: se a chave passar a viver
       * noutro projecto do Google, a legada nao se activa la e esta busca para
       * de um dia para o outro. Isso e decisao do Marcelo, nao do codigo.
       */
      const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      if (pageToken) {
        url.searchParams.set('pagetoken', pageToken);
      } else {
        url.searchParams.set('location', `${lat},${lng}`);
        url.searchParams.set('radius', String(radius));
        url.searchParams.set('type', 'restaurant');
      }
      url.searchParams.set('key', googleApiKey);

      const res = await fetch(url.toString());

      // Ler texto antes de tentar JSON. A resposta que mata este caminho nao e
      // um erro JSON tratavel: e a pagina 404 em HTML que o Google devolve
      // quando o endereco deixa de existir. Sobre HTML, `res.json()` rebenta
      // longe daqui, no catch geral, e o operador ve "Erro interno" sem uma
      // unica pista de que foi o Google que desapareceu.
      const corpo = await res.text();
      let data: NearbySearchResponse;
      try {
        data = JSON.parse(corpo) as NearbySearchResponse;
      } catch {
        console.error(
          "Google recusou em %s: HTTP %s | corpo nao e JSON: %s",
          "buscar prospectos", res.status, corpo.slice(0, 300),
        );
        return new Response(
          JSON.stringify({ error: 'Google Places: resposta não é JSON', detail: corpo.slice(0, 300) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        // Mesmo formato de `sync-google-business-profile`, de proposito: um so
        // formato em todos os pontos do Google e o que faz o diagnostico ser
        // uma busca por "Google recusou em" e nao uma leitura de tudo.
        // `status` separa as duas causas mais provaveis — REQUEST_DENIED e "a
        // API nao esta activada ou a chave nao vale"; OVER_QUERY_LIMIT e "esta
        // activada e acabou a quota". Consertos completamente diferentes.
        console.error(
          "Google recusou em %s: HTTP %s | status %s | %s",
          "buscar prospectos", res.status, data.status || "?", data.error_message || "sem mensagem",
        );
        return new Response(
          JSON.stringify({ error: `Google Places: ${data.status}`, detail: data.error_message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      all.push(...(data.results || []));

      if (!data.next_page_token) break;
      pageToken = data.next_page_token;
      // O token só fica válido depois de um instante.
      await new Promise((r) => setTimeout(r, 2000));
    }

    const prospects: Prospect[] = all
      .filter(
        (p) =>
          p.business_status === 'OPERATIONAL' &&
          typeof p.rating === 'number' &&
          typeof p.user_ratings_total === 'number' &&
          p.user_ratings_total >= min_reviews &&
          p.user_ratings_total <= max_reviews
      )
      .map((p) => {
        const { score, reason } = scoreProspect(p.rating!, p.user_ratings_total!);
        return {
          place_id: p.place_id,
          name: p.name,
          rating: p.rating!,
          reviews: p.user_ratings_total!,
          address: p.vicinity || '',
          opportunity: score,
          reason,
        };
      })
      .sort((a, b) => b.opportunity - a.opportunity);

    const rated = all.filter((p) => typeof p.rating === 'number');
    const summary = {
      zone_name,
      scanned: all.length,
      qualified: prospects.length,
      avg_rating:
        rated.length
          ? Number((rated.reduce((s, p) => s + (p.rating || 0), 0) / rated.length).toFixed(2))
          : null,
      median_reviews: (() => {
        const counts = all
          .map((p) => p.user_ratings_total || 0)
          .sort((a, b) => a - b);
        if (!counts.length) return null;
        const mid = Math.floor(counts.length / 2);
        return counts.length % 2 ? counts[mid] : Math.round((counts[mid - 1] + counts[mid]) / 2);
      })(),
    };

    return new Response(JSON.stringify({ summary, prospects }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('search-prospects error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', detail: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
