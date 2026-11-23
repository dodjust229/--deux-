import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { MAX_ANSWER_LENGTH, PRIVATE_ANSWER, PRIVATE_STORAGE_PREFIX, encodeText } from "../lib/media";
import type { Interaction } from "../types";

interface ComposerProps {
  interaction: Interaction;
  busy: boolean;
  alreadyAnswered: boolean;
  canSend: boolean;
  hint: string;
  onSubmit: (payload: string) => void;
  onPass: () => void;
}

const EMOJIS = ["❤️", "😏", "🔥", "🌙", "😅", "🤫", "✨", "🫦"];

export function Composer({ interaction, busy, alreadyAnswered, canSend, hint, onSubmit, onPass }: ComposerProps) {
  const [text, setText] = useState("");
  const [guess, setGuess] = useState("");

  const options = interaction.options ?? [];
  const isSecret = interaction.kind === "secret";
  const isPrediction = interaction.kind === "prediction";
  const isPrivate = interaction.visibility === "privee";
  const locked = alreadyAnswered || busy;

  // Nouvelle interaction : on repart d'un compositeur vide.
  useEffect(() => {
    setText("");
    setGuess("");
  }, [interaction.id]);

  const payload = (): string | null => {
    if (isPrediction) return text.trim() && guess.trim() ? JSON.stringify({ own: text.trim(), guess: guess.trim() }) : null;
    if (isSecret) return text || null;
    if (interaction.kind === "challenge") return text.trim() ? encodeText(text) : "Défi relevé ✓";
    return text.trim() ? encodeText(text) : null;
  };

  const send = () => {
    if (isPrivate) {
      const room = new URLSearchParams(location.search).get("room") ?? "local";
      try {
        window.localStorage.setItem(`${PRIVATE_STORAGE_PREFIX}${room}.${interaction.id}`, text.trim());
      } catch {
        /* stockage indisponible : la confidence reste en mémoire */
      }
      onSubmit(PRIVATE_ANSWER);
      return;
    }
    const value = payload();
    if (value) onSubmit(value);
  };

  const addEmoji = (emoji: string) => {
    setText((current) => (current + emoji).slice(0, MAX_ANSWER_LENGTH));
  };

  if (alreadyAnswered) {
    return (
      <div className="composer composer--locked">
        <p className="composer__locked">
          <Icon name="check" size={16} /> Ta réponse est enregistrée. Elle reste cachée jusqu'à la révélation.
        </p>
      </div>
    );
  }

  return (
    <div className="composer">
      {isSecret ? (
        <div className="options" role="radiogroup" aria-label="Choisis une option">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={text === option}
              className={`option ${text === option ? "is-selected" : ""}`}
              disabled={locked}
              onClick={() => setText(option)}
            >
              <span>{option}</span>
              {text === option && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      ) : (
        <>
          <label className="composer__field">
            <span className="composer__sublabel">
              {isPrivate ? (
                <>
                  <Icon name="lock" size={13} /> Visible par toi seule ou toi seul
                </>
              ) : (
                "Ta réponse"
              )}
            </span>
            <textarea
              data-testid="answer"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
              disabled={locked}
              rows={isPrediction ? 3 : 4}
              placeholder={
                isPrivate
                  ? "Personne ne lira ceci : le texte reste sur ton appareil."
                  : isPrediction
                    ? "Ta réponse…"
                    : interaction.kind === "challenge"
                      ? "Ton défi, ou valide simplement « défi relevé »."
                      : "Écris ce que tu as sur le cœur…"
              }
            />
            {isPrediction && (
              <>
                <span className="composer__sublabel">Ce que l'autre va répondre, selon toi</span>
                <input
                  className="composer__input"
                  value={guess}
                  onChange={(event) => setGuess(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
                  disabled={locked}
                  placeholder="Ton pronostic…"
                />
              </>
            )}
          </label>

          {!isPrivate && (
            <div className="emoji-row" role="group" aria-label="Insérer un emoji">
              {EMOJIS.map((emoji) => (
                <button key={emoji} type="button" className="emoji" disabled={locked} onClick={() => addEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="composer__actions">
        <button type="button" className="secondary" data-testid="pass" onClick={onPass} disabled={locked}>
          <Icon name="skip" size={16} /> Passer
        </button>
        <button
          type="button"
          className="primary"
          data-testid="send"
          onClick={send}
          disabled={!canSend || busy || (isPrivate ? text.trim().length === 0 : !payload())}
        >
          {isPrivate ? (
            <>
              <Icon name="lock" size={16} /> Garder pour moi
            </>
          ) : (
            <>
              Envoyer <Icon name="send" size={16} />
            </>
          )}
        </button>
      </div>
      <p className="composer__hint" role="status">{hint}</p>
    </div>
  );
}
