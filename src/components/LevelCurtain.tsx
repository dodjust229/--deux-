import { translator, type Lang } from "../lib/i18n";
import { levelNames } from "../content";

/** Écran sombre de transition de niveau : une phrase, puis la partie reprend. */
export function LevelCurtain({ level, lang }: { level: 1 | 2 | 3 | 4; lang: Lang }) {
  const t = translator(lang);
  return (
    <div className="curtain" role="status" aria-live="polite">
      <span className="curtain__eyebrow">{t("level.transition", { n: level })}</span>
      <strong>{levelNames[level]}</strong>
    </div>
  );
}
