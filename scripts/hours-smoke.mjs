#!/usr/bin/env node
/**
 * Browser smoke for The Hours We Keep, on the static Pages build.
 * Title, a new journey, a step, an interaction, a battle command,
 * a save reload, and one optional oath answer with a journal line
 * and a reward that survives reload. Desktop and 390px shots.
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

async function seed(flagsAndMore) {
  await page.evaluate((patch) => {
    const raw = localStorage.getItem("eotn.save.v1");
    if (!raw) throw new Error("no chronicle");
    const save = JSON.parse(raw);
    const hero = save.roster.wanderer;
    const kael = structuredClone(hero);
    kael.id = "kael";
    kael.name = "Kael";
    kael.jobId = "job.oathkeeper";
    save.roster.kael = kael;
    save.party = ["wanderer", "kael"];
    save.reserve = [];
    save.equipment.kael = save.equipment.kael || {};
    save.knownSpells = save.knownSpells || {};
    save.knownSpells.kael = ["atk.oathcut", "spell.stoneguard"];
    save.bonds = save.bonds || {};
    save.bonds.kael = 1;
    save.mapId = "map.vale";
    save.spawnId = "square";
    save.mode = "legacy";
    save.settings = save.settings || {};
    save.settings.reducedMotion = true;
    save.choiceLog = [{ id: "choice.kael", value: "law" }];
    save.flags = save.flags || {};
    for (const id of [
      "flag.flown",
      "flag.kael_joined",
      "flag.kael_law",
      "flag.hour_complete",
      "flag.oath_path",
      "flag.festival_fought",
      "flag.warden_spared",
    ]) {
      save.flags[id] = true;
    }
    delete save.flags["flag.mira_joined"];
    delete save.flags["flag.oath_vale"];
    delete save.flags["flag.oath_done"];
    delete save.flags["flag.oath_held"];
    delete save.flags["flag.oath_served"];
    save.inventory = (save.inventory || []).filter((s) => s.itemId !== "item.oath_cord" && s.itemId !== "item.walk_token");
    save.encounter = null;
    Object.assign(save, patch || {});
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
  }, flagsAndMore ?? {});
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByRole("heading", { name: "Echoes of the Nine" }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "New Journey" }).click();
  await page.locator("#hero-name").fill("Ash");
  await page.getByRole("button", { name: "Begin" }).click();
  await page.getByText("Lantern Vale").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Journal" }).waitFor({ timeout: 8000 });
  await page.keyboard.press("KeyD");
  await page.waitForTimeout(120);
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");

  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("eotn.save.v1"));
    save.mapId = "map.vale";
    save.spawnId = "square";
    save.flags["flag.mira_joined"] = true;
    delete save.flags["flag.festival_fought"];
    save.settings.reducedMotion = true;
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  const attack = page.getByRole("button", { name: "Attack" });
  await attack.waitFor({ timeout: 20000 });
  await attack.click();
  await page.getByText(/Shardling|hits|damage|Strike/i).first().waitFor({ timeout: 8000 });

  await seed();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Journal" }).waitFor({ timeout: 12000 });
  await page.keyboard.press("KeyE");
  const hold = page.getByRole("button", { name: "Keep the words as they were sworn." });
  await hold.waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/hours-desktop.png`, fullPage: false });
  await hold.click();
  await page.getByRole("button", { name: "Journal" }).click();
  await page.getByText("Kael kept the words. The first choice about Pell stays.").waitFor({ timeout: 8000 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bag" }).click();
  await page.getByText("Kept Cord").waitFor({ timeout: 8000 });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Bag" }).waitFor({ timeout: 12000 });
  await page.getByRole("button", { name: "Bag" }).click();
  await page.getByText("Kept Cord").waitFor({ timeout: 8000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Journal" }).click();
  await page.getByText("Kael kept the words. The first choice about Pell stays.").waitFor({ timeout: 8000 });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: `${dir}/hours-mobile.png`, fullPage: false });
  if (wide > 24) throw new Error(`mobile overflow ${wide}px`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ ok: true, url, desktop: `${dir}/hours-desktop.png`, mobile: `${dir}/hours-mobile.png` }));
} catch (err) {
  await page.screenshot({ path: `${dir}/hours-fail.png`, fullPage: false }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
