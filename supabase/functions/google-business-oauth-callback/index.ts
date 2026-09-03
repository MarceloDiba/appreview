import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
};

const redirectToApp = (result: "connected" | "cancelled" | "failed") => {
  const appUrl = (Deno.env.get("APP_URL") || "").replace(/\/$/, "");
  if (!appUrl) {
    return new Response("Google authorization finished. Return to Binno.", { status: 200 });
  }
  return Response.redirect(`${appUrl}/settings?googleConnection=${result}`, 302);
};

serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";
  const redirectUri = Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const url = new URL(request.url);
  const googleError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (googleError) return redirectToApp("cancelled");

  // Env ausente e parametro ausente sao causas diferentes: a primeira e um
  // deploy com secret faltando na propria funcao; a segunda e um pedido que
  // nao veio do fluxo normal do Google (link velho, acesso direto ao
  // endereco). Um "failed" mudo obrigava a adivinhar entre as duas.
  if (!clientId || !clientSecret || !redirectUri || !serviceRoleKey) {
    console.error("Callback do Google: configuracao do servidor incompleta");
    return redirectToApp("failed");
  }
  if (!code || !state) {
    console.error("Callback do Google: code ou state ausente no pedido");
    return redirectToApp("failed");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: oauthState, error: stateError } = await admin
    .from("google_business_oauth_states")
    .select("id, user_id, expires_at, consumed_at")
    .eq("state_hash", await sha256(state))
    .maybeSingle();

  // Estas tres causas eram um so "if" com um so log. Separadas, cada uma
  // aponta para um conserto diferente: erro de leitura ou state nunca
  // emitido, state reaproveitado, ou state emitido ha tempo demais.
  if (stateError || !oauthState) {
    console.error("Callback do Google: estado nao encontrado");
    return redirectToApp("failed");
  }
  if (oauthState.consumed_at) {
    console.error("Callback do Google: estado ja consumido");
    return redirectToApp("failed");
  }
  if (new Date(oauthState.expires_at).getTime() < Date.now()) {
    console.error("Callback do Google: estado expirado");
    return redirectToApp("failed");
  }

  const { error: consumeError } = await admin
    .from("google_business_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", oauthState.id)
    .is("consumed_at", null);
  if (consumeError) {
    console.error("Callback do Google: falha ao marcar o estado como consumido");
    return redirectToApp("failed");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const token = await tokenResponse.json().catch(() => ({})) as {
    refresh_token?: string;
    scope?: string;
  };

  // O HTTP falhar e a resposta vir sem refresh_token sao causas diferentes: a
  // primeira e o Google recusando o code (expirado, ja usado, credenciais
  // erradas); a segunda costuma ser reautorizacao sem "prompt=consent", onde
  // o Google devolve 200 mas nao reenvia o refresh_token.
  if (!tokenResponse.ok) {
    console.error("Callback do Google: token recusado (HTTP %s)", tokenResponse.status);
    return redirectToApp("failed");
  }
  if (!token.refresh_token) {
    console.error("Callback do Google: resposta sem refresh_token");
    return redirectToApp("failed");
  }

  const { error: storeError } = await admin.rpc("store_google_business_refresh_token", {
    p_user_id: oauthState.user_id,
    p_refresh_token: token.refresh_token,
    p_granted_scopes: token.scope?.split(" ").filter(Boolean) || [],
  });
  if (storeError) {
    console.error("Callback do Google: falha ao gravar o token (%s)", storeError.message);
    return redirectToApp("failed");
  }

  await admin
    .from("google_business_oauth_states")
    .delete()
    .eq("id", oauthState.id);

  return redirectToApp("connected");
});
