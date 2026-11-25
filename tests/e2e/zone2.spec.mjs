import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const catalog = JSON.parse(
  readFileSync(new URL("../../src/catalog.json", import.meta.url), "utf8")
);
const audaciousCard = catalog.find(
  (card) => card.category === "audacieux" && card.level === 3
) ?? catalog.find((card) => card.category === "audacieux");

if (!audaciousCard) throw new Error("Le catalogue de test ne contient aucune carte Audacieux.");

const players = [
  {
    id: "demo-1", seat: 1, nickname: "Tao", avatar: "masculin", online: true,
    adult_consent: true, selected_categories: ["audacieux"]
  },
  {
    id: "demo-2", seat: 2, nickname: "Naya", avatar: "feminin", online: true,
    adult_consent: true, selected_categories: ["audacieux"]
  }
];

function snapshot(status) {
  const playing = status === "playing";
  return {
    room: {
      id: "demo", mode: "couple", room_kind: "couple", status,
      current_index: 0, total: 24, adult_enabled: playing,
      level: playing ? 3 : 2, selected_level: 2, explicit_floor: playing ? 3 : 1
    },
    players,
    my_player_id: "demo-1",
    my_seat: 1,
    my_consent: true,
    my_categories: ["audacieux"],
    other_categories: ["audacieux"],
    interaction_id: playing ? audaciousCard.id : null,
    my_answer: null,
    other_submitted: false,
    revealed: false,
    answers: [],
    first_answer: null,
    first_player_present: true,
    i_acked: false,
    other_acked: false,
    summary: null
  };
}

async function mockRoomApi(page) {
  let started = false;
  let startPayload = null;
  let categoryPayload = null;

  await page.route("https://qspicy-test.supabase.co/rest/v1/rpc/**", async (route) => {
    const request = route.request();
    const cors = {
      "access-control-allow-origin": "http://127.0.0.1:4173",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "apikey,authorization,content-type,x-client-info,prefer",
      "access-control-max-age": "86400"
    };

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }

    const name = new URL(request.url()).pathname.split("/").pop();
    let body = true;
    if (name === "set_player_categories") {
      categoryPayload = request.postDataJSON();
    } else if (name === "start_game_by_level") {
      startPayload = request.postDataJSON();
      started = true;
    } else if (name === "get_room_snapshot") {
      body = snapshot(started ? "playing" : "waiting");
    }

    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify(body)
    });
  });

  return {
    getStartPayload: () => startPayload,
    getCategoryPayload: () => categoryPayload
  };
}

test("Audacieux choisi par les deux joueurs démarre au premier palier disponible", async ({ page }) => {
  const api = await mockRoomApi(page);
  await page.addInitScript(() => localStorage.setItem("qspicy.prefs.v1", JSON.stringify({ intensity: "audacious" })));
  await page.goto("/?apercu=zone2-lobby");

  await page.getByRole("radio", { name: /Audacieux/ }).click();
  await expect(page.getByTestId("launch")).toBeEnabled();
  await page.getByTestId("launch").click();

  await expect(page.locator(".game")).toHaveAttribute("data-level", "3");
  await expect(page.locator(".prompt")).toHaveAttribute("data-level", "3");
  await expect(page.locator(".prompt h1")).toHaveText(audaciousCard.title);
  await expect(page.locator(".prompt__text")).toHaveText(audaciousCard.prompt);

  expect(api.getCategoryPayload()?.p_categories).toContain("audacieux");
  expect(api.getStartPayload()?.p_level).toBe(2);
});

test("le palier de session reste affiché au-dessus du palier de la carte courante", async ({ page }) => {
  await page.goto("/?apercu=zone2-level-regression");

  await expect(page.locator(".game")).toHaveAttribute("data-level", "4");
  await expect(page.locator(".prompt")).toHaveAttribute("data-level", "4");
  await expect(page.locator(".game__progress-track")).toHaveAttribute("data-level", "4");
  await expect(page.locator(".prompt__meta .tag--audacieux")).toBeVisible();
  await expect(page.locator(".prompt h1")).toHaveText(audaciousCard.title);
});
