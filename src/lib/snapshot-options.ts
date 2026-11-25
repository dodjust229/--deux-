import type { Interaction } from "../types";

/**
 * Pour une question à choix secret, le serveur fournit la liste canonique
 * depuis public.catalog. Elle doit primer sur la copie locale du catalogue :
 * submit_answer valide exactement contre cette liste en base.
 */
export function applyServerOptions(
  interaction: Interaction | null,
  serverOptions: unknown
): Interaction | null {
  if (!interaction || interaction.kind !== "secret" || serverOptions === undefined) {
    return interaction;
  }
  const options = Array.isArray(serverOptions)
    ? serverOptions.filter((option): option is string => typeof option === "string")
    : [];
  return { ...interaction, options };
}
