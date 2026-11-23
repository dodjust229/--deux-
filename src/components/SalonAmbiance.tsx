export type SalonId = "couple" | "duos" | "side" | "anonymous" | "custom" | "vocal";
export type SalonLevel = 1 | 2 | 3 | 4;

interface SalonAmbianceProps {
  /** Identifiant du salon (mêmes ids que Mode.tsx, plus « vocal »). */
  salon: SalonId;
  /** Palier réel du moteur : interaction.level (1 à 4). */
  level: SalonLevel;
  /** Partie en pause : lumière en suspens, mouvements figés. */
  paused?: boolean;
  /** Réponse envoyée, en attente de l'autre : moment de calme et d'anticipation. */
  waiting?: boolean;
}

const VIEW = { viewBox: "0 0 400 400", preserveAspectRatio: "xMidYMid slice" } as const;
const WAVE = "q50 -26 100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0 t100 0";

function Motif({ salon }: { salon: SalonId }) {
  switch (salon) {
    case "couple":
      return (
        <svg className="salon__svg" {...VIEW}>
          <circle className="m-lens" cx="200" cy="200" r="46" />
          <circle className="m-ring m-a" cx="200" cy="200" r="86" />
          <circle className="m-ring m-b" cx="200" cy="200" r="86" />
        </svg>
      );
    case "duos":
      return (
        <svg className="salon__svg" {...VIEW}>
          <circle className="m-orbit" cx="200" cy="200" r="70" />
          <circle className="m-orbit" cx="200" cy="200" r="104" />
          <g className="m-pa">
            <circle className="m-dot" cx="130" cy="186" r="10" />
            <circle className="m-dot" cx="130" cy="214" r="10" />
          </g>
          <g className="m-pb">
            <circle className="m-dot" cx="304" cy="186" r="10" />
            <circle className="m-dot" cx="304" cy="214" r="10" />
          </g>
        </svg>
      );
    case "side":
      return (
        <svg className="salon__svg" {...VIEW}>
          <g className="m-wrap-a">
            <path className="m-w" d={`M-200 200 ${WAVE}`} />
          </g>
          <g className="m-wrap-b">
            <path className="m-w m-wb" d={`M-200 200 ${WAVE}`} />
          </g>
        </svg>
      );
    case "anonymous":
      return (
        <>
          <div className="m-veil" />
          <svg className="salon__svg" {...VIEW}>
            <ellipse className="m-shade m-s1" cx="120" cy="270" rx="130" ry="56" />
            <ellipse className="m-shade m-s2" cx="290" cy="150" rx="110" ry="48" />
          </svg>
        </>
      );
    case "custom":
      return (
        <>
          <div className="m-blob" />
          <div className="m-blob" />
          <div className="m-blob" />
        </>
      );
    case "vocal":
      return (
        <svg className="salon__svg" {...VIEW}>
          <g className="m-rg m-rg1"><circle className="m-vring" cx="200" cy="165" r="60" /></g>
          <g className="m-rg m-rg2"><circle className="m-vring" cx="200" cy="165" r="60" /></g>
          <g className="m-rg m-rg3"><circle className="m-vring" cx="200" cy="165" r="60" /></g>
          <g className="m-mic">
            <rect x="190" y="144" width="20" height="38" rx="10" />
            <path d="M180 168 a20 20 0 0 0 40 0 M200 188 v14" />
          </g>
          <g className="m-eq">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <rect key={i} x={156 + i * 11} y="276" width="6" height="64" rx="3" />
            ))}
          </g>
        </svg>
      );
  }
}

/**
 * Univers animé d'un salon. Une couche fixe, décorative, derrière le contenu.
 * Tout est piloté par data-level (palier réel du moteur) : aucune logique de jeu ici.
 * CSS et SVG natifs, transform/opacity uniquement, aucune image ni vidéo.
 */
export function SalonAmbiance({ salon, level, paused = false, waiting = false }: SalonAmbianceProps) {
  const state = paused ? "paused" : waiting ? "waiting" : "active";
  return (
    <div className="salon" data-salon={salon} data-level={level} data-state={state} aria-hidden="true">
      <div className="salon__glow" />
      <div className="salon__lamp salon__lamp--a" />
      <div className="salon__lamp salon__lamp--b" />
      <div className="salon__motif">
        <Motif salon={salon} />
      </div>
      <div className="salon__swell" key={level} />
      <div className="salon__vignette" />
    </div>
  );
}
