import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PUBLIC_ART_NOTES, regionLook } from "./art.ts";
import { MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";

describe("visual ascension", () => {
  it("gives every map a region look and keeps the art notes public", () => {
    for (const id of Object.keys(MAPS)) {
      const look = regionLook(id);
      assert.ok(look.ground[0].startsWith("#"));
      assert.ok(look.skyTop.startsWith("#"));
      assert.notEqual(look.ground[0], look.wall);
    }
    const vale = regionLook("map.vale");
    const ridge = regionLook("map.ridge");
    const reach = regionLook("map.reach");
    assert.notEqual(vale.skyTop, ridge.skyTop);
    assert.notEqual(vale.ground[0], reach.ground[0]);
    const blob = JSON.stringify(PUBLIC_ART_NOTES).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) assert.equal(blob.includes(banned), false, banned);
  });
});
