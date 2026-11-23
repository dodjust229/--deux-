/**
 * Données de démonstration, uniquement en développement (`npm run dev` + `?apercu=…`).
 * Retirées de la compilation de production : aucun impact pour les joueurs.
 */
import { interactions } from "../content";
import type { DuoSnapshot, Snapshot } from "../types";

const player = (seat: 1 | 2, nickname: string, avatar: "masculin" | "feminin", online = true) => ({
  id: `demo-${seat}`,
  seat,
  nickname,
  avatar,
  online,
  adult_consent: seat === 1,
  selected_categories: ["decouverte", "complicite", "profondeur", "seduction"] as Snapshot["players"][number]["selected_categories"]
});

const base = (status: Snapshot["room"]["status"], total = 12): Snapshot => ({
  room: { id: "demo", status, current_index: 3, total, adult_enabled: false },
  players: [player(1, "Tao", "masculin"), player(2, "Naya", "feminin")],
  my_player_id: "demo-1",
  my_seat: 1,
  my_consent: true,
  my_categories: ["decouverte", "complicite", "profondeur", "seduction"],
  other_categories: ["decouverte", "profondeur", "seduction"],
  interaction_id: null,
  interaction: null,
  my_answer: null,
  other_submitted: false,
  revealed: false,
  answers: [],
  first_answer: null,
  first_player_present: true,
  i_acked: false,
  other_acked: false,
  summary: null
});

export function previewSnapshot(kind: string): Snapshot {
  const free = interactions.find((item) => item.kind === "free")!;
  const reward = interactions.find((item) => item.kind === "prediction") ?? free;

  if (kind === "lobby") {
    const snapshot = base("waiting");
    snapshot.room.current_index = 0;
    snapshot.players[1].adult_consent = false;
    return snapshot;
  }
  if (kind === "reveal") {
    return {
      ...base("playing"),
      interaction_id: free.id,
      interaction: free,
      revealed: true,
      answers: [
        { player_id: "demo-1", answer: "Sa façon de rire avant même de finir sa phrase.", passed: false },
        { player_id: "demo-2", answer: "qs1:sticker:clin", passed: false }
      ],
      my_answer: "Sa façon de rire avant même de finir sa phrase.",
      other_submitted: true
    };
  }
  if (kind === "prediction") {
    return {
      ...base("playing"),
      interaction_id: reward.id,
      interaction: reward,
      my_answer: null
    };
  }
  if (kind === "end") {
    return {
      ...base("finished"),
      room: { id: "demo", status: "finished", current_index: 11, total: 12, adult_enabled: false },
      summary: { answered: 19, passed: 3, total: 12 }
    };
  }
  return {
    ...base("playing"),
    interaction_id: free.id,
    interaction: free
  };
}

/** Aperçus DUOS (développement uniquement) : quatre joueurs, deux duos, autorisations. */
export function previewDuoSnapshot(kind: string): DuoSnapshot {
  const free = interactions.find((item) => item.kind === "free")!;
  const seats = (status: DuoSnapshot["room"]["status"]): DuoSnapshot => ({
    room: { id: "demo", mode: "duos", status, current_index: status === "finished" ? 11 : 3, total: 12, adult_enabled: false },
    players: [
      { id: "demo-1", seat: 1, duo_no: 1, nickname: "Tao", avatar: "masculin", online: true, adult_consent: true, selected_categories: ["decouverte", "complicite", "profondeur", "seduction"], cross_participation: true, receive_media: true },
      { id: "demo-2", seat: 2, duo_no: 1, nickname: "Naya", avatar: "feminin", online: true, adult_consent: true, selected_categories: ["decouverte", "profondeur", "seduction"], cross_participation: true, receive_media: true },
      { id: "demo-3", seat: 3, duo_no: 2, nickname: "Iris", avatar: "feminin", online: true, adult_consent: false, selected_categories: ["decouverte", "complicite", "seduction"], cross_participation: false, receive_media: true },
      { id: "demo-4", seat: 4, duo_no: 2, nickname: "Sacha", avatar: "masculin", online: false, adult_consent: true, selected_categories: ["decouverte", "complicite", "profondeur"], cross_participation: false, receive_media: false }
    ],
    my_player_id: "demo-1",
    my_seat: 1,
    my_duo_no: 1,
    my_consent: true,
    my_categories: ["decouverte", "complicite", "profondeur", "seduction"],
    other_categories: ["decouverte", "profondeur", "seduction"],
    interaction_id: status === "waiting" ? null : free.id,
    interaction: status === "waiting" ? null : free,
    my_answer: status === "playing" ? null : "Sa façon de rire avant même de finir sa phrase.",
    other_submitted: false,
    revealed: false,
    answers: [],
    first_answer: null,
    first_player_present: true,
    i_acked: false,
    other_acked: false,
    summary: null,
    permissions: { cross_participation: true, receive_media: true, share_answers: true },
    messages: [
      { id: "m1", sender_player_id: "demo-2", space: "duo_a", message_type: "text", body: "On commence doucement ?", created_at: "2026-11-23T20:00:00Z" },
      { id: "m2", sender_player_id: "demo-1", space: "duo_a", message_type: "text", body: "Oui. Et on verra pour l'espace commun.", created_at: "2026-11-23T20:01:00Z" }
    ],
    replay: status === "finished" ? { votes: 2, needed: 4, mine: true } : undefined
  });
  if (kind === "duo-lobby") {
    const snap = seats("waiting");
    snap.players = snap.players.slice(0, 3);
    return snap;
  }
  if (kind === "duo-end") return seats("finished");
  if (kind === "duo-paused") return seats("paused");
  return seats("playing");
}
