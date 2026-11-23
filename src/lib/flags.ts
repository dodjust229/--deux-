/**
 * Drapeaux de fonctionnalités.
 * DUOS : le socle SQL n'est pas encore installé côté Supabase (les RPC create_duo_room,
 * get_duo_snapshot… ne sont pas déployées). Le code reste dans le dépôt mais l'entrée est
 * masquée tant que la migration n'est pas appliquée et validée.
 */
export const DUOS_ENABLED = false;

/** Mode vocal : jamais présenté comme disponible tant qu'il n'existe pas. */
export const VOICE_ENABLED = false;
