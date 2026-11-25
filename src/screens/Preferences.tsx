import { Icon } from "../components/Icon";
import { InfoTip } from "../components/InfoTip";
import { translator, type Lang } from "../lib/i18n";
import type { Intensity, Preferences as Prefs } from "../lib/prefs";
import { clampVolume } from "../lib/prefs";

interface PreferencesProps {
  lang: Lang;
  prefs: Prefs;
  onChange: (next: Prefs) => void;
  onContinue: () => void;
  onBack: () => void;
}

const INTENSITIES: { value: Intensity; label: string; description: string }[] = [
  { value: "soft", label: "prefs.intensity.soft", description: "prefs.intensity.soft.desc" },
  { value: "audacious", label: "prefs.intensity.audacious", description: "prefs.intensity.audacious.desc" },
  { value: "all", label: "prefs.intensity.all", description: "prefs.intensity.all.desc" }
];

export function Preferences({ lang, prefs, onChange, onContinue, onBack }: PreferencesProps) {
  const t = translator(lang);
  const set = (patch: Partial<Prefs>) => onChange({ ...prefs, ...patch });

  return (
    <main className="flow page">
      <button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow" size={16} className="flip" /> {t("back")}
      </button>
      <header className="flow__head">
        <span className="eyebrow">QSPICY</span>
        <h1>{t("prefs.title")}</h1>
        <p className="muted">
          {t("prefs.sub")} <InfoTip tip="prefs" lang={lang} />
        </p>
      </header>

      <section className="panel prefs-panel">
        <div className="prefs-row">
          <span className="prefs-row__label">{t("prefs.language")}</span>
          <div className="segmented compact" role="radiogroup" aria-label={t("prefs.language")}>
            {(["fr", "en"] as Lang[]).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={prefs.language === value} className={prefs.language === value ? "is-selected" : ""} onClick={() => set({ language: value })}>
                {value === "fr" ? "Français" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="prefs-row">
          <span className="prefs-row__label">{t("prefs.theme")}</span>
          <div className="segmented compact" role="radiogroup" aria-label={t("prefs.theme")}>
            {(["dark", "light"] as const).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={prefs.theme === value} className={prefs.theme === value ? "is-selected" : ""} onClick={() => set({ theme: value })}>
                <Icon name={value === "dark" ? "moon" : "sun"} size={15} /> {t(value === "dark" ? "settings.dark" : "settings.light")}
              </button>
            ))}
          </div>
        </div>

        <div className="prefs-block">
          <span className="prefs-row__label">{t("prefs.intensity")}</span>
          <div className="intensity-grid" role="radiogroup" aria-label={t("prefs.intensity")}>
            {INTENSITIES.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                role="radio"
                data-testid={"prefs-ambience-" + value}
                aria-checked={prefs.intensity === value}
                className={"intensity intensity--" + value + (prefs.intensity === value ? " is-selected" : "")}
                onClick={() => set({ intensity: value })}
              >
                <strong>{t(label as "prefs.intensity.soft" | "prefs.intensity.audacious" | "prefs.intensity.all")}</strong>
                <small>{t(description as "prefs.intensity.soft.desc" | "prefs.intensity.audacious.desc" | "prefs.intensity.all.desc")}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="prefs-row">
          <span className="prefs-row__label">{t("prefs.sound")}</span>
          <label className="switch">
            <input type="checkbox" checked={prefs.sound} onChange={(event) => set({ sound: event.target.checked })} />
            <span aria-hidden="true" />
            <span className="visually-hidden">{t("prefs.sound")}</span>
          </label>
        </div>
        {prefs.sound && (
          <label className="volume">
            <span><Icon name="sound" size={16} /> {t("settings.volume")}</span>
            <input type="range" min={0} max={100} step={5} value={Math.round(prefs.volume * 100)} onChange={(event) => set({ volume: clampVolume(Number(event.target.value) / 100) })} />
            <output>{Math.round(prefs.volume * 100)} %</output>
          </label>
        )}

        <div className="prefs-row">
          <span className="prefs-row__label">{t("prefs.motion")}</span>
          <div className="segmented compact" role="radiogroup" aria-label={t("prefs.motion")}>
            {([false, true] as const).map((reduced) => (
              <button key={String(reduced)} type="button" role="radio" aria-checked={prefs.reducedMotion === reduced} className={prefs.reducedMotion === reduced ? "is-selected" : ""} onClick={() => set({ reducedMotion: reduced })}>
                {t(reduced ? "prefs.motion.reduced" : "prefs.motion.normal")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button className="primary full" type="button" data-testid="prefs-continue" onClick={onContinue}>
        {t("prefs.continue")} <Icon name="arrow" />
      </button>
    </main>
  );
}
