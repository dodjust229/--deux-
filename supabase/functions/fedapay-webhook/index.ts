import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();
const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? [part.trim(), ""] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }));
  const timestamp = Number(parts.t);
  const signature = parts.s;
  if (!Number.isInteger(timestamp) || !signature) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected, signature);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const fedapayKey = Deno.env.get("FEDAPAY_SECRET_KEY");
  const webhookSecret = Deno.env.get("FEDAPAY_WEBHOOK_SECRET");
  const environment = Deno.env.get("FEDAPAY_ENVIRONMENT") ?? "sandbox";
  if (!supabaseUrl || !serviceKey || !fedapayKey || !webhookSecret) {
    return response(503, { error: "Webhook payment not configured" });
  }

  const rawBody = await req.text();
  if (!(await verifySignature(rawBody, req.headers.get("X-FEDAPAY-SIGNATURE"), webhookSecret))) {
    return response(400, { error: "Invalid webhook signature" });
  }

  let event: Record<string, any>;
  try { event = JSON.parse(rawBody); } catch { return response(400, { error: "Invalid JSON" }); }
  const eventName = String(event.name ?? event.type ?? "");
  const transactionId = String(
    event.entity?.id ?? event.data?.id ?? event.data?.object?.id ?? event.object?.id ?? "",
  );
  if (!transactionId) return response(400, { error: "Missing transaction reference" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: payment, error: paymentError } = await admin
    .from("host_payments")
    .select("id,user_id,amount,currency,status,provider_transaction_id")
    .eq("provider_transaction_id", transactionId)
    .maybeSingle();
  if (paymentError || !payment) return response(404, { error: "Unknown payment" });

  const apiBase = environment === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";
  const verifyResponse = await fetch(`${apiBase}/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${fedapayKey}`, "Content-Type": "application/json" },
  });
  if (!verifyResponse.ok) return response(502, { error: "Unable to verify transaction with FedaPay" });
  const verifyData = await verifyResponse.json();
  const transaction = verifyData?.["v1/transaction"] ?? verifyData?.transaction ?? verifyData?.data ?? verifyData;
  const amount = Number(transaction?.amount);
  const currency = String(transaction?.currency?.iso ?? transaction?.currency ?? "").toUpperCase();
  const status = String(transaction?.status ?? "").toLowerCase();

  if (String(transaction?.id ?? "") !== transactionId || amount !== 750 || currency !== "XOF") {
    return response(400, { error: "Transaction details do not match QSPICY order" });
  }

  if (status === "approved" && eventName === "transaction.approved") {
    const { data: alreadyActivated } = await admin.from("host_subscriptions")
      .select("id").eq("payment_id", payment.id).maybeSingle();
    if (alreadyActivated) return response(200, { received: true, duplicate: true });

    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const { error: updateError } = await admin
      .from("host_payments")
      .update({ status: "approved", approved_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", payment.id)
      .neq("status", "approved");
    if (updateError) return response(500, { error: "Unable to record approved payment" });

    const { error: subscriptionError } = await admin.from("host_subscriptions").insert({
      user_id: payment.user_id,
      payment_id: payment.id,
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });
    if (subscriptionError) {
      const { data: existing } = await admin.from("host_subscriptions").select("id").eq("payment_id", payment.id).maybeSingle();
      if (!existing) return response(500, { error: "Unable to activate host access" });
    }
    return response(200, { received: true, activated: true });
  }

  if (status === "refunded" || eventName === "transaction.refunded") {
    await admin.from("host_payments").update({ status: "refunded", updated_at: new Date().toISOString() }).eq("id", payment.id);
    await admin.from("host_subscriptions").update({ status: "revoked" }).eq("payment_id", payment.id);
    return response(200, { received: true, refunded: true });
  }

  if (status === "canceled" || status === "declined") {
    await admin.from("host_payments").update({ status, updated_at: new Date().toISOString() }).eq("id", payment.id).neq("status", "approved");
  }
  return response(200, { received: true, status });
});
