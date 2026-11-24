import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { Preferences, Theme, Ambience } from "../lib/prefs";
import type { Lang } from "../lib/i18n";
import { translator } from "../lib/i18n";
import { useFocusTrap } from "../lib/useFocusTrap";
import { getActiveAmbience, setAmbience, stopAmbience } from "../lib/sound";

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

export function Settings({
  open, prefs, onChange, onClose, playing, paused, onTogglePause,
  adultEnabled, onLeaveAdult, onLeaveRoom, onOpenGuide, lang = "fr", busy
}: SettingsProps) {
  const t = translator(lang);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [ambienceActive, setAmbienceActive] = useState(false);

  useFocusTrap(open, { onClose, container: panelRef, initial: closeRef });
  useEffect(() => {
    if (open) setAmbienceActive(getActiveAmbience() !== "off");
  }, [open]);
  if (!open) return null;

  const update = (patch: Partial<Preferences>) => onChange({ ...prefs, ...patch });
  const startAmbience = () => {
    if (prefs.ambience === "off") return;
    setAmbience(prefs.ambience, prefs.volume);
    setAmbienceActive(true);
  };
  const changeAmbience = (value: Ambience) => {
    update({ ambience: value });
    if (ambienceActive) {
      setAmbience(value, prefs.volume);
      if (value === "off") setAmbienceActive(false);
    }
  };
  const changeVolume = (value: number) => {
    update({ volume: value });
    if (ambienceActive && value > 0) setAmbience(prefs.ambience, value);
    else if (value <= 0) { stopAmbience(); setAmbienceActive(false); }
  };
  const stop = () => {
    stopAmbience();
    setAmbienceActive(false);
  };

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
              <button key={theme.id} type="button" role="radio" aria-checked={prefs.theme === theme.id}
                className={prefs.theme === theme.id ? "is-selected" : ""}
                onClick={() => update({ theme: theme.id })}>
                <Icon name={theme.icon} size={16} /> {t(theme.id === "dark" ? "settings.dark" : "settings.light")}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="switch-row">
          <div><strong>{t("settings.reduce")}</strong><p>{t("settings.reduce.sub")}</p></div>
          <label className="switch">
            <input type="checkbox" checked={prefs.reducedMotion} onChange={(event) => update({ reducedMotion: event.target.checked })} />
            <span aria-hidden="true" /><span className="visually-hidden">{t("settings.reduce.on")}</span>
          </label>
        </div>

        <div className="switch-row">
          <div><strong>{t("settings.sound")}</strong><p>{t("settings.sound.sub")}</p></div>
          <label className="switch">
            <input type="checkbox" checked={prefs.sound} onChange={(event) => update({ sound: event.target.checked })} />
            <span aria-hidden="true" /><span className="visually-hidden">{t("settings.sound.on")}</span>
          </label>
        </div>

        <section className="ambience-control" aria-labelledby="ambience-title">
          <div className="ambience-control__intro">
            <strong id="ambience-title">{lang === "en" ? "Room atmosphere" : "Ambiance du salon"}</strong>
            <p>{lang === "en" ? "Soft, original soundscapes made in your browser. Nothing is streamed." : "Des nappes sonores originales, générées dans ton navigateur. Aucun morceau n'est diffusé."}</p>
          </div>
          <label className="ambience-control__label" htmlFor="qspicy-ambience">{lang === "en" ? "Choose a soundscape" : "Choisir une ambiance"}</label>
          <select id="qspicy-ambience" value={prefs.ambience} onChange={(event) => changeAmbience(event.target.value as Ambience)}>
            <option value="off">{lang === "en" ? "Off" : "Désactivée"}</option>
            <option value="lounge">{lang === "en" ? "Warm lounge · soft tones" : "Lounge chaleureux · notes douces"}</option>
            <option value="velvet">{lang === "en" ? "Velvet · deep atmosphere" : "Velours · ambiance profonde"}</option>
            <option value="rain">{lang === "en" ? "Rain · calm background" : "Pluie · fond apaisant"}</option>
          </select>
          <button className="secondary full" type="button" disabled={prefs.ambience === "off" && !ambienceActive}
            onClick={() => ambienceActive ? stop() : startAmbience()}>
            <Icon name="sound" size={17} />
            {ambienceActive
              ? (lang === "en" ? "Turn atmosphere off" : "Couper l'ambiance")
              : (lang === "en" ? "Play atmosphere" : "Lancer l'ambiance")}
          </button>
          <p className="ambience-control__hint">{lang === "en" ? "Starts only after your tap. Local to this device; headphones recommended." : "Démarre uniquement après ton clic. Réglage propre à cet appareil ; casque conseillé."}</p>
        </section>

        <label className={`volume ${prefs.sound || ambienceActive ? "" : "is-muted"}`}>
          <span><Icon name="sound" size={16} /> {t("settings.volume")}</span>
          <input type="range" min={0} max={100} step={5} value={Math.round(prefs.volume * 100)}
            onChange={(event) => changeVolume(Number(event.target.value) / 100)} />
          <output>{Math.round(prefs.volume * 100)} %</output>
        </label>

        <div className="sheet__actions">
          {onOpenGuide && <button className="secondary full" type="button" onClick={onOpenGuide}><Icon name="info" /> {t("settings.guide")}</button>}
          {playing && onTogglePause && <button className="secondary full" type="button" disabled={busy} onClick={onTogglePause}>
            <Icon name={paused ? "play" : "pause"} /> {paused ? t("settings.resume") : t("settings.pause")}
          </button>}
          {adultEnabled && onLeaveAdult && <button className="secondary full" type="button" disabled={busy} onClick={onLeaveAdult}>
            <Icon name="lock" /> {t("settings.adult.off")}
          </button>}
          <button className="secondary full danger" type="button" disabled={busy} onClick={onLeaveRoom}>
            <Icon name="log-out" /> {t("settings.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
