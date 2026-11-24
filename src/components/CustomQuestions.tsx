import { useState } from "react";
import { Icon } from "./Icon";
import type { Lang } from "../lib/i18n";
import { CUSTOM, buildCustomDeck } from "../lib/custom";
import type { Interaction } from "../types";

interface Props {
  lang: Lang;
  catalog: readonly Interaction[];
  onLaunch: (questions: string[]) => void;
  isHost: boolean;
  partnerHere: boolean;
  busy: boolean;
  serverError?: string;
}

export function CustomQuestions({ lang, catalog, onLaunch, isHost, partnerHere, busy, serverError }: Props) {
  const en = lang === "en";
  const [count, setCount] = useState(12);
  const [deck, setDeck] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);
  const eligibleCount = catalog.filter((card) => card.level <= 2 && card.kind === "free").length;
  const generate = () => {
    setDeck(buildCustomDeck(catalog, count));
    setGenerated(true);
  };

  if (!isHost) {
    return (
      <section className="custom-panel" aria-labelledby="custom-guest">
        <h2 id="custom-guest">{en ? "QSPICY is preparing your game" : "QSPICY prépare votre partie"}</h2>
        <p className="muted small">
          {en
            ? "Questions come from the QSPICY catalogue. You do not need to write or submit any."
            : "Les questions viennent directement du catalogue QSPICY. Tu n'as rien à rédiger ni à envoyer."}
        </p>
        <p className="custom-panel__count" role="status">
          {en ? "Waiting for the host to start…" : "En attente du lancement par l'hôte…"}
        </p>
      </section>
    );
  }

  return (
    <section className="custom-panel" aria-labelledby="custom-title">
      <h2 id="custom-title">{en ? "Build your QSPICY session" : "Composez votre partie QSPICY"}</h2>
      <p className="muted small">
        {en
          ? "QSPICY selects open questions from its catalogue. No player-written questions. This first corrected version uses levels 1–2 while the custom mode's consent-aware engine is being upgraded."
          : "QSPICY sélectionne des questions ouvertes de son catalogue. Aucun joueur n'a à en rédiger. Cette première correction utilise les paliers 1–2 en attendant la mise à niveau du moteur de consentement du mode personnalisé."}
      </p>

      <label className="custom-panel__count" htmlFor="custom-count">
        {en ? "Number of questions" : "Nombre de questions"}
      </label>
      <select id="custom-count" value={count} disabled={busy} onChange={(event) => { setCount(Number(event.target.value)); setGenerated(false); }}>
        {[5, 8, 12, 16, 19].map((value) => (
          <option key={value} value={value}>{value} {en ? "questions" : "questions"}</option>
        ))}
      </select>
      <p className="muted small">
        {eligibleCount} {en ? "eligible open questions in the current catalogue." : "questions ouvertes actuellement disponibles dans le catalogue."}
      </p>

      <button type="button" className="secondary full" data-testid="custom-generate" disabled={busy || eligibleCount < CUSTOM.min} onClick={generate}>
        <Icon name="rotate" size={16} /> {generated ? (en ? "Shuffle another selection" : "Mélanger une autre sélection") : (en ? "Generate a question selection" : "Générer une sélection de questions")}
      </button>

      {generated && (
        <ol className="custom-list" aria-label={en ? "Selected questions" : "Questions sélectionnées"}>
          {deck.map((question, index) => (
            <li key={`${index}-${question}`} className="custom-list__row">
              <span className="custom-list__num" aria-hidden="true">{index + 1}</span>
              <p className="custom-list__preview">{question}</p>
            </li>
          ))}
        </ol>
      )}

      {serverError && <p className="custom-errors" role="alert" data-testid="custom-server-error">{serverError}</p>}

      <button type="button" className="primary full" data-testid="custom-launch" disabled={busy || !partnerHere || !generated || deck.length < CUSTOM.min} onClick={() => onLaunch(deck)}>
        {!partnerHere
          ? (en ? "Waiting for the other person" : "En attente de l'autre personne")
          : !generated
            ? (en ? "Generate the questions first" : "Génère d'abord les questions")
            : (en ? "Start the custom game" : "Lancer la partie personnalisée")}
        {partnerHere && generated && !busy && <Icon name="arrow" />}
      </button>
    </section>
  );
}
