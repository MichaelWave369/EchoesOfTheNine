/**
 * Static Pages release guard: a passing Vite build is not proof that Tailwind
 * emitted the utilities used by the actual GameApp (which lives outside pages/).
 *
 * Fail CI if the CSS is missing; otherwise a successful Pages deploy shows
 * gigantic unbounded SVGs and tiny buttons instead of a responsive JRPG UI.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const outDir = "dist-pages";
const html = readFileSync(join(outDir, "index.html"), "utf8");
const cssNames = readdirSync(join(outDir, "assets")).filter((name) => name.endsWith(".css"));
if (cssNames.length === 0) throw new Error("Pages build contains no CSS asset");
if (!html.match(/<link[^>]*href=["'][^"']+\\.css["']/i)) {
  throw new Error("Pages HTML is not linking a compiled CSS asset");
}
const css = cssNames.map((name) => readFileSync(join(outDir, "assets", name), "utf8")).join("\n");
const expected = [
  ".min-h-screen", // main application fills browser
  ".absolute", // backdrop and art layer must overlay, not stack
  ".inset-0", // background covers the viewport
  ".max-w-3xl", // title menu bounded
  ".items-center", // logo and menu align
  ".justify-center", // title content vertically centered
  ".h-28", // emblem constrained
  ".w-28",
  ".text-5xl", // readable title, not tiny unstyled text
  ".bg-amber", // styled main action button
];
const missing = expected.filter((selector) => !css.includes(selector));
if (missing.length > 0) {
  throw new Error("Pages build is missing Tailwind game utilities: " + missing.join(", "));
}
console.log("Pages CSS guard passed:", expected.length, "canonical game utilities found");
