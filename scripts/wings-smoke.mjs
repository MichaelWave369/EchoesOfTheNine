#!/usr/bin/env node
/**
 * Browser smoke for Wings of the First Stay, on the static Pages build.
 * A real title and New Journey, then a labeled pre-cinder fixture
 * (not a full campaign playthrough). The kite is already weather in that
 * fixture. The script then walks the deck, flies, notes Cinderwatch, counts
 * the ash, stands the perch, sets the drop, reloads, and returns home.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.env.GAME_SMOKE_URL || "http://127.0.0.1:4173/EchoesOfTheNine/";
const dir = process.env.GAME_SMOKE_OUT || "screenshots";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));

console.log("fixture: pre-cinder chronicle after New Journey. Not a full UI playthrough of the campaign.");

async function press(code, times = 1) {
  for (let i = 0; i < times; i++) await page.keyboard.press(code);
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByRole("heading", { name: "Echoes of the Nine" }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "New Journey" }).click();
  await page.locator("#hero-name").fill("Ash");
  await page.getByRole("button", { name: "Begin" }).click();
  await page.getByText("Lantern Vale").waitFor({ timeout: 15000 });

  await page.evaluate(() => {
    const raw = localStorage.getItem("eotn.save.v1");
    if (!raw) throw new Error("no chronicle");
    const save = JSON.parse(raw);
    save.mapId = "map.berth";
    save.spawnId = "pad";
    save.mode = "legacy";
    save.encounter = null;
    save.gold = 30;
    save.sightCharges = 3;
    save.settings = save.settings || {};
    save.settings.reducedMotion = true;
    save.flags = save.flags || {};
    for (const id of [
      "flag.sky_open",
      "flag.skiff_ready",
      "flag.temporal_sight",
      "flag.dragoon_spark",
      "flag.ashkite_cleared",
      "flag.hour_complete",
      "flag.flown",
    ]) {
      save.flags[id] = true;
    }
    delete save.flags["flag.found_cinder"];
    delete save.flags["flag.cinder_tally"];
    delete save.flags["flag.sight_cinder"];
    delete save.flags["flag.dragoon_trial"];
    delete save.flags["flag.falling_star"];
    save.flags["sky.aboard"] = true;
    save.flags["sky.x"] = 15;
    save.flags["sky.y"] = 9;
    save.flags["sky.facing"] = "w";
    save.flags["sky.dock"] = "dock.berth";
    save.party = ["wanderer"];
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${dir}/wings-sky.png`, fullPage: false });
  await page.getByRole("button", { name: "Walk the deck" }).click();
  await page.getByText(/bunk/).first().waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/wings-deck.png`, fullPage: false });
  await press("ArrowDown", 2);
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 8000 });
  await press("ArrowLeft", 3);
  await page.getByText(/Sky 12, 9/).first().waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page.getByRole("button", { name: "Land", exact: true }).click();
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/wings-cinder.png`, fullPage: false });
  await page.getByRole("button", { name: /Temporal Sight/ }).click();
  await press("ArrowRight", 5);
  await page.keyboard.press("KeyE");
  await page.getByText(/upward ash/).first().waitFor({ timeout: 8000 });
  await press("ArrowRight", 2);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "Cold Perch" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/wings-trial.png`, fullPage: false });
  await page.getByRole("button", { name: "Attack", exact: true }).waitFor({ timeout: 8000 });
  for (let i = 0; i < 10; i++) {
    if (await page.getByText("The light holds.").count()) break;
    if (!(await page.getByRole("heading", { name: "Cold Perch" }).count())) break;
    await page.getByRole("button", { name: "Attack", exact: true }).click();
    await page.waitForTimeout(450);
  }
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 8000 });
  const taught = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("eotn.save.v1") || "{}");
    return Boolean(save.flags?.["flag.dragoon_trial"]) && (save.earnedSpells || []).includes("atk.sky_lance");
  });
  if (!taught) throw new Error("the perch did not teach the drill");
  await press("ArrowRight", 7);
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "The drop" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "rise", exact: true }).click();
  await page.getByRole("button", { name: "hold", exact: true }).click();
  await page.getByRole("button", { name: "drop", exact: true }).click();
  await page.getByRole("button", { name: "Set the order" }).click();
  await page.getByText(/Falling Star/).first().waitFor({ timeout: 8000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 12000 });
  await page.keyboard.press("KeyJ");
  await page.getByText(/Falling Star/).first().waitFor({ timeout: 8000 });
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Return to the last dock" }).click();
  await page.getByText("Skyweave berth", { exact: true }).waitFor({ timeout: 8000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${dir}/wings-mobile.png`, fullPage: false });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 24) throw new Error(`mobile overflow ${wide}px`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({
    ok: true,
    url,
    sky: `${dir}/wings-sky.png`,
    deck: `${dir}/wings-deck.png`,
    cinder: `${dir}/wings-cinder.png`,
    trial: `${dir}/wings-trial.png`,
    mobile: `${dir}/wings-mobile.png`,
    note: "fixture is not a full campaign playthrough",
  }));
} catch (err) {
  await page.screenshot({ path: `${dir}/wings-fail.png`, fullPage: false }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
