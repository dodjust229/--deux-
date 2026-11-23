import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Wordmark } from "../components/Brand";

interface HostBillingProps {
  onAccessReady: () => void;
  onBack: () => void;
}

export function HostBilling({ onAccessReady, onBack }: HostBillingProps) {
  const [busy, setBusy] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    if (!supabase) throw new Error("Connexion au serveur indisponible.");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error("Reconnecte-toi à ton compte hôte.");
    const { data, error: queryError } = await supabase
      .from("host_subscriptions")
      .select("expires_at")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (queryError) throw queryError;
    if (data?.expires_at) {
      setExpiresAt(data.expires_at);
      onAccessReady();
      return true;
    }
    setExpiresAt(null);
    return false;
  }, [onAccessReady]);

  const verifyReturn = useCallback(async () => {
    if (!supabase) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "return") return;
    const transactionId = params.get("id") ?? "";
    window.history.replaceState({}, "", window.location.pathname);
    if (!transactionId) {
      setMessage("Retour de paiement reçu. Vérifie ton statut ci-dessous.");
      return;
    }
    setMessage("Vérification sécurisée de ton paiement auprès de FedaPay…");
    const { data, error: invokeError } = await supabase.functions.invoke("verify-host-payment", {
      body: { transaction_id: transactionId },
    });
    if (invokeError) throw invokeError;
    if (data?.error) throw new Error(data.error);
    if (data?.activated) {
      setMessage("Paiement confirmé. Ton accès hôte est activé.");
      if (data.expires_at) setExpiresAt(data.expires_at);
      onAccessReady();
    } else {
      setMessage("Le paiement n'est pas encore confirmé. Tu peux actualiser le statut dans un instant.");
    }
  }, [onAccessReady]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true); setError("");
      try {
        await verifyReturn();
        if (alive) await loadAccess();
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Impossible de vérifier ton accès.");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [verifyReturn, loadAccess]);

  async function startPayment() {
    if (!supabase) return;
    setPaying(true); setError(""); setMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("create-host-checkout", {
        body: { idempotency_key: crypto.randomUUID() },
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      if (data?.already_active) {
        await loadAccess();
        return;
      }
      if (!data?.payment_url || !/^https:\/\//i.test(data.payment_url)) throw new Error("Le lien de paiement reçu est invalide.");
      window.location.assign(data.payment_url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de démarrer le paiement.");
      setPaying(false);
    }
  }

  async function refreshStatus() {
    setBusy(true); setError("");
    try {
      await verifyReturn();
      await loadAccess();
      if (!expiresAt) setMessage("Aucun paiement confirmé pour le moment.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vérification impossible.");
    } finally { setBusy(false); }
  }

  return (
    <main className="host-billing page">
      <section className="host-billing__card">
        <Wordmark size={48} />
        <span className="eyebrow">Accès hôte QSPICY</span>
        <h1>Débloque tes parties</h1>
        <p className="muted">Les invités rejoignent gratuitement. Seul l'hôte qui crée la salle paie.</p>
        <div className="host-billing__price">
          <strong>750 <small>FCFA</small></strong>
          <span>15 jours d'accès</span>
        </div>
        <ul className="host-billing__terms">
          <li>Un paiement unique</li>
          <li>Aucun renouvellement automatique</li>
          <li>Tu renouvelles uniquement si tu le souhaites</li>
          <li>Confirmation du paiement côté serveur</li>
        </ul>
        {expiresAt && <p className="host-billing__message">Accès actif jusqu'au {new Date(expiresAt).toLocaleString("fr-FR")}.</p>}
        {message && <p className="host-auth__message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!expiresAt && <button className="primary full" type="button" disabled={busy || paying} onClick={() => void startPayment()}>{paying ? "Redirection…" : "Payer 750 FCFA"}</button>}
        <button className="secondary full" type="button" disabled={busy} onClick={() => void refreshStatus()}>{busy ? "Vérification…" : "Actualiser le statut du paiement"}</button>
        <button className="back-link" type="button" onClick={onBack}>← Retour</button>
      </section>
    </main>
  );
}
