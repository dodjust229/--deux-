import { translator, type Lang } from "../lib/i18n";
import { levelNames } from "../content";

/**
 * Écran de transition de niveau : une phrase, puis la partie reprend.
 * Le palier pilote l'intensité visuelle (data-level) : plus on monte, plus la
 * lumière se resserre et la teinte chauffe. Purement décoratif.
 */
export function LevelCurtain({ level, lang }: { level: 1 | 2 | 3 | 4; lang: Lang }) {
  const t = translator(lang);
  return (
    <div className="curtain" data-level={level} role="status" aria-live="polite">
      <span className="curtain__halo" aria-hidden="true" />
      <span className="curtain__eyebrow">{t("level.transition", { n: level })}</span>
      <strong>{levelNames[level]}</strong>
      <span className="curtain__pips" aria-hidden="true">
        {[1, 2, 3, 4].map((pip) => (
          <i key={pip} className={pip <= level ? "is-on" : ""} />
        ))}
      </span>
    </div>
  );
}
