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

export const levelLabels: Record<number, string> = {
  1: "Niveau 1",
  2: "Niveau 2",
  3: "Niveau 3",
  4: "Niveau 4"
};

export const levelNames: Record<number, string> = {
  1: "Ça commence à piquer",
  2: "La tension monte",
  3: "Confidences",
  4: "Sans filtre"
};

export const audienceLabels: Record<Interaction["audience"], string> = {
  partner: "Pour vous deux",
  own_duo: "Pour votre duo",
  other_duo: "Pour l'autre duo",
  all_players: "Pour les quatre",
  individual_choice: "À toi de choisir qui l'entend"
};

export const kindLabels: Record<Interaction["kind"], string> = {
  free: "Question ouverte",
  secret: "Choix secret",
  prediction: "Prédiction",
  challenge: "Mini-défi · facultatif",
  cross: "Question croisée"
};
