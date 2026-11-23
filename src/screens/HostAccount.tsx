import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Wordmark } from "../components/Brand";

type Step = "identify" | "verify" | "link" | "link-verify";
type Method = "phone" | "email";

interface HostAccountProps {
  onComplete: () => void;
  onBack: () => void;
}

function normalizeBeninPhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("229")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("01")) return `+229${digits.slice(2)}`;
  if (digits.length === 8) return `+229${digits}`;
  return value.trim();
}

export function HostAccount({ onComplete, onBack }: HostAccountProps) {
  const [method, setMethod] = useState<Method>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("identify");
  const [pendingValue, setPendingValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const completed = useRef(false);

  const phoneVerified = Boolean(user?.phone && user?.phone_confirmed_at);
  const emailVerified = Boolean(user?.email && user?.email_confirmed_at);
  const missing = useMemo(() => !phoneVerified ? "phone" : !emailVerified ? "email" : null, [phoneVerified, emailVerified]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) setStep("link"); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setStep("link");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && phoneVerified && emailVerified && !completed.current) {
      completed.current = true;
      onComplete();
    }
  }, [user, phoneVerified, emailVerified, onComplete]);

  async function sendInitialCode() {
    if (!supabase) return setError("Le service de connexion n'est pas configuré.");
    setBusy(true); setError(""); setMessage("");
    try {
      if (method === "phone") {
        const normalized = normalizeBeninPhone(phone);
        if (!/^\+229[0-9]{8}$/.test(normalized)) throw new Error("Entre un numéro béninois valide, avec ou sans +229.");
        setPhone(normalized);
        const { error: authError } = await supabase.auth.signInWithOtp({ phone: normalized });
        if (authError) throw authError;
        setPendingValue(normalized);
      } else {
        const normalized = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Entre une adresse e-mail valide.");
        const { error: authError } = await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true } });
        if (authError) throw authError;
        setPendingValue(normalized);
      }
      setStep("verify");
      setMessage(method === "phone" ? "Code envoyé par SMS." : "Code envoyé par e-mail. Vérifie aussi tes courriers indésirables.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d'envoyer le code.");
    } finally { setBusy(false); }
  }

  async function verifyInitialCode() {
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = method === "phone"
        ? await supabase.auth.verifyOtp({ phone: pendingValue, token: code.trim(), type: "sms" })
        : await supabase.auth.verifyOtp({ email: pendingValue, token: code.trim(), type: "email" });
      if (result.error) throw result.error;
      setUser(result.data.user);
      setCode("");
      setStep("link");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Code invalide ou expiré.");
    } finally { setBusy(false); }
  }

  async function sendLinkedCode() {
    if (!supabase || !user) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (missing === "phone") {
        const normalized = normalizeBeninPhone(phone);
        if (!/^\+229[0-9]{8}$/.test(normalized)) throw new Error("Entre un numéro béninois valide, avec ou sans +229.");
        const { error: updateError } = await supabase.auth.updateUser({ phone: normalized });
        if (updateError) throw updateError;
        setPendingValue(normalized);
        setStep("link-verify");
        setMessage("Code de vérification envoyé par SMS.");
      } else if (missing === "email") {
        const normalized = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Entre une adresse e-mail valide.");
        const { error: updateError } = await supabase.auth.updateUser({ email: normalized });
        if (updateError) throw updateError;
        setPendingValue(normalized);
        setStep("link-verify");
        setMessage("Code de confirmation envoyé à ton adresse e-mail.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d'ajouter cette coordonnée.");
    } finally { setBusy(false); }
  }

  async function verifyLinkedCode() {
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = missing === "phone"
        ? await supabase.auth.verifyOtp({ phone: pendingValue, token: code.trim(), type: "phone_change" })
        : await supabase.auth.verifyOtp({ email: pendingValue, token: code.trim(), type: "email_change" });
      if (result.error) throw result.error;
      const refreshed = await supabase.auth.getUser();
      setUser(refreshed.data.user);
      setCode("");
      setStep("link");
      setMessage("Coordonnée vérifiée.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Code invalide ou expiré.");
    } finally { setBusy(false); }
  }

  async function signOutAndBack() {
    await supabase?.auth.signOut();
    completed.current = false;
    setUser(null);
    setStep("identify");
    setError("");
    onBack();
  }

  return (
    <main className="host-auth page">
      <section className="host-auth__card">
        <Wordmark size={48} />
        <span className="eyebrow">Espace hôte</span>
        <h1>Ton compte QSPICY</h1>
        <p className="muted">Un seul compte, avec ton téléphone et ton adresse e-mail vérifiés. Les invités n'ont pas besoin de compte.</p>

        {!user && step === "identify" && <>
          <div className="host-auth__switch" role="group" aria-label="Méthode de connexion">
            <button type="button" className={method === "phone" ? "is-active" : ""} onClick={() => setMethod("phone")}>Téléphone</button>
            <button type="button" className={method === "email" ? "is-active" : ""} onClick={() => setMethod("email")}>E-mail</button>
          </div>
          {method === "phone" ? (
            <label className="field"><span>Numéro béninois</span><input className="input" autoComplete="tel" inputMode="tel" placeholder="+229 01 90 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} /></label>
          ) : (
            <label className="field"><span>Adresse e-mail</span><input className="input" type="email" autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
          )}
          <button className="primary full" type="button" disabled={busy} onClick={() => void sendInitialCode()}>{busy ? "Envoi…" : "Recevoir mon code"}</button>
        </>}

        {!user && step === "verify" && <>
          <p className="host-auth__step">Vérification de {pendingValue}</p>
          <label className="field"><span>Code à 6 chiffres</span><input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          <button className="primary full" type="button" disabled={busy || code.length !== 6} onClick={() => void verifyInitialCode()}>{busy ? "Vérification…" : "Valider le code"}</button>
          <button className="link-button" type="button" onClick={() => { setStep("identify"); setCode(""); }}>Changer de méthode</button>
        </>}

        {user && step === "link" && <>
          <div className="host-auth__checks">
            <p className={phoneVerified ? "is-done" : ""}>{phoneVerified ? "✓" : "○"} Téléphone {phoneVerified ? "vérifié" : "à vérifier"}</p>
            <p className={emailVerified ? "is-done" : ""}>{emailVerified ? "✓" : "○"} E-mail {emailVerified ? "vérifié" : "à vérifier"}</p>
          </div>
          {missing === "phone" ? (
            <label className="field"><span>Ajouter ton numéro béninois</span><input className="input" inputMode="tel" autoComplete="tel" placeholder="+229 01 90 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} /></label>
          ) : missing === "email" ? (
            <label className="field"><span>Ajouter ton adresse e-mail</span><input className="input" type="email" autoComplete="email" placeholder="toi@exemple.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
          ) : null}
          {missing && <button className="primary full" type="button" disabled={busy} onClick={() => void sendLinkedCode()}>{busy ? "Envoi…" : "Vérifier cette coordonnée"}</button>}
          <button className="link-button" type="button" onClick={() => void signOutAndBack()}>Se déconnecter</button>
        </>}

        {user && step === "link-verify" && <>
          <p className="host-auth__step">Code envoyé à {pendingValue}</p>
          <label className="field"><span>Code à 6 chiffres</span><input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          <button className="primary full" type="button" disabled={busy || code.length !== 6} onClick={() => void verifyLinkedCode()}>{busy ? "Vérification…" : "Confirmer et lier au compte"}</button>
          <button className="link-button" type="button" onClick={() => { setStep("link"); setCode(""); }}>Retour</button>
        </>}

        {message && <p className="host-auth__message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="back-link" type="button" onClick={onBack}>← Retour</button>
      </section>
    </main>
  );
}
