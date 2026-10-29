import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEncounter, fingerprint, proposeAction, resolveEnemyTurn, tryMercy } from "./combat.ts";
import { makeCombatant, ENEMY_TEMPLATES } from "../content/characters.ts";
import { applyReward, deserialize, freshSave, serialize, setFlag } from "../chronicle/save.ts";
import { DIALOGUE, MAPS, MOSS_ANSWER, PUBLIC_STRING_BAN } from "../content/world.ts";
import { learnElementalist, prepareForBattle, useSight } from "../content/gear.ts";
import type { CombatAction, CombatantState } from "../contracts.ts";
import { assertPlayable, scriptedCrystalAwakening } from "./playthrough.ts";
import { companionAside, reachClose, wardenMemory } from "../content/memory.ts";

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

describe("living world", () => {
  it("evading negates the next hit and is consumed", () => {
    let s = createEncounter({
      encounterId: "enc.woods",
      seed: 4,
      party: partyTrio(),
      enemies: [foe("shardling", "s", { x: 0, z: -1 })],
    });
    const hero = s.combatants.find((c) => c.id === "wanderer")!;
    hero.hp = 10;
    hero.statuses = [{ id: "evading", remaining: 1, potency: 1 }];
    s.phase = "enemy";
    s.activeActorId = "s";
    s.intents = [{ actorId: "s", abilityId: "enemy.shard_bite", targetIds: ["wanderer"], telegraph: "lunge", committed: true }];
    const res = resolveEnemyTurn(s);
    assert.equal(res.ok, true);
    const after = res.state.combatants.find((c) => c.id === "wanderer")!;
    assert.equal(after.hp, 10);
    assert.equal(after.statuses.some((st) => st.id === "evading"), false);
  });

  it("close range hits harder than far range with the same seed", () => {
    const strike = (z: number) => {
      const s = createEncounter({
        encounterId: "enc.festival",
        seed: 99,
        party: [makeCombatant("wanderer", { name: "Ash", position: { x: 0, z } })],
        enemies: [foe("shardling", "s", { x: 0, z: -1 })],
      });
      s.activeActorId = "wanderer";
      s.phase = "player";
      const res = proposeAction(s, act({ actorId: "wanderer", abilityId: "atk.strike", kind: "attack", targetIds: ["s"] }));
      assert.equal(res.ok, true);
      return res.state.events.find((e) => e.kind === "damage")?.amount ?? 0;
    };
    assert.ok(strike(-0.2) > strike(3.2));
  });

  it("equipped festival knife raises attack and levels grow from shared xp", () => {
    const bare = makeCombatant("wanderer", { name: "Ash" });
    let save = freshSave("Ash");
    const geared = prepareForBattle(save, "wanderer");
    assert.ok(geared.attack > bare.attack);
    const before = save.roster.wanderer!.maxHp;
    save = applyReward(save, { id: "reward.test.xp", gold: 0, xp: 45, items: [], flags: [] });
    assert.ok(save.roster.wanderer!.level >= 4);
    assert.ok(save.roster.wanderer!.maxHp > before);
  });

  it("cantor mercy pays once and only under half health", () => {
    let s = createEncounter({
      encounterId: "enc.cantor",
      seed: 12,
      party: partyTrio(),
      enemies: [foe("cantor", "cantor", { x: 0, z: -2 })],
    });
    assert.equal(tryMercy(s).ok, false);
    s.combatants.find((c) => c.id === "cantor")!.hp = 80;
    assert.equal(tryMercy(s).ok, false);
    assert.equal(tryMercy(s, { wardenSpared: false }).ok, false);
    const spared = tryMercy(s, { wardenSpared: true });
    assert.equal(spared.ok, true);
    assert.equal(spared.state.pendingReward?.id, "reward.cantor.mercy");
    let save = applyReward(freshSave("Ash"), spared.state.pendingReward!);
    const qty = save.inventory.find((i) => i.itemId === "accessory.reed_loop")?.qty ?? 0;
    save = applyReward(save, spared.state.pendingReward!);
    assert.equal(save.inventory.find((i) => i.itemId === "accessory.reed_loop")?.qty, qty);
    assert.equal(save.choiceLog.some((c) => c.id === "cantor" && c.value === "spared"), true);
  });

  it("temporal sight writes a durable clue and spends a charge", () => {
    let save = freshSave("Ash");
    save = setFlag(save, "flag.temporal_sight");
    save.sightCharges = 2;
    save.mapId = "map.reach";
    const seen = useSight(save);
    assert.equal(seen.ok, true);
    if (!seen.ok) return;
    assert.equal(seen.save.flags["flag.sight_cache"], true);
    assert.equal(seen.save.sightCharges, 1);
    const back = deserialize(serialize(seen.save));
    assert.equal(back.flags["flag.sight_cache"], true);
    assert.equal(back.sightCharges, 1);
  });

  it("schema 1 chronicles migrate without dropping the warden choice", () => {
    const modern = freshSave("Ash");
    modern.wardenOutcome = "spared";
    modern.flags["flag.warden_spared"] = true;
    modern.chapterComplete = true;
    const old = JSON.parse(serialize(modern)) as Record<string, unknown>;
    old.schema = 1;
    for (const key of ["equipment", "bonds", "spellMastery", "sightCharges", "knownSpells", "jobsUnlocked", "discoveries", "choiceLog", "echoMemory", "gnosis"]) {
      delete old[key];
    }
    const back = deserialize(JSON.stringify(old));
    assert.equal(back.schema, 3);
    assert.deepEqual(back.earnedSpells, []);
    assert.equal(back.sightScene, null);
    assert.equal(back.sightSteps, 0);
    assert.equal(back.wardenOutcome, "spared");
    assert.equal(back.flags["flag.warden_spared"], true);
    assert.equal(back.chapterComplete, true);
    assert.equal(back.equipment.wanderer?.weapon, "weapon.festival_knife");
    assert.deepEqual(back.echoMemory, []);
    assert.equal(back.gnosis, 0);
    assert.ok(back.quests.some((q) => q.id === "quest.reach"));
    assert.equal(back.quests.find((q) => q.id === "quest.reach")?.status, "active");
    assert.equal(wardenMemory(back), "spared");
    assert.match(companionAside("nessa", 3, "spared"), /stopped once/);
    assert.match(reachClose(back.playerName, "spared", true), /still sleeping/);
  });

  it("elementalist and the reach gates stay behind their discoveries", () => {
    const learned = learnElementalist(freshSave("Ash"));
    assert.ok(learned.jobsUnlocked.includes("job.elementalist"));
    assert.ok(learned.knownSpells.wanderer?.includes("spell.flare"));
    assert.equal(learned.roster.wanderer?.jobId, "job.elementalist");
    assert.deepEqual([...MOSS_ANSWER], ["wind", "flame", "stone"]);
    assert.equal(MAPS["map.shrine"]?.exits.find((e) => e.to === "map.reach")?.requires, "flag.chapter_complete");
    assert.equal(MAPS["map.reach"]?.exits.find((e) => e.to === "map.barrow")?.requires, "flag.moss_hymn");
  });

  it("a defeated warden stays defeated after schema migration and into the Reach", () => {
    const modern = freshSave("Ash");
    modern.wardenOutcome = "defeated";
    modern.flags["flag.warden_defeated"] = true;
    modern.chapterComplete = true;
    const raw = JSON.parse(serialize(modern)) as Record<string, unknown>;
    raw.schema = 1;
    delete raw.equipment;
    delete raw.choiceLog;
    const back = deserialize(JSON.stringify(raw));
    assert.equal(back.wardenOutcome, "defeated");
    assert.equal(wardenMemory(back), "defeated");
    assert.match(companionAside("mira", 1, "defeated"), /blank line/);
    assert.match(companionAside("mira", 4, "defeated"), /blank line/);
    assert.doesNotMatch(companionAside("kael", 3, "defeated"), /sleep/);
    assert.match(reachClose("Ash", "defeated", false), /still fallen/);
    assert.equal(back.quests.find((q) => q.id === "quest.reach")?.status, "active");
  });

  it("rejects a mode switch that is not the active ally's turn", () => {
    const s = createEncounter({
      encounterId: "enc.woods",
      seed: 5,
      party: partyTrio(),
      enemies: [foe("shardling", "s", { x: 0, z: -1 })],
      switchUnlocked: true,
    });
    s.phase = "player";
    s.activeActorId = "kael";
    const outsider = proposeAction(s, act({ actorId: "wanderer", abilityId: "act.defend", kind: "switch" }));
    assert.equal(outsider.ok, false);
    assert.equal(outsider.state.mode, "legacy");
    s.phase = "enemy";
    s.activeActorId = "s";
    const enemyPhase = proposeAction(s, act({ actorId: "kael", abilityId: "act.defend", kind: "switch" }));
    assert.equal(enemyPhase.ok, false);
    assert.equal(enemyPhase.state.mode, "legacy");
  });

  it("rejects the wrong target, an unknown art, and an empty pack", () => {
    const s = createEncounter({
      encounterId: "enc.woods",
      seed: 8,
      party: partyTrio(),
      enemies: [foe("shardling", "s", { x: 0, z: -1 })],
    });
    s.phase = "player";
    s.activeActorId = "wanderer";
    const before = s.combatants.find((c) => c.id === "mira")!.hp;
    const allyHit = proposeAction(s, act({ actorId: "wanderer", abilityId: "atk.strike", kind: "attack", targetIds: ["mira"] }));
    assert.equal(allyHit.ok, false);
    assert.equal(allyHit.state.combatants.find((c) => c.id === "mira")!.hp, before);
    const flare = proposeAction(s, act({ actorId: "wanderer", abilityId: "spell.flare", kind: "cast", targetIds: ["s"] }));
    assert.equal(flare.ok, false);
    s.combatants.find((c) => c.id === "wanderer")!.knownAbilities = ["atk.strike", "spell.ember", "spell.flare", "act.defend"];
    s.combatants.find((c) => c.id === "wanderer")!.mp = 40;
    const learned = proposeAction(s, act({ actorId: "wanderer", abilityId: "spell.flare", kind: "cast", targetIds: ["s"] }));
    assert.equal(learned.ok, true, learned.reason);
    const dry = proposeAction(s, act({ actorId: "wanderer", abilityId: "item.lantern_salve", kind: "item", targetIds: ["wanderer"] }));
    assert.equal(dry.ok, false);
    s.pack = { "item.lantern_salve": 1 };
    s.combatants.find((c) => c.id === "wanderer")!.hp = 20;
    const used = proposeAction(s, act({ actorId: "wanderer", abilityId: "item.lantern_salve", kind: "item", targetIds: ["wanderer"] }));
    assert.equal(used.ok, true, used.reason);
    assert.equal(used.state.pack?.["item.lantern_salve"], 0);
    assert.ok((used.state.combatants.find((c) => c.id === "wanderer")?.hp ?? 0) > 20);
  });

  it("same seed and same strikes stay identical, and a rival payout is refused", () => {
    const play = () => {
      let s = createEncounter({
        encounterId: "enc.woods",
        seed: 4242,
        party: partyTrio(),
        enemies: [foe("shardling", "s", { x: 0, z: -1 })],
      });
      for (let i = 0; i < 6 && s.outcome === "ongoing"; i++) {
        if (s.phase === "enemy") {
          const res = resolveEnemyTurn(s);
          assert.equal(res.ok, true, res.reason);
          s = res.state;
        } else if (s.phase === "player" && s.activeActorId) {
          const foeId = s.combatants.find((c) => c.side === "enemy" && c.alive)?.id ?? "s";
          const abilityId = s.activeActorId === "kael" ? "atk.oathcut" : "atk.strike";
          const res = proposeAction(s, act({ actorId: s.activeActorId, abilityId, kind: "attack", targetIds: [foeId] }));
          assert.equal(res.ok, true, res.reason);
          s = res.state;
        } else break;
      }
      return fingerprint(s);
    };
    assert.equal(play(), play());
    const cantor = createEncounter({
      encounterId: "enc.cantor",
      seed: 3,
      party: partyTrio(),
      enemies: [foe("cantor", "cantor", { x: 0, z: -2 })],
      rewardsAlready: ["reward.cantor.defeat"],
    });
    cantor.combatants.find((c) => c.id === "cantor")!.hp = 40;
    const mercy = tryMercy(cantor, { wardenSpared: true });
    assert.equal(mercy.ok, true);
    assert.equal(mercy.state.pendingReward, null);
    assert.deepEqual(mercy.state.rewardsGranted, ["reward.cantor.defeat"]);
  });
});
