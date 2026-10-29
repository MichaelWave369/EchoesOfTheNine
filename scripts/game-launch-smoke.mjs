#!/usr/bin/env node
/**
 * Launch smoke, separate from the state-level game tests.
 * New Journey → a name → Begin → the Vale is interactive.
 * Not part of GitHub Actions: the runner does not install browsers.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = process.env.GAME_SMOKE_URL || "http://127.0.0.1:8080/";
const out = process.env.GAME_SMOKE_OUT || "/workspace/screenshots/game-launch.png";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.getByRole("button", { name: "New Journey" }).click();
  await page.locator("#hero-name").fill("Ash");
  await page.getByRole("button", { name: "Begin" }).click();
  await page.getByText("Walk the festival").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Journal" }).waitFor({ timeout: 8000 });
  await page.getByText("Lantern Vale").waitFor({ timeout: 8000 });
  await page.keyboard.press("KeyD");
  await page.keyboard.press("KeyE");
  await page.screenshot({ path: out, fullPage: false });
  if (errors.length) {
    console.error(JSON.stringify({ ok: false, errors }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, url, screenshot: out, reached: "vale" }));
} catch (err) {
  await page.screenshot({ path: out, fullPage: false }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), errors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
