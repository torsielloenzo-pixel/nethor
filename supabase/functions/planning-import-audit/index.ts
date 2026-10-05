import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const ALLOWED_ORIGINS = new Set([
  "https://nethor.fr",
  "https://www.nethor.fr",
  "https://torsielloenzo-pixel.github.io",
]);

function cors(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://nethor.fr";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeIp(value: string | null) {
  let ip = String(value || "").split(",")[0].trim();
  if (!ip) return null;
  if (ip.startsWith("[") && ip.includes("]")) ip = ip.slice(1, ip.indexOf("]"));
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
    const octets = ip.split(".").map(Number);
    return octets.every((x) => x >= 0 && x <= 255) ? ip : null;
  }
  if (ip.includes(":") && /^[0-9a-fA-F:]+$/.test(ip) && ip.length <= 45) return ip;
  return null;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url || !secret || !anon) return json({ error: "server_configuration" }, 500, origin);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized" }, 401, origin);

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: "unauthorized" }, 401, origin);

  const caller = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: securityContext, error: securityError } = await caller.rpc("nethor_security_context");
  if (securityError || securityContext?.session_active !== true) {
    return json({ error: "session_revoked" }, 401, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const storagePath = String(body.storage_path || "").trim();
  if (!storagePath || storagePath.length > 500) return json({ error: "invalid_storage_path" }, 400, origin);

  const { data: history, error: historyError } = await admin
    .from("planning_import_history")
    .select("id,imported_by")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (historyError) {
    console.error("Planning import history lookup", historyError.message);
    return json({ error: "history_lookup_failed" }, 500, origin);
  }
  if (!history || history.imported_by !== user.id) {
    return json({ error: "forbidden" }, 403, origin);
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    normalizeIp(req.headers.get("cf-connecting-ip")) ||
    normalizeIp(forwarded) ||
    normalizeIp(req.headers.get("x-real-ip"));

  const rawSize = Number(body.file_size);
  const fileSize = Number.isFinite(rawSize) && rawSize >= 0 && rawSize <= 20 * 1024 * 1024
    ? Math.floor(rawSize)
    : null;
  const mimeType = String(body.mime_type || "").trim().slice(0, 160) || null;

  const { error: updateError } = await admin
    .from("planning_import_history")
    .update({
      ip_address: ip,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .eq("id", history.id);

  if (updateError) {
    console.error("Planning import history update", updateError.message);
    return json({ error: "history_update_failed" }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
});
