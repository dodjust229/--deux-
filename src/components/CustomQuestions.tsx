import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import type { Lang } from "../lib/i18n";
import { CUSTOM, buildCustomDeck } from "../lib/custom";
import type { Category, Interaction } from "../types";
interface Props {
  lang: Lang; catalog: readonly Interaction[]; selectedCategories: readonly Category[];
  onLaunch: (interactionIds: string[]) => void; isHost: boolean; partnerHere: boolean; busy: boolean;
  myConsent: boolean; otherConsent: boolean; onToggleConsent: (value: boolean) => void; serverError?: string;
}
export function CustomQuestions({ lang, catalog, selectedCategories, onLaunch, isHost, partnerHere, busy, myConsent, otherConsent, onToggleConsent, serverError }: Props) {
  const en = lang === "en";
  const [count, setCount] = useState(12);
  const [deck, setDeck] = useState<Interaction[]>([]);
  const [generated, setGenerated] = useState(false);
  const categoryKey = [...selectedCategories].sort().join("|");
  const eligibleCount = catalog.filter(card => selectedCategories.includes(card.category)).length;
  const needsAdult = deck.some(card => card.level >= 3 || card.category === "audacieux");
  const consentReady = !needsAdult || (myConsent && otherConsent);
  useEffect(() => { setDeck([]); setGenerated(false); }, [categoryKey]);
  const generate = () => { setDeck(buildCustomDeck(catalog, count, Math.random, selectedCategories)); setGenerated(true); };

  return (
    <section className="custom-panel" aria-labelledby="custom-title">
      <h2 id="custom-title">{isHost ? (en ? "Prepare your QSPICY selection" : "Préparez votre sélection QSPICY") : (en ? "QSPICY is preparing your game" : "QSPICY prépare votre partie")}</h2>
      <p className="muted small">{en
        ? "QSPICY draws a varied set of existing catalogue cards from your shared categories: open questions, secret choices, predictions and challenges. You do not write the questions; you choose the path to play."
        : "QSPICY tire une sélection variée de cartes déjà présentes dans le catalogue et vos catégories communes : questions ouvertes, choix secrets, prédictions et défis. Vous ne rédigez pas les questions ; vous choisissez le parcours à jouer."}</p>
      <section className="consent">
        <label className="consent__line">
          <input type="checkbox" checked={myConsent} disabled={busy} onChange={event => onToggleConsent(event.target.checked)} />
          <span><strong>{en ? "I am 18 or older and agree to level 3–4 content if selected." : "J'ai 18 ans ou plus et j'accepte les contenus des paliers 3–4 s'ils sont sélectionnés."}</strong>
            <small>{en ? "Both players must agree only when adult cards are in the selection. Consent can be withdrawn at any time." : "Les deux joueurs doivent être d'accord uniquement si la sélection contient des cartes adultes. Le consentement peut être retiré à tout moment."}</small></span>
        </label>
        <p className="consent__status">{otherConsent ? (en ? "The other player has agreed." : "L'autre joueur a donné son accord.") : (en ? "Waiting for the other player's agreement." : "En attente de l'accord de l'autre joueur.")}</p>
      </section>
      {!isHost ? <p className="custom-panel__count" role="status">{en ? "Waiting for the host to start…" : "En attente du lancement par l'hôte…"}</p> : <>
        <label className="custom-panel__count" htmlFor="custom-count">{en ? "Number of questions" : "Nombre de questions"}</label>
        <select id="custom-count" value={count} disabled={busy} onChange={event => { setCount(Number(event.target.value)); setGenerated(false); }}>
          {[5, 8, 12, 16, 19, 24].map(value => <option key={value} value={value}>{value} {en ? "questions" : "questions"}</option>)}
        </select>
        <p className="muted small">{eligibleCount} {en ? "questions available in the selected shared categories." : "questions disponibles dans vos catégories communes."}</p>
      <p className="muted small">{en
        ? "After each reveal, you can comment on the answers and send private reactions to your partner."
        : "Après chaque révélation, vous pourrez commenter les réponses et envoyer des réactions privées à votre partenaire."}</p>
        <button type="button" className="secondary full" data-testid="custom-generate" disabled={busy || eligibleCount < CUSTOM.min} onClick={generate}>
          <Icon name="rotate" size={16} /> {generated ? (en ? "Shuffle another selection" : "Tirer une autre sélection") : (en ? "Draw a selection" : "Tirer une sélection")}
        </button>
        {generated && <ol className="custom-list" aria-label={en ? "Question path" : "Parcours de questions"}>
          {deck.map((card, index) => <li key={card.id} className="custom-list__row">
            <span className="custom-list__num" aria-hidden="true">{index + 1}</span>
            <div><p className="custom-list__preview">{card.prompt}</p><small className="muted">{card.title} · {({ free: en ? "Open question" : "Question ouverte", secret: en ? "Secret choice" : "Choix secret", prediction: en ? "Prediction" : "Prédiction", challenge: en ? "Challenge" : "Défi", cross: en ? "Cross-question" : "Question croisée" })[card.kind]} · {en ? "Level" : "Palier"} {card.level}</small></div>
          </li>)}
        </ol>}
        {serverError && <p className="custom-errors" role="alert" data-testid="custom-server-error">{serverError}</p>}
        <button type="button" className="primary full" data-testid="custom-launch" disabled={busy || !partnerHere || !generated || deck.length < CUSTOM.min || !consentReady} onClick={() => onLaunch(deck.map(card => card.id))}>
          {!partnerHere ? (en ? "Waiting for the other person" : "En attente de l'autre personne")
            : !generated ? (en ? "Generate the questions first" : "Génère d'abord une sélection")
            : !consentReady ? (en ? "Waiting for both 18+ agreements" : "En attente des deux accords 18+")
            : (en ? "Start the custom game" : "Lancer la partie personnalisée")}
          {partnerHere && generated && consentReady && !busy && <Icon name="arrow" />}
        </button>
      </>}
    </section>
  );
}
