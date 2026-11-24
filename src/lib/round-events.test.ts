import test from "node:test";
import assert from "node:assert/strict";
import { getRoundEvent } from "./round-events.ts";

const interaction = {
  id: "card-17",
  category: "seduction" as const,
  kind: "free" as const,
  level: 2 as const
};

test("keeps the opening rounds clean and introduces a surprise every third round", () => {
  assert.equal(getRoundEvent("room-a", 0, 8, interaction), null);
  assert.equal(getRoundEvent("room-a", 1, 8, interaction), null);
  assert.ok(getRoundEvent("room-a", 2, 8, interaction));
  assert.equal(getRoundEvent("room-a", 3, 8, interaction), null);
  assert.match(getRoundEvent("room-a", 5, 8, interaction)?.subtitle ?? "", /SURPRISE/);
});

test("always gives the final round a finale event, even outside the cadence", () => {
  const event = getRoundEvent("room-a", 4, 5, interaction);
  assert.ok(event);
  assert.match(event.subtitle, /DERNIER TOUR/);
});

test("all devices derive the same event for the same room and round", () => {
  assert.deepEqual(
    getRoundEvent("shared-room", 5, 9, interaction),
    getRoundEvent("shared-room", 5, 9, interaction)
  );
});

test("event selection changes across rooms instead of showing a fixed surprise", () => {
  const ids = new Set(
    Array.from({ length: 24 }, (_, index) => getRoundEvent(`room-${index}`, 2, 8, interaction)?.id)
  );
  assert.ok(ids.size > 1);
});

test("English sessions receive translated event copy", () => {
  const event = getRoundEvent("room-a", 2, 8, interaction, "en");
  assert.ok(event);
  assert.match(event.subtitle, /SURPRISE/);
  assert.notEqual(event.title, getRoundEvent("room-a", 2, 8, interaction, "fr")?.title);
});

test("invalid round coordinates never produce an event", () => {
  assert.equal(getRoundEvent("room-a", -1, 8, interaction), null);
  assert.equal(getRoundEvent("room-a", 8, 8, interaction), null);
  assert.equal(getRoundEvent("", 2, 8, interaction), null);
});
