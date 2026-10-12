import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const genericOk = () => json({
  success: true,
  message: "Si cet identifiant correspond à un compte, la procédure de récupération a été lancée.",
});
const safe = (v: unknown) => String(v ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
function normalizedUsername(raw: unknown) {
  const value = String(raw ?? "").trim().toLowerCase();
  const left = value.includes("@") ? value.split("@")[0] : value;
  return left.replace(/[^a-z0-9._-]/g, "").slice(0, 80);
}
function validBaseUrl(raw: unknown) {
  try {
    const u = new URL(String(raw ?? ""));
    if (!["https:", "http:"].includes(u.protocol)) return null;
    u.hash = "";
    u.search = "";
    if (!u.pathname.endsWith("/")) u.pathname = u.pathname.replace(/[^/]*$/, "");
    return u.toString();
  } catch { return null; }
}
async function findProfile(admin: any, rawIdentifier: string) {
  const username = normalizedUsername(rawIdentifier);
  let profile: any = null;
  if (rawIdentifier.includes("@")) {
    const { data: recovery } = await admin.from("user_recovery_emails")
      .select("user_id").eq("email", rawIdentifier).maybeSingle();
    if (recovery?.user_id) {
      const { data } = await admin.from("profiles")
        .select("id,display_name,email").eq("id", recovery.user_id).maybeSingle();
      profile = data;
    }
  }
  if (!profile && username.length >= 3) {
    const { data } = await admin.from("profiles")
      .select("id,display_name,email")
      .eq("email", username + "@stock-fl.local")
      .maybeSingle();
    profile = data;
  }
  if (!profile && username.length >= 3) {
    const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = (authList?.users || []).find((u: any) => {
      const authEmail = String(u.email || "").toLowerCase();
      const metaUser = String(u.user_metadata?.username || "").toLowerCase();
      return metaUser === username || authEmail.split("@")[0] === username;
    });
    if (authUser) {
      const { data } = await admin.from("profiles")
        .select("id,display_name,email").eq("id", authUser.id).maybeSingle();
      profile = data;
    }
  }
  return { profile, username };
}
async function sendMail(to: string, subject: string, html: string, textBody: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, reason: "not_configured" };
  const from = Deno.env.get("PASSWORD_RESET_FROM_EMAIL") || "Nethor <noreply@nethor.fr>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ from, to: [to], subject, html, text: textBody }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, reason: null, id: String(data?.id || "") };
    return { ok: false, reason: String(data?.message || data?.error || ("HTTP " + res.status)).slice(0, 500), id: "" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message.slice(0, 500) : "send_failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return genericOk();

  try {
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "request");

    if (action === "resolved") {
      const auth = req.headers.get("Authorization");
      const anon = Deno.env.get("SUPABASE_ANON_KEY");
      if (!auth || !anon) return json({ error: "Authentification requise." }, 401);

      const caller = createClient(url, anon, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: authError } = await caller.auth.getUser();
      if (authError || !user) return json({ error: "Session de récupération invalide." }, 401);

      // getUser valide le JWT, mais ne garantit pas qu'une session revoquee a perdu ses droits.
      // Revalider au niveau serveur avant toute operation utilisant la cle service_role.
      let sessionActive = false;
      try {
        const { data: securityContext, error: securityError } =
          await caller.rpc("nethor_security_context");
        sessionActive = !securityError && securityContext?.session_active === true;
      } catch {
        // Une erreur de transport/reseau ne doit jamais laisser passer une operation privilegiee.
        sessionActive = false;
      }
      if (!sessionActive) {
        return json({ error: "Session inactive ou révoquée." }, 401);
      }

      const now = new Date().toISOString();
      const { data: rows } = await admin.from("password_reset_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("reset_channel", "email")
        .is("resolved_at", null);

      if ((rows || []).length) {
        await admin.from("password_reset_requests")
          .update({ resolved_at: now, resolved_by: null })
          .eq("user_id", user.id)
          .eq("reset_channel", "email")
          .is("resolved_at", null);

        await admin.from("audit_logs").insert({
          actor_id: null,
          target_user_id: user.id,
          action: "password_reset_self_resolved",
          area: "Authentification",
          resource_type: "password_reset_requests",
          resource_id: rows[0]?.id || null,
          summary: "Mot de passe réinitialisé par lien e-mail",
          details: { channel: "email" },
        });
      }

      const { data: recovery } = await admin.from("user_recovery_emails")
        .select("email").eq("user_id", user.id).maybeSingle();
      if (recovery?.email) {
        await sendMail(
          recovery.email,
          "[Nethor] Votre mot de passe a été modifié",
          '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;background:#f5f6f8;padding:28px;color:#202124"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e7eb;border-radius:18px;padding:26px"><h2 style="margin:0 0 10px;font-size:21px">Mot de passe modifié</h2><p style="margin:0;line-height:1.55;color:#62676f">Le mot de passe de votre compte Nethor vient d’être réinitialisé.</p><p style="margin:16px 0 0;line-height:1.55;color:#8a4b25"><strong>Si vous n’êtes pas à l’origine de cette modification, contactez immédiatement un administrateur Nethor.</strong></p></div></div>',
          "Le mot de passe de votre compte Nethor vient d’être réinitialisé.\n\nSi vous n’êtes pas à l’origine de cette modification, contactez immédiatement un administrateur Nethor."
        );
      }
      return json({ success: true });
    }

    if (action !== "request") return json({ error: "Action inconnue." }, 400);

    const rawIdentifier = String(body?.identifier || "").trim().toLowerCase().slice(0, 120);
    const { profile, username } = await findProfile(admin, rawIdentifier);

    if (!profile || username.length < 3) {
      await new Promise((r) => setTimeout(r, 250));
      return genericOk();
    }

    const cutoff = new Date(Date.now() - 120_000).toISOString();
    const { data: recent } = await admin.from("password_reset_requests")
      .select("id")
      .eq("user_id", profile.id)
      .gte("requested_at", cutoff)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) return genericOk();

    const { data: recovery } = await admin.from("user_recovery_emails")
      .select("email")
      .eq("user_id", profile.id)
      .maybeSingle();

    const { data: setting } = await admin.from("app_settings")
      .select("value").eq("key", "site_base_url").maybeSingle();
    const base = validBaseUrl(setting?.value?.url || "");
    const resendConfigured = !!Deno.env.get("RESEND_API_KEY");

    if (recovery?.email && base && resendConfigured && profile.email) {
      const { data: generated, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: String(profile.email),
      });

      const tokenHash = generated?.properties?.hashed_token || generated?.properties?.hashedToken || "";
      let actionLink = "";
      if (!linkError && tokenHash) {
        const secureLink = new URL("reset-password.html", base);
        secureLink.searchParams.set("token_hash", String(tokenHash));
        secureLink.searchParams.set("type", "recovery");
        actionLink = secureLink.toString();
      }
      if (!linkError && actionLink) {
        const mail = await sendMail(
          recovery.email,
          "[Nethor] Réinitialiser votre mot de passe",
          '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;background:#f5f6f8;padding:28px;color:#202124"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e7eb;border-radius:18px;padding:26px"><div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#ff2d20,#ff8a00);display:grid;place-items:center;color:#fff;font-weight:900;font-size:20px">N</div><h2 style="margin:18px 0 8px;font-size:21px">Réinitialiser votre mot de passe</h2><p style="margin:0 0 18px;line-height:1.55;color:#62676f">Bonjour ' + safe(profile.display_name || username) + ', une demande de réinitialisation a été effectuée pour votre compte Nethor.</p><a href="' + safe(actionLink) + '" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#171717;color:#fff;text-decoration:none;font-weight:700">Choisir un nouveau mot de passe</a><p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#7a7f87">Ce lien de récupération est généré par Supabase Auth et ne doit pas être partagé.</p><p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#7a7f87">Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail.</p></div></div>',
          "Bonjour " + (profile.display_name || username) + ",\n\nUne demande de réinitialisation a été effectuée pour votre compte Nethor.\n\nChoisissez un nouveau mot de passe :\n" + actionLink + "\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail."
        );

        if (mail.ok) {
          const { data: resetRow } = await admin.from("password_reset_requests").insert({
            user_id: profile.id,
            identifier: rawIdentifier || username,
            display_name: profile.display_name || username,
            email_status: "sent",
            email_error: null,
            reset_channel: "email",
          }).select("id").single();

          await admin.from("audit_logs").insert({
            actor_id: null,
            target_user_id: profile.id,
            action: "password_reset_email_sent",
            area: "Authentification",
            resource_type: "password_reset_requests",
            resource_id: resetRow?.id || null,
            summary: "Lien de réinitialisation envoyé · " + (profile.display_name || username),
            details: { channel: "email", resend_id: mail.id || null },
          });
          return genericOk();
        }
      }
    }

    try {
      await fetch(url + "/functions/v1/password-reset-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_ANON_KEY") || service,
          Authorization: "Bearer " + (Deno.env.get("SUPABASE_ANON_KEY") || service),
        },
        body: JSON.stringify({
          identifier: String(profile.email || "").endsWith("@stock-fl.local")
            ? String(profile.email).replace(/@stock-fl\.local$/i, "")
            : (rawIdentifier || username)
        }),
      });
    } catch (e) {
      console.error("password recovery admin fallback", e);
    }

    return genericOk();
  } catch (e) {
    console.error("password-recovery-email", e);
    return genericOk();
  }
});