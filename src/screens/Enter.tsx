import { useState } from "react";
import { Character, PERSONA_NAME, PERSONA_TRAIT, type Persona } from "../components/Character";
import { Icon } from "../components/Icon";
import { Wordmark } from "../components/Brand";

interface EnterProps {
  mode: "create" | "join";
  initialCode: string;
  busy: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (input: { nickname: string; persona: Persona; code: string }) => void;
}

const PERSONAS: Persona[] = ["masculin", "feminin"];

export function Enter({ mode, initialCode, busy, error, onBack, onSubmit }: EnterProps) {
  const [nickname, setNickname] = useState("");
  const [persona, setPersona] = useState<Persona>("masculin");
  const [code, setCode] = useState(initialCode);

  return (
    <main className="enter page">
      <button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow" size={16} className="flip" /> Retour
      </button>

      <div className="enter__card">
        <Wordmark size={26} />
        <h1>{mode === "create" ? "Ouvrir votre salle" : "Rejoindre la conversation"}</h1>
        <p className="muted">
          {mode === "create"
            ? "Choisis ton prénom de jeu et le personnage que tu incarnes. Un lien privé sera créé pour l'autre personne."
            : "Colle le lien reçu, choisis ton personnage et entre dans la salle."}
        </p>

        {mode === "join" && (
          <label className="field">
            <span>Lien ou identifiant de la salle</span>
            <input
              className="input"
              data-testid="room-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="https://…?room=…"
              inputMode="url"
              autoComplete="off"
            />
          </label>
        )}

        <label className="field">
          <span>Ton prénom de jeu</span>
          <input
            className="input"
            data-testid="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={20}
            placeholder="Ex. Alex"
            autoComplete="nickname"
          />
        </label>

        <fieldset className="personas">
          <legend>Ton personnage</legend>
          <div className="personas__grid" role="radiogroup" aria-label="Personnage">
            {PERSONAS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={persona === value}
                className={`persona ${persona === value ? "is-selected" : ""}`}
                data-testid={`persona-${value}`}
                onClick={() => setPersona(value)}
              >
                <Character persona={value} state={persona === value ? "amused" : "idle"} size={132} />
                <strong>{PERSONA_NAME[value]}</strong>
                <small>{PERSONA_TRAIT[value]}</small>
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="primary full"
          type="button"
          data-testid="enter-submit"
          disabled={busy}
          onClick={() => onSubmit({ nickname, persona, code })}
        >
          {busy ? "Connexion…" : mode === "create" ? "Créer la salle" : "Entrer dans la salle"}
          {!busy && <Icon name="arrow" />}
        </button>
        <p className="enter__note">
          Ton prénom, ton personnage et tes réponses restent liés à cette salle temporaire. Aucun compte
          n'est créé.
        </p>
      </div>
    </main>
  );
}
