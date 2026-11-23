import { asset } from "../lib/assets";

/**
 * QSPICY — le logo officiel fourni par le propriétaire, jamais redessiné.
 * L'image est servie depuis /brand (convertie en WebP, fond bordeaux conservé).
 */
export function Pepper({ className = "" }: { className?: string }) {
  return (
    <svg className={`pepper ${className}`} viewBox="0 0 100 160" aria-hidden="true" focusable="false">
      <path
        className="pepper-body"
        d="M62 22C76 26 84 38 82 52c-2 14-12 24-18 36-7 14-10 30-14 44-2 9-8 18-15 22-6 3-11-3-8-9 7-15 12-31 14-45 2-14-1-24-7-34-6-10-10-20-6-30 4-10 16-16 26-12 3 1 6 0 8-2Z"
      />
      <path
        className="pepper-shine"
        d="M31 38c5-9 15-13 22-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path className="pepper-leaf" d="M64 20c2-10 8-15 16-14-2 8-7 14-14 17Z" />
      <path className="pepper-stem" d="M62 18c4-6 10-10 16-10-4 6-9 10-14 13" fill="none" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
  /** Hauteur du logo en px. */
  size?: number;
  as?: "span" | "h1";
}

export function Wordmark({ className = "", size = 40, as = "span" }: WordmarkProps) {
  const Tag = as;
  return (
    <Tag className={`wordmark ${className}`} style={{ height: `${size}px` }}>
      <img
        className="wordmark__logo"
        src={asset("brand/logo-qspicy.webp")}
        alt="QSPICY"
        width={size}
        height={size}
        decoding="async"
      />
    </Tag>
  );
}
