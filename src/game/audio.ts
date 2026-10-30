/** Procedural Web Audio. No samples, no keys. Unlocks on the first gesture. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let music: GainNode | null = null;
let sfx: GainNode | null = null;
let musicTimer: number | null = null;
let bed: AudioBufferSourceNode | null = null;
let muted = false;
let volume = 0.7;
let reduced = false;
let quiet = false;
let lastMode: string | null = null;

function ensure() {
  if (ctx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });
  master = ctx.createGain();
  music = ctx.createGain();
  sfx = ctx.createGain();
  music.connect(master);
  sfx.connect(master);
  master.connect(ctx.destination);
  applyGains();
}

function applyGains() {
  if (!ctx || !master || !music || !sfx) return;
  const m = muted ? 0 : volume * volume;
  master.gain.setTargetAtTime(m, ctx.currentTime, 0.03);
  music.gain.setTargetAtTime(0.22, ctx.currentTime, 0.03);
  sfx.gain.setTargetAtTime(0.8, ctx.currentTime, 0.02);
}

export function unlockAudio() {
  ensure();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function configureAudio(opts: { muted: boolean; volume: number; reducedMotion: boolean; quiet?: boolean }) {
  muted = opts.muted;
  volume = opts.volume;
  reduced = opts.reducedMotion;
  quiet = Boolean(opts.quiet);
  if (ctx) applyGains();
  if (muted || reduced) stopMusic();
  else if (quiet) stopAmbience();
  else if (lastMode && ctx) startAmbience(bedKind(lastMode));
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, bus: "sfx" | "music" = "sfx") {
  if (!ctx || !sfx || !music || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(bus === "music" ? music : sfx);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playSfx(name: "ui" | "hit" | "heal" | "spell" | "hurt" | "victory" | "clock" | "step" | "warn" | "rise") {
  unlockAudio();
  if (muted || reduced) return;
  if (name === "ui") tone(520, 0.08, "triangle", 0.08);
  if (name === "step") tone(180 + Math.random() * 30, 0.05, "sine", 0.03);
  if (name === "rise") {
    tone(196, 0.28, "sine", 0.04);
    tone(294, 0.36, "triangle", 0.03, 0.08);
  }
  if (name === "hit") {
    tone(140, 0.12, "square", 0.07);
    tone(90, 0.16, "sawtooth", 0.04);
  }
  if (name === "hurt") tone(110, 0.2, "sawtooth", 0.06);
  if (name === "heal") {
    tone(520, 0.12, "sine", 0.05);
    tone(660, 0.16, "sine", 0.04, 0.06);
  }
  if (name === "spell") {
    tone(440, 0.18, "triangle", 0.06);
    tone(660, 0.22, "sine", 0.05, 0.05);
    tone(880, 0.2, "sine", 0.03, 0.1);
  }
  if (name === "clock") {
    tone(196, 0.7, "sine", 0.08);
    tone(392, 0.9, "triangle", 0.04, 0.05);
  }
  if (name === "victory") {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, "triangle", 0.06, i * 0.12));
  }
  if (name === "warn") {
    tone(98, 0.32, "sawtooth", 0.05);
    tone(146, 0.26, "triangle", 0.04, 0.08);
  }
}

export type StepKind = "cobble" | "grass" | "wood" | "stone" | "water";

export function playStep(kind: StepKind) {
  unlockAudio();
  if (muted || reduced) return;
  const base = kind === "grass" ? 128 : kind === "wood" ? 236 : kind === "stone" ? 150 : kind === "water" ? 188 : 176;
  const wave = kind === "wood" || kind === "stone" ? "triangle" : "sine";
  tone(base + Math.random() * 22, kind === "water" ? 0.07 : 0.045, wave, 0.034);
}

function stopAmbience() {
  if (!bed) return;
  try {
    bed.stop();
  } catch {
    /* already stopped */
  }
  bed.disconnect();
  bed = null;
}

function bedKind(mode: string): "vale" | "woods" | "shrine" | "mist" | "ridge" | "quiet" {
  if (mode === "vale" || mode === "inn" || mode === "title") return "vale";
  if (mode === "woods" || mode === "reach" || mode === "barrow") return "woods";
  if (mode === "shrine" || mode === "glass") return "shrine";
  if (mode === "mist" || mode === "lowbell" || mode === "hold") return "mist";
  if (mode === "ridge" || mode === "highroad" || mode === "cave" || mode === "berth") return "ridge";
  return "quiet";
}

function startAmbience(kind: ReturnType<typeof bedKind>) {
  stopAmbience();
  if (!ctx || !music || muted || reduced || quiet || kind === "quiet") return;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let v = 0;
  for (let i = 0; i < data.length; i++) {
    v = v * 0.985 + (Math.random() * 2 - 1) * 0.02;
    data[i] = v;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = kind === "ridge" ? "highpass" : "lowpass";
  filter.frequency.value = kind === "vale" ? 680 : kind === "woods" ? 420 : kind === "mist" ? 260 : kind === "ridge" ? 900 : 520;
  const g = ctx.createGain();
  g.gain.value = 0.03;
  src.connect(filter);
  filter.connect(g);
  g.connect(music);
  src.start();
  bed = src;
}

const MODES: Record<string, number[]> = {
  title: [196, 247, 294, 247, 220, 196, 174, 196],
  vale: [262, 294, 330, 294, 262, 247, 262, 330],
  woods: [220, 247, 196, 220, 174, 196, 165, 196],
  shrine: [174, 220, 196, 247, 220, 174, 165, 196],
  reach: [196, 220, 174, 196, 233, 196, 174, 165],
  barrow: [146, 165, 174, 146, 130, 146, 174, 196],
  inn: [294, 330, 294, 262, 247, 262, 294, 330],
  lowbell: [220, 262, 294, 262, 196, 220, 247, 196],
  mist: [174, 196, 220, 196, 165, 146, 174, 220],
  hold: [146, 174, 165, 146, 130, 146, 174, 130],
  highroad: [220, 247, 262, 220, 196, 220, 247, 196],
  ridge: [247, 294, 262, 220, 247, 196, 220, 262],
  glass: [196, 247, 220, 174, 196, 220, 247, 174],
  cave: [130, 146, 174, 146, 130, 165, 146, 130],
  berth: [262, 294, 330, 294, 247, 262, 294, 330],
  battle: [146, 174, 196, 174, 146, 130, 146, 196],
};

export function startMusic(mode: keyof typeof MODES) {
  lastMode = mode;
  unlockAudio();
  stopMusic();
  if (muted || reduced || !ctx) return;
  const scale = MODES[mode];
  let i = 0;
  const tick = () => {
    const f = scale[i % scale.length] ?? 220;
    tone(f, 0.45, "sine", 0.05, 0, "music");
    tone(f / 2, 0.5, "triangle", 0.03, 0, "music");
    i++;
  };
  tick();
  musicTimer = window.setInterval(tick, 720);
  if (!quiet) startAmbience(bedKind(mode));
}

export function stopMusic() {
  if (musicTimer != null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  stopAmbience();
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
