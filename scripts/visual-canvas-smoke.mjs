#!/usr/bin/env node
/**
 * Visual smoke for the living canvas. Not on the GitHub Actions critical path.
 * Title bounds, Vale, dialogue, party, and one Legacy battle. Desktop and a narrow viewport.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.env.GAME_SMOKE_URL || "http://127.0.0.1:8080/";
const dir = "/workspace/screenshots";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function pass(name, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (err) => errors.push(`${name}: ${err}`));
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  const h1 = await page.locator("h1").boundingBox();
  const mark = await page.locator("h1").locator("xpath=preceding::*[contains(@class,'h-28')][1]").boundingBox().catch(() => null);
  if (!h1 || h1.height > 140 || h1.width > width) {
    throw new Error(`${name} title bounds ${JSON.stringify(h1)}`);
  }
  await page.screenshot({ path: `${dir}/canvas-title-${name}.png` });
  await page.getByRole("button", { name: "New Journey" }).click();
  await page.locator("#hero-name").fill("Ash");
  await page.getByRole("button", { name: "Begin" }).click();
  await page.getByText("Lantern Vale").waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dir}/canvas-vale-${name}.png` });
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("KeyD");
    await page.waitForTimeout(80);
  }
  await page.keyboard.press("KeyE");
  await page.getByText("The clock hasn't rung").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/canvas-talk-${name}.png` });
  await page.getByRole("button", { name: "Come with me. The woods are wrong." }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.keyboard.press("KeyP");
  await page.getByText("The wanderer's cloak is a dye").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${dir}/canvas-party-${name}.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("KeyA");
    await page.waitForTimeout(90);
  }
  await page.getByRole("button", { name: "Attack" }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/canvas-battle-${name}.png` });
  await page.close();
}

try {
  await pass("desktop", 1280, 800);
  await pass("mobile", 390, 844);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ ok: true, shots: ["title", "vale", "talk", "party", "battle"], viewports: ["desktop", "mobile"] }));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
