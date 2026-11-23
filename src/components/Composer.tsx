import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { MediaComposerPreview, Sticker } from "./MediaContent";
import {
  MAX_ANSWER_LENGTH,
  PRIVATE_ANSWER,
  PRIVATE_STORAGE_PREFIX,
  STICKERS,
  encodeGif,
  encodeSticker,
  encodeText,
  normalizeGifUrl,
  parseContent,
  type Content,
  type StickerId
} from "../lib/media";
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

const MEDIA_KINDS = new Set(["free", "challenge", "cross"]);

export function Composer({ interaction, busy, alreadyAnswered, canSend, hint, onSubmit, onPass }: ComposerProps) {
  const [text, setText] = useState("");
  const [guess, setGuess] = useState("");
  const [panel, setPanel] = useState<"none" | "stickers" | "gif">("none");
  const [media, setMedia] = useState<Content | null>(null);
  const [gifInput, setGifInput] = useState("");
  const [gifError, setGifError] = useState("");

  const options = interaction.options ?? [];
  const isPrivate = interaction.visibility === "privee";
  const isSecret = interaction.kind === "secret";
  const isPrediction = interaction.kind === "prediction";
  const mediaAllowed = MEDIA_KINDS.has(interaction.kind) && !isPrivate;
  const locked = alreadyAnswered || busy;

  // Nouvelle interaction : on repart d'un compositeur vide (aucun reste de la question précédente).
  useEffect(() => {
    setText("");
    setGuess("");
    setMedia(null);
    setPanel("none");
    setGifInput("");
    setGifError("");
  }, [interaction.id]);

  const gifPreview = useMemo(() => {
    if (panel !== "gif" || !gifInput.trim()) return null;
    const url = normalizeGifUrl(gifInput);
    return url ? { url } : null;
  }, [gifInput, panel]);

  const payload = (): string | null => {
    if (media?.kind === "sticker") return encodeSticker(media.id);
    if (media?.kind === "gif") return encodeGif(media.url);
    if (isPrediction) return text.trim() && guess.trim() ? JSON.stringify({ own: text.trim(), guess: guess.trim() }) : null;
    if (isSecret) return text || null;
    if (interaction.kind === "challenge") return text.trim() ? encodeText(text) : "Défi relevé ✓";
    return text.trim() ? encodeText(text) : null;
  };

  const send = () => {
    if (isPrivate) {
      // La confidence ne quitte pas l'appareil : seule une marque part pour que la partie avance.
      const room = new URLSearchParams(location.search).get("room") ?? "local";
      try {
        window.localStorage.setItem(`${PRIVATE_STORAGE_PREFIX}${room}.${interaction.id}`, text.trim());
      } catch {
        /* stockage plein : la confidence reste seulement en mémoire */
      }
      onSubmit(PRIVATE_ANSWER);
      return;
    }
    const value = payload();
    if (value) onSubmit(value);
  };

  const chooseSticker = (id: StickerId) => {
    setMedia({ kind: "sticker", id });
    setPanel("none");
  };

  const addGif = () => {
    const encoded = encodeGif(gifInput);
    if (!encoded) {
      setGifError("Lien refusé : choisis une adresse https se terminant par .gif ou .webp.");
      return;
    }
    setMedia({ kind: "gif", url: normalizeGifUrl(gifInput)! });
    setGifError("");
    setPanel("none");
    setGifInput("");
  };

  if (alreadyAnswered) {
    return (
      <div className="composer composer--locked">
        <p className="composer__locked">
          <Icon name="check" size={16} /> Ta réponse est enregistrée. Elle reste cachée jusqu'à la révélation.
        </p>
        {hint && <p className="composer__hint">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="composer">
      {isSecret && (
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
      )}

      {!isSecret && (
        <>
          {isPrivate ? (
            <label className="composer__field">
              <span className="composer__sublabel">
                <Icon name="lock" size={13} /> Visible par toi seule ou toi seul
              </span>
              <textarea
                data-testid="answer"
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
                disabled={locked}
                rows={4}
                placeholder="Personne ne lira ceci. Ni l'autre joueur, ni nous : le texte reste sur ton appareil."
              />
            </label>
          ) : media ? (
            <MediaComposerPreview content={media} onRemove={() => setMedia(null)} />
          ) : (
            <label className="composer__field">
              <span className="visually-hidden">{isPrediction ? "Ta réponse" : "Ton message"}</span>
              <textarea
                data-testid="answer"
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
                disabled={locked}
                rows={isPrediction ? 3 : 4}
                placeholder={isPrediction ? "Ta réponse…" : interaction.kind === "challenge" ? "Ton défi, ou valide simplement « défi relevé »." : "Écris ce que tu as sur le cœur…"}
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
          )}

          {mediaAllowed && (
            <div className="composer__tools">
              <button
                type="button"
                className={`tool ${panel === "stickers" ? "is-on" : ""}`}
                aria-expanded={panel === "stickers"}
                disabled={locked}
                onClick={() => setPanel(panel === "stickers" ? "none" : "stickers")}
              >
                <Icon name="sticker" size={16} /> Sticker
              </button>
              <button
                type="button"
                className={`tool ${panel === "gif" ? "is-on" : ""}`}
                aria-expanded={panel === "gif"}
                disabled={locked}
                onClick={() => setPanel(panel === "gif" ? "none" : "gif")}
              >
                <Icon name="gif" size={16} /> GIF
              </button>
              {isPrediction && <span className="tool-note">Pas de média pour une prédiction</span>}
            </div>
          )}

          {panel === "stickers" && (
            <div className="picker" role="group" aria-label="Choisir un sticker">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  className="picker__item"
                  onClick={() => chooseSticker(sticker.id)}
                  aria-label={sticker.label}
                >
                  <Sticker id={sticker.id} size={54} />
                  <small>{sticker.label}</small>
                </button>
              ))}
            </div>
          )}

          {panel === "gif" && (
            <div className="picker picker--gif">
              <label className="composer__sublabel" htmlFor="gif-url">
                Lien d'un GIF animé (.gif ou .webp, https)
              </label>
              <div className="picker__row">
                <input
                  id="gif-url"
                  className="composer__input"
                  value={gifInput}
                  onChange={(event) => {
                    setGifInput(event.target.value);
                    setGifError("");
                  }}
                  placeholder="https://media.giphy.com/media/…/giphy.gif"
                  inputMode="url"
                />
                <button type="button" className="secondary" onClick={addGif} disabled={!gifInput.trim()}>
                  Aperçu
                </button>
              </div>
              {gifError && <p className="form-error" role="alert">{gifError}</p>}
              {gifPreview && !gifError && (
                <div className="picker__preview">
                  <MediaComposerPreview content={parseContent(encodeGif(gifPreview.url) ?? "")} onRemove={() => setGifInput("")} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="composer__actions">
        <button type="button" className="secondary" onClick={onPass} disabled={locked}>
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
