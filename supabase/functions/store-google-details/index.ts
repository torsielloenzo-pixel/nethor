import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const ALLOWED_ORIGINS = new Set([
  "https://nethor.fr",
  "https://www.nethor.fr",
  "https://torsielloenzo-pixel.github.io",
]);
const PLACE_ID = "ChIJSY7JsE71tRIRRSih3toBniY";
const DEFAULT_MAPS = "https://www.google.com/maps/search/?api=1&query=Netto%20Le%20Thor&query_place_id=" + PLACE_ID;
const FIELD_MASK = [
  "id", "displayName", "formattedAddress", "nationalPhoneNumber",
  "internationalPhoneNumber", "currentOpeningHours", "businessStatus",
  "googleMapsUri"
].join(",");

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://nethor.fr",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function respond(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}
function safeMapsUrl(url: unknown) {
  const value = String(url || "");
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" && /(^|\.)google\.(com|fr)$/.test(parsed.hostname)) return value;
  } catch (_) { /* invalid URL */ }
  return DEFAULT_MAPS;
}
function asText(value: unknown, limit = 200) {
  return typeof value === "string" ? value.trim().slice(0, limit) : null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405, origin);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !adminKey) return respond({ error: "server_configuration" }, 503, origin);

  // The function has verify_jwt enabled. Also confirm the live session has not been revoked.
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return respond({ error: "unauthorized" }, 401, origin);
  const admin = createClient(url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) return respond({ error: "unauthorized" }, 401, origin);

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!anonKey) return respond({ error: "server_configuration" }, 503, origin);
  const caller = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: security, error: securityError } = await caller.rpc("nethor_security_context");
  if (securityError || security?.session_active !== true) {
    return respond({ error: "session_revoked" }, 401, origin);
  }

  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return respond({ error: "google_places_not_configured", source: "unavailable" }, 503, origin);
  }

  let google: Response;
  try {
    google = await fetch("https://places.googleapis.com/v1/places/" + PLACE_ID + "?languageCode=fr", {
      method: "GET",
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
      signal: AbortSignal.timeout(8500),
    });
  } catch (error) {
    console.error("[store-google-details] Google request failed", String(error));
    return respond({ error: "google_unavailable", source: "unavailable" }, 502, origin);
  }

  if (!google.ok) {
    // Never return the upstream body: it may contain configuration details.
    console.error("[store-google-details] Google API status", google.status);
    return respond({ error: google.status === 403 ? "google_api_permission" : "google_unavailable", source: "unavailable" }, 502, origin);
  }

  let place: Record<string, unknown>;
  try {
    place = await google.json() as Record<string, unknown>;
  } catch (_) {
    return respond({ error: "google_invalid_response", source: "unavailable" }, 502, origin);
  }
  if (place.id !== PLACE_ID) return respond({ error: "google_wrong_place", source: "unavailable" }, 502, origin);
  const hours = place.currentOpeningHours as Record<string, unknown> | null;
  const status = asText(place.businessStatus);
  return respond({
    source: "google_places",
    verified: true,
    fetched_at: new Date().toISOString(),
    place_id: PLACE_ID,
    name: asText((place.displayName as Record<string, unknown> | null)?.text) || "Netto Le Thor",
    address: asText(place.formattedAddress, 260),
    phone: asText(place.nationalPhoneNumber, 60) || asText(place.internationalPhoneNumber, 60),
    business_status: status,
    open_now: typeof hours?.openNow === "boolean" ? hours.openNow : null,
    next_close_time: asText(hours?.nextCloseTime, 50),
    next_open_time: asText(hours?.nextOpenTime, 50),
    weekday_descriptions: Array.isArray(hours?.weekdayDescriptions)
      ? hours.weekdayDescriptions.filter(x => typeof x === "string").slice(0, 7)
      : [],
    maps_url: safeMapsUrl(place.googleMapsUri),
    popular_times_available_via_places_api: false,
  }, 200, origin);
});
