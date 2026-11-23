import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "https://a-deux-jeu.onrender.com",
  "Content-Type": "application/json",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fedapayKey = Deno.env.get("FEDAPAY_SECRET_KEY");
  const environment = Deno.env.get("FEDAPAY_ENVIRONMENT") ?? "sandbox";
  if (!url || !serviceKey || !fedapayKey) return json(503, { error: "Vérification de paiement non configurée." });

  const bearer = req.headers.get("Authorization") ?? "";
  const token = bearer.replace(/^Bearer\s+/i, "");
  if (!token || token === bearer) return json(401, { error: "Connexion hôte requise." });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;
  if (authError || !user || user.is_anonymous) return json(401, { error: "Compte hôte invalide." });
  if (!user.email_confirmed_at || !user.phone_confirmed_at) return json(403, { error: "Les deux coordonnées doivent être vérifiées." });

  let body: { transaction_id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Requête invalide." }); }
  const transactionId = String(body.transaction_id ?? "");
  if (!/^[0-9]+$/.test(transactionId)) return json(400, { error: "Référence de transaction invalide." });

  const { data: payment, error: paymentError } = await admin
    .from("host_payments")
    .select("id,user_id,amount,currency,status,provider_transaction_id")
    .eq("provider_transaction_id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (paymentError || !payment) return json(404, { error: "Paiement introuvable pour ce compte." });

  const apiBase = environment === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";
  const response = await fetch(`${apiBase}/transactions/${encodeURIComponent(transactionId)}?include=currency`, {
    headers: { Authorization: `Bearer ${fedapayKey}`, "Content-Type": "application/json" },
  });
  if (!response.ok) return json(502, { error: "FedaPay ne répond pas à la vérification." });
  const payload = await response.json();
  const transaction = payload?.["v1/transaction"] ?? payload?.transaction ?? payload?.data ?? payload;
  const amount = Number(transaction?.amount);
  const currency = String(transaction?.currency?.iso ?? transaction?.currency ?? "").toUpperCase();
  const status = String(transaction?.status ?? "").toLowerCase();
  if (String(transaction?.id ?? "") !== transactionId || amount !== 750 || currency !== "XOF") {
    return json(400, { error: "Les détails du paiement ne correspondent pas à la commande QSPICY." });
  }
  if (status !== "approved") return json(200, { status, activated: false });

  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const { error: updateError } = await admin
    .from("host_payments")
    .update({ status: "approved", approved_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("id", payment.id);
  if (updateError) return json(500, { error: "Impossible d'enregistrer le paiement." });

  const { data: existing } = await admin.from("host_subscriptions")
    .select("id,expires_at").eq("payment_id", payment.id).maybeSingle();
  if (existing) return json(200, { status: "approved", activated: true, expires_at: existing.expires_at });

  const { data: subscription, error: subscriptionError } = await admin.from("host_subscriptions").insert({
    user_id: user.id, payment_id: payment.id, status: "active",
    starts_at: now.toISOString(), expires_at: expires.toISOString(),
  }).select("expires_at").single();
  if (subscriptionError) {
    const { data: raced } = await admin.from("host_subscriptions")
      .select("expires_at").eq("payment_id", payment.id).maybeSingle();
    if (raced) return json(200, { status: "approved", activated: true, expires_at: raced.expires_at });
    return json(500, { error: "Le paiement est confirmé, mais l'accès n'a pas pu être activé." });
  }
  return json(200, { status: "approved", activated: true, expires_at: subscription.expires_at });
});
