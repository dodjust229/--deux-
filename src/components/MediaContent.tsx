import { useEffect, useState } from "react";
import { Pepper } from "./Brand";
import { Icon } from "./Icon";
import { STICKERS, stickerLabel, type Content, type StickerId } from "../lib/media";

/** Sticker statique : dessin vectoriel intégré, jamais une commande brute affichée telle quelle. */
export function Sticker({ id, size = 96 }: { id: StickerId; size?: number }) {
  const label = stickerLabel(id);
  return (
    <span className="sticker" role="img" aria-label={`Sticker : ${label}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <StickerArt id={id} />
      </svg>
    </span>
  );
}

function Face({ eyes, mouth }: { eyes: "open" | "wink" | "closed" | "tears"; mouth: "smile" | "laugh" | "pout" | "shh" | "o" }) {
  return (
    <g>
      <circle cx="50" cy="50" r="34" fill="var(--sticker-face)" />
      {eyes === "open" && (
        <>
          <circle cx="38" cy="44" r="4" fill="var(--sticker-ink)" />
          <circle cx="62" cy="44" r="4" fill="var(--sticker-ink)" />
        </>
      )}
      {eyes === "wink" && (
        <>
          <circle cx="38" cy="44" r="4" fill="var(--sticker-ink)" />
          <path d="M56 44q6 5 12 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {eyes === "closed" && (
        <>
          <path d="M33 45q5-6 10 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M57 45q5-6 10 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {eyes === "tears" && (
        <>
          <path d="M33 44q5-6 10 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M57 44q5-6 10 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 50q-3 7 1 9 4-2 2-9" fill="#7fc7e8" />
          <path d="M70 50q3 7-1 9-4-2-2-9" fill="#7fc7e8" />
        </>
      )}
      {mouth === "smile" && <path d="M40 58q10 10 20 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3.4" strokeLinecap="round" />}
      {mouth === "laugh" && <path d="M38 56q12 18 24 0z" fill="var(--sticker-ink)" />}
      {mouth === "pout" && <path d="M43 62q7-7 14 0" fill="none" stroke="var(--sticker-ink)" strokeWidth="3.4" strokeLinecap="round" />}
      {mouth === "shh" && (
        <>
          <path d="M42 60h16" stroke="var(--sticker-ink)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M50 64v14" stroke="var(--sticker-face)" strokeWidth="5" />
          <path d="M50 66c0-6 0-9 0-12" stroke="var(--sticker-ink)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {mouth === "o" && <ellipse cx="50" cy="61" rx="5" ry="6" fill="var(--sticker-ink)" />}
    </g>
  );
}

function StickerArt({ id }: { id: StickerId }) {
  switch (id) {
    case "coeur":
      return <path d="M50 82C32 69 18 58 18 44a16 16 0 0 1 32-6 16 16 0 0 1 32 6c0 14-14 25-32 38z" fill="var(--sticker-accent)" />;
    case "piment":
      return (
        <g transform="translate(28 12) scale(0.62)">
          <Pepper />
        </g>
      );
    case "etincelle":
      return (
        <g fill="var(--sticker-accent)">
          <path d="M50 12l7 24 24 7-24 7-7 24-7-24-24-7 24-7z" />
          <circle cx="20" cy="22" r="4" opacity="0.7" />
          <circle cx="82" cy="76" r="5" opacity="0.6" />
        </g>
      );
    case "bravo":
      return (
        <g fill="none" stroke="var(--sticker-accent)" strokeWidth="5" strokeLinecap="round">
          <path d="M50 22v14M24 34l10 10M76 34L66 44M18 62h14M82 62H68" />
          <path d="M38 62l12 8 12-8" />
          <circle cx="50" cy="52" r="20" stroke="var(--sticker-ink)" strokeWidth="3" opacity="0.35" />
        </g>
      );
    case "clin":
      return <Face eyes="wink" mouth="smile" />;
    case "rire":
      return <Face eyes="closed" mouth="laugh" />;
    case "fou-rire":
      return <Face eyes="tears" mouth="laugh" />;
    case "chut":
      return <Face eyes="closed" mouth="shh" />;
    case "boude":
      return <Face eyes="open" mouth="pout" />;
    case "susurre":
      return <Face eyes="closed" mouth="o" />;
  }
}

interface MediaViewProps {
  content: Content;
  compact?: boolean;
}

/** Rendu d'un contenu typé : texte, sticker, GIF animé, ou fallback explicite. */
export function MediaView({ content, compact = false }: MediaViewProps) {
  if (content.kind === "text") {
    return <p className="content-text">{content.text}</p>;
  }
  if (content.kind === "sticker") {
    return (
      <div className={`content-sticker ${compact ? "is-compact" : ""}`}>
        <Sticker id={content.id} size={compact ? 64 : 92} />
        <span className="content-sticker__label">{stickerLabel(content.id)}</span>
      </div>
    );
  }
  if (content.kind === "gif") {
    return <GifFrame url={content.url} compact={compact} />;
  }
  return (
    <p className="content-fallback" role="status">
      <Icon name="image" size={16} /> Ce média n'a pas pu être affiché.
    </p>
  );
}

function GifFrame({ url, compact }: { url: string; compact?: boolean }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Un GIF qui ne répond pas ne doit pas laisser un squelette éternel.
  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setStatus((current) => (current === "loading" ? "error" : current)), 8000);
    return () => window.clearTimeout(timer);
  }, [status, url]);
  return (
    <figure className={`gif ${compact ? "is-compact" : ""} is-${status}`}>
      {status !== "error" && (
        <img
          src={url}
          alt="GIF animé partagé"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && <span className="gif__skeleton" aria-hidden="true" />}
      {status === "error" && (
        <p className="gif__fallback" role="status">
          <Icon name="image" size={16} /> GIF indisponible : le lien ne répond pas.
        </p>
      )}
      {status === "ready" && <figcaption className="gif__caption">GIF animé</figcaption>}
    </figure>
  );
}

/** Aperçu avant envoi : le joueur voit exactement ce que l'autre recevra. */
export function MediaComposerPreview({ content, onRemove }: { content: Content; onRemove: () => void }) {
  return (
    <div className="composer-preview">
      <MediaView content={content} compact />
      <button type="button" className="composer-preview__remove" onClick={onRemove}>
        <Icon name="close" size={14} /> Retirer
      </button>
    </div>
  );
}

export const STICKER_CHOICES: readonly { id: StickerId; label: string }[] = STICKERS.map((sticker) => ({
  id: sticker.id,
  label: sticker.label
}));
