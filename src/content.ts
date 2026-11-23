import type { Interaction } from "./types";
import catalog from "./catalog.json";

/** Source unique du contenu : src/catalog.json (parsé en JSON, pas de regex).
 *  `npm run catalog:sync` régénère supabase/02_catalog.sql ; `npm run catalog:check` vérifie la cohérence. */
export const interactions = catalog as Interaction[];

export const categoryLabels: Record<string, string> = {
  decouverte: "Découverte", complicite: "Complicité", profondeur: "Profondeur",
  seduction: "Séduction", audacieux: "Audacieux · 18+"
};

export const categoryDescriptions: Record<string, string> = {
  decouverte: "Petits détails, premières impressions.",
  complicite: "Rires, références et fous rires.",
  profondeur: "Confidences et valeurs.",
  seduction: "Regards, tension, attirance.",
  audacieux: "Défis osés, toujours facultatifs."
};

export const kindLabels: Record<Interaction["kind"], string> = {
  free: "Question ouverte",
  secret: "Choix secret",
  prediction: "Prédiction",
  challenge: "Mini-défi · facultatif",
  cross: "Question croisée"
};
