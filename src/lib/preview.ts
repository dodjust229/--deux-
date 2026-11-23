/**
 * Données de démonstration, uniquement en développement (`npm run dev` + `?apercu=…`).
 * Retirées de la compilation de production : aucun impact pour les joueurs.
 */
import { interactions } from "../content";
import type { Snapshot } from "../types";

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
