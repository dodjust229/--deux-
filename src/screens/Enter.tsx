import { useState } from "react";
import { Character, PERSONA_NAME, PERSONA_TRAIT, type Persona } from "../components/Character";
import { Icon } from "../components/Icon";
import { translator, type Lang } from "../lib/i18n";

interface EnterProps {
  mode: "create" | "join";
  initialCode: string;
  busy: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (input: { nickname: string; persona: Persona; code: string }) => void;
  lang: Lang;
  duoMode?: boolean;
}

const PERSONAS: Persona[] = ["masculin", "feminin"];

export function Enter({ mode, initialCode, busy, error, onBack, onSubmit, lang, duoMode = false }: EnterProps) {
  const t = translator(lang);
  const [nickname, setNickname] = useState("");
  const [persona, setPersona] = useState<Persona>("masculin");
  const [code, setCode] = useState(initialCode);

  return (
    <main className="enter page">
      <button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow" size={16} className="flip" /> {t("back")}
      </button>

      <div className="enter__card">
        <h1>{mode === "create" ? t("enter.create.title") : t("enter.join.title")}</h1>
        <p className="muted">{mode === "create" ? t("enter.create.sub") : t("enter.join.sub")}</p>

        {mode === "join" && (
          <label className="field">
            <span>{t("enter.code")}</span>
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
          <span>{t("enter.nickname")}</span>
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
          <legend>{t("enter.persona")}</legend>
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
          {busy ? t("enter.busy") : mode === "create" ? t("enter.submit.create") : t("enter.submit.join")}
          {!busy && <Icon name="arrow" />}
        </button>
        <p className="enter__note">{t("enter.note")}</p>
      </div>
    </main>
  );
}
