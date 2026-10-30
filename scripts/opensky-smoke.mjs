#!/usr/bin/env node
/**
 * Browser smoke for The First Open Sky, on the static Pages build.
 * A real title and New Journey, then a labeled pre-heading fixture
 * (not a full campaign playthrough). After that the UI pins the heading,
 * flies west, notes Cinderwatch, lands, reloads, and returns to the berth.
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

console.log("fixture: pre-heading chronicle after New Journey. Not a full UI playthrough of the campaign.");

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
    save.ascensionUnlocked = true;
    save.settings = save.settings || {};
    save.settings.reducedMotion = true;
    save.flags = save.flags || {};
    for (const id of ["flag.flown", "flag.hull_shadow", "flag.sky_split", "flag.hour_complete", "flag.skiff_ready", "flag.festival_fought", "flag.hour_spared"]) {
      save.flags[id] = true;
    }
    delete save.flags["flag.sky_open"];
    delete save.flags["flag.bearing_land"];
    delete save.flags["flag.bearing_cloud"];
    delete save.flags["flag.mira_joined"];
    delete save.flags["sky.aboard"];
    save.party = ["wanderer"];
    localStorage.setItem("eotn.save.v1", JSON.stringify(save));
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Skyweave berth", { exact: true }).waitFor({ timeout: 15000 });
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "Pin the roads from the walk" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Pin the roads from the walk" }).click();
  await page.getByRole("button", { name: "Change the view" }).click();
  await page.getByRole("button", { name: "Pin the gap from inside the step" }).click();
  await page.getByRole("button", { name: "Take the roads you already know" }).click();
  await page.getByRole("button", { name: "Open the sky" }).click();
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 8000 });
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.getByText(/Sky 12, 9/).first().waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/opensky-flight.png`, fullPage: false });
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page.getByRole("button", { name: "Land", exact: true }).click();
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/opensky-landing.png`, fullPage: false });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Cinderwatch", { exact: true }).waitFor({ timeout: 12000 });
  await page.screenshot({ path: `${dir}/opensky-explore.png`, fullPage: false });
  await page.keyboard.press("KeyE");
  await page.getByRole("heading", { name: "The First Stay" }).waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: "Return to the last dock" }).click();
  await page.getByText("Skyweave berth", { exact: true }).waitFor({ timeout: 8000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${dir}/opensky-mobile.png`, fullPage: false });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 24) throw new Error(`mobile overflow ${wide}px`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ ok: true, url, flight: `${dir}/opensky-flight.png`, landing: `${dir}/opensky-landing.png`, explore: `${dir}/opensky-explore.png`, mobile: `${dir}/opensky-mobile.png` }));
} catch (err) {
  await page.screenshot({ path: `${dir}/opensky-fail.png`, fullPage: false }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
