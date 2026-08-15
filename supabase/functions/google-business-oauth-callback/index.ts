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
  if (!clientId || !clientSecret || !redirectUri || !serviceRoleKey || !code || !state) {
    return redirectToApp("failed");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: oauthState, error: stateError } = await admin
    .from("google_business_oauth_states")
    .select("id, user_id, expires_at, consumed_at")
    .eq("state_hash", await sha256(state))
    .maybeSingle();

  if (
    stateError ||
    !oauthState ||
    oauthState.consumed_at ||
    new Date(oauthState.expires_at).getTime() < Date.now()
  ) {
    return redirectToApp("failed");
  }

  const { error: consumeError } = await admin
    .from("google_business_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", oauthState.id)
    .is("consumed_at", null);
  if (consumeError) return redirectToApp("failed");

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

  if (!tokenResponse.ok || !token.refresh_token) {
    console.error("Google OAuth token exchange failed", tokenResponse.status);
    return redirectToApp("failed");
  }

  const { error: storeError } = await admin.rpc("store_google_business_refresh_token", {
    p_user_id: oauthState.user_id,
    p_refresh_token: token.refresh_token,
    p_granted_scopes: token.scope?.split(" ").filter(Boolean) || [],
  });
  if (storeError) {
    console.error("Could not store Google OAuth grant", storeError.message);
    return redirectToApp("failed");
  }

  await admin
    .from("google_business_oauth_states")
    .delete()
    .eq("id", oauthState.id);

  return redirectToApp("connected");
});
