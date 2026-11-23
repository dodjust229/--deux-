/**
 * Drapeaux de fonctionnalités.
 * DUOS : les huit RPC existent côté Supabase (vérifié le 23/11/2026 : create_duo_room,
 * join_room_any, get_duo_snapshot, start_duo_game, next_duo_interaction, submit_duo_answer,
 * set_duo_permissions, send_duo_message). Le mode est donc ouvert.
 */
export const DUOS_ENABLED = true;

/** Mode vocal : jamais présenté comme disponible tant qu'il n'existe pas. */
export const VOICE_ENABLED = false;
