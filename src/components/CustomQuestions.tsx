import { InfoTip } from "./InfoTip";
import { Icon } from "./Icon";
import type { Lang } from "../lib/i18n";
import { CUSTOM, checkQuestions, customMessage } from "../lib/custom";

interface Props {
  lang: Lang;
  questions: string[];
  onChange: (next: string[]) => void;
  onLaunch: () => void;
  isHost: boolean;
  partnerHere: boolean;
  busy: boolean;
  serverError?: string;
}

/**
 * Écriture des questions du salon Personnalisé (hôte) ou attente de l'hôte (invité).
 * L'ordre affiché est l'ordre joué ; la validation reprend exactement les contrôles du serveur.
 */
export function CustomQuestions({ lang, questions, onChange, onLaunch, isHost, partnerHere, busy, serverError }: Props) {
  const check = checkQuestions(questions);
  const en = lang === "en";
  const filled = check.questions.length;

  if (!isHost) {
    return (
      <section className="custom-panel" aria-labelledby="custom-guest">
        <h2 id="custom-guest">
          {en ? "Your own questions" : "Vos questions"}
        </h2>
        <p className="muted small">
          {en
            ? "The person who created the room writes the questions. They appear here as soon as the game starts."
            : "La personne qui a créé le salon écrit les questions. Elles s'affichent ici dès que la partie commence."}
        </p>
        <p className="custom-panel__count" data-testid="custom-guest-count">
          {filled} / {CUSTOM.max}
        </p>
        <p className="muted small">
          {en
            ? "A custom game never includes the 18+ tier: only the catalogue can withdraw a card mid-game."
            : "Une partie personnalisée n'inclut jamais le palier 18+ : seule une carte du catalogue peut être retirée en cours de partie."}
        </p>
      </section>
    );
  }

  const set = (index: number, value: string) => onChange(questions.map((q, i) => (i === index ? value : q)));
  const add = () => onChange([...questions, ""]);
  const remove = (index: number) => onChange(questions.filter((_, i) => i !== index));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <section className="custom-panel" aria-labelledby="custom-title">
      <h2 id="custom-title">
        {en ? "Write your questions" : "Écris tes questions"} <InfoTip tip="custom" lang={lang} />
      </h2>
      <p className="muted small">
        {en
          ? `Between ${CUSTOM.min} and ${CUSTOM.max} questions. They are played in the order below, one after the other.`
          : `Entre ${CUSTOM.min} et ${CUSTOM.max} questions. Elles se jouent dans l'ordre ci-dessous, l'une après l'autre.`}
      </p>

      <ol className="custom-list">
        {questions.map((question, index) => {
          const bad = check.badIndexes.includes(index);
          return (
            <li key={index} className="custom-list__row">
              <span className="custom-list__num" aria-hidden="true">{index + 1}</span>
              <textarea
                className={`custom-list__field ${bad ? "is-invalid" : ""}`}
                value={question}
                rows={2}
                maxLength={CUSTOM.maxChars + 40}
                placeholder={en ? "A question you want to ask…" : "Une question que tu as envie de poser…"}
                aria-label={`${en ? "Question" : "Question"} ${index + 1}`}
                data-testid={`custom-q-${index}`}
                disabled={busy}
                onChange={(event) => set(index, event.target.value)}
              />
              <span className="custom-list__tools">
                <button type="button" className="custom-list__tool" disabled={busy || index === 0}
                  aria-label={en ? `Move question ${index + 1} up` : `Monter la question ${index + 1}`}
                  onClick={() => move(index, -1)}>
                  <Icon name="arrow" size={14} className="up" />
                </button>
                <button type="button" className="custom-list__tool" disabled={busy || index === questions.length - 1}
                  aria-label={en ? `Move question ${index + 1} down` : `Descendre la question ${index + 1}`}
                  onClick={() => move(index, 1)}>
                  <Icon name="arrow" size={14} className="down" />
                </button>
                <button type="button" className="custom-list__tool" disabled={busy}
                  aria-label={en ? `Remove question ${index + 1}` : `Supprimer la question ${index + 1}`}
                  onClick={() => remove(index)}>
                  <Icon name="close" size={14} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="custom-panel__foot">
        <button type="button" className="ghost" data-testid="custom-add" disabled={busy || questions.length >= CUSTOM.max} onClick={add}>
          <Icon name="plus" size={14} /> {en ? "Add a question" : "Ajouter une question"}
        </button>
        <span className="custom-panel__count" data-testid="custom-count">
          {filled} / {CUSTOM.max}
        </span>
      </div>

      {check.errors.length > 0 && (
        <ul className="custom-errors" role="alert" data-testid="custom-errors">
          {check.errors.map((error) => <li key={error}>{customMessage(lang, error)}</li>)}
        </ul>
      )}
      {serverError && <p className="custom-errors" role="alert" data-testid="custom-server-error">{serverError}</p>}

      <p className="muted small">
        {en
          ? "No 18+ tier here: only the catalogue can withdraw a card when consent changes mid-game."
          : "Pas de palier 18+ ici : seul le catalogue peut retirer une carte si un accord change en cours de partie."}
      </p>

      <button type="button" className="primary full" data-testid="custom-launch" disabled={busy || !partnerHere || !check.ok} onClick={onLaunch}>
        {!partnerHere
          ? (en ? "Waiting for the other person" : "En attente de l'autre personne")
          : !check.ok
            ? (en ? "Finish your questions" : "Termine tes questions")
            : (en ? "Start the custom game" : "Lancer la partie personnalisée")}
        {partnerHere && check.ok && !busy && <Icon name="arrow" />}
      </button>
    </section>
  );
}
