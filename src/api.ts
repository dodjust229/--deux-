import { supabase } from "./supabase";
import type { Snapshot, Category } from "./types";
import { interactions } from "./content";

function client() { if (!supabase) throw new Error("Le serveur n'est pas encore configuré. Consulte INSTALLATION.md."); return supabase; }
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
type Joined = { room_id: string; player_id: string; player_token: string };
export const createRoom = (nickname: string, avatar: string) => rpc<Joined>("create_room", { p_nickname: nickname, p_avatar: avatar });
export const joinRoom = (roomId: string, nickname: string, avatar: string) => rpc<Joined>("join_room", { p_room_id: roomId, p_nickname: nickname, p_avatar: avatar });
export async function getSnapshot(roomId: string, token: string): Promise<Snapshot> {
  const raw = await rpc<Omit<Snapshot, "interaction">>("get_room_snapshot", { p_room_id: roomId, p_player_token: token });
  return { ...raw, interaction: interactions.find(i => i.id === raw.interaction_id) ?? null };
}
export const setAdultConsent = (r: string, t: string, v: boolean) => rpc<boolean>("set_adult_consent", { p_room_id: r, p_player_token: t, p_value: v });
export const setPlayerCategories = (r: string, t: string, categories: Category[]) => rpc<boolean>("set_player_categories", { p_room_id: r, p_player_token: t, p_categories: categories });
export async function startGame(r: string, t: string, categories: Category[]) {
  await setPlayerCategories(r, t, categories);
  return rpc<boolean>("start_game", { p_room_id: r, p_player_token: t, p_categories: categories });
}
export const submitAnswer = (r: string, t: string, answer: string, pass = false) => rpc<boolean>("submit_answer", { p_room_id: r, p_player_token: t, p_answer: answer, p_pass: pass });
export const nextInteraction = (r: string, t: string) => rpc<{ advanced: boolean }>("next_interaction", { p_room_id: r, p_player_token: t });
export const setPause = (r: string, t: string, paused: boolean) => rpc<boolean>("set_pause", { p_room_id: r, p_player_token: t, p_paused: paused });
export const restartGame = (r: string, t: string) => rpc<boolean>("restart_game", { p_room_id: r, p_player_token: t });
export const leaveRoom = (r: string, t: string) => rpc<boolean>("leave_room", { p_room_id: r, p_player_token: t });
