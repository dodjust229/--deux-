import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { GUIDE } from "../lib/guide";
import type { Lang } from "../lib/i18n";

interface GuideProps {
  open: boolean;
  lang: Lang;
  onClose: () => void;
}

/** Guide d'utilisation intégré : consultable avant et pendant une partie, sans quitter l'écran. */
export function Guide({ open, lang, onClose }: GuideProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sections = GUIDE[lang];

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

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <button className="sheet__backdrop" type="button" aria-label={lang === "fr" ? "Fermer le guide" : "Close the guide"} onClick={onClose} />
      <div className="sheet__panel guide">
        <header className="sheet__head">
          <h2 id="guide-title">{lang === "fr" ? "Guide d'utilisation" : "User guide"}</h2>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={lang === "fr" ? "Fermer" : "Close"}>
            <Icon name="close" />
          </button>
        </header>
        <div className="guide__body">
          <nav className="guide__nav" aria-label={lang === "fr" ? "Sommaire" : "Contents"}>
            {sections.map((section, index) => (
              <a key={section.id} href={`#guide-${section.id}`} onClick={(event) => {
                event.preventDefault();
                document.getElementById(`guide-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="guide__content">
            {sections.map((section) => (
              <section key={section.id} id={`guide-${section.id}`} className="guide__section">
                <h3>{section.title}</h3>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </section>
            ))}
            <p className="guide__note">
              {lang === "fr"
                ? "Ce guide décrit uniquement ce qui est réellement disponible aujourd'hui."
                : "This guide only describes what is genuinely available today."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
