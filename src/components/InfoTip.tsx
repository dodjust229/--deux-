import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";
import { TIPS, type TipId } from "../lib/guide";
import type { Lang } from "../lib/i18n";

interface InfoTipProps {
  tip: TipId;
  lang: Lang;
  className?: string;
}

/** Petit « ⓘ » contextuel : ouvre une explication courte, sans quitter l'écran. */
export function InfoTip({ tip, lang, className = "" }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const id = useId();
  const content = TIPS[lang][tip];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span className={`info ${className}`} ref={wrapper}>
      <button
        type="button"
        className="info__button"
        aria-label={content.title}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="info" size={15} />
      </button>
      {open && (
        <span className="info__panel" id={id} role="status">
          <strong>{content.title}</strong>
          <span>{content.body}</span>
          <button type="button" className="info__close" onClick={() => setOpen(false)} aria-label={lang === "en" ? "Close" : "Fermer"}>
            <Icon name="close" size={12} />
          </button>
        </span>
      )}
    </span>
  );
}
