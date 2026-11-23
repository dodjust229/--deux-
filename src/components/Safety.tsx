import { useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { translator, type Lang } from "../lib/i18n";

interface SafetyProps {
  open: boolean;
  lang: Lang;
  onClose: () => void;
  onPause: () => void;
  onQuit: () => void;
  onBlock: () => void;
  canPause?: boolean;
}

/** Panneau SAFE : arrêter tout de suite, sans justification. */
export function Safety({ open, lang, onClose, onPause, onQuit, onBlock, canPause = true }: SafetyProps) {
  const t = translator(lang);
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

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="safe-title">
      <button className="sheet__backdrop" type="button" aria-label={t("settings.close")} onClick={onClose} />
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 id="safe-title">{t("safe.title")}</h2>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label={t("settings.close")}>
            <Icon name="close" />
          </button>
        </header>
        <p className="sheet__note">{t("safe.sub")}</p>
        <div className="sheet__actions">
          {canPause && (
            <button className="secondary full" type="button" onClick={onPause}>
              <Icon name="pause" /> {t("safe.pause")}
            </button>
          )}
          <button className="secondary full" type="button" onClick={onQuit}>
            <Icon name="log-out" /> {t("safe.quit")}
          </button>
          <button className="secondary full danger" type="button" onClick={onBlock}>
            <Icon name="shield" /> {t("safe.block")}
          </button>
          <p className="sheet__note">{t("safe.block.note")}</p>
        </div>
      </div>
    </div>
  );
}
