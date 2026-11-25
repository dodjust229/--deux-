import type { Interaction } from "../types";

/**
 * Pour une question à choix secret, le serveur fournit la liste canonique
 * depuis public.catalog. Elle doit primer sur la copie locale : submit_answer
 * valide exactement contre cette liste en base.
 *
 * Échec fermé : si le champ est absent (ancienne RPC) ou null, ne jamais
 * présenter des choix locaux qui pourraient être rejetés par le serveur.
 */
export function applyServerOptions(
  interaction: Interaction | null,
  serverOptions: unknown
): Interaction | null {
  if (!interaction || interaction.kind !== "secret") return interaction;
  const options = Array.isArray(serverOptions)
    ? serverOptions.filter((option): option is string => typeof option === "string")
    : [];
  return { ...interaction, options };
}
