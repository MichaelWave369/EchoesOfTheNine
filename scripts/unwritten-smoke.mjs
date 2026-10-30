#!/usr/bin/env node
/**
 * UI path for the Unwritten Hour. Not on GitHub Actions.
 * Starts a journey, then walks the new chapter with buttons and keys.
 * Screenshots land in /workspace/screenshots.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.env.GAME_SMOKE_URL || "http://127.0.0.1:8080/";
const dir = "/workspace/screenshots";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

function ally(base, id, name, jobId) {
  const c = structuredClone(base);
  c.id = id;
  c.name = name;
  c.jobId = jobId;
  c.maxHp = 900;
  c.hp = 900;
  c.attack = 80;
  c.speed = 40;
  return c;
}

async function seedLate(page, mapId, spawnId) {
  await page.evaluate(({ mapId, spawnId }) => {
    const raw = localStorage.getItem("eotn.save.v1");
    if (!raw) throw new Error("no chronicle");
    const save = JSON.parse(raw);
    const hero = save.roster.wanderer;
    hero.maxHp = 900;
    hero.hp = 900;
    hero.attack = 80;
    hero.speed = 40;
    save.roster.mira = allyish(hero, "mira", "Mira", "job.archivist");
    save.roster.sera = allyish(hero, "sera", "Sera", "job.skywright");
    save.party = ["wanderer", "mira", "sera"];
    save.reserve = [];
    save.mapId = mapId;
    save.spawnId = spawnId;
    save.mode = "legacy";
    save.ascensionUnlocked = true;
    save.conduitsAligned = true;
    save.wardenOutcome = "spared";
    save.sightCharges = 3;
    save.sightScene = null;
    save.sightSteps = 0;
    save.chapterComplete = true;
    save.settings.reducedMotion = true;
    save.settings.captions = true;
    const flags = [
      "flag.flown",
      "flag.clock_anomaly",
      "flag.bell_solved",
      "flag.ferry_complete",
      "flag.ridge_complete",
      "flag.skiff_ready",
      "flag.warden_spared",
      "flag.temporal_sight",
      "flag.festival_fought",
      "flag.mira_joined",
      "flag.sera_joined",
      "flag.sera_stay",
      "flag.chapter_complete",
      "flag.nessa_joined",
    ];
    for (const id of flags) save.flags[id] = true;
    save.choiceLog = [
      { id: "choice.mira", value: "record" },
      { id: "choice.sera", value: "stay" },
    ];
    const places = ["map.vale", "map.lowbell", "map.ferry", "map.ridge", "map.berth"];
    for (const id of places) {
      const key = `place.${id}`;
      if (!save.discoveries.includes(key)) save.discoveries.push(key);
    }
    save.knownSpells = save.knownSpells || {};
    save.knownSpells.wanderer = save.knownSpells.wanderer || ["spell.ember"];
    save.knownSpells.mira = ["spell.mend"];
    save.knownSpells.sera = ["spell.gust"];
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
    function allyish(base, id, name, jobId) {
      const c = structuredClone(base);
      c.id = id;
      c.name = name;
      c.jobId = jobId;
      c.maxHp = 900;
      c.hp = 900;
      c.attack = 80;
      c.speed = 40;
      return c;
    }
  }, { mapId, spawnId });
}

async function boot(page, mapId, spawnId) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByRole("button", { name: "New Journey" }).click();
  await page.locator("#hero-name").fill("Ash");
  await page.getByRole("button", { name: "Begin" }).click();
  await page.getByText("Lantern Vale").waitFor({ timeout: 15000 });
  await seedLate(page, mapId, spawnId);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Journal" }).waitFor({ timeout: 12000 });
}

async function steps(page, code, n) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(code);
    await page.waitForTimeout(180);
  }
}

async function travel(page, place) {
  await page.getByRole("button", { name: "Atlas" }).click();
  const row = page.locator("li", { hasText: place });
  await row.getByRole("button", { name: "Travel" }).click();
  await page.locator("p.uppercase", { hasText: place }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(200);
}

async function fight(page, label) {
  await page.getByRole("button", { name: "Attack", exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/hour-battle-${label}.png` });
  const attackBox = await page.getByRole("button", { name: "Attack", exact: true }).boundingBox();
  if (!attackBox || attackBox.y < 0) throw new Error(`${label} attack offscreen`);
  for (let i = 0; i < 40; i++) {
    const journal = page.getByRole("button", { name: "Journal" });
    const attack = page.getByRole("button", { name: "Attack", exact: true });
    const attackUp = (await attack.count()) > 0 && (await attack.isVisible());
    const back = (await journal.count()) > 0 && (await journal.isVisible()) && !attackUp;
    if (back) return;
    if (attackUp) {
      await attack.click();
      const target = page.getByRole("button", { name: /\(\d+\)/ }).first();
      if ((await target.count()) > 0 && (await target.isVisible())) await target.click();
    }
    const ask = page.getByRole("button", { name: "Ask it to sit" });
    const hint = page.getByText("quiet enough to ask");
    if ((await hint.count()) > 0 && (await ask.count()) > 0 && (await ask.isVisible())) {
      await ask.click();
    }
    await page.waitForTimeout(180);
  }
  throw new Error(`${label} fight did not end`);
}

async function full(name, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (err) => errors.push(`${name}: ${err}`));
  await boot(page, "map.berth", "pad");
  await page.locator("p.uppercase", { hasText: "Skyweave berth" }).waitFor({ timeout: 8000 });
  await steps(page, "KeyA", 1);
  await page.keyboard.press("KeyE");
  await page.getByText("The ledger has a departure").waitFor({ timeout: 8000 });
  await page.keyboard.press("KeyE");
  await page.getByText("You write the berth").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Journal" }).click();
  await page.getByRole("dialog", { name: "Journal" }).getByText("The Unwritten Hour is open").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-journal-${name}.png` });
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await travel(page, "Lantern Vale");
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Set it beside the tenth." }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-mira-${name}.png` });
  await page.getByRole("button", { name: "Set it beside the tenth." }).click();

  await steps(page, "KeyA", 2);
  await steps(page, "KeyW", 4);
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Keep both hours." }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-vale-${name}.png` });
  await page.getByRole("button", { name: "Keep both hours." }).click();
  await page.getByText("Still to write: Lowbell's margin, Mistwater's window").waitFor({ timeout: 8000 });

  await travel(page, "Skyweave Ridge");
  await steps(page, "KeyD", 6);
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Lash a second stay over it." }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-sera-${name}.png` });
  await page.getByRole("button", { name: "Lash a second stay over it." }).click();

  await travel(page, "Lowbell Landing");
  await steps(page, "KeyW", 3);
  await steps(page, "KeyD", 4);
  await page.keyboard.press("KeyE");
  await page.getByText("Beside the clapper").waitFor({ timeout: 8000 });
  await page.getByText("Still to write: Mistwater's window").waitFor({ timeout: 8000 });

  await travel(page, "Mistwater Crossing");
  await steps(page, "KeyS", 2);
  await steps(page, "KeyD", 3);
  await steps(page, "KeyS", 1);
  await steps(page, "KeyW", 1);
  await page.keyboard.press("KeyE");
  await page.getByText("The hold remembers a courtesy").waitFor({ timeout: 8000 });
  await page.getByText("The First Stay can reach the Margin").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-mist-${name}.png` });

  await travel(page, "Skyweave berth");
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Cast off for The Margin" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-skiff-${name}.png` });
  await page.getByRole("button", { name: "Cast off for The Margin" }).click();
  await page.locator("p.uppercase", { hasText: "The Margin" }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/hour-margin-${name}.png` });
  const fold = page.getByRole("button", { name: "Look from inside the step" });
  if ((await fold.count()) === 0) throw new Error(`${name} missing fold button`);

  await steps(page, "KeyS", 2);
  await steps(page, "KeyD", 1);
  await page.keyboard.press("KeyE");
  await fight(page, `${name}-ink`);
  await page.locator("p.uppercase", { hasText: "The Margin" }).waitFor({ timeout: 8000 });

  await steps(page, "KeyD", 2);
  await page.keyboard.press("KeyE");
  await page.getByText("The arch decides to be a stair").waitFor({ timeout: 8000 });
  await page.keyboard.press("KeyE");
  await page.getByText("From the walk, the page says").waitFor({ timeout: 8000 });
  await fold.click();
  await page.getByText("You look from inside the step").waitFor({ timeout: 8000 });
  await page.locator("h2").click();
  await page.waitForTimeout(200);
  await page.keyboard.press("KeyS");
  await page.waitForTimeout(500);
  await page.keyboard.press("KeyE");
  await page.getByText(/From inside the step, the page is blank|Both readings are kept/).waitFor({ timeout: 8000 });

  await page.getByRole("button", { name: /Temporal Sight/ }).click();
  await page.getByRole("button", { name: "Compare the hours" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Trace the echo" }).click();
  await page.getByText("A shine admits it can be taken").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Compare the hours" }).click();
  await page.screenshot({ path: `${dir}/hour-sight-${name}.png` });

  await steps(page, "KeyD", 2);
  await page.keyboard.press("KeyE");
  await page.getByText("A loose hour").waitFor({ timeout: 8000 });
  await steps(page, "KeyD", 2);
  await page.keyboard.press("KeyE");
  await page.getByText("The well gives").waitFor({ timeout: 8000 });

  await page.keyboard.press("KeyE");
  await page.getByText("I am Iri").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-iri-${name}.png` });
  await page.getByRole("button", { name: "Continue" }).click();

  await steps(page, "KeyS", 1);
  await page.keyboard.press("KeyE");
  await fight(page, `${name}-hour`);
  await page.getByText("Iri is in the Margin chamber").waitFor({ timeout: 8000 });

  await steps(page, "KeyD", 2);
  await page.keyboard.press("KeyE");
  await page.getByText("The arch decides to be a stair").waitFor({ timeout: 8000 });
  await steps(page, "KeyD", 4);
  await page.keyboard.press("KeyE");
  await page.getByText("The well gives").waitFor({ timeout: 8000 });
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Walk with me." }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Walk with me." }).click();
  await page.getByText("Then I walk with you").waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Journal" }).click();
  await page.getByRole("dialog", { name: "Journal" }).getByText("The Unwritten Hour is kept.", { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-done-${name}.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 8) throw new Error(`${name} horizontal overflow ${overflow}`);
  await page.close();
}

async function narrowBattle() {
  const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
  page.on("pageerror", (err) => errors.push(`narrow: ${err}`));
  await boot(page, "map.margin", "pad");
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("eotn.save.v1"));
    save.flags["flag.unwritten_open"] = true;
    save.flags["flag.margin_dock"] = true;
    save.flags["flag.hour_both"] = true;
    save.flags["flag.clue_vale"] = true;
    save.flags["flag.clue_lowbell"] = true;
    save.flags["flag.clue_mist"] = true;
    save.flags["flag.clue_ridge"] = true;
    save.flags["flag.margin_page"] = true;
    save.flags["flag.margin_echo"] = true;
    save.flags["flag.cleared.enc.ink"] = true;
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("p.uppercase", { hasText: "The Margin" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hour-margin-narrow.png` });
  const fold = page.getByRole("button", { name: "Look from inside the step" });
  if ((await fold.count()) === 0) throw new Error("narrow missing fold button");
  await steps(page, "KeyD", 2);
  await page.keyboard.press("KeyE");
  await page.getByText("The arch decides to be a stair").waitFor({ timeout: 8000 });
  await steps(page, "KeyD", 4);
  await page.keyboard.press("KeyE");
  await page.getByText("The well gives").waitFor({ timeout: 8000 });
  await steps(page, "KeyS", 1);
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Attack", exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  const attack = await page.getByRole("button", { name: "Attack", exact: true }).boundingBox();
  if (!attack || attack.y + attack.height > 708) throw new Error(`narrow attack offscreen ${JSON.stringify(attack)}`);
  await page.screenshot({ path: `${dir}/hour-battle-narrow.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 8) throw new Error(`narrow overflow ${overflow}`);
  await page.close();
}

try {
  await full("desktop", 1280, 800);
  await full("mobile", 390, 844);
  await narrowBattle();
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ ok: true, viewports: ["desktop", "mobile", "narrow"] }));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
