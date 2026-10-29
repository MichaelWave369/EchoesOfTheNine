import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freshSave, normalizeAppearance, serialize, setAppearance, deserialize } from "../chronicle/save.ts";
import { battleArt, cameraOrigin, elementOf, foeFrame, frameFor, hotspotActor, portraitMood, tileJitter } from "./sprites.ts";
import { PUBLIC_ART_NOTES } from "./art.ts";
import { PUBLIC_STRING_BAN } from "../content/world.ts";

describe("living canvas", () => {
  it("starts on the lantern cloak and keeps old chronicles on that dye", () => {
    const fresh = freshSave("Ash");
    assert.equal(fresh.appearance, "lantern");
    assert.equal(fresh.schema, 4);
    const raw = JSON.parse(serialize(fresh)) as Record<string, unknown>;
    delete raw.appearance;
    raw.schema = 4;
    raw.wardenOutcome = "spared";
    const back = deserialize(JSON.stringify(raw));
    assert.equal(back.appearance, "lantern");
    assert.equal(back.wardenOutcome, "spared");
    assert.equal(back.schema, 4);
    assert.equal(normalizeAppearance("nope"), "lantern");
  });

  it("changes only the cloak", () => {
    const save = freshSave("Ash");
    const dyed = setAppearance(save, "river");
    assert.equal(dyed.appearance, "river");
    assert.equal(dyed.gold, save.gold);
    assert.equal(dyed.roster.wanderer?.hp, save.roster.wanderer?.hp);
    assert.deepEqual(dyed.inventory, save.inventory);
    assert.deepEqual(dyed.knownSpells, save.knownSpells);
    assert.equal(save.appearance, "lantern");
  });

  it("has a facing frame for the wanderer and each companion", () => {
    for (const id of ["wanderer", "mira", "kael", "nessa", "sera"]) {
      const south = frameFor(id, "s", 0, true, "idle", false, "lantern");
      const north = frameFor(id, "n", 8, false, "walk", true, "festival");
      assert.ok(south);
      assert.equal(south?.row, 0);
      assert.equal(north?.row, 3);
      assert.equal(north?.col, 2);
    }
    const dyed = frameFor("wanderer", "s", 0, true, "idle", false, "river");
    assert.match(dyed?.filter ?? "", /hue-rotate/);
    const mira = frameFor("mira", "s", 0, true, "idle", false, "river");
    assert.equal(mira?.filter, "none");
    assert.equal(foeFrame("enemy.warden").big, true);
    assert.equal(hotspotActor("npc.mira"), "mira");
    assert.equal(hotspotActor("sign.well"), null);
  });

  it("keeps the art notes public", () => {
    const blob = JSON.stringify(PUBLIC_ART_NOTES).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });

  it("picks a region plate and a display tint without moving the walker", () => {
    assert.equal(battleArt("enc.warden", false), "battle-shrine.jpg");
    assert.equal(battleArt("enc.woods", false), "battle-woods.jpg");
    assert.equal(battleArt("enc.ferryman", false), "battle-mist.jpg");
    assert.equal(battleArt("enc.galekeeper", false), "battle-ridge.jpg");
    assert.equal(battleArt("enc.festival", false), "battle-vale.jpg");
    assert.equal(battleArt("enc.festival", true), "battle-ascent.jpg");
    assert.equal(elementOf("spell.ember").tone, "fire");
    assert.equal(elementOf("spell.gust").tone, "wind");
    assert.equal(elementOf("spell.mend").tone, "life");
    assert.equal(elementOf("atk.strike").tone, "steel");
    assert.match(portraitMood("I will remember"), /saturate/);
    assert.equal(portraitMood("The stall is open."), "none");
    const here = cameraOrigin(10, 8, 20, 14);
    assert.ok(Math.abs(here.x - 0.525) < 0.001);
    assert.ok(Math.abs(here.y - 8.5 / 14) < 0.001);
    assert.deepEqual(cameraOrigin(10, 8, 20, 14), here);
    assert.equal(cameraOrigin(-4, 99, 20, 14).x, 0);
    assert.equal(cameraOrigin(-4, 99, 20, 14).y, 1);
    const jitter = tileJitter(6, 4);
    assert.equal(tileJitter(6, 4), jitter);
    assert.ok(jitter >= 0 && jitter < 1);
    assert.equal(frameFor("wanderer", "s", 0, false, "attack", false)?.col, 1);
    assert.equal(frameFor("mira", "s", 0, false, "hurt", false)?.col, 3);
  });
});
