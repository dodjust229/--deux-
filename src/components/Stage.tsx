import type { Scene } from "../lib/scene";
import { Character, type Persona } from "./Character";

export interface StagePlayer {
  nickname: string;
  persona: Persona;
  online: boolean;
  seat: 1 | 2;
}

interface StageProps {
  scene: Scene;
  me: StagePlayer;
  other: StagePlayer | null;
  /** Hauteur cible des personnages (px), adaptée par la feuille de style. */
  size?: number;
  variant?: "hero" | "game" | "lobby";
}

const STATUS_TEXT = {
  idle: "au repos",
  listening: "à l'écoute",
  speaking: "prend la parole",
  thinking: "réfléchit",
  amused: "s'amuse",
  surprised: "surpris",
  shy: "gêné",
  reacting: "réagit",
  celebrating: "célèbre"
} as const;

/** Scène : zone de bulle réservée au-dessus, puis les deux personnages côte à côte. */
export function Stage({ scene, me, other, size = 220, variant = "game" }: StageProps) {
  const samePersona = other?.persona === me.persona;
  return (
    <div className={`stage stage--${variant}`}>
      <div className="stage__bubble-zone" aria-live="polite">
        {scene.bubble && scene.bubbleSeat !== null && (
          <div
            key={scene.bubble}
            className={`bubble bubble--${scene.bubbleSeat === me.seat ? "me" : "other"} bubble--${scene.states[scene.bubbleSeat]}`}
          >
            {scene.bubble}
            <span className="bubble__tail" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="stage__players">
        <figure className={`stage__player ${scene.states[me.seat] === "speaking" ? "is-speaking" : ""}`}>
          <Character
            persona={me.persona}
            state={scene.states[me.seat]}
            name={me.nickname}
            active={scene.states[me.seat] === "speaking" || scene.states[me.seat] === "thinking"}
            size={size}
          />
          <figcaption className="stage__caption">
            {me.nickname}
            <span className={`stage__dot ${me.online ? "is-online" : "is-offline"}`} aria-hidden="true" />
            <span className="visually-hidden">{me.online ? "connecté" : "hors ligne"}</span>
          </figcaption>
        </figure>

        <div className="stage__link" aria-hidden="true">
          <span className="stage__link-line" />
          <span className="stage__link-mark">✷</span>
          <span className="stage__link-line" />
        </div>

        <figure className={`stage__player ${other ? "" : "is-ghost"} ${other && scene.states[other.seat] === "speaking" ? "is-speaking" : ""}`}>
          {other ? (
            <Character
              persona={other.persona}
              state={scene.states[other.seat]}
              name={other.nickname}
              active={scene.states[other.seat] === "speaking" || scene.states[other.seat] === "thinking"}
              mirrored={samePersona}
              size={size}
            />
          ) : (
            <div className="stage__empty" style={{ height: `${size}px` }}>
              <span>?</span>
              <small>en attente</small>
            </div>
          )}
          <figcaption className="stage__caption">
            {other ? (
              <>
                {other.nickname}
                <span className={`stage__dot ${other.online ? "is-online" : "is-offline"}`} aria-hidden="true" />
                <span className="visually-hidden">{other.online ? "connecté" : "hors ligne"}</span>
              </>
            ) : (
              "Personne 2"
            )}
          </figcaption>
        </figure>
      </div>
      <p className="stage__status visually-hidden">
        {me.nickname} {STATUS_TEXT[scene.states[me.seat]]}
        {other ? ` · ${other.nickname} ${STATUS_TEXT[scene.states[other.seat]]}` : ""}
      </p>
    </div>
  );
}
