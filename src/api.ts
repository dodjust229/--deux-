import { supabase } from "./supabase";
import type { Snapshot, Category, DuoSnapshot } from "./types";
import { interactions } from "./content";

function client() { if (!supabase) throw new Error("Le serveur n'est pas encore configuré. Consulte INSTALLATION.md."); return supabase; }
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
type Joined = { room_id: string; player_id: string; player_token: string; mode?: "couple" | "duos" };
export const createRoom = (nickname: string, avatar: string) => rpc<Joined>("create_room", { p_nickname: nickname, p_avatar: avatar });
export const joinRoom = (roomId: string, nickname: string, avatar: string) => rpc<Joined>("join_room_any", { p_room_id: roomId, p_nickname: nickname, p_avatar: avatar });
export async function getSnapshot(roomId: string, token: string): Promise<Snapshot> {
  const raw = await rpc<Omit<Snapshot, "interaction">>("get_room_snapshot", { p_room_id: roomId, p_player_token: token });
  return { ...raw, interaction: interactions.find(i => i.id === raw.interaction_id) ?? null };
}
export const setAdultConsent = (r: string, t: string, v: boolean) => rpc<boolean>("set_adult_consent", { p_room_id: r, p_player_token: t, p_value: v });
export const setPlayerCategories = (r: string, t: string, categories: Category[]) => rpc<boolean>("set_player_categories", { p_room_id: r, p_player_token: t, p_categories: categories });
export async function startGame(r: string, t: string, categories: Category[], level: 1 | 2 | 3 | 4) {
  await setPlayerCategories(r, t, categories);
  return rpc<boolean>("start_game_by_level", { p_room_id: r, p_player_token: t, p_categories: categories, p_level: level });
}
export const submitAnswer = (r: string, t: string, answer: string, pass = false) => rpc<boolean>("submit_answer", { p_room_id: r, p_player_token: t, p_answer: answer, p_pass: pass });
export const nextInteraction = (r: string, t: string) => rpc<{ advanced: boolean }>("next_interaction", { p_room_id: r, p_player_token: t });
export const setPause = (r: string, t: string, paused: boolean) => rpc<boolean>("set_pause", { p_room_id: r, p_player_token: t, p_paused: paused });
export const restartGame = (r: string, t: string) => rpc<boolean>("restart_game", { p_room_id: r, p_player_token: t });
export const leaveRoom = (r: string, t: string) => rpc<boolean>("leave_room", { p_room_id: r, p_player_token: t });

export const createDuoRoom = (nickname: string, avatar: string) => rpc<Joined>("create_duo_room", { p_nickname: nickname, p_avatar: avatar });
export async function getDuoSnapshot(roomId: string, token: string): Promise<DuoSnapshot> {
  const raw = await rpc<any>("get_duo_snapshot", { p_room_id: roomId, p_player_token: token });
  const partner = raw.players?.find((p: any) => p.duo_no === raw.my_duo_no && p.id !== raw.my_player_id);
  return { ...raw, interaction: interactions.find(i => i.id === raw.interaction_id) ?? null,
    other_categories: partner?.selected_categories ?? [],
    other_submitted: (raw.answers ?? []).some((a: any) => a.player_id !== raw.my_player_id),
    first_answer: null, first_player_present: false, summary: null } as DuoSnapshot;
}
export async function getSessionSnapshot(roomId: string, token: string, mode?: "couple" | "duos" | "custom"): Promise<Snapshot> {
  return mode === "duos" ? getDuoSnapshot(roomId, token) : getSnapshot(roomId, token);
}
export const startDuoGame = (r: string, t: string) => rpc<boolean>("start_duo_game", { p_room_id: r, p_player_token: t });
export const nextDuoInteraction = (r: string, t: string) => rpc<{ advanced: boolean }>("next_duo_interaction", { p_room_id: r, p_player_token: t });
export const submitDuoAnswer = (r: string, t: string, i: string, a: string, pass: boolean, visibility: "private" | "duo" | "group") => rpc<boolean>("submit_duo_answer", { p_room_id: r, p_player_token: t, p_interaction_id: i, p_answer: a, p_pass: pass, p_visibility: visibility });
export const setDuoPermissions = (r: string, t: string, p: { cross_participation: boolean; receive_media: boolean; share_answers: boolean }) => rpc<boolean>("set_duo_permissions", { p_room_id: r, p_player_token: t, p_cross_participation: p.cross_participation, p_receive_media: p.receive_media, p_share_answers: p.share_answers });
export const sendDuoMessage = (r: string, t: string, space: "group" | "duo_a" | "duo_b", body: string) => rpc<string>("send_duo_message", { p_room_id: r, p_player_token: t, p_space: space, p_message_type: "text", p_body: body });
export const restartDuoGame = (r: string, t: string) => rpc<{ restarted: boolean; votes: number; needed: number }>("restart_duo_game", { p_room_id: r, p_player_token: t });

/* Mode Personnalisé : la liste appartient à la salle (voir supabase/10_custom_room.sql). */
export const startCustomGame = (r: string, t: string, questions: string[]) =>
  rpc<boolean>("start_custom_game", { p_room_id: r, p_player_token: t, p_questions: questions });
export const getCustomDeck = (r: string, t: string) => rpc<string[]>("get_custom_deck", { p_room_id: r, p_player_token: t });
