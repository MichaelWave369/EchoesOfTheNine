#!/usr/bin/env node
/**
 * Browser smoke for The Dragon's Oath, on the static Pages build.
 * A real title and New Journey, then a labeled pre-beacon fixture
 * (not a full campaign playthrough). The perch and the drop are already
 * finished in that fixture. The script banks the signal, notes the beacon
 * without landing, walks the ash road, reads the log, swears, fights
 * Oathwing through Attack, reloads, and returns to the berth.
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

console.log("fixture: pre-beacon chronicle after New Journey. Not a full UI playthrough of the campaign.");

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
    save.mapId = "map.cinder";
    save.spawnId = "pad";
    save.mode = "legacy";
    save.encounter = null;
    save.gold = 40;
    save.sightCharges = 3;
    save.party = ["wanderer"];
    save.reserve = [];
    save.settings = save.settings || {};
    save.settings.reducedMotion = true;
    save.flags = save.flags || {};
    for (const id of [
      "flag.sky_open",
      "flag.skiff_ready",
      "flag.temporal_sight",
      "flag.dragoon_spark",
      "flag.ashkite_cleared",
      "flag.dragoon_trial",
      "flag.falling_star",
      "flag.hour_complete",
      "flag.flown",
      "flag.found_cinder",
    ]) {
      save.flags[id] = true;
    }
    for (const id of ["flag.cinder_signal", "flag.cinder_bank", "flag.cinder_send", "flag.sky_beacon", "flag.beacon_oath", "flag.beacon_done", "flag.dragoon_oath"]) {
      delete save.flags[id];
    }
    save.flags["sky.aboard"] = false;
    save.flags["sky.x"] = 12;
    save.flags["sky.y"] = 9;
    save.flags["sky.facing"] = "e";
    save.flags["sky.dock"] = "dock.berth";
    const hero = save.roster?.wanderer;
    if (!hero) throw new Error("no wanderer");
    hero.attack = 80;
    hero.hp = 200;
    hero.maxHp = 200;
    hero.level = 8;
    hero.jobId = "job.wanderer";
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 15000 });
  await press("ArrowRight", 3);
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Bank the light. Let the watch keep it." }).click();
  await page.getByText(/You bank the light/).first().waitFor({ timeout: 8000 });
  const banked = await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("eotn.save.v1") || "{}").flags?.["flag.cinder_bank"]));
  if (!banked) throw new Error("the signal was not banked");
  await page.screenshot({ path: `${dir}/dragons-cinder.png`, fullPage: false });

  await press("ArrowLeft", 4);
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 8000 });
  await page.getByText(/Sky 12, 9/).first().waitFor({ timeout: 8000 });
  await press("ArrowLeft", 8);
  await press("ArrowUp", 7);
  await page.getByText(/Sky 4, 2/).first().waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page.getByText(/not a pad/i).first().waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/dragons-sky.png`, fullPage: false });
  await page.getByRole("button", { name: "Land", exact: true }).click();
  await page.getByText(/no pad under the hull/).first().waitFor({ timeout: 8000 });
  const stillAir = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("eotn.save.v1") || "{}");
    return Boolean(save.flags?.["sky.aboard"]) && save.flags?.["flag.sky_beacon"] === true && save.mapId === "map.cinder";
  });
  if (!stillAir) throw new Error("the beacon took a landing");
  await press("ArrowRight", 8);
  await press("ArrowDown", 7);
  await page.getByText(/Sky 12, 9/).first().waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Land", exact: true }).click();
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 8000 });

  await press("ArrowRight");
  await press("ArrowDown");
  await page.keyboard.press("KeyE");
  await page.getByText("Ashbound Beacon", { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/dragons-beacon.png`, fullPage: false });
  await press("ArrowRight", 2);
  await page.keyboard.press("KeyE");
  await page.getByText(/missing line/).first().waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: /Temporal Sight/ }).click();
  await press("ArrowRight", 3);
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Keep a light for whoever comes back." }).click();
  await page.getByText(/comes back/).first().waitFor({ timeout: 8000 });
  await press("ArrowRight", 2);
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "Oathwing" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Attack", exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/dragons-trial.png`, fullPage: false });
  for (let i = 0; i < 20; i++) {
    if (!(await page.getByRole("heading", { name: "Oathwing" }).count())) break;
    const atk = page.getByRole("button", { name: "Attack", exact: true });
    if (await atk.count()) await atk.click();
    await page.waitForTimeout(450);
  }
  await page.getByText("Ashbound Beacon", { exact: true }).waitFor({ timeout: 12000 });
  const settled = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("eotn.save.v1") || "{}");
    const glass = (save.inventory || []).some((s) => s.itemId === "item.vow_glass" && s.qty > 0);
    return {
      done: Boolean(save.flags?.["flag.beacon_done"]),
      glass,
      oath: Boolean(save.flags?.["flag.dragoon_oath"]),
      bank: Boolean(save.flags?.["flag.cinder_bank"]),
      send: Boolean(save.flags?.["flag.cinder_send"]),
      job: save.roster?.wanderer?.jobId,
    };
  });
  if (!settled.done || !settled.glass || !settled.oath) throw new Error(`the wing did not settle ${JSON.stringify(settled)}`);
  if (!settled.bank || settled.send) throw new Error("the banked signal was rewritten");
  if (settled.job !== "job.wanderer") throw new Error(`job changed to ${settled.job}`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Ashbound Beacon", { exact: true }).waitFor({ timeout: 12000 });
  await page.keyboard.press("KeyJ");
  await page.getByText(/Dragoon stays shut/).first().waitFor({ timeout: 8000 });
  await page.keyboard.press("Escape");
  await press("ArrowLeft");
  await page.keyboard.press("KeyE");
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 8000 });
  await press("ArrowLeft", 2);
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Return to the last dock" }).click();
  await page.getByText("Skyweave berth", { exact: true }).waitFor({ timeout: 8000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${dir}/dragons-mobile.png`, fullPage: false });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 24) throw new Error(`mobile overflow ${wide}px`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({
    ok: true,
    url,
    cinder: `${dir}/dragons-cinder.png`,
    sky: `${dir}/dragons-sky.png`,
    beacon: `${dir}/dragons-beacon.png`,
    trial: `${dir}/dragons-trial.png`,
    mobile: `${dir}/dragons-mobile.png`,
    note: "fixture is not a full campaign playthrough",
  }));
} catch (err) {
  await page.screenshot({ path: `${dir}/dragons-fail.png`, fullPage: false }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
