import { useEffect, useRef } from "react";

interface AtmosphereProps {
  variant?: "duo" | "duos";
  /** Densité des particules ; réduite automatiquement si les animations sont réduites. */
  density?: number;
}

/**
 * Ambiance de salon : particules dorées lentes (À Deux) ou trajectoires orbitales (DUOS).
 * Canvas léger, une seule boucle, pause quand l'onglet est masqué.
 */
export function Atmosphere({ variant = "duo", density = 42 }: AtmosphereProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced =
      document.documentElement.dataset.motion === "reduced" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const count = reduced ? Math.round(density / 3) : density;
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const dots = Array.from({ length: count }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      r: variant === "duos" ? 0.8 + Math.random() * 1.6 : 0.9 + Math.random() * 1.8,
      speed: variant === "duos" ? 0.00025 + Math.random() * 0.0005 : 0.00012 + Math.random() * 0.00028,
      drift: (Math.random() - 0.5) * (variant === "duos" ? 0.0009 : 0.00035),
      phase: index * 0.7,
      hue: variant === "duos" && index % 3 === 0 ? "rose" : "gold"
    }));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (const dot of dots) {
        if (!reduced) {
          dot.y -= dot.speed;
          dot.x += dot.drift;
          if (dot.y < -0.05) dot.y = 1.05;
          if (dot.x < -0.05) dot.x = 1.05;
          if (dot.x > 1.05) dot.x = -0.05;
        }
        const twinkle = 0.35 + 0.35 * Math.sin(time / 1800 + dot.phase);
        const x = dot.x * width;
        const y = dot.y * height;
        const gradient = context.createRadialGradient(x, y, 0, x, y, dot.r * 6);
        gradient.addColorStop(0, dot.hue === "rose" ? `rgba(224, 150, 160, ${twinkle})` : `rgba(240, 192, 106, ${twinkle})`);
        gradient.addColorStop(1, "rgba(240, 192, 106, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, dot.r * 6, 0, Math.PI * 2);
        context.fill();
      }
      if (variant === "duos") {
        context.strokeStyle = "rgba(240, 192, 106, 0.06)";
        context.lineWidth = 1;
        for (let ring = 1; ring <= 2; ring += 1) {
          context.beginPath();
          context.ellipse(width / 2, height * 0.45, width * 0.22 * ring, height * 0.12 * ring, -0.35, 0, Math.PI * 2);
          context.stroke();
        }
      }
    };

    const loop = (time: number) => {
      if (!visible) return;
      paint(time);
      frame = window.requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      window.cancelAnimationFrame(frame);
      if (visible && !reduced) frame = window.requestAnimationFrame(loop);
    };

    resize();
    paint(0);
    if (!reduced) frame = window.requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant, density]);

  return <canvas ref={ref} className="atmosphere" aria-hidden="true" />;
}
