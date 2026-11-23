export type Category = "decouverte" | "complicite" | "profondeur" | "seduction" | "audacieux";
export type InteractionKind = "free" | "secret" | "prediction" | "challenge" | "cross";
export interface Interaction { id: string; category: Category; kind: InteractionKind; title: string; prompt: string; options?: string[]; }
export interface Player { id: string; seat: 1 | 2; nickname: string; avatar: "masculin" | "feminin"; online: boolean; adult_consent: boolean; selected_categories?: Category[]; }
export interface Answer { player_id: string; answer: string; passed: boolean; }
export interface Snapshot {
  room: { id: string; status: "waiting" | "playing" | "paused" | "finished"; current_index: number; total: number; adult_enabled: boolean };
  players: Player[]; my_categories?: Category[]; other_categories?: Category[]; my_player_id: string; my_seat: 1 | 2; my_consent: boolean;
  interaction_id: string | null; interaction: Interaction | null;
  my_answer: string | null; other_submitted: boolean; revealed: boolean; answers: Answer[]; first_answer: string | null; first_player_present: boolean;
  i_acked: boolean; other_acked: boolean; summary: { answered: number; passed: number; total: number } | null;
}
