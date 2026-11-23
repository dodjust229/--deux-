import type { CharacterState } from "../lib/scene";

export type Persona = "masculin" | "feminin";

interface CharacterProps {
  persona: Persona;
  state?: CharacterState;
  name?: string;
  /** Met en lumière le personnage qui a la parole ou qui attend une réponse. */
  active?: boolean;
  /** Miroir pour distinguer deux joueurs ayant choisi le même personnage. */
  mirrored?: boolean;
  size?: number;
  className?: string;
}

const STATE_LABEL: Record<CharacterState, string> = {
  idle: "au repos",
  listening: "à l'écoute",
  speaking: "prend la parole",
  thinking: "réfléchit",
  amused: "s'amuse",
  surprised: "est surpris",
  shy: "est gêné",
  reacting: "réagit",
  celebrating: "célèbre"
};

/**
 * Personnage illustré en SVG : deux identités complémentaires (« Tao » et « Naya »),
 * expressions et gestes pilotés par l'état réel de la partie.
 */
export function Character({
  persona,
  state = "idle",
  name,
  active = false,
  mirrored = false,
  size = 210,
  className = ""
}: CharacterProps) {
  const isTao = persona === "masculin";
  const id = isTao ? "tao" : "naya";
  const label = `${isTao ? "Tao" : "Naya"}${name ? `, ${name}` : ""}, ${STATE_LABEL[state]}`;

  return (
    <div
      className={`character character--${id} ${active ? "is-active" : ""} ${mirrored ? "is-mirrored" : ""} ${className}`}
      data-state={state}
      style={{ height: `${size}px` }}
    >
      <div className="character__frame">
      <svg viewBox="0 0 200 340" role="img" aria-label={label} className="character__svg">
        <defs>
          <linearGradient id={`skin-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isTao ? "#e9b892" : "#f4cbaa"} />
            <stop offset="100%" stopColor={isTao ? "#c68a63" : "#dda57f"} />
          </linearGradient>
          <linearGradient id={`cloth-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isTao ? "#7a2233" : "#b9793f"} />
            <stop offset="100%" stopColor={isTao ? "#43101d" : "#7c4a25"} />
          </linearGradient>
          <linearGradient id={`hair-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isTao ? "#2b2220" : "#5b2a20"} />
            <stop offset="100%" stopColor={isTao ? "#151011" : "#33170f"} />
          </linearGradient>
          <radialGradient id={`halo-${id}`} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={isTao ? "#e0344a" : "#e0a458"} stopOpacity="0.35" />
            <stop offset="100%" stopColor={isTao ? "#e0344a" : "#e0a458"} stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="character__shadow" cx="100" cy="330" rx="56" ry="8" />
        <circle className="character__halo" cx="100" cy="150" r="98" fill={`url(#halo-${id})`} />

        {/* Bras arrière */}
        <g className="character__arm character__arm--back">
          <path d="M152 210 C 162 240 160 268 154 286" fill="none" stroke={`url(#cloth-${id})`} strokeWidth="26" strokeLinecap="round" />
          <path d="M154 286 C 154 296 148 302 142 300" fill="none" stroke={`url(#skin-${id})`} strokeWidth="20" strokeLinecap="round" />
        </g>

        {/* Torse */}
        <g className="character__body">
          <path
            className="character__cloth"
            d="M100 180 C 68 180 46 198 38 234 L 30 330 Q 30 336 36 336 H 164 Q 170 336 170 330 L 162 234 C 154 198 132 180 100 180 Z"
            fill={`url(#cloth-${id})`}
          />
          <path className="character__collar" d="M80 184 C 88 200 112 200 120 184" fill="none" stroke={isTao ? "#d8a06a" : "#f0d2ab"} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
          <path d="M100 198 L 100 336" stroke="#00000022" strokeWidth="2" />
          {isTao ? (
            <>
              <circle cx="100" cy="222" r="2.6" fill="#d8a06a" opacity="0.7" />
              <circle cx="100" cy="252" r="2.6" fill="#d8a06a" opacity="0.55" />
            </>
          ) : (
            <path d="M78 196 C 92 214 108 214 122 196" fill="none" stroke="#f0d2ab" strokeWidth="2.4" opacity="0.6" />
          )}
        </g>

        {/* Cou et tête */}
        <g className="character__head">
          <path d="M90 154 h20 v26 h-20 z" fill={isTao ? "#c1885f" : "#d99f78"} />
          <circle cx="55" cy="122" r="7.5" fill={`url(#skin-${id})`} />
          <circle cx="145" cy="122" r="7.5" fill={`url(#skin-${id})`} />

          {!isTao && (
            <path
              className="character__hair-back"
              d="M56 96 C 54 58 74 40 100 40 C 126 40 146 58 144 96 C 146 132 150 178 156 224 C 158 238 148 248 138 242 C 128 236 124 212 122 192 C 120 162 118 132 112 114 L 88 114 C 82 132 80 162 78 192 C 76 212 72 236 62 242 C 52 248 42 238 44 224 C 50 178 54 132 56 96 Z"
              fill={`url(#hair-${id})`}
            />
          )}

          <ellipse cx="100" cy="118" rx="45" ry="51" fill={`url(#skin-${id})`} />
          <path className="character__brow" d="M70 104 Q 80 99 90 103" fill="none" stroke={isTao ? "#241a18" : "#3a1c14"} strokeWidth="3" strokeLinecap="round" />
          <path className="character__brow character__brow--right" d="M110 103 Q 120 99 130 104" fill="none" stroke={isTao ? "#241a18" : "#3a1c14"} strokeWidth="3" strokeLinecap="round" />

          <g className="character__eyes">
            <g className="character__eye character__eye--left">
              <ellipse cx="81" cy="120" rx="5.4" ry="6.4" fill="#2a1b18" />
              <circle className="character__glint" cx="79.4" cy="118" r="1.5" fill="#fff" opacity="0.85" />
            </g>
            <g className="character__eye character__eye--right">
              <ellipse cx="119" cy="120" rx="5.4" ry="6.4" fill="#2a1b18" />
              <circle className="character__glint" cx="117.4" cy="118" r="1.5" fill="#fff" opacity="0.85" />
            </g>
          </g>

          <path className="character__nose" d="M100 126 C 98 132 97 136 101 138" fill="none" stroke={isTao ? "#a86f4a" : "#c1855e"} strokeWidth="2.2" strokeLinecap="round" />
          <ellipse className="character__blush" cx="70" cy="136" rx="8" ry="4" fill="#d9665d" opacity="0.18" />
          <ellipse className="character__blush character__blush--right" cx="130" cy="136" rx="8" ry="4" fill="#d9665d" opacity="0.18" />

          <path className="character__mouth character__mouth--line" d="M92 149 Q 100 153 108 149" fill="none" stroke="#7d3a34" strokeWidth="2.6" strokeLinecap="round" />
          <path className="character__mouth character__mouth--smile" d="M87 146 Q 100 160 113 146" fill="none" stroke="#7d3a34" strokeWidth="3" strokeLinecap="round" />
          <ellipse className="character__mouth character__mouth--open" cx="100" cy="151" rx="6.5" ry="7.5" fill="#6d2f2d" />

          {isTao ? (
            <path className="character__hair" d="M55 116 C 50 72 73 50 100 50 C 127 50 150 72 145 116 C 141 95 129 86 117 86 C 109 97 91 97 83 86 C 71 86 59 95 55 116 Z" fill={`url(#hair-${id})`} />
          ) : (
            <path className="character__hair" d="M57 106 C 59 70 78 50 100 50 C 122 50 141 70 143 106 C 135 86 121 79 108 85 C 96 91 82 90 70 84 C 64 90 59 97 57 106 Z" fill={`url(#hair-${id})`} />
          )}
          {!isTao && <circle cx="147" cy="137" r="2.6" fill="#e0a458" />}
          {isTao && <path d="M88 160 C 94 168 106 168 112 160" fill="none" stroke="#d8a06a" strokeWidth="1.8" opacity="0.5" />}
        </g>

        {/* Bras avant */}
        <g className="character__arm character__arm--front">
          <path d="M48 208 C 38 240 40 268 46 288" fill="none" stroke={`url(#cloth-${id})`} strokeWidth="27" strokeLinecap="round" />
          <path d="M46 288 C 45 298 50 304 56 302" fill="none" stroke={`url(#skin-${id})`} strokeWidth="20" strokeLinecap="round" />
        </g>
      </svg>
      </div>
    </div>
  );
}

export const PERSONA_NAME: Record<Persona, string> = { masculin: "Tao", feminin: "Naya" };
export const PERSONA_TRAIT: Record<Persona, string> = {
  masculin: "Voix posée, regard qui s'allume.",
  feminin: "Sourire malicieux, franc-parler."
};
