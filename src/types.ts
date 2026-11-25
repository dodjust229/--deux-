export type Seat = 1 | 2 | 3 | 4;
export type Category = "decouverte" | "complicite" | "profondeur" | "seduction" | "audacieux";
export type InteractionKind = "free" | "secret" | "prediction" | "challenge" | "cross";
export type Audience = "partner" | "own_duo" | "other_duo" | "all_players" | "individual_choice";
export type Visibility = "partagee" | "anonyme" | "privee";
export interface Interaction {
  id: string; category: Category; kind: InteractionKind; title: string; prompt: string; options?: string[];
  level: 1 | 2 | 3 | 4; audience: Audience; visibility: Visibility;
}
export interface Player { id: string; seat: Seat; duo_no?: 1 | 2; cross_participation?: boolean; receive_media?: boolean; nickname: string; avatar: "masculin" | "feminin"; online: boolean; adult_consent: boolean; selected_categories?: Category[]; replay_vote?: boolean; }
export interface Answer { player_id: string; answer: string; passed: boolean; visibility?: "private" | "duo" | "group"; }
export interface Snapshot {
  room: { id: string; mode?: "couple" | "duos"; room_kind?: "couple" | "custom" | "duos"; status: "waiting" | "playing" | "paused" | "finished"; current_index: number; total: number; adult_enabled: boolean; level?: 1 | 2 | 3 | 4; selected_level?: 1 | 2 | 3 | 4; explicit_floor?: 1 | 2 | 3 | 4 };
  players: Player[]; my_categories?: Category[]; other_categories?: Category[]; my_player_id: string; my_seat: Seat; my_consent: boolean;
  interaction_id: string | null; interaction: Interaction | null;
  /** Options QCM canoniques renvoyées par le catalogue serveur. */
  interaction_options?: string[] | null;
  /** Messages privés du mode Personnalisé, visibles uniquement aux deux partenaires. */
  partner_messages?: PartnerMessage[];
  my_answer: string | null; other_submitted: boolean; revealed: boolean; answers: Answer[]; first_answer: string | null; first_player_present: boolean;
  i_acked: boolean; other_acked: boolean; summary: { answered: number; passed: number; total: number } | null;
}

export interface PartnerMessage { id: string; sender_player_id: string; body: string; created_at: string; }
export interface DuoPermissions { cross_participation: boolean; receive_media: boolean; share_answers: boolean; }
export interface DuoMessage { id: string; sender_player_id: string; space: "group" | "duo_a" | "duo_b"; message_type: "text" | "sticker" | "gif"; body: string; created_at: string; }
export interface DuoReplay { votes: number; needed: number; mine: boolean; }
export interface DuoSnapshot extends Snapshot { my_duo_no: 1 | 2; permissions: DuoPermissions; messages: DuoMessage[]; replay?: DuoReplay; }
