import { useEffect, useRef, useState } from "react";
import type { SaveGame } from "../contracts.ts";
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
  const display = useRef({ x: 0, y: 0, ang: 0, bank: 0, ready: false });
  const swipe = useRef<{ x: number; y: number } | null>(null);
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
  const landing = canLand(save, cell.x, cell.y) ? "Landing: this cell will take the hull." : "Landing: not a pad.";
  const pads = SKY_DOCKS.filter((d) => canLand(save, d.x, d.y));
  const noted = SKY_FINDS.filter((f) => save.flags[f.flag]);

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
          <canvas
            ref={canvasRef}
            className="block h-[min(68vh,640px)] w-full touch-none"
            aria-label="The First Stay over a bounded sky chart. A and Left are west. D and Right are east."
            onPointerDown={(e) => {
              swipe.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={(e) => {
              const start = swipe.current;
              swipe.current = null;
              if (!start) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (Math.hypot(dx, dy) < 28) return;
              if (Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? "w" : "e");
              else go(dy < 0 ? "n" : "s");
            }}
          />
          <p className="sr-only" aria-live="polite">{status} {landing}</p>
        </div>
        <aside className="region-card flex flex-col gap-3 rounded-md border border-line bg-panel p-3">
          <p className="text-sm text-parchment/80">A bounded sky. West is left on the chart. The hull moves one cell at a time. It will not cross the edge, and it will not land on a mark that is not a pad.</p>
          <div className="grid grid-cols-3 place-items-center text-xs tracking-widest text-amber" aria-label={`Compass. Heading ${facingWord(cell.facing)}.`}>
            <span />
            <span className={cell.facing === "n" ? "font-bold text-teal" : ""}>N</span>
            <span />
            <span className={cell.facing === "w" ? "font-bold text-teal" : ""}>W</span>
            <span className="text-[10px] tracking-normal text-parchment/70">{facingWord(cell.facing)}</span>
            <span className={cell.facing === "e" ? "font-bold text-teal" : ""}>E</span>
            <span />
            <span className={cell.facing === "s" ? "font-bold text-teal" : ""}>S</span>
            <span />
          </div>
          <p className="text-sm text-parchment">Sky {cell.x}, {cell.y} · {facingWord(cell.facing)}</p>
          <p className={canLand(save, cell.x, cell.y) ? "text-sm text-teal" : "text-sm text-parchment/70"}>{landing}</p>
          <p className="text-xs text-parchment/70">A or Left west. D or Right east. W or Up north. S or Down south. A swipe or a gamepad stick does the same, one cell at a time.</p>
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
          <p className="text-xs text-parchment/70">Pads that will take the hull: {pads.length ? pads.map((d) => d.name).join(", ") : "none yet"}.</p>
          <p className="text-xs text-parchment/70">Noted: {noted.length ? noted.map((f) => f.id).join(", ") : "nothing extra yet"}.</p>
          <details className="text-xs text-parchment/70">
            <summary className="cursor-pointer text-amber">Whole chart</summary>
            <p className="mt-2">{chartText(save)}</p>
          </details>
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
  display: { x: number; y: number; ang: number; bank: number; ready: boolean },
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
  const cell = skyCell(save);
  const tx = cell.x * CELL + CELL / 2;
  const ty = cell.y * CELL + CELL / 2;
  const targetAng = faceAngle(cell.facing);
  const reduced = save.settings.reducedMotion || time === 0;
  if (!display.ready || reduced) {
    display.x = tx;
    display.y = ty;
    display.ang = targetAng;
    display.bank = 0;
    display.ready = true;
  } else {
    const dx = tx - display.x;
    const dy = ty - display.y;
    display.x += dx * 0.12;
    display.y += dy * 0.12;
    const before = display.ang;
    display.ang = lerpAngle(display.ang, targetAng, 0.14);
    let turn = display.ang - before;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    display.bank = display.bank * 0.86 + Math.max(-0.38, Math.min(0.38, turn * 6));
  }
  const worldW = SKY_W * CELL;
  const worldH = SKY_H * CELL;
  let camX = display.x - w / 2;
  let camY = display.y - h / 2;
  camX = Math.max(0, Math.min(worldW - w, camX));
  camY = Math.max(0, Math.min(worldH - h, camY));
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#1a2740");
  sky.addColorStop(0.45, "#24344c");
  sky.addColorStop(1, "#12161e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunX = w * 0.72;
  const sunY = h * 0.18;
  const sun = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 180);
  sun.addColorStop(0, "rgba(232,177,90,0.28)");
  sun.addColorStop(1, "rgba(232,177,90,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(-camX, -camY);
  for (let y = 0; y < SKY_H; y++) {
    for (let x = 0; x < SKY_W; x++) {
      ctx.fillStyle = terrainColor(x, y);
      ctx.fillRect(x * CELL, y * CELL, CELL + 1, CELL + 1);
      if (skyInside(x, y) && (x + y) % 2 === 0) {
        ctx.fillStyle = "rgba(243,230,200,0.03)";
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }
  paintCountry(ctx, reduced ? 0 : time);
  paintClouds(ctx, worldW, worldH, reduced ? 40 : time / 28, 0.22);
  for (const dock of SKY_DOCKS) {
    const known = canLand(save, dock.x, dock.y);
    const hinted = dock.id === "dock.cinder" && !save.flags["flag.found_cinder"];
    const cx = dock.x * CELL + CELL / 2;
    const cy = dock.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, known ? 9 : 5, 0, Math.PI * 2);
    ctx.fillStyle = dock.id === "dock.cinder" ? "#7eb6d6" : "#e8b15a";
    ctx.globalAlpha = known ? 0.95 : hinted ? 0.45 : 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (known) {
      ctx.strokeStyle = "#f3e6c8";
      ctx.stroke();
      ctx.fillStyle = "#f3e6c8";
      ctx.font = "12px sans-serif";
      ctx.fillText(dock.name, dock.x * CELL + 4, dock.y * CELL - 6);
    }
  }
  for (const find of SKY_FINDS) {
    const known = Boolean(save.flags[find.flag]);
    const cx = find.x * CELL + CELL / 2;
    const cy = find.y * CELL + CELL / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = find.id === "later" ? "#8b6bb8" : known ? "#4ec8c0" : "rgba(243,230,200,0.28)";
    ctx.lineWidth = known ? 2 : 1;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
    if (known && find.id !== "later") {
      ctx.fillStyle = "#d7e4f2";
      ctx.font = "11px sans-serif";
      ctx.fillText(find.id, find.x * CELL + 8, find.y * CELL + 12);
    }
    if (find.id === "later") {
      ctx.fillStyle = "rgba(139,107,184,0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy - 16, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (find.id === "beacon") {
      const pulse = reduced ? 0.65 : 0.35 + 0.5 * Math.abs(Math.sin(time / 280));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = known ? `rgba(232,177,90,${0.25 + pulse * 0.45})` : "rgba(232,177,90,0.12)";
      ctx.beginPath();
      ctx.arc(0, -20, known ? 14 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = known ? "#e8b15a" : "rgba(243,230,200,0.35)";
      ctx.fillRect(-3, -16, 6, 24);
      ctx.fillStyle = known ? "#7eb6d6" : "rgba(126,182,214,0.28)";
      ctx.beginPath();
      ctx.arc(8, -18, known ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.save();
  ctx.translate(display.x, display.y);
  drawHull(ctx, display.ang, display.bank);
  ctx.restore();
  ctx.restore();
  paintCloudsScreen(ctx, w, h, reduced ? 0 : time / 40);
  if (!reduced) {
    ctx.strokeStyle = "rgba(215,228,242,0.18)";
    for (let i = 0; i < 6; i++) {
      const y = ((time / 8 + i * 70) % (h + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(w + 10, y - 18);
      ctx.stroke();
    }
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(8,10,16,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  if (!skyInside(cell.x, cell.y)) {
    ctx.strokeStyle = "#e8b15a";
    ctx.strokeRect(8, 8, w - 16, h - 16);
  }
}

function faceAngle(facing: string): number {
  if (facing === "s") return Math.PI / 2;
  if (facing === "w") return Math.PI;
  if (facing === "n") return -Math.PI / 2;
  return 0;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function drawHull(ctx: CanvasRenderingContext2D, ang: number, bank: number) {
  ctx.save();
  ctx.rotate(ang);
  ctx.transform(1, 0, bank, 1, 0, 0);
  ctx.fillStyle = "rgba(18,16,14,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8b49a";
  ctx.beginPath();
  ctx.ellipse(2, 0, 36, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6a5040";
  ctx.stroke();
  ctx.fillStyle = "#8a6848";
  ctx.fillRect(-26, -3, 52, 6);
  ctx.fillStyle = "#2a221c";
  ctx.fillRect(-6, 5, 16, 8);
  ctx.fillStyle = "#e8b15a";
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-46, -10);
  ctx.lineTo(-46, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7eb6d6";
  ctx.beginPath();
  ctx.arc(30, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function terrainColor(x: number, y: number): string {
  if (!skyInside(x, y)) return "#0c1016";
  if (x >= 11 && x <= 14 && y >= 7) return "#4a3834";
  if (y >= 9) return "#1a4554";
  if (x <= 5 && y >= 6) return "#2f4a3c";
  if (y <= 4 && x >= 5 && x <= 13) return "#3a4658";
  if (x >= 13) return "#2c3848";
  if ((x * 3 + y) % 7 === 0) return "#243e34";
  return "#2a4638";
}

function paintCountry(ctx: CanvasRenderingContext2D, time: number) {
  ctx.fillStyle = "#5a6a78";
  for (const [x, y, s] of [[7, 2, 28], [9, 3, 36], [11, 2, 24], [8, 4, 18]] as const) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, y * CELL + s);
    ctx.lineTo(x * CELL + s * 0.6, y * CELL - s * 0.2);
    ctx.lineTo(x * CELL + s * 1.2, y * CELL + s);
    ctx.fill();
  }
  ctx.strokeStyle = "#3a7a90";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(4 * CELL, 10 * CELL);
  ctx.quadraticCurveTo(7 * CELL, 7 * CELL, 9 * CELL, 8 * CELL);
  ctx.quadraticCurveTo(12 * CELL, 9 * CELL, 13 * CELL, 11 * CELL);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = "#1e3a30";
  for (let i = 0; i < 8; i++) {
    const x = 2 * CELL + (i % 4) * 22;
    const y = 7 * CELL + Math.floor(i / 4) * 18;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#c8bba8";
  ctx.beginPath();
  ctx.moveTo(6 * CELL + 20, 5 * CELL + 40);
  ctx.lineTo(6 * CELL + 28, 5 * CELL + 8);
  ctx.lineTo(6 * CELL + 36, 5 * CELL + 40);
  ctx.stroke();
  ctx.fillStyle = `rgba(126,182,214,${0.35 + Math.sin(time / 40) * 0.08})`;
  ctx.fillRect(13 * CELL + 18, 7 * CELL + 10, 10, 16);
}

function paintClouds(ctx: CanvasRenderingContext2D, worldW: number, worldH: number, drift: number, alpha: number) {
  ctx.fillStyle = `rgba(243,230,200,${alpha})`;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 170 + drift * (i % 2 ? 1.6 : 0.7)) % (worldW + 140)) - 70;
    const y = 30 + ((i * 91) % (worldH - 60));
    ctx.beginPath();
    ctx.ellipse(x, y, 64 + (i % 3) * 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCloudsScreen(ctx: CanvasRenderingContext2D, w: number, h: number, drift: number) {
  ctx.fillStyle = "rgba(210,222,236,0.14)";
  for (let i = 0; i < 4; i++) {
    const x = ((i * 220 - drift * 0.45) % (w + 180)) - 60;
    const y = 24 + i * (h / 5);
    ctx.beginPath();
    ctx.ellipse(x, y, 120, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
