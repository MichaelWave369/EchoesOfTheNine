import { useEffect, useRef, useState } from "react";
import type { SaveGame } from "../contracts.ts";
import { artUrl } from "./sprites.ts";
import {
  SKY_DOCKS,
  SKY_FINDS,
  SKY_H,
  SKY_W,
  canLand,
  chartText,
  landAt,
  lookFromSky,
  noteSky,
  returnDock,
  skyCell,
  skyInside,
  stepSky,
  takeCache,
  walkDeck,
  type SkyFacing,
} from "../content/opensky.ts";

const CELL = 56;

function SkyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-md border border-line bg-ink-2/80 px-4 py-2 text-base font-semibold text-parchment hover:border-amber"
    >
      {children}
    </button>
  );
}

/**
 * Top-down chart, not a chase camera.
 * A / Left moves west (left on the chart). D / Right moves east.
 * W / Up is north. S / Down is south. One cell per press.
 */
export function SkyAtlas({
  save,
  commit,
  push,
  onGround,
}: {
  save: SaveGame;
  commit: (s: SaveGame) => SaveGame;
  push: (t: string) => void;
  onGround: (s: SaveGame) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const display = useRef({ x: 0, y: 0, ready: false });
  const [status, setStatus] = useState("The chart has edges. The hull does not.");
  const reduced = save.settings.reducedMotion;
  const cell = skyCell(save);

  function go(dir: SkyFacing) {
    const moved = stepSky(saveRef.current, dir);
    if (!moved.ok) {
      setStatus(moved.reason);
      push(moved.reason);
      return;
    }
    saveRef.current = moved.save;
    commit(moved.save);
    const next = skyCell(moved.save);
    setStatus(placeLine(moved.save, next.x, next.y, next.facing));
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const dir =
        e.code === "ArrowLeft" || e.code === "KeyA"
          ? "w"
          : e.code === "ArrowRight" || e.code === "KeyD"
            ? "e"
            : e.code === "ArrowUp" || e.code === "KeyW"
              ? "n"
              : e.code === "ArrowDown" || e.code === "KeyS"
                ? "s"
                : null;
      if (!dir) return;
      e.preventDefault();
      go(dir);
    };
    window.addEventListener("keydown", down);
    const probe = {
      getX: () => skyCell(saveRef.current).x,
      getY: () => skyCell(saveRef.current).y,
      getFacing: () => skyCell(saveRef.current).facing,
      setKeys: (codes: string[]) => {
        const code = codes[0];
        const dir = code === "KeyA" || code === "ArrowLeft" ? "w" : code === "KeyD" || code === "ArrowRight" ? "e" : code === "KeyW" || code === "ArrowUp" ? "n" : code === "KeyS" || code === "ArrowDown" ? "s" : null;
        if (dir) go(dir);
      },
    };
    (window as unknown as { __controlsTest?: typeof probe }).__controlsTest = probe;
    return () => {
      window.removeEventListener("keydown", down);
      const w = window as unknown as { __controlsTest?: typeof probe };
      if (w.__controlsTest === probe) delete w.__controlsTest;
    };
  }, [save.flags["sky.x"], save.flags["sky.y"], save.flags["sky.facing"]]);

  useEffect(() => {
    let frame = 0;
    let alive = true;
    const prev = { buttons: [] as boolean[], axes: [0, 0] };
    const tick = (t: number) => {
      if (!alive) return;
      const canvas = canvasRef.current;
      if (canvas) paint(canvas, saveRef.current, display.current, reduced ? 0 : t);
      const pads = navigator.getGamepads?.() ?? [];
      const pad = pads[0];
      if (pad) {
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        const edgeAxis = (now: number, was: number, neg: SkyFacing, pos: SkyFacing) => {
          if (now < -0.55 && was >= -0.55) go(neg);
          if (now > 0.55 && was <= 0.55) go(pos);
        };
        edgeAxis(ax, prev.axes[0] ?? 0, "w", "e");
        edgeAxis(ay, prev.axes[1] ?? 0, "n", "s");
        const pressed = pad.buttons.map((b) => b.pressed);
        const edge = (i: number, dir: SkyFacing) => {
          if (pressed[i] && !prev.buttons[i]) go(dir);
        };
        edge(14, "w");
        edge(15, "e");
        edge(12, "n");
        edge(13, "s");
        prev.buttons = pressed;
        prev.axes = [ax, ay];
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  function act(kind: "note" | "land" | "sight" | "deck" | "home" | "cache") {
    const current = saveRef.current;
    if (kind === "note") {
      const noted = noteSky(current);
      if (noted.ok) {
        saveRef.current = noted.save;
        commit(noted.save);
      }
      setStatus(noted.ok ? noted.text : noted.reason);
      push(noted.ok ? noted.text : noted.reason);
      return;
    }
    if (kind === "cache") {
      const taken = takeCache(current);
      if (taken.ok) {
        saveRef.current = taken.save;
        commit(taken.save);
      }
      setStatus(taken.ok ? taken.text : taken.reason);
      push(taken.ok ? taken.text : taken.reason);
      return;
    }
    if (kind === "sight") {
      const seen = lookFromSky(current);
      if (seen.ok) {
        saveRef.current = seen.save;
        commit(seen.save);
      }
      setStatus(seen.ok ? seen.text : seen.reason);
      push(seen.ok ? seen.text : seen.reason);
      return;
    }
    if (kind === "deck") {
      const walked = walkDeck(current);
      if (!walked.ok) {
        push(walked.reason);
        return;
      }
      onGround(walked.save);
      return;
    }
    if (kind === "home") {
      const back = returnDock(current);
      if (!back.ok) {
        push(back.reason);
        return;
      }
      onGround(back.save);
      push(back.text);
      return;
    }
    const landed = landAt(current);
    if (!landed.ok) {
      setStatus(landed.reason);
      push(landed.reason);
      return;
    }
    onGround(landed.save);
    push(landed.text);
  }

  const here = placeLine(save, cell.x, cell.y, cell.facing);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-3 py-3 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.22em] text-teal uppercase">Sky Atlas</p>
          <h2 className="font-display text-2xl">The First Stay</h2>
        </div>
        <p className="max-w-md text-sm text-amber-2">{here}</p>
      </header>
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="map-frame overflow-hidden rounded-md border border-line bg-ink-2">
          <canvas ref={canvasRef} className="block h-[min(68vh,640px)] w-full" aria-label="The First Stay over a bounded sky chart. A and Left are west. D and Right are east." />
          <p className="sr-only" aria-live="polite">{status}</p>
        </div>
        <aside className="region-card flex flex-col gap-3 rounded-md border border-line bg-panel p-3">
          <p className="text-sm text-parchment/80">A bounded sky. West is left on the chart. The hull moves one cell at a time. It will not cross the edge, and it will not land on a mark that is not a pad.</p>
          <p className="text-xs text-parchment/70">A or Left west. D or Right east. W or Up north. S or Down south. A gamepad stick does the same.</p>
          <div className="grid grid-cols-3 gap-2">
            <span />
            <SkyButton onClick={() => go("n")}>North</SkyButton>
            <span />
            <SkyButton onClick={() => go("w")}>West</SkyButton>
            <SkyButton onClick={() => act("note")}>Note</SkyButton>
            <SkyButton onClick={() => go("e")}>East</SkyButton>
            <span />
            <SkyButton onClick={() => go("s")}>South</SkyButton>
            <span />
          </div>
          <SkyButton onClick={() => act("land")}>Land</SkyButton>
          <SkyButton onClick={() => act("cache")}>Take the cache</SkyButton>
          <SkyButton onClick={() => act("sight")}>Sight</SkyButton>
          <SkyButton onClick={() => act("deck")}>Walk the deck</SkyButton>
          <SkyButton onClick={() => act("home")}>Return to the last dock</SkyButton>
          <p className="text-xs text-parchment/70">{chartText(save)}</p>
        </aside>
      </div>
    </div>
  );
}

function placeLine(save: SaveGame, x: number, y: number, facing: string): string {
  const dock = SKY_DOCKS.find((d) => d.x === x && d.y === y);
  const find = SKY_FINDS.find((f) => f.x === x && f.y === y);
  let under = "Open air.";
  if (dock?.id === "dock.cinder" && !save.flags["flag.found_cinder"]) under = "Something under the hull has not been written down.";
  else if (dock) under = canLand(save, x, y) ? dock.name : `${dock.name} is not a landing yet.`;
  else if (find && save.flags[find.flag]) under = find.id === "later" ? "A later light. Not a pad." : find.text.slice(0, 72);
  else if (find) under = "Something under the hull has not been written down.";
  return `Sky ${x}, ${y} · ${facingWord(facing)}. ${under}`;
}

function facingWord(facing: string): string {
  if (facing === "n") return "north";
  if (facing === "s") return "south";
  if (facing === "e") return "east";
  return "west";
}

function paint(
  canvas: HTMLCanvasElement,
  save: SaveGame,
  display: { x: number; y: number; ready: boolean },
  time: number,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width));
  const h = Math.max(240, Math.floor(rect.height));
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const cell = skyCell(save);
  const tx = cell.x * CELL + CELL / 2;
  const ty = cell.y * CELL + CELL / 2;
  if (!display.ready || save.settings.reducedMotion) {
    display.x = tx;
    display.y = ty;
    display.ready = true;
  } else {
    display.x += (tx - display.x) * 0.18;
    display.y += (ty - display.y) * 0.18;
  }
  const worldW = SKY_W * CELL;
  const worldH = SKY_H * CELL;
  let camX = display.x - w / 2;
  let camY = display.y - h / 2;
  camX = Math.max(0, Math.min(worldW - w, camX));
  camY = Math.max(0, Math.min(worldH - h, camY));
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#24344a");
  sky.addColorStop(1, "#141820");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(-camX, -camY);
  for (let y = 0; y < SKY_H; y++) {
    for (let x = 0; x < SKY_W; x++) {
      ctx.fillStyle = terrainColor(x, y);
      ctx.fillRect(x * CELL, y * CELL, CELL + 1, CELL + 1);
    }
  }
  const reduced = save.settings.reducedMotion || time === 0;
  paintClouds(ctx, worldW, worldH, reduced ? 0 : time / 40);
  for (const dock of SKY_DOCKS) {
    const open = canLand(save, dock.x, dock.y) || (dock.id === "dock.cinder" && !save.flags["flag.found_cinder"]);
    ctx.fillStyle = dock.id === "dock.cinder" ? "#7eb6d6" : "#e8b15a";
    ctx.globalAlpha = open ? 0.95 : 0.35;
    ctx.beginPath();
    ctx.arc(dock.x * CELL + CELL / 2, dock.y * CELL + CELL / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (dock.id !== "dock.cinder" || save.flags["flag.found_cinder"]) {
      ctx.fillStyle = "#f3e6c8";
      ctx.font = "12px sans-serif";
      ctx.fillText(dock.name, dock.x * CELL + 8, dock.y * CELL - 4);
    }
  }
  for (const find of SKY_FINDS) {
    if (!save.flags[find.flag] && find.id !== "later") continue;
    ctx.strokeStyle = find.id === "later" ? "#8b6bb8" : "#4ec8c0";
    ctx.strokeRect(find.x * CELL + 16, find.y * CELL + 16, 24, 24);
  }
  const img = sheet();
  const face = skyCell(save).facing;
  const ang = face === "e" ? 0 : face === "s" ? Math.PI / 2 : face === "w" ? Math.PI : -Math.PI / 2;
  ctx.save();
  ctx.translate(display.x, display.y);
  ctx.rotate(ang);
  if (img) ctx.drawImage(img, -46, -28, 92, 56);
  else {
    ctx.fillStyle = "#c8bba8";
    ctx.fillRect(-28, -10, 56, 20);
  }
  ctx.restore();
  ctx.restore();
  if (!skyInside(cell.x, cell.y)) {
    ctx.strokeStyle = "#e8b15a";
    ctx.strokeRect(8, 8, w - 16, h - 16);
  }
}

function terrainColor(x: number, y: number): string {
  if (!skyInside(x, y)) return "#0e1218";
  if (x === 12 && y >= 8) return "#4a3834";
  if (x <= 5 && y >= 7) return "#3d5a48";
  if (x >= 13 && y >= 6) return "#3a4454";
  if (y <= 4 && x >= 6 && x <= 12) return "#2a3c58";
  if (y >= 8) return "#1e4a58";
  if ((x + y) % 5 === 0) return "#2a4038";
  return "#2c4a3c";
}

function paintClouds(ctx: CanvasRenderingContext2D, worldW: number, worldH: number, drift: number) {
  ctx.fillStyle = "rgba(243,230,200,0.16)";
  for (let i = 0; i < 7; i++) {
    const x = ((i * 180 + drift * (i % 2 ? 1.4 : 0.6)) % (worldW + 120)) - 60;
    const y = 40 + ((i * 97) % (worldH - 80));
    ctx.beginPath();
    ctx.ellipse(x, y, 70 + (i % 3) * 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(200,214,230,0.12)";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 240 - drift * 0.35) % (worldW + 160)) - 40;
    const y = 80 + ((i * 130) % (worldH - 100));
    ctx.beginPath();
    ctx.ellipse(x, y, 110, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

let hull: HTMLImageElement | null = null;
function sheet(): HTMLImageElement | null {
  if (hull) return hull.complete ? hull : null;
  if (typeof Image === "undefined") return null;
  hull = new Image();
  hull.src = artUrl("skiff.png");
  return null;
}
