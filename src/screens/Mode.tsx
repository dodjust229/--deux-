import { Icon } from "../components/Icon";
import { translator, type Lang } from "../lib/i18n";
import { DUOS_ENABLED, VOICE_ENABLED } from "../lib/flags";

interface ModeProps {
  lang: Lang;
  onSelect: (mode: "couple" | "duos") => void;
  onBack: () => void;
}

export function Mode({ lang, onSelect, onBack }: ModeProps) {
  const t = translator(lang);
  const modes = [
    { id: "couple", title: t("mode.couple"), desc: t("mode.couple.desc"), icon: "heart" as const, available: true },
    { id: "side", title: t("mode.side"), desc: t("mode.side.desc"), icon: "users" as const, available: false },
    { id: "anonymous", title: t("mode.anonymous"), desc: t("mode.anonymous.desc"), icon: "lock" as const, available: false },
    { id: "custom", title: t("mode.custom"), desc: t("mode.custom.desc"), icon: "sparkles" as const, available: false },
    { id: "duos", title: t("mode.duos"), desc: t("mode.duos.desc"), icon: "bolt" as const, available: DUOS_ENABLED }
  ];

  return (
    <main className="flow page">
      <button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow" size={16} className="flip" /> {t("back")}
      </button>
      <header className="flow__head">
        <span className="eyebrow">QSPICY</span>
        <h1>{t("mode.title")}</h1>
        <p className="muted">{t("mode.sub")}</p>
      </header>

      <ul className="mode-list">
        {modes.map((mode) => (
          <li key={mode.id}>
            <button
              type="button"
              className={`mode-card ${mode.available ? "" : "is-locked"}`}
              data-testid={`mode-${mode.id}`}
              disabled={!mode.available}
              onClick={() => mode.available && onSelect(mode.id === "duos" ? "duos" : "couple")}
            >
              <span className="mode-card__icon"><Icon name={mode.icon} /></span>
              <span className="mode-card__body">
                <strong>{mode.title}</strong>
                <small>{mode.desc}</small>
              </span>
              {mode.available ? <Icon name="arrow" /> : <span className="mode-card__soon">{t("mode.soon")}</span>}
            </button>
          </li>
        ))}
      </ul>

      {!VOICE_ENABLED && <p className="flow__note">Le mode vocal n'est pas encore disponible.</p>}
    </main>
  );
}
