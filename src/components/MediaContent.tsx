import { Icon } from "./Icon";
import type { Content } from "../lib/media";

/** Rendu d'une réponse : texte, confidence privée, ou média historique retiré. */
export function MediaView({ content }: { content: Content; compact?: boolean }) {
  if (content.kind === "text") {
    return <p className="content-text">{content.text}</p>;
  }
  if (content.kind === "private") {
    return (
      <p className="content-private">
        <Icon name="lock" size={14} /> Confidence gardée pour soi.
      </p>
    );
  }
  return (
    <p className="content-fallback">
      <Icon name="image" size={16} /> Média retiré : les stickers et GIF ne font plus partie du jeu.
    </p>
  );
}
