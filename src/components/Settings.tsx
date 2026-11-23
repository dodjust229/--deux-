import { useRef } from "react";
import { Icon } from "./Icon";
import type { Preferences, Theme } from "../lib/prefs";
import type { Lang } from "../lib/i18n";
import { translator } from "../lib/i18n";
import { useFocusTrap } from "../lib/useFocusTrap";

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
  onOpenGuide?: () => void;
  lang?: Lang;
  busy: boolean;
}

const THEMES: { id: Theme; icon: "moon" | "sun" }[] = [
  { id: "dark", icon: "moon" },
  { id: "light", icon: "sun" }
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
  onOpenGuide,
  lang = "fr",
  busy
}: SettingsProps) {
  const t = translator(lang);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, { onClose, container: panelRef, initial: closeRef });

  if (!open) return null;

  const update = (patch: Partial<Preferences>) => onChange({ ...prefs, ...patch });

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button className="sheet__backdrop" type="button" aria-label={t("settings.close.dialog")} onClick={onClose} />
      <div className="sheet__panel" ref={panelRef}>
        <header className="sheet__head">
          <h2 id="settings-title">{t("settings.title")}</h2>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={t("settings.close")}>
            <Icon name="close" />
          </button>
        </header>

        <p className="sheet__note">{t("settings.note")}</p>

        <fieldset className="field">
          <legend>{t("settings.appearance")}</legend>
          <div className="segmented" role="radiogroup" aria-label={t("settings.theme")}>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={prefs.theme === theme.id}
                className={prefs.theme === theme.id ? "is-selected" : ""}
                onClick={() => update({ theme: theme.id })}
              >
                <Icon name={theme.icon} size={16} /> {t(theme.id === "dark" ? "settings.dark" : "settings.light")}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="switch-row">
          <div>
            <strong>{t("settings.reduce")}</strong>
            <p>{t("settings.reduce.sub")}</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={prefs.reducedMotion}
              onChange={(event) => update({ reducedMotion: event.target.checked })}
            />
            <span aria-hidden="true" />
            <span className="visually-hidden">{t("settings.reduce.on")}</span>
          </label>
        </div>

        <div className="switch-row">
          <div>
            <strong>{t("settings.sound")}</strong>
            <p>{t("settings.sound.sub")}</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={prefs.sound} onChange={(event) => update({ sound: event.target.checked })} />
            <span aria-hidden="true" />
            <span className="visually-hidden">{t("settings.sound.on")}</span>
          </label>
        </div>

        <label className={`volume ${prefs.sound ? "" : "is-muted"}`}>
          <span>
            <Icon name="sound" size={16} /> {t("settings.volume")}
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
          {onOpenGuide && (
            <button className="secondary full" type="button" onClick={onOpenGuide}>
              <Icon name="info" /> {t("settings.guide")}
            </button>
          )}
          {playing && onTogglePause && (
            <button className="secondary full" type="button" disabled={busy} onClick={onTogglePause}>
              <Icon name={paused ? "play" : "pause"} /> {paused ? t("settings.resume") : t("settings.pause")}
            </button>
          )}
          {adultEnabled && onLeaveAdult && (
            <button className="secondary full" type="button" disabled={busy} onClick={onLeaveAdult}>
              <Icon name="lock" /> {t("settings.adult.off")}
            </button>
          )}
          <button className="secondary full danger" type="button" disabled={busy} onClick={onLeaveRoom}>
            <Icon name="log-out" /> {t("settings.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
