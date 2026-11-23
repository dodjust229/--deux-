import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "https://a-deux-jeu.onrender.com",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Méthode non autorisée." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fedapayKey = Deno.env.get("FEDAPAY_SECRET_KEY");
  const environment = Deno.env.get("FEDAPAY_ENVIRONMENT") ?? "sandbox";
  if (!supabaseUrl || !serviceKey || !fedapayKey) {
    return json(503, { error: "Le paiement QSPICY n'est pas encore configuré côté serveur." });
  }
  if (environment !== "sandbox" && environment !== "live") {
    return json(500, { error: "Environnement FedaPay invalide." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken || accessToken === authHeader) return json(401, { error: "Connexion hôte requise." });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  const user = authData.user;
  if (authError || !user || user.is_anonymous) return json(401, { error: "Compte hôte invalide." });
  if (!user.email || !user.email_confirmed_at || !user.phone || !user.phone_confirmed_at) {
    return json(403, { error: "Vérifie ton adresse e-mail et ton numéro de téléphone avant de payer." });
  }
  if (!user.phone.startsWith("+229")) {
    return json(400, { error: "Pour le lancement, le numéro du compte hôte doit être un numéro béninois (+229)." });
  }

  let body: { idempotency_key?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Requête invalide." }); }
  const idempotencyKey = body.idempotency_key ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return json(400, { error: "Clé de paiement invalide." });
  }

  const { data: active } = await admin
    .from("host_subscriptions")
    .select("id,expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) return json(200, { already_active: true, expires_at: active.expires_at });

  const { data: existing } = await admin
    .from("host_payments")
    .select("id,status,payment_url")
    .eq("user_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing?.payment_url && existing.status === "pending") {
    return json(200, { payment_url: existing.payment_url, payment_id: existing.id });
  }
  if (existing) return json(409, { error: "Cette tentative de paiement est déjà en cours ou terminée. Relance une nouvelle tentative." });

  const { data: payment, error: insertError } = await admin
    .from("host_payments")
    .insert({ user_id: user.id, idempotency_key: idempotencyKey, amount: 750, currency: "XOF", status: "pending" })
    .select("id")
    .single();
  if (insertError || !payment) return json(500, { error: "Impossible de préparer le paiement. Réessaie." });

  const apiBase = environment === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
  const phone = user.phone;
  const customer = {
    firstname: "Hôte",
    lastname: "QSPICY",
    email: user.email,
    phone_number: { number: phone, country: "bj" },
  };

  try {
    const createResponse = await fetch(`${apiBase}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fedapayKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Accès hôte QSPICY — 15 jours",
        amount: 750,
        currency: { iso: "XOF" },
        callback_url: "https://a-deux-jeu.onrender.com/?payment=return",
        customer,
        include: "currency,customer",
      }),
    });
    const created = await createResponse.json();
    if (!createResponse.ok) throw new Error("FedaPay n'a pas pu créer la transaction.");
    const transaction = created?.["v1/transaction"] ?? created?.transaction ?? created?.data ?? created;
    const transactionId = String(transaction?.id ?? "");
    if (!transactionId) throw new Error("Réponse de transaction FedaPay incomplète.");

    await admin.from("host_payments").update({ provider_transaction_id: transactionId }).eq("id", payment.id);

    const tokenResponse = await fetch(`${apiBase}/transactions/${encodeURIComponent(transactionId)}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fedapayKey}`, "Content-Type": "application/json" },
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error("FedaPay n'a pas pu générer le lien de paiement.");
    const token = tokenData?.["v1/transaction-token"] ?? tokenData?.token ?? tokenData?.data ?? tokenData;
    const paymentUrl = String(token?.url ?? "");
    if (!paymentUrl || !/^https:\/\//i.test(paymentUrl)) throw new Error("Lien de paiement FedaPay invalide.");

    const { error: updateError } = await admin
      .from("host_payments")
      .update({ payment_url: paymentUrl, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    if (updateError) throw new Error("Impossible d'enregistrer le lien de paiement.");

    return json(200, { payment_url: paymentUrl, payment_id: payment.id });
  } catch (_error) {
    await admin.from("host_payments").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", payment.id);
    return json(502, { error: "La création du paiement a échoué. Aucun accès n'a été activé." });
  }
});
