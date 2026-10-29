import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, fingerprint, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import { makeCombatant, ENEMY_TEMPLATES } from "../content/characters.ts";
import { applyReward, deserialize, freshSave, serialize, setFlag } from "../chronicle/save.ts";
import { DIALOGUE, MAPS, PUBLIC_STRING_BAN } from "../content/world.ts";
import type { CombatAction, CombatantState } from "../contracts.ts";
import { assertPlayable, scriptedCrystalAwakening } from "./playthrough.ts";

function foe(template: keyof typeof ENEMY_TEMPLATES, id: string, position: { x: number; z: number }): CombatantState {
  return { ...structuredClone(ENEMY_TEMPLATES[template]), id, position };
}

function partyTrio() {
  return [
    makeCombatant("wanderer", { name: "Ash", position: { x: -1.2, z: 2 } }),
    makeCombatant("mira", { position: { x: 0, z: 2.2 } }),
    makeCombatant("kael", { position: { x: 1.2, z: 2 } }),
  ];
}

function act(partial: Partial<CombatAction> & Pick<CombatAction, "actorId" | "abilityId" | "kind">): CombatAction {
  return {
    version: 1,
    targetIds: [],
    modeOrigin: "legacy",
    timeOrTurn: 1,
    ...partial,
  };
}

describe("combat core", () => {
  it("identical seeded ember from legacy and ascension yields the same rules result", () => {
    const mk = (mode: "legacy" | "ascension") => {
      let s = createEncounter({
        encounterId: "enc.woods",
        seed: 909,
        party: partyTrio(),
        enemies: [foe("shardling", "shard-a", { x: 0, z: -1.5 })],
        mode,
        switchUnlocked: true,
      });
      const hero = s.activeActorId!;
      const res = proposeAction(
        s,
        act({
          actorId: hero,
          abilityId: "spell.ember",
          kind: "cast",
          targetIds: ["shard-a"],
          modeOrigin: mode,
        }),
      );
      assert.equal(res.ok, true);
      s = res.state;
      return fingerprint(s);
    };
    assert.equal(mk("legacy"), mk("ascension"));
  });

  it("refuses a spell when MP is short and applies no damage", () => {
    let s = createEncounter({
      encounterId: "enc.woods",
      seed: 3,
      party: partyTrio(),
      enemies: [foe("glowmoth", "moth", { x: 0.4, z: -1 })],
    });
    const hero = s.combatants.find((c) => c.id === "wanderer")!;
    hero.mp = 2;
    s.activeActorId = "wanderer";
    s.phase = "player";
    const before = s.combatants.find((c) => c.id === "moth")!.hp;
    const res = proposeAction(
      s,
      act({ actorId: "wanderer", abilityId: "spell.ember", kind: "cast", targetIds: ["moth"] }),
    );
    assert.equal(res.ok, false);
    assert.match(res.reason ?? "", /MP/);
    assert.equal(res.state.combatants.find((c) => c.id === "moth")!.hp, before);
  });

  it("mode switch preserves enemy HP, phase, rng, cooldowns, and does not mint rewards", () => {
    let s = createEncounter({
      encounterId: "enc.warden",
      seed: 42,
      party: partyTrio(),
      enemies: [foe("warden", "warden", { x: 0, z: -2 })],
      switchUnlocked: true,
    });
    const warden = s.combatants.find((c) => c.id === "warden")!;
    warden.hp = 140;
    warden.phase = 2;
    warden.cooldowns["enemy.prism_rupture"] = 2;
    const rng = s.rngState;
    const rewards = [...s.rewardsGranted];
    s.activeActorId = "wanderer";
    s.phase = "player";
    const res = proposeAction(
      s,
      act({ actorId: "wanderer", abilityId: "act.defend", kind: "switch", targetIds: [] }),
    );
    assert.equal(res.ok, true);
    const w2 = res.state.combatants.find((c) => c.id === "warden")!;
    assert.equal(w2.hp, 140);
    assert.equal(w2.phase, 2);
    assert.equal(w2.cooldowns["enemy.prism_rupture"], 2);
    assert.equal(res.state.rngState, rng);
    assert.deepEqual(res.state.rewardsGranted, rewards);
    assert.equal(res.state.mode, "ascension");
    assert.ok(res.state.switchLock >= 0);
  });

  it("does not pay a unique reward twice", () => {
    let s = createEncounter({
      encounterId: "enc.festival",
      seed: 1,
      party: [makeCombatant("wanderer", { name: "Ash" })],
      enemies: [foe("shardling", "s", { x: 0, z: -1 })],
    });
    const foeState = s.combatants.find((c) => c.id === "s")!;
    foeState.hp = 1;
    s.activeActorId = "wanderer";
    s.phase = "player";
    let res = proposeAction(s, act({ actorId: "wanderer", abilityId: "atk.strike", kind: "attack", targetIds: ["s"] }));
    assert.equal(res.state.outcome, "victory");
    assert.equal(res.state.rewardsGranted.length, 1);
    const again = createEncounter({
      encounterId: "enc.festival",
      seed: 1,
      party: [makeCombatant("wanderer", { name: "Ash" })],
      enemies: [foe("shardling", "s", { x: 0, z: -1 })],
      rewardsAlready: res.state.rewardsGranted,
    });
    again.combatants.find((c) => c.id === "s")!.hp = 1;
    again.activeActorId = "wanderer";
    again.phase = "player";
    res = proposeAction(again, act({ actorId: "wanderer", abilityId: "atk.strike", kind: "attack", targetIds: ["s"] }));
    assert.equal(res.state.pendingReward, null);
    assert.equal(res.state.rewardsGranted.length, 1);
  });

  it("mercy and defeat are different outcomes and mercy needs the seam", () => {
    let s = createEncounter({
      encounterId: "enc.warden",
      seed: 7,
      party: partyTrio(),
      enemies: [foe("warden", "warden", { x: 0, z: -2 })],
    });
    const early = tryMercy(s);
    assert.equal(early.ok, false);
    const warden = s.combatants.find((c) => c.id === "warden")!;
    warden.mercyEligible = true;
    warden.statuses.push({ id: "exposed", remaining: 2, potency: 1 });
    const spared = tryMercy(s);
    assert.equal(spared.ok, true);
    assert.equal(spared.state.outcome, "mercy");
    assert.ok(spared.state.pendingReward?.flags.includes("flag.warden_spared"));
    assert.ok(!spared.state.pendingReward?.flags.includes("flag.warden_defeated"));
  });

  it("enemy telegraph resolves through the same action pipeline", () => {
    let s = createEncounter({
      encounterId: "enc.woods",
      seed: 11,
      party: partyTrio(),
      enemies: [foe("shardling", "s", { x: 0, z: -1 })],
    });
    const heroHp = () => s.combatants.find((c) => c.id === "wanderer")!.hp;
    let guard = 0;
    for (let i = 0; i < 8 && s.outcome === "ongoing"; i++) {
      if (s.phase === "enemy") {
        const before = heroHp();
        const res = resolveEnemyTurn(s);
        assert.equal(res.ok, true);
        s = res.state;
        if (s.combatants.find((c) => c.id === "wanderer")!.hp < before) guard++;
      } else if (s.phase === "player" && s.activeActorId) {
        const res = proposeAction(
          s,
          act({
            actorId: s.activeActorId,
            abilityId: s.activeActorId === "kael" ? "atk.oathcut" : "atk.strike",
            kind: "attack",
            targetIds: ["s"],
          }),
        );
        assert.equal(res.ok, true, res.reason);
        s = res.state;
      } else break;
    }
    assert.ok(guard >= 0);
    assert.notEqual(s.outcome, "ongoing");
  });
});

describe("chronicle", () => {
  it("round-trips save data including puzzle flags", () => {
    let save = freshSave("Ash");
    save = setFlag(save, "flag.runes_decoded");
    save.runeOrder = ["flame", "stone", "tide"];
    save = setFlag(save, "flag.conduits_aligned");
    save.conduitsAligned = true;
    save.ascensionUnlocked = true;
    const back = deserialize(serialize(save));
    assert.equal(back.playerName, "Ash");
    assert.deepEqual(back.runeOrder, ["flame", "stone", "tide"]);
    assert.equal(back.flags["flag.conduits_aligned"], true);
    assert.equal(back.ascensionUnlocked, true);
    assert.equal(back.quests.find((q) => q.id === "quest.prism")?.status, "complete");
    assert.equal(back.quests.find((q) => q.id === "quest.warden")?.status, "active");
  });

  it("reward application is idempotent", () => {
    let save = freshSave("Ash");
    const reward = {
      id: "reward.warden.mercy",
      gold: 40,
      xp: 60,
      items: [{ itemId: "item.warden_shard", qty: 1 }],
      flags: ["flag.warden_spared"],
    };
    save = applyReward(save, reward);
    const gold = save.gold;
    save = applyReward(save, reward);
    assert.equal(save.gold, gold);
    assert.equal(save.inventory.filter((i) => i.itemId === "item.warden_shard").length, 1);
    assert.equal(save.wardenOutcome, "spared");
  });

  it("public dialogue and map labels do not leak late-game words", () => {
    const blob = JSON.stringify({ DIALOGUE, MAPS }).toLowerCase();
    for (const banned of PUBLIC_STRING_BAN) {
      assert.equal(blob.includes(banned), false, `leaked: ${banned}`);
    }
  });

  it("quest order cannot skip the woods gate", () => {
    const shrine = MAPS["map.shrine"];
    const woods = MAPS["map.woods"];
    assert.ok(woods?.exits.some((e) => e.to === "map.shrine" && e.requires === "flag.woods_cleared"));
    assert.ok(shrine?.hotspots.some((h) => h.id === "puzzle.runes"));
    assert.ok(shrine?.hotspots.some((h) => h.id === "puzzle.conduits"));
  });
});

describe("chapter playthrough", () => {
  it("a button-only script clears festival, woods, puzzle, and the Warden", () => {
    const result = scriptedCrystalAwakening("Ash");
    assertPlayable(result);
    assert.equal(result.save.wardenOutcome === "spared" || result.save.wardenOutcome === "defeated", true);
    assert.ok(result.save.gold > 15);
  });
});
