import type { SVGProps } from "react";

/** Petites icônes intégrées (aucune bibliothèque d'icônes, aucun paquet supplémentaire). */
const PATHS = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  link: "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1",
  copy: "M9 9h10v10H9zM5 15H4V4h11v1",
  users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 4.5a3.5 3.5 0 0 1 0 6.6M21 20v-1a4 4 0 0 0-3-3.8",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15",
  shield: "M12 3l8 3v6c0 4.5-3.2 8.4-8 9-4.8-.6-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7",
  check: "M20 6L9 17l-5-5",
  skip: "M5 5l9 7-9 7zM19 5v14",
  pause: "M9 5v14M15 5v14",
  play: "M8 5l11 7-11 7z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.7H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z",
  rotate: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  wifiOff: "M2 2l20 20M8.5 8.6a11 11 0 0 1 12 2.1M5 12.5a11 11 0 0 1 4-2.2M8.5 15.9a6 6 0 0 1 7 0M12 19.5h.01",
  close: "M6 6l12 12M18 6L6 18",
  sticker: "M20 12a8 8 0 1 0-8 8h4l4-4v-4zM9 9h.01M15 9h.01M9 13.5c1.6 1.6 4.4 1.6 6 0",
  gif: "M4 5h16v14H4zM9 10h-2v4h2v-1.5H8.5M12 10v4M15 14v-4h3M15 12h2",
  image: "M4 5h16v14H4zM4 15l4.5-4.5 4 4 3-2.5L20 16M8.5 9.5h.01",
  heart: "M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 7.5a4.1 4.1 0 0 1 7 3.1C19 15.4 12 20 12 20z",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M21 13.2A8.5 8.5 0 1 1 10.8 3a7 7 0 0 0 10.2 10.2z",
  sound: "M4 9v6h4l5 4V5L8 9H4M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6l1-8z",
  "log-out": "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  quote: "M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4"
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
