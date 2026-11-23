import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import type { Preferences, Theme } from "../lib/prefs";

interface SettingsProps {
  open: boolean;
  prefs: Preferences;
  onChange: (next: Preferences) => void;
  onClose: () => void;
  playing: boolean;
  paused: boolean;
  onTogglePause?: () => void;
  adultEnabled: boolean;
  onLeaveAdult?: () => void;
  onLeaveRoom: () => void;
  busy: boolean;
}

const THEMES: { id: Theme; label: string; icon: "moon" | "sun" }[] = [
  { id: "dark", label: "Sombre", icon: "moon" },
  { id: "light", label: "Clair", icon: "sun" }
];

/** Réglages : préférences propres à cet appareil, rien n'est partagé avec l'autre joueur. */
export function Settings({
  open,
  prefs,
  onChange,
  onClose,
  playing,
  paused,
  onTogglePause,
  adultEnabled,
  onLeaveAdult,
  onLeaveRoom,
  busy
}: SettingsProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<Preferences>) => onChange({ ...prefs, ...patch });

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button className="sheet__backdrop" type="button" aria-label="Fermer les réglages" onClick={onClose} />
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 id="settings-title">Réglages</h2>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </header>

        <p className="sheet__note">Ces préférences restent sur cet appareil. L'autre joueur garde les siennes.</p>

        <fieldset className="field">
          <legend>Apparence</legend>
          <div className="segmented" role="radiogroup" aria-label="Thème">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={prefs.theme === theme.id}
                className={prefs.theme === theme.id ? "is-selected" : ""}
                onClick={() => update({ theme: theme.id })}
              >
                <Icon name={theme.icon} size={16} /> {theme.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="switch-row">
          <div>
            <strong>Réduire les animations</strong>
            <p>Les personnages restent visibles, les mouvements sont figés.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.reducedMotion}
              onChange={(event) => update({ reducedMotion: event.target.checked })}
            />
            <span aria-hidden="true" />
            <span className="visually-hidden">Réduire les animations</span>
          </label>
        </div>

        <div className="switch-row">
          <div>
            <strong>Sons</strong>
            <p>Un signal discret à l'envoi et à la révélation.</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={prefs.sound} onChange={(event) => update({ sound: event.target.checked })} />
            <span aria-hidden="true" />
            <span className="visually-hidden">Activer les sons</span>
          </label>
        </div>

        <label className={`volume ${prefs.sound ? "" : "is-muted"}`}>
          <span>
            <Icon name="sound" size={16} /> Volume
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(prefs.volume * 100)}
            onChange={(event) => update({ volume: Number(event.target.value) / 100 })}
            disabled={!prefs.sound}
          />
          <output>{Math.round(prefs.volume * 100)} %</output>
        </label>

        <div className="sheet__actions">
          {playing && onTogglePause && (
            <button className="secondary full" type="button" disabled={busy} onClick={onTogglePause}>
              <Icon name={paused ? "play" : "pause"} /> {paused ? "Reprendre la partie" : "Mettre en pause"}
            </button>
          )}
          {adultEnabled && onLeaveAdult && (
            <button className="secondary full" type="button" disabled={busy} onClick={onLeaveAdult}>
              <Icon name="lock" /> Quitter le mode 18+
            </button>
          )}
          <button className="secondary full danger" type="button" disabled={busy} onClick={onLeaveRoom}>
            <Icon name="log-out" /> Quitter la salle
          </button>
        </div>
      </div>
    </div>
  );
}
