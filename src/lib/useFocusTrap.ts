import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

/**
 * Fenêtre modale accessible : focus donné à l'ouverture, focus gardé à l'intérieur tant
 * qu'elle est ouverte (Tab et Maj+Tab bouclent), Échap ferme, et le focus revient à
 * l'élément qui a ouvert la fenêtre. Le défilement du document est bloqué pendant l'ouverture.
 */
export function useFocusTrap(
  open: boolean,
  options: {
    onClose: () => void;
    container: RefObject<HTMLElement | null>;
    initial?: RefObject<HTMLElement | null>;
  }
) {
  const { onClose, container, initial } = options;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInside = () => {
      const root = container.current;
      if (!root) return;
      const target = initial?.current ?? root.querySelector<HTMLElement>(FOCUSABLE) ?? root;
      target.focus({ preventScroll: true });
    };
    // Un tour de boucle : le contenu de la fenêtre est monté avant de placer le focus.
    const timer = window.setTimeout(focusInside, 0);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const root = container.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null || item === document.activeElement
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, onClose, container, initial]);
}
