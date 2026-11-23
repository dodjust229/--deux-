import { useRef } from "react";
import { Icon } from "./Icon";
import { GUIDE } from "../lib/guide";
import type { Lang } from "../lib/i18n";
import { useFocusTrap } from "../lib/useFocusTrap";

interface GuideProps {
  open: boolean;
  lang: Lang;
  onClose: () => void;
  /** Respecte la préférence de réduction des animations, défilement du sommaire compris. */
  reducedMotion?: boolean;
}

/** Guide d'utilisation intégré : consultable avant et pendant une partie, sans quitter l'écran. */
export function Guide({ open, lang, onClose, reducedMotion = false }: GuideProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sections = GUIDE[lang];
  const en = lang === "en";

  useFocusTrap(open, { onClose, container: panelRef, initial: closeRef });

  if (!open) return null;

  const jump = (id: string) => {
    const target = document.getElementById(`guide-${id}`);
    const scroller = contentRef.current;
    if (!target || !scroller) return;
    const top = target.offsetTop - scroller.offsetTop;
    scroller.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <button className="sheet__backdrop" type="button" aria-label={en ? "Close the guide" : "Fermer le guide"} onClick={onClose} />
      <div className="sheet__panel guide" ref={panelRef}>
        <header className="sheet__head">
          <h2 id="guide-title">{en ? "User guide" : "Guide d'utilisation"}</h2>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}>
            <Icon name="close" />
          </button>
        </header>
        <div className="guide__body">
          <nav className="guide__nav" aria-label={en ? "Contents" : "Sommaire"}>
            {sections.map((section, index) => (
              <a
                key={section.id}
                href={`#guide-${section.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  jump(section.id);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="guide__content" ref={contentRef}>
            {sections.map((section) => (
              <section key={section.id} id={`guide-${section.id}`} className="guide__section" tabIndex={-1}>
                <h3>{section.title}</h3>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </section>
            ))}
            <p className="guide__note">
              {en
                ? "This guide only describes what is genuinely available today."
                : "Ce guide décrit uniquement ce qui est réellement disponible aujourd'hui."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
