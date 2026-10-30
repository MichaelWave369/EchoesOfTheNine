import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CombatAction, EncounterState, SaveGame, WandererAppearance } from "../contracts.ts";
import { CHARACTERS, ENEMY_TEMPLATES, JOBS } from "../content/characters.ts";
import { ability, ABILITIES } from "../content/abilities.ts";
import { DIALOGUE, ITEMS, MAPS, MOSS_ANSWER, RUNE_ANSWER, type MapHotspot } from "../content/world.ts";
import { buyItem, equipItem, GEAR, learnElementalist, levelForXp, prepareForBattle, restParty, SHOP_IDS, useSight, withGear } from "../content/gear.ts";
import { companionAside, choiceCoda, reachClose, wardenMemory } from "../content/memory.ts";
import {
  ATLAS,
  ATLAS_ROADS,
  BRAZIER_ANSWER,
  canTravel,
  chooseCompanion,
  EXPANSE_COPY,
  JOB_KITS,
  learnSolarFrom,
  markPlace,
  noteBell,
  placeState,
  talkIvo,
  tryLearnMemoryFromMira,
  windupAdvice,
} from "../content/expanses.ts";
import {
  CROSSING_COPY,
  MIST_SHOP,
  companionInstinct,
  crossingCoda,
  dismissSight,
  recordDepartures,
  switchJob,
  takePierCache,
  talkHale,
  talkTamsin,
  talkWren,
  tickSight,
  timetableText,
  tryHold,
  tryLearnWake,
} from "../content/crossing.ts";
import {
  SKY_COPY,
  SKIFF_DOCKS,
  benchToggle,
  chooseSera,
  flyTo,
  formationSlot,
  noteHullShadow,
  readGlass,
  revisitLine,
  setFormation,
  skyCoda,
  takeCloudSalt,
  talkAda,
  talkOrrin,
  talkSera,
  tryDome,
  tryLearnCrosswind,
  wrenSky,
} from "../content/skyweave.ts";
import {
  applyReward,
  bumpBond,
  clearLocal,
  deserialize,
  flag,
  freshSave,
  loadLocal,
  recruit,
  serialize,
  setAppearance,
  setFlag,
  writeLocal,
} from "../chronicle/save.ts";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "../core/combat.ts";
import { configureAudio, resumeAudio, playSfx, playStep, startMusic, unlockAudio } from "../audio.ts";
import { paintArena, paintExploration } from "./art.ts";
import { artUrl, cameraOrigin, portraitMood, portraitSpec, warmArt } from "./sprites.ts";
import { glide, stepKind } from "./breath.ts";
import { detectXr, requestReferenceSession, XR_BINDINGS, type XrCapability } from "../xr/adapter.ts";

type Screen = "title" | "name" | "explore" | "battle" | "ending";

type Toast = { id: number; text: string };

const TILE = 48;

function musicFor(mapId: string): "vale" | "woods" | "shrine" | "reach" | "barrow" | "inn" | "lowbell" | "mist" | "hold" | "highroad" | "ridge" | "glass" | "cave" | "berth" | "battle" | "title" {
  if (mapId === "map.shrine") return "shrine";
  if (mapId === "map.woods") return "woods";
  if (mapId === "map.reach") return "reach";
  if (mapId === "map.barrow") return "barrow";
  if (mapId === "map.lowbell") return "lowbell";
  if (mapId === "map.ferry") return "mist";
  if (mapId === "map.hold") return "hold";
  if (mapId === "map.highroad") return "highroad";
  if (mapId === "map.ridge") return "ridge";
  if (mapId === "map.glass") return "glass";
  if (mapId === "map.cave") return "cave";
  if (mapId === "map.berth") return "berth";
  if (mapId === "map.inn" || mapId === "map.smith") return "inn";
  return "vale";
}

const SPEAKER_HUE: Record<string, number> = {
  Lira: 24,
  Nim: 48,
  Mira: 168,
  Kael: 210,
  Nessa: 128,
  Salla: 330,
  Bram: 16,
  "Elder Voss": 42,
  Ivo: 18,
  Pell: 12,
  Hale: 200,
  Wren: 80,
  Sera: 48,
  Ada: 16,
  Orrin: 200,
  You: 38,
};

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

export function GameApp() {
  const [screen, setScreen] = useState<Screen>("title");
  const [save, setSave] = useState<SaveGame | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [name, setName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fromTitle, setFromTitle] = useState(true);
  const { toasts, push } = useToasts();

  useEffect(() => {
    warmArt();
    setHasSave(!!loadLocal());
  }, [screen]);

  const commit = useCallback(
    (next: SaveGame, slot: "auto" | "manual" = "auto") => {
      const written = writeLocal(next, slot);
      setSave(written);
      setHasSave(true);
      return written;
    },
    [],
  );

  useEffect(() => {
    if (!save) return;
    configureAudio({
      muted: save.settings.muted,
      volume: save.settings.masterVolume,
      reducedMotion: save.settings.reducedMotion,
      quiet: save.settings.motionDetail === "quiet",
    });
  }, [save?.settings.muted, save?.settings.masterVolume, save?.settings.reducedMotion, save?.settings.motionDetail]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const scale = save?.settings.textScale ?? "md";

  return (
    <div className={`eotn text-scale-${scale} ${save?.settings.highContrast ? "contrast-boost" : ""} min-h-screen bg-ink text-parchment`}>
      {screen === "title" && (
        <TitleScreen
          hasSave={hasSave}
          onNew={() => {
            unlockAudio();
            playSfx("ui");
            startMusic("title");
            setScreen("name");
          }}
          onContinue={() => {
            const loaded = loadLocal();
            if (!loaded) return;
            unlockAudio();
            playSfx("ui");
            setSave(loaded);
            startMusic(musicFor(loaded.mapId));
            setScreen(loaded.encounter ? "battle" : "explore");
          }}
          onSettings={() => {
            setFromTitle(true);
            setSettingsOpen(true);
          }}
        />
      )}
      {screen === "name" && (
        <NameScreen
          name={name}
          setName={setName}
          onBegin={(look) => {
            const next = setAppearance(freshSave(name), look);
            commit(next);
            startMusic("vale");
            playSfx("ui");
            setScreen("explore");
            push(`The ninth lantern is lit, ${next.playerName}.`);
          }}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "explore" && save && (
        <Explore
          save={save}
          commit={commit}
          push={push}
          onBattle={(enc) => {
            const next = { ...save, encounter: enc };
            commit(next);
            startMusic("battle");
            setScreen("battle");
          }}
          onMenu={() => {
            setFromTitle(false);
            setSettingsOpen(true);
          }}
          onEnding={() => {
            startMusic("shrine");
            playSfx("victory");
            setScreen("ending");
          }}
        />
      )}
      {screen === "battle" && save?.encounter && (
        <Battle
          save={save}
          commit={commit}
          push={push}
          onLeave={(next, victory, encounterId) => {
            commit(next);
            const closing = encounterId === "enc.warden" || encounterId === "enc.cantor";
            if (closing && victory) {
              startMusic(encounterId === "enc.cantor" ? "reach" : "shrine");
              playSfx("victory");
              setScreen("ending");
            } else {
              startMusic(musicFor(next.mapId));
              setScreen("explore");
              if (!victory) push("You wake at the last safe step. The story has not closed.");
            }
          }}
        />
      )}
      {screen === "ending" && save && (
        <Ending
          save={save}
          onTitle={() => setScreen("title")}
          onAgain={() => {
            const next = {
              ...save,
              mapId: flag(save, "flag.cantor_spared") || flag(save, "flag.cantor_defeated") ? "map.reach" : "map.shrine",
              spawnId: flag(save, "flag.cantor_spared") || flag(save, "flag.cantor_defeated") ? "shrine_side" : "door",
              encounter: null,
            };
            commit(next);
            startMusic(musicFor(next.mapId));
            setScreen("explore");
          }}
        />
      )}
      {settingsOpen && (
        <SettingsSheet
          save={save}
          onChange={(next) => {
            if (save) commit({ ...save, settings: next });
            else {
              const ghost = freshSave("Wanderer");
              ghost.settings = next;
              setSave(ghost);
            }
          }}
          onClose={() => setSettingsOpen(false)}
          onReset={() => {
            clearLocal();
            setSave(null);
            setHasSave(false);
            setSettingsOpen(false);
            setScreen("title");
            push("The chronicle was set down and closed.");
          }}
          onExport={() => {
            if (!save) return;
            const blob = new Blob([serialize(save)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `echoes-${save.playerName || "wanderer"}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onImport={async (file) => {
            const text = await file.text();
            try {
              const loaded = deserialize(text);
              commit(loaded, "manual");
              setSettingsOpen(false);
              setScreen(loaded.chapterComplete ? "ending" : "explore");
              push("Chronicle restored.");
            } catch (err) {
              push(err instanceof Error ? err.message : "Could not read that chronicle.");
            }
          }}
          showBackToTitle={fromTitle}
        />
      )}
      <div className="pointer-events-none fixed bottom-28 left-1/2 z-30 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 sm:bottom-4">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-md border border-line bg-ink-2/95 px-3 py-2 text-center text-sm text-parchment shadow-lg">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function CrystalMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <radialGradient id="crystal-core" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#f3e6c8" />
          <stop offset="55%" stopColor="#e8b15a" />
          <stop offset="100%" stopColor="#8b6bb8" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="28" fill="url(#crystal-core)" />
      <path d="M60 18 L78 60 L60 102 L42 60 Z" fill="#f3e6c8" opacity="0.35" />
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (Math.PI * 2 * i) / 9 - Math.PI / 2;
        const x = 60 + Math.cos(a) * 46;
        const y = 60 + Math.sin(a) * 46;
        return <circle key={i} cx={x} cy={y} r={i === 0 ? 4.2 : 2.4} fill={i % 2 ? "#4ec8c0" : "#f3e6c8"} className={i % 2 ? "lantern-flicker" : undefined} />;
      })}
      <circle cx="60" cy="60" r="50" fill="none" stroke="#e8b15a" strokeOpacity="0.55" />
    </svg>
  );
}

function TitleScreen({
  hasSave,
  onNew,
  onContinue,
  onSettings,
}: {
  hasSave: boolean;
  onNew: () => void;
  onContinue: () => void;
  onSettings: () => void;
}) {
  const [xr, setXr] = useState<XrCapability | null>(null);
  const [xrMsg, setXrMsg] = useState<string | null>(null);
  useEffect(() => {
    void detectXr().then(setXr);
  }, []);
  return (
    <div className="relative min-h-screen overflow-hidden">
      <VillageBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
        <CrystalMark className="mb-4 h-28 w-28" />
        <p className="text-xs tracking-[0.35em] text-amber-2 uppercase">Φ369 Labs</p>
        <h1 className="font-display mt-2 text-5xl text-parchment sm:text-7xl">Echoes of the Nine</h1>
        <p className="mt-3 max-w-md text-amber-2">A lantern festival. A clock that strikes the wrong hour. A shrine that knows your name.</p>
        <p className="mt-1 text-sm text-parchment/70">Chapter I — The Crystal Awakening</p>
        <p className="mt-1 text-xs tracking-[0.22em] text-teal/80 uppercase">A world worth walking before it is explained</p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <MenuButton onClick={onNew}>New Journey</MenuButton>
          {hasSave && <MenuButton onClick={onContinue}>Continue</MenuButton>}
          <MenuButton onClick={onSettings} tone="ghost">
            Settings
          </MenuButton>
          <MenuButton
            tone="ghost"
            onClick={() => {
              unlockAudio();
              void requestReferenceSession().then((r) => setXrMsg(r.message));
            }}
          >
            Enter VR
          </MenuButton>
        </div>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-parchment/60">
          {xr?.reason ?? "Checking for a headset…"} {xrMsg ?? ""} Keyboard and mouse carry the whole chapter. Gamepad: A confirms, B closes a talk or bag, d-pad moves. In a fight, A strikes, B braces, X sidesteps, Y changes view when Ascension is awake.
        </p>
        <p className="mt-6 text-[11px] tracking-widest text-amber/80 uppercase">9:09</p>
      </div>
    </div>
  );
}

function VillageBackdrop() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <img src={artUrl("vale-night.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover object-bottom" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,24,0.78)_0%,rgba(20,14,24,0.18)_42%,rgba(20,14,24,0.78)_100%)]" />
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  tone = "solid",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "solid" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const cls =
    tone === "solid"
      ? "bg-amber text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-amber-2"
      : tone === "danger"
        ? "bg-danger text-ink hover:opacity-90"
        : "border border-line bg-ink-2/80 text-parchment hover:border-amber hover:bg-panel";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-md px-4 py-2 text-base font-semibold tracking-wide disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

function NameScreen({
  name,
  setName,
  onBegin,
  onBack,
}: {
  name: string;
  setName: (v: string) => void;
  onBegin: (look: WandererAppearance) => void;
  onBack: () => void;
}) {
  const [look, setLook] = useState<WandererAppearance>("lantern");
  const dyes: { id: WandererAppearance; label: string }[] = [
    { id: "lantern", label: "Lantern" },
    { id: "festival", label: "Festival" },
    { id: "river", label: "River" },
    { id: "ridge", label: "Ridge" },
  ];
  return (
    <div className="relative min-h-screen overflow-hidden">
      <VillageBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-5">
      <p className="text-xs tracking-[0.28em] text-teal uppercase">Before the festival</p>
      <h2 className="font-display text-4xl">What do they call you in the Vale?</h2>
      <p className="text-parchment/80">Any name. The clock will mispronounce it anyway. Sixteen letters is plenty. The cloak is only a dye.</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onBegin(look);
        }}
      >
        <label className="text-sm text-amber-2" htmlFor="hero-name">
          Name
        </label>
        <input
          id="hero-name"
          value={name}
          maxLength={16}
          autoFocus
          placeholder="Wanderer"
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 rounded-md border border-line bg-ink-2 px-3 text-lg text-parchment"
        />
        <div className="flex items-center gap-3">
          <Portrait name="Wanderer" appearance={look} />
          <div className="flex flex-wrap gap-2">
            {dyes.map((dye) => (
              <button
                key={dye.id}
                type="button"
                className={`min-h-11 rounded-md px-3 text-sm font-semibold ${look === dye.id ? "bg-amber text-ink" : "border border-line text-parchment"}`}
                onClick={() => setLook(dye.id)}
              >
                {dye.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-3">
          <MenuButton onClick={() => onBegin(look)}>Begin</MenuButton>
          <MenuButton tone="ghost" onClick={onBack}>
            Back
          </MenuButton>
        </div>
      </form>
      </div>
    </div>
  );
}

function Explore({
  save,
  commit,
  push,
  onBattle,
  onMenu,
  onEnding,
}: {
  save: SaveGame;
  commit: (s: SaveGame, slot?: "auto" | "manual") => SaveGame;
  push: (t: string) => void;
  onBattle: (e: EncounterState) => void;
  onMenu: () => void;
  onEnding: () => void;
}) {
  const map = MAPS[save.mapId] ?? MAPS["map.vale"];
  const spawn = map.spawns[save.spawnId] ?? map.spawns[Object.keys(map.spawns)[0]!]!;
  const [pos, setPos] = useState({ x: spawn.x, y: spawn.y });
  const [facing, setFacing] = useState<"n" | "s" | "e" | "w">(spawn.facing);
  const [lifting, setLifting] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<{
    nodes: { id: string; speaker: string; text: string; choices?: { label: string; next: string; flag?: string }[]; next?: string; grant?: string }[];
    index: string;
  } | null>(null);
  const [panel, setPanel] = useState<"none" | "journal" | "party" | "bag" | "help" | "shop" | "stall" | "rest" | "atlas" | "arts" | "board" | "skiff">("none");
  const [followCam, setFollowCam] = useState(true);
  const [runePick, setRunePick] = useState<string[]>(save.runeOrder);
  const [mossPick, setMossPick] = useState<string[]>([]);
  const [kilnPick, setKilnPick] = useState<string[]>([]);
  const [holdPick, setHoldPick] = useState<string[]>([]);
  const [puzzle, setPuzzle] = useState<null | "runes" | "conduits" | "moss" | "bell" | "kiln" | "hold" | "lens">(null);
  const [conduit, setConduit] = useState(0);
  const moved = useRef(false);
  const padPrev = useRef<boolean[]>([]);

  useEffect(() => {
    setPos({ x: spawn.x, y: spawn.y });
    setFacing(spawn.facing);
  }, [save.mapId, save.spawnId]);

  useEffect(() => {
    const marked = markPlace(save);
    if (marked !== save) commit(marked);
  }, [save.mapId]);

  const objective = useMemo(() => currentObjective(save), [save]);

  const tryStep = useCallback(
    (dx: number, dy: number) => {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return;
      if (blocked(map.id, nx, ny)) return;
      setPos({ x: nx, y: ny });
      moved.current = true;
      if (dx > 0) setFacing("e");
      if (dx < 0) setFacing("w");
      if (dy > 0) setFacing("s");
      if (dy < 0) setFacing("n");
      if ((save.sightSteps ?? 0) > 0) commit(tickSight(save));
      if (!save.settings.reducedMotion) playStep(stepKind(map.id, nx, ny));
    },
    [pos, map, save, commit],
  );

  const interact = useCallback(() => {
    const front = ahead(pos, facing);
    const here = { x: pos.x, y: pos.y };
    const covers = (h: MapHotspot, x: number, y: number) =>
      x >= h.x - 1 && x < h.x + h.w + 1 && y >= h.y - 1 && y < h.y + h.h + 1;
    const spot =
      map.hotspots.find((h) => covers(h, front.x, front.y)) ??
      map.hotspots.find((h) => covers(h, here.x, here.y)) ??
      map.hotspots
        .map((h) => ({ h, d: Math.abs(h.x - pos.x) + Math.abs(h.y - pos.y) }))
        .filter((x) => x.d <= 2)
        .sort((a, b) => a.d - b.d)[0]?.h;
    if (!spot) {
      push("Nothing here but festival air.");
      return;
    }
    handleSpot(spot);
  }, [pos, facing, map, save]);

  const handleSpot = useCallback((spot: MapHotspot) => {
    playSfx("ui");
    if (spot.kind === "npc" || spot.kind === "sign") {
      if (spot.id === "npc.mira" && flag(save, "flag.mira_joined")) {
        openTalk("mira");
        return;
      }
      if (spot.id === "npc.kael" && flag(save, "flag.kael_joined")) {
        openTalk("kael");
        return;
      }
      if (spot.id === "npc.nessa" && flag(save, "flag.nessa_joined")) {
        openTalk("nessa");
        return;
      }
      if (spot.id === "npc.clock" && flag(save, "flag.sight_clock") && !flag(save, "flag.got_charm")) {
        let next = setFlag(save, "flag.got_charm");
        next.inventory.push({ itemId: "accessory.clock_charm", qty: 1 });
        commit(next);
        push("A warm pebble comes loose under the clock. It keeps pace with you.");
        return;
      }
      const special = ["npc.shelf", "npc.pell", "sign.mother", "npc.ivo", "sign.scorch", "npc.hale", "npc.wren", "sign.timetable", "sign.pier", "sign.faded", "sign.wake", "sign.board", "door.berth", "npc.sera", "npc.ada", "npc.orrin", "sign.bridge", "sign.salt", "sign.skiff", "sign.cross", "door.dome", "door.gale"].includes(spot.id);
      if (!special) {
        const key =
          spot.id === "npc.voss"
            ? flag(save, "flag.warden_spared")
              ? "npc.voss.spared"
              : flag(save, "flag.warden_defeated")
                ? "npc.voss.defeated"
                : "npc.voss"
            : spot.id;
        const nodes = DIALOGUE[key];
        if (!nodes) return;
        const extra = spot.id === "npc.lira" ? revisitLine("lira", save) : "";
        const shown = extra ? nodes.map((n, i) => (i === 0 ? { ...n, text: n.text + extra } : n)) : nodes;
        setDialogue({ nodes: shown, index: shown[0]!.id });
        return;
      }
    }
    if (spot.id === "npc.shelf") {
      if (!save.party.includes("mira")) {
        push("The parish shelf is Mira's. She is not here to argue with a blank page.");
        return;
      }
      if (!save.choiceLog.some((c) => c.id === "choice.mira")) {
        setDialogue({
          nodes: [
            {
              id: "shelf.ask",
              speaker: "Mira",
              text: EXPANSE_COPY.shelfAsk,
              choices: [
                { label: "Write the strike as it happened.", next: "shelf.done", flag: "choice.mira.record" },
                { label: "Leave the page blank.", next: "shelf.done", flag: "choice.mira.blank" },
              ],
            },
          ],
          index: "shelf.ask",
        });
        return;
      }
      const learned = tryLearnMemoryFromMira(save);
      if (learned.ok) commit(learned.save);
      setDialogue({
        nodes: [{ id: "shelf.now", speaker: "Mira", text: learned.ok ? learned.text : learned.reason }],
        index: "shelf.now",
      });
      return;
    }
    if (spot.id === "npc.pell") {
      if (!save.party.includes("kael")) {
        push("Pell watches the path and will not talk until the oathkeeper is here.");
        return;
      }
      if (save.choiceLog.some((c) => c.id === "choice.kael")) {
        push(flag(save, "flag.kael_law") ? "Pell is gone, back toward the square." : "Pell finished the walk. The path is only a path again.");
        return;
      }
      setDialogue({
        nodes: [
          {
            id: "pell.ask",
            speaker: "Pell",
            text: EXPANSE_COPY.pellAsk,
            choices: [
              { label: "Turn Pell back. The oath is a gate.", next: "pell.done", flag: "choice.kael.law" },
              { label: "Let Pell finish the walk.", next: "pell.done", flag: "choice.kael.people" },
            ],
          },
        ],
        index: "pell.ask",
      });
      return;
    }
    if (spot.id === "sign.mother") {
      if (!save.party.includes("nessa")) {
        push("A stone with a worn rhyme. It is waiting for someone who knew the speaker.");
        return;
      }
      if (save.choiceLog.some((c) => c.id === "choice.nessa")) {
        push(flag(save, "flag.nessa_spring") ? "The old rhyme is spoken. The moss is unconvinced." : "The new verse stands. The stone does not argue.");
        return;
      }
      setDialogue({
        nodes: [
          {
            id: "mother.ask",
            speaker: "Nessa",
            text: EXPANSE_COPY.motherAsk,
            choices: [
              { label: "Teach it the old spring rhyme.", next: "mother.done", flag: "choice.nessa.spring" },
              { label: "Let the new verse stand.", next: "mother.done", flag: "choice.nessa.verse" },
            ],
          },
        ],
        index: "mother.ask",
      });
      return;
    }
    if (spot.id === "npc.ivo") {
      const scene = talkIvo(save);
      if (scene.save !== save) commit(scene.save);
      setDialogue({ nodes: [{ id: "ivo.1", speaker: "Ivo", text: scene.text + revisitLine("ivo", scene.save) }], index: "ivo.1" });
      return;
    }
    if (spot.id === "sign.scorch") {
      const learned = learnSolarFrom(save, "scorch");
      if (learned.ok) commit(learned.save);
      setDialogue({
        nodes: [{ id: "scorch.1", speaker: "Scorched vein", text: learned.ok ? learned.text : learned.reason }],
        index: "scorch.1",
      });
      return;
    }
    if (spot.id === "npc.hale") {
      const scene = talkHale(save);
      if (scene.save !== save) commit(scene.save);
      setDialogue({ nodes: [{ id: "hale.1", speaker: "Hale", text: scene.text + revisitLine("hale", scene.save) }], index: "hale.1" });
      return;
    }
    if (spot.id === "sign.wake") {
      const learned = tryLearnWake(save);
      if (learned.ok) commit(learned.save);
      push(learned.ok ? learned.text : learned.reason);
      return;
    }
    if (spot.id === "npc.wren") {
      const scene = talkWren(save);
      if (scene.save !== save) commit(scene.save);
      setDialogue({ nodes: [{ id: "wren.1", speaker: "Wren", text: scene.text + wrenSky(scene.save) }], index: "wren.1" });
      return;
    }
    if (spot.id === "npc.sera") {
      if (save.flags["flag.sera_joined"]) {
        const scene = talkSera(save);
        if (scene.save !== save) commit(scene.save);
        setDialogue({ nodes: [{ id: "sera.back", speaker: "Sera", text: scene.text }], index: "sera.back" });
        return;
      }
      setDialogue({
        nodes: [
          {
            id: "sera.ask",
            speaker: "Sera",
            text: SKY_COPY.seraAsk,
            choices: [
              { label: "Let her finish the hot splice.", next: "sera.done", flag: "choice.sera.splice" },
              { label: "Make her lash the safer stay.", next: "sera.done", flag: "choice.sera.stay" },
            ],
          },
        ],
        index: "sera.ask",
      });
      return;
    }
    if (spot.id === "npc.ada") {
      const scene = talkAda(save);
      if (scene.save !== save) commit(scene.save);
      setDialogue({ nodes: [{ id: "ada.1", speaker: "Ada", text: scene.text }], index: "ada.1" });
      return;
    }
    if (spot.id === "npc.orrin") {
      const scene = talkOrrin(save);
      if (scene.save !== save) commit(scene.save);
      setDialogue({ nodes: [{ id: "orrin.1", speaker: "Orrin", text: scene.text }], index: "orrin.1" });
      return;
    }
    if (spot.id === "sign.bridge") {
      push(SKY_COPY.bridge);
      return;
    }
    if (spot.id === "sign.salt") {
      const taken = takeCloudSalt(save);
      if (taken.ok) commit(taken.save);
      push(taken.ok ? taken.text : taken.reason);
      return;
    }
    if (spot.id === "sign.skiff") {
      if (!flag(save, "flag.skiff_ready")) {
        push(save.mapId === "map.vale" ? "The roof is only a roof." : SKY_COPY.skiffShut);
        return;
      }
      setPanel("skiff");
      return;
    }
    if (spot.id === "sign.cross") {
      const learned = tryLearnCrosswind(save);
      if (learned.ok) commit(learned.save);
      push(learned.ok ? learned.text : learned.reason);
      return;
    }
    if (spot.id === "door.dome") {
      const door = tryDome(save);
      if (!door.ok) {
        push(door.reason);
        return;
      }
      setPos({ x: 8, y: 5 });
      setFacing("e");
      push(door.text);
      return;
    }
    if (spot.id === "door.gale") {
      if (!flag(save, "flag.sky_split")) {
        push(SKY_COPY.domeShut);
        return;
      }
      setPos({ x: 14, y: 5 });
      setFacing("e");
      push("The gale door gives. The wind arrives a moment early.");
      return;
    }
    if (spot.id === "sign.timetable") {
      const recorded = recordDepartures(save);
      if (!recorded.ok && !save.flags["flag.sight_ferry"]) {
        push(timetableText(save));
        return;
      }
      if (recorded.ok && recorded.save !== save) commit(recorded.save);
      push(recorded.ok ? recorded.text : timetableText(save));
      return;
    }
    if (spot.id === "sign.pier") {
      const taken = takePierCache(save);
      if (taken.ok) commit(taken.save);
      push(taken.ok ? taken.text : taken.reason);
      return;
    }
    if (spot.id === "sign.faded") {
      push(CROSSING_COPY.faded);
      return;
    }
    if (spot.id === "sign.board") {
      setPanel("board");
      return;
    }
    if (spot.id === "door.berth") {
      if (!flag(save, "flag.hold_open")) {
        push("The berth is past the plate.");
        return;
      }
      if (!flag(save, "flag.cleared.enc.vault")) {
        push("The vault lights are still up.");
        return;
      }
      setPos({ x: 14, y: 5 });
      setFacing("e");
      push("The berth door gives. Water light moves before you do.");
      return;
    }
    if (spot.kind === "shop") {
      if (spot.id === "npc.tamsin") {
        const scene = talkTamsin(save);
        if (scene.save !== save) commit(scene.save);
        push(scene.text);
        setPanel("stall");
        return;
      }
      setPanel("shop");
      return;
    }
    if (spot.kind === "rest") {
      setPanel("rest");
      return;
    }
    if (spot.kind === "exit") {
      const exit = map.exits.find((e) => e.id === spot.id);
      if (!exit) return;
      if (exit.requires && !flag(save, exit.requires)) {
        const why: Record<string, string> = {
          "flag.woods_cleared": "The shrine path is still a smear of light. Clear the flicker first.",
          "flag.chapter_complete": "The trail beyond the prism is still just weather. The Warden's question comes first.",
          "flag.moss_hymn": "The barrow mouth is shut. The moss has not accepted a hymn.",
          "flag.nessa_joined": "The river stair is Nessa's road. Walk with her before Lowbell.",
          "flag.bell_solved": "The dock is still arguing with its own bell. Finish the split hour first.",
          "flag.ferry_complete": "The high stair is still weather. The ferryman's question comes first.",
          "flag.ridge_complete": "The berth is still a rumor. Settle the gale first.",
        };
        push(why[exit.requires] ?? "Not yet.");
        return;
      }
      if (exit.to === "map.woods" && !flag(save, "flag.mira_joined")) {
        push("Mira is still by the lanterns. The pines can wait one conversation.");
        return;
      }
      const next = writeLocal({ ...save, mapId: exit.to, spawnId: exit.spawn, encounter: null });
      commit(next);
      startMusic(musicFor(exit.to));
      return;
    }
    if (spot.kind === "item") {
      if (spot.id === "item.cache") {
        if (!flag(save, "flag.sight_cache")) {
          push("The moss looks ordinary. Too ordinary, if you have not looked twice.");
          return;
        }
        if (flag(save, "flag.got_cache")) {
          push("The cache is a dent in the ground now.");
          return;
        }
        let next = setFlag(save, "flag.got_cache");
        const slot = next.inventory.find((i) => i.itemId === "item.dew_vial");
        if (slot) slot.qty += 1;
        else next.inventory.push({ itemId: "item.dew_vial", qty: 1 });
        commit(next);
        push("A dew vial, hidden under moss that was lying about being moss.");
        return;
      }
      if (spot.id === "item.root") {
        if (!flag(save, "flag.sight_barrow")) {
          push("A root. It is doing an excellent impression of a root.");
          return;
        }
        if (flag(save, "flag.got_root")) {
          push("The latch is open and empty.");
          return;
        }
        let next = setFlag(save, "flag.got_root");
        next.inventory.push({ itemId: "item.hollow_resin", qty: 1 });
        next.gold += 18;
        commit(next);
        push("Hollow resin, and a few coins that did not want to be a root.");
        return;
      }
      if (flag(save, "flag.got_salve")) {
        push("The crate is empty. Pim would approve of the thoroughness.");
        return;
      }
      let next = setFlag(save, "flag.got_salve");
      const slot = next.inventory.find((i) => i.itemId === "item.lantern_salve");
      if (slot) slot.qty += 1;
      commit(next);
      push("Lantern salve, still warm.");
      return;
    }
    if (spot.kind === "save") {
      commit(save, "manual");
      push("The niche keeps your place.");
      return;
    }
    if (spot.kind === "battle") {
      if (spot.id === "battle.woods") {
        if (flag(save, "flag.woods_cleared")) {
          push("The pines are only pines again.");
          return;
        }
        if (!flag(save, "flag.kael_joined")) {
          push("Kael bars the flicker. Talk to the oathkeeper.");
          return;
        }
        onBattle(makeEncounter(save, "enc.woods"));
        return;
      }
      if (spot.id === "battle.warden") {
        if (save.chapterComplete || save.wardenOutcome !== "none") {
          push("The prism is quiet.");
          return;
        }
        if (!flag(save, "flag.conduits_aligned")) {
          push("The Warden will not wake until the runes and the conduits agree.");
          return;
        }
        onBattle(makeEncounter(save, "enc.warden"));
        return;
      }
      if (spot.id === "battle.thicket") {
        if (flag(save, "flag.thicket_cleared") || flag(save, "flag.cleared.enc.thicket")) {
          push("The briars are only briars.");
          return;
        }
        onBattle(makeEncounter(save, "enc.thicket"));
        return;
      }
      if (spot.id === "battle.cantor") {
        if (flag(save, "flag.cantor_spared") || flag(save, "flag.cantor_defeated")) {
          push("The barrow keeps a finished song.");
          return;
        }
        onBattle(makeEncounter(save, "enc.cantor"));
        return;
      }
      if (spot.id === "battle.mist") {
        if (flag(save, "flag.cleared.enc.crossing")) {
          push("The flood is only water.");
          return;
        }
        onBattle(makeEncounter(save, "enc.crossing"));
        return;
      }
      if (spot.id === "battle.vault") {
        if (!flag(save, "flag.hold_open")) {
          push("The vault is past the plate.");
          return;
        }
        if (flag(save, "flag.cleared.enc.vault")) {
          push("The lanterns are only lanterns.");
          return;
        }
        onBattle(makeEncounter(save, "enc.vault"));
        return;
      }
      if (spot.id === "battle.ferryman") {
        if (flag(save, "flag.ferry_complete")) {
          push("The berth keeps a finished boarding.");
          return;
        }
        if (!flag(save, "flag.cleared.enc.vault")) {
          push("The vault lights are still between you and the berth.");
          return;
        }
        onBattle(makeEncounter(save, "enc.ferryman"));
        return;
      }
      if (spot.id === "battle.gust") {
        if (flag(save, "flag.cleared.enc.gust")) {
          push("The gust is only wind.");
          return;
        }
        onBattle(makeEncounter(save, "enc.gust"));
        return;
      }
      if (spot.id === "battle.gale") {
        if (flag(save, "flag.ridge_complete")) {
          push("The dome keeps a finished noon.");
          return;
        }
        if (!flag(save, "flag.sky_split")) {
          push(SKY_COPY.domeShut);
          return;
        }
        onBattle(makeEncounter(save, "enc.galekeeper"));
        return;
      }
    }
    if (spot.kind === "puzzle") {
      if (spot.id === "puzzle.runes") {
        setRunePick(save.runeOrder.length ? [...save.runeOrder] : []);
        setPuzzle("runes");
        return;
      }
      if (spot.id === "puzzle.conduits") {
        if (!flag(save, "flag.runes_decoded")) {
          push("The ring will not turn until you know the order. Read the wall.");
          return;
        }
        setPuzzle("conduits");
        return;
      }
      if (spot.id === "puzzle.moss") {
        setMossPick([]);
        setPuzzle("moss");
        return;
      }
      if (spot.id === "puzzle.bell") {
        setPuzzle("bell");
        return;
      }
      if (spot.id === "puzzle.kiln") {
        if (flag(save, "flag.braziers")) {
          const learned = learnSolarFrom(save, "kiln");
          if (learned.ok) {
            commit(learned.save);
            push(learned.text);
          } else push(learned.reason);
          return;
        }
        setKilnPick([]);
        setPuzzle("kiln");
        return;
      }
      if (spot.id === "puzzle.lens") {
        setPuzzle("lens");
        return;
      }
      if (spot.id === "door.vault") {
        if (flag(save, "flag.hold_open")) {
          setPos({ x: 8, y: 5 });
          setFacing("e");
          push("The inner door remembers you.");
          return;
        }
        setHoldPick([]);
        setPuzzle("hold");
      }
    }
  }, [save, map, commit, onBattle, push]);

  function openTalk(id: "mira" | "kael" | "nessa") {
    const next = bumpBond(save, id);
    commit(next);
    const bond = next.bonds[id] ?? 1;
    const text = companionAside(id, bond, wardenMemory(next)) + choiceCoda(id, next.flags) + crossingCoda(id, next.flags) + skyCoda(id, next.flags);
    setDialogue({ nodes: [{ id: `${id}.bond`, speaker: id === "mira" ? "Mira" : id === "kael" ? "Kael" : "Nessa", text }], index: `${id}.bond` });
  }

  function advanceDialogue(choice?: { label: string; next: string; flag?: string }) {
    if (!dialogue) return;
    let nextSave = save;
    const node = dialogue.nodes.find((n) => n.id === dialogue.index);
    if (choice?.flag?.startsWith("choice.")) {
      const [, who, value] = choice.flag.split(".");
      if (who === "mira" || who === "kael" || who === "nessa") {
        const chosen = chooseCompanion(save, who, value as "record" | "blank" | "law" | "people" | "spring" | "verse");
        if (chosen) {
          commit(chosen);
          const said =
            value === "record"
              ? EXPANSE_COPY.shelfRecord
              : value === "blank"
                ? EXPANSE_COPY.shelfBlank
                : value === "law"
                  ? EXPANSE_COPY.pellLaw
                  : value === "people"
                    ? EXPANSE_COPY.pellPeople
                    : value === "spring"
                      ? EXPANSE_COPY.motherSpring
                      : EXPANSE_COPY.motherVerse;
          push(said);
        }
      }
      if (who === "sera" && (value === "splice" || value === "stay")) {
        const chosen = chooseSera(save, value);
        if (chosen) {
          commit(chosen.save);
          push(chosen.text);
        }
      }
      setDialogue(null);
      return;
    }
    if (choice?.flag) nextSave = setFlag(nextSave, choice.flag);
    const grant = node?.grant;
    if (!choice && grant) nextSave = setFlag(nextSave, grant);
    if (choice?.next === "mira.join" || grant === "flag.mira_joined" || choice?.flag === "flag.mira_joined") {
      nextSave = recruit(setFlag(nextSave, "flag.mira_joined"), "mira");
    }
    if (grant === "flag.kael_joined" || choice?.flag === "flag.kael_joined") {
      nextSave = recruit(setFlag(nextSave, "flag.kael_joined"), "kael");
    }
    if (grant === "flag.nessa_joined" || choice?.flag === "flag.nessa_joined") {
      nextSave = recruit(setFlag(nextSave, "flag.nessa_joined"), "nessa");
    }
    if (grant === "flag.clock_anomaly") playSfx("clock");
    if (nextSave !== save) commit(nextSave);
    const nextId = choice?.next ?? node?.next;
    if (!nextId || !dialogue.nodes.some((n) => n.id === nextId)) {
      setDialogue(null);
      return;
    }
    setDialogue({ ...dialogue, index: nextId });
  }

  function submitRunes() {
    const ok = runePick.length === 3 && runePick.every((r, i) => r === RUNE_ANSWER[i]);
    if (!ok) {
      push("The wall stays dark. Flame, then stone, then tide.");
      setRunePick([]);
      return;
    }
    let next = setFlag(save, "flag.runes_decoded");
    next.runeOrder = [...RUNE_ANSWER];
    commit(next);
    setPuzzle(null);
    push("The order holds: Flame, Stone, Tide.");
    playSfx("spell");
  }

  function submitMoss() {
    const ok = mossPick.length === 3 && mossPick.every((r, i) => r === MOSS_ANSWER[i]);
    if (!ok) {
      push("The moss shrugs. It wanted wind, then flame, then stone.");
      setMossPick([]);
      return;
    }
    const next = setFlag(save, "flag.moss_hymn");
    commit(next);
    setPuzzle(null);
    push("The hymn takes. Somewhere ahead, a mouth in the hill decides to be a door.");
    playSfx("spell");
  }

  function submitKiln() {
    const ok = kilnPick.length === 3 && kilnPick.every((r, i) => r === BRAZIER_ANSWER[i]);
    if (!ok) {
      push("The kiln stays dark. Flame, then stone, then flame again.");
      setKilnPick([]);
      return;
    }
    let next = setFlag(save, "flag.braziers");
    const learned = learnSolarFrom(next, "kiln");
    if (learned.ok) next = learned.save;
    commit(next);
    setPuzzle(null);
    push(learned.ok ? learned.text : `${EXPANSE_COPY.kilnHot} ${learned.reason}`);
    playSfx("spell");
  }

  function submitHold() {
    const learned = tryHold(save, holdPick);
    if (!learned.ok) {
      push(learned.reason);
      setHoldPick([]);
      return;
    }
    commit(learned.save);
    setPuzzle(null);
    setPos({ x: 8, y: 5 });
    setFacing("e");
    push(learned.text);
    playSfx("spell");
  }

  function foldView() {
    if (!save.ascensionUnlocked) {
      push("Ascension is not awake. The shrine conduits are what fold the air.");
      return;
    }
    const mode = save.mode === "ascension" ? "legacy" : "ascension";
    commit({ ...save, mode });
    push(mode === "ascension" ? "You look from inside the step." : "You look from the walk again.");
  }

  function ringBell(claim: "nine" | "ten") {
    const view = save.mode === "ascension" ? "ascension" : "legacy";
    const res = noteBell(save, view, claim);
    commit(res.save);
    push(res.text);
    if (res.solved) {
      setPuzzle(null);
      playSfx("clock");
    }
  }

  function lookTwice() {
    const seen = useSight(save);
    if (!seen.ok) {
      push(seen.reason);
      return;
    }
    commit(seen.save);
    push(seen.text);
    playSfx("spell");
  }

  function turnConduit(dir: number) {
    if (!save.ascensionUnlocked && save.mode !== "ascension") {
      /* button-only path is always available once runes are known — spec: keyboard complete */
    }
    const order = RUNE_ANSWER;
    const nextIdx = (conduit + dir + order.length) % order.length;
    setConduit(nextIdx);
    if (order[nextIdx] === "tide" && flag(save, "flag.runes_decoded")) {
      let next = setFlag(save, "flag.conduits_aligned");
      next = setFlag(next, "flag.temporal_sight");
      next = setFlag(next, "flag.ascension_unlocked");
      next.conduitsAligned = true;
      next.ascensionUnlocked = true;
      next.mode = "ascension";
      if (!flag(save, "flag.conduits_aligned")) {
        next = learnElementalist(next);
        next.sightCharges = 3;
      }
      commit(next);
      setPuzzle(null);
      playSfx("spell");
      push("The conduits match. For a breath you see the shrine twice. Ascension is awake. Flare answers when you call it.");
    } else {
      push(`Conduit settles on ${order[nextIdx]}. It wants the last of the rune order.`);
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (dialogue || puzzle || panel !== "none") {
        if (e.key === "Escape") {
          setDialogue(null);
          setPuzzle(null);
          setPanel("none");
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "Enter", "KeyE"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "ArrowUp" || e.code === "KeyW") tryStep(0, -1);
      if (e.code === "ArrowDown" || e.code === "KeyS") tryStep(0, 1);
      if (e.code === "ArrowLeft" || e.code === "KeyA") tryStep(-1, 0);
      if (e.code === "ArrowRight" || e.code === "KeyD") tryStep(1, 0);
      if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") interact();
      if (e.code === "KeyJ") setPanel("journal");
      if (e.code === "KeyI") setPanel("bag");
      if (e.code === "KeyP") setPanel("party");
      if (e.code === "KeyH" || e.code === "Escape") setPanel("help");
      if (e.code === "F5") {
        e.preventDefault();
        if (!flag(save, "flag.festival_fought") && save.mapId === "map.vale" && flag(save, "flag.clock_anomaly")) {
          onBattle(makeEncounter(save, "enc.festival"));
        }
      }
    };
    window.addEventListener("keydown", down);
    return () => {
      window.removeEventListener("keydown", down);
    };
  }, [tryStep, interact, dialogue, puzzle, panel, save, onBattle]);

  useEffect(() => {
    const pad = () => {
      const pads = navigator.getGamepads?.() ?? [];
      const p = pads[0];
      const prev = padPrev.current;
      padPrev.current = p ? p.buttons.map((b) => b.pressed) : [];
      if (!p) return;
      const edge = (i: number) => Boolean(p.buttons[i]?.pressed) && !prev[i];
      if (dialogue || puzzle || panel !== "none") {
        if (edge(1)) {
          setDialogue(null);
          setPuzzle(null);
          setPanel("none");
        }
        return;
      }
      if (p.buttons[12]?.pressed) tryStep(0, -1);
      if (p.buttons[13]?.pressed) tryStep(0, 1);
      if (p.buttons[14]?.pressed) tryStep(-1, 0);
      if (p.buttons[15]?.pressed) tryStep(1, 0);
      if (edge(0)) interact();
    };
    const id = window.setInterval(pad, 180);
    return () => window.clearInterval(id);
  }, [tryStep, dialogue, puzzle, panel, interact]);

  useEffect(() => {
    if (save.mapId !== "map.vale") return;
    if (!flag(save, "flag.mira_joined") || flag(save, "flag.festival_fought")) return;
    if (pos.y >= 7 && pos.y <= 9 && pos.x >= 8 && pos.x <= 12) {
      onBattle(makeEncounter(save, "enc.festival"));
    }
  }, [pos.x, pos.y, save.mapId, save.flags["flag.mira_joined"], save.flags["flag.festival_fought"]]);

  const node = dialogue?.nodes.find((n) => n.id === dialogue.index);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-3 py-3 lg:px-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.22em] text-teal uppercase">{map.name}</p>
          <h2 className="font-display text-2xl">{save.playerName}</h2>
        </div>
        <p className="max-w-md text-sm text-amber-2">{objective}</p>
        <div className="flex flex-wrap gap-2">
          <MenuButton tone="ghost" onClick={() => setPanel("journal")}>Journal</MenuButton>
          <MenuButton tone="ghost" onClick={() => setPanel("party")}>Party</MenuButton>
          <MenuButton tone="ghost" onClick={() => setPanel("bag")}>Bag</MenuButton>
          <MenuButton tone="ghost" onClick={() => setPanel("arts")}>Arts</MenuButton>
          <MenuButton tone="ghost" onClick={() => setPanel("atlas")}>Atlas</MenuButton>
          <MenuButton tone="ghost" onClick={() => setFollowCam((v) => !v)}>{followCam ? "Whole map" : "Close in"}</MenuButton>
          <MenuButton tone="ghost" onClick={onMenu}>Settings</MenuButton>
        </div>
      </header>
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className={`map-frame relative overflow-hidden rounded-md border border-line bg-ink-2 ${save.sightScene && save.sightSteps > 0 ? "sight-live" : ""}`}>
          <MapCanvas
            mapId={map.id}
            width={map.width}
            height={map.height}
            pos={pos}
            facing={facing}
            party={save.party}
            hotspots={map.hotspots}
            reduced={save.settings.reducedMotion}
            life={save.settings.motionDetail !== "quiet"}
            comfort={save.settings.cameraComfort}
            follow={followCam}
            sight={Boolean(save.sightScene) && save.sightSteps > 0 && (save.sightScene === `sight.${map.id.replace("map.", "")}` || (map.id === "map.lowbell" && save.sightScene === "sight.lowbell") || (map.id === "map.ferry" && save.sightScene === "sight.ferry") || (map.id === "map.hold" && save.sightScene === "sight.hold") || (map.id === "map.highroad" && save.sightScene === "sight.stair"))}
            appearance={save.appearance}
            sightSteps={save.sightSteps}
          />
          {lifting && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center bg-ink/40 pb-8">
              <img src={artUrl("skiff.png")} alt="" className="skiff-rise h-28 w-auto" />
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line p-2 lg:hidden">
            <Pad onMove={tryStep} onAct={interact} />
          </div>
        </div>
        <aside className="region-card flex flex-col gap-3 rounded-md border border-line bg-panel p-3">
          <p className="text-sm text-parchment/80">{map.blurb}</p>
          <PartyStrip save={save} />
          <p className="text-xs text-parchment/60">Move WASD or arrows. E, Enter, or the lantern button speaks, opens, and fights. J journal, I bag, P party.</p>
          <p className="gold-chip text-xs text-amber">{save.gold} gold · {save.xp} xp · circle {levelForXp(save.xp)}</p>
          {save.ascensionUnlocked && <p className="text-xs text-teal">Ascension is awake. Battles can be stepped into.</p>}
          {flag(save, "flag.temporal_sight") && (
            <MenuButton tone="ghost" onClick={lookTwice}>
              <span className="sight-mark" aria-hidden /> Temporal Sight ({save.sightCharges})
            </MenuButton>
          )}
          {save.sightScene && save.sightSteps > 0 && (
            <>
              <p className="text-xs text-teal">The other hour is up for {save.sightSteps} steps. It shows. It does not solve.</p>
              <MenuButton
                tone="ghost"
                onClick={() => {
                  commit(dismissSight(save));
                  push("You let the other hour go. The journal keeps what you saw.");
                }}
              >
                Dismiss the other hour
              </MenuButton>
            </>
          )}
          {flag(save, "flag.temporal_sight") && (
            <p className="text-xs text-violet">Sight spends a charge and opens the other hour of this room. Walking spends it. The Wick restores the charges. Buttons only.</p>
          )}
          {save.chapterComplete && (
            <MenuButton onClick={onEnding}>Read the chapter's close</MenuButton>
          )}
        </aside>
      </div>
      {node && (
        <DialogueBox
          speaker={node.speaker}
          text={node.text}
          choices={node.choices}
          appearance={node.speaker === save.playerName ? save.appearance : undefined}
          reduced={save.settings.reducedMotion}
          onNext={() => advanceDialogue()}
          onChoice={(c) => advanceDialogue(c)}
        />
      )}
      {puzzle === "runes" && (
        <Modal title="Rune wall" onClose={() => setPuzzle(null)}>
          <p className="mb-3 text-sm">Three glyphs will take a press. The wall remembers only one order. This can be done with buttons alone.</p>
          <div className="mb-3 flex gap-2">
            {runePick.map((r) => (
              <span key={r + runePick.length} className="rounded-md bg-ink px-2 py-1 text-amber">{r}</span>
            ))}
            {runePick.length === 0 && <span className="text-parchment/50">Nothing pressed yet.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {["flame", "stone", "tide"].map((r) => (
              <MenuButton key={r} tone="ghost" disabled={runePick.includes(r)} onClick={() => setRunePick((p) => [...p, r].slice(0, 3))}>
                {r}
              </MenuButton>
            ))}
            <MenuButton onClick={submitRunes}>Set the order</MenuButton>
          </div>
        </Modal>
      )}
      {puzzle === "moss" && (
        <Modal title="Moss hymn" onClose={() => setPuzzle(null)}>
          <p className="mb-3 text-sm">Three notes, in the order Nessa keeps. Buttons are enough. The other view is not required, but standing close when you looked twice still matters.</p>
          <div className="mb-3 flex gap-2">
            {mossPick.map((r, i) => (
              <span key={r + i} className="rounded-md bg-ink px-2 py-1 text-teal">{r}</span>
            ))}
            {mossPick.length === 0 && <span className="text-parchment/50">The moss is listening.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {["wind", "flame", "stone", "tide"].map((r) => (
              <MenuButton key={r} tone="ghost" disabled={mossPick.includes(r)} onClick={() => setMossPick((p) => [...p, r].slice(0, 3))}>
                {r}
              </MenuButton>
            ))}
            <MenuButton onClick={submitMoss}>Give the hymn</MenuButton>
          </div>
        </Modal>
      )}
      {puzzle === "kiln" && (
        <Modal title="River kiln" onClose={() => setPuzzle(null)}>
          <p className="mb-3 text-sm">{EXPANSE_COPY.kilnNeed} Ember still has to be cast three times before noon will answer, and a spared guardian does not close this road.</p>
          <div className="mb-3 flex gap-2">
            {kilnPick.map((r, i) => (
              <span key={r + i} className="rounded-md bg-ink px-2 py-1 text-amber">{r}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["flame", "stone", "tide", "wind"].map((r) => (
              <MenuButton key={r} tone="ghost" onClick={() => setKilnPick((p) => [...p, r].slice(0, 3))}>{r}</MenuButton>
            ))}
            <MenuButton onClick={submitKiln}>Feed the kiln</MenuButton>
          </div>
        </Modal>
      )}
      {puzzle === "hold" && (
        <Modal title="Inner plate" onClose={() => setPuzzle(null)}>
          <p className="mb-3 text-sm">{CROSSING_COPY.holdNeed} Sight can show the cut. It will not press these buttons.</p>
          <div className="mb-3 flex gap-2">
            {holdPick.map((r, i) => (
              <span key={r + i} className="rounded-md bg-ink px-2 py-1 text-teal">{r}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["flame", "stone", "tide", "wind"].map((r) => (
              <MenuButton key={r} tone="ghost" onClick={() => setHoldPick((p) => [...p, r].slice(0, 3))}>{r}</MenuButton>
            ))}
            <MenuButton tone="ghost" onClick={() => setHoldPick([])}>Clear</MenuButton>
            <MenuButton onClick={submitHold}>Turn the plate</MenuButton>
            <MenuButton tone="ghost" onClick={() => setHoldPick([])}>Clear</MenuButton>
          </div>
        </Modal>
      )}
      {puzzle === "lens" && (
        <Modal title="Early lens" onClose={() => setPuzzle(null)}>
          <p className="mb-3 text-sm">
            Two readings. From the walk, the chart. From inside the step, the sky. Buttons only. Sight can show the trouble. It will not press these.
            {save.mode === "ascension" ? " You are inside the step." : " You are on the walk."}
          </p>
          <p className="mb-3 text-xs text-parchment/70">
            {flag(save, "flag.sky_chart") ? "Chart recorded. " : "Chart not yet. "}
            {flag(save, "flag.sky_ahead") ? "Sky recorded." : "Sky not yet."}
          </p>
          <div className="flex flex-wrap gap-2">
            <MenuButton tone="ghost" onClick={foldView}>{save.mode === "ascension" ? "Look from the walk" : "Look from inside the step"}</MenuButton>
            <MenuButton
              onClick={() => {
                const read = readGlass(save, "chart");
                if (read.ok) commit(read.save);
                push(read.ok ? read.text : read.reason);
                if (read.ok && read.save.flags["flag.sky_split"]) setPuzzle(null);
              }}
            >
              Read the chart
            </MenuButton>
            <MenuButton
              onClick={() => {
                const read = readGlass(save, "sky");
                if (read.ok) commit(read.save);
                push(read.ok ? read.text : read.reason);
                if (read.ok && read.save.flags["flag.sky_split"]) setPuzzle(null);
              }}
            >
              Read the sky
            </MenuButton>
          </div>
        </Modal>
      )}
      {puzzle === "bell" && (
        <Modal title="Split bell" onClose={() => setPuzzle(null)}>
          <p className="mb-2 text-sm">
            Two truths. From the walk, read the face. From inside the step, read what is still ringing. Buttons only. No gesture, no headset.
            {save.mode === "ascension" ? " You are inside the step." : " You are on the walk."}
          </p>
          <p className="mb-3 text-xs text-parchment/70">
            {flag(save, "flag.bell_face") ? "Face recorded. " : "Face not yet. "}
            {flag(save, "flag.bell_ghost") ? "Air recorded." : "Air not yet."}
            {flag(save, "flag.nessa_verse") ? " Nessa let the new verse stand. Trust the air." : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <MenuButton tone="ghost" onClick={foldView}>{save.mode === "ascension" ? "Look from the walk" : "Look from inside the step"}</MenuButton>
            <MenuButton onClick={() => ringBell("nine")}>The face says nine and nine</MenuButton>
            <MenuButton onClick={() => ringBell("ten")}>A tenth strike is still in the air</MenuButton>
          </div>
        </Modal>
      )}
      {puzzle === "conduits" && (
        <Modal title="Conduit ring" onClose={() => setPuzzle(null)}>
          <p className="mb-2 text-sm">
            The same discovery, the other angle. Turn the ring until it rests on the last rune. Keyboard and buttons both turn it — no gesture required.
            {save.mode === "ascension" ? " You are looking through Ascension." : " Legacy showed you the order. The ring answers either way."}
          </p>
          <p className="mb-3 font-display text-2xl text-teal">{RUNE_ANSWER[conduit]}</p>
          <div className="flex gap-2">
            <MenuButton onClick={() => turnConduit(-1)}>Turn left</MenuButton>
            <MenuButton onClick={() => turnConduit(1)}>Turn right</MenuButton>
          </div>
        </Modal>
      )}
      {panel !== "none" && (
        <Modal
          title={panel === "journal" ? "Journal" : panel === "party" ? "Party" : panel === "bag" ? "Bag" : panel === "shop" ? "Bram's stall" : panel === "stall" ? "Tamsin's kettle" : panel === "rest" ? (save.mapId === "map.ferry" ? "The station kettle" : "The Ninth Wick") : panel === "atlas" ? "The walked road" : panel === "arts" ? "Jobs and arts" : panel === "board" ? "A quiet trade" : panel === "skiff" ? "The First Stay" : "How to walk the Vale"}
          onClose={() => setPanel("none")}
        >
          {panel === "journal" && (
            <div className="flex flex-col gap-3">
              {save.quests.filter((q) => q.status !== "hidden").map((q) => (
                <div key={q.id}>
                  <p className="font-semibold text-amber">{q.title} · {q.status}</p>
                  <p className="text-sm">{q.summary}</p>
                </div>
              ))}
              <ul className="max-h-40 list-disc overflow-auto pl-4 text-sm text-parchment/80">
                {save.journal.map((j, i) => (
                  <li key={i}>{j}</li>
                ))}
              </ul>
            </div>
          )}
          {panel === "party" && (
            <div className="flex flex-col gap-3">
              <PartyStrip save={save} verbose />
              <p className="text-xs text-parchment/70">The wanderer's cloak is a dye. It does not touch the pack, the arts, or the road.</p>
              <div className="flex flex-wrap gap-2">
                {(["lantern", "festival", "river", "ridge"] as WandererAppearance[]).map((dye) => (
                  <MenuButton key={dye} tone={save.appearance === dye ? "solid" : "ghost"} onClick={() => commit(setAppearance(save, dye))}>
                    {dye[0]!.toUpperCase() + dye.slice(1)}
                  </MenuButton>
                ))}
              </div>
              <p className="text-sm text-parchment/80">
                Four walk into a fight. {(save.formation ?? "line") === "wide" ? "The line is loose, and hits land softer." : "The line is close, and true hits land harder."} A bench does not copy a pack.
              </p>
              <div className="flex flex-wrap gap-2">
                <MenuButton
                  tone="ghost"
                  onClick={() => {
                    const next = setFormation(save, "line");
                    if (!next.ok) {
                      push(next.reason);
                      return;
                    }
                    commit(next.save);
                    push(next.text);
                  }}
                >
                  Close line
                </MenuButton>
                <MenuButton
                  tone="ghost"
                  onClick={() => {
                    const next = setFormation(save, "wide");
                    if (!next.ok) {
                      push(next.reason);
                      return;
                    }
                    commit(next.save);
                    push(next.text);
                  }}
                >
                  Loose line
                </MenuButton>
              </div>
              <p className="text-xs tracking-[0.18em] text-amber uppercase">At the rig</p>
              {(save.reserve ?? []).length === 0 && <p className="text-sm text-parchment/70">Nobody is waiting.</p>}
              {(save.reserve ?? []).map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 rounded-md bg-ink/50 p-2 text-sm">
                  <span>{save.roster[id]?.name ?? id}</span>
                  <MenuButton
                    tone="ghost"
                    onClick={() => {
                      const moved = benchToggle(save, id);
                      if (!moved.ok) {
                        push(moved.reason);
                        return;
                      }
                      commit(moved.save);
                      push(moved.text);
                    }}
                  >
                    Call in
                  </MenuButton>
                </div>
              ))}
              {save.party.filter((id) => id !== "wanderer").map((id) => (
                <div key={`out-${id}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-parchment/70">{save.roster[id]?.name ?? id} is in the four</span>
                  <MenuButton
                    tone="ghost"
                    onClick={() => {
                      const moved = benchToggle(save, id);
                      if (!moved.ok) {
                        push(moved.reason);
                        return;
                      }
                      commit(moved.save);
                      push(moved.text);
                    }}
                  >
                    Send to the rig
                  </MenuButton>
                </div>
              ))}
            </div>
          )}
          {panel === "bag" && (
            <ul className="flex flex-col gap-2 text-sm">
              <li className="rounded-md bg-ink/40 p-2 text-parchment/80">
                {save.party.map((who) => {
                  const load = save.equipment?.[who];
                  const worn = [load?.weapon, load?.armor, load?.accessory].filter(Boolean).map((id) => GEAR[id!]!.name);
                  return (
                    <span key={who} className="block">
                      {save.roster[who]?.name ?? who}: {worn.length ? worn.join(", ") : "unarmed"}
                    </span>
                  );
                })}
              </li>
              {save.inventory.filter((s) => s.qty > 0).map((s) => {
                const gear = GEAR[s.itemId];
                const item = ITEMS[s.itemId];
                return (
                  <li key={s.itemId} className="rounded-md bg-ink/50 p-2">
                    <span className="text-amber">{gear?.name ?? item?.name ?? s.itemId}</span> × {s.qty}
                    <span className="block text-parchment/70">{gear?.blurb ?? item?.blurb ?? "A thing from the road."}</span>
                    {gear && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {save.party.map((who) => (
                          <MenuButton
                            key={who}
                            tone="ghost"
                            onClick={() => {
                              const next = equipItem(save, who, s.itemId);
                              if (!next) {
                                push("That will not sit on them.");
                                return;
                              }
                              commit(next);
                              push(`${gear.name} equipped.`);
                            }}
                          >
                            Equip {save.roster[who]?.name ?? who}
                          </MenuButton>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
              {save.inventory.filter((s) => s.qty > 0).length === 0 && <li>Empty pockets. Pim would despair.</li>}
            </ul>
          )}
          {panel === "shop" && (
            <div className="flex flex-col gap-3 text-sm">
              <p>Bram looks at your purse the way a baker looks at an oven: professionally, and without romance.</p>
              {SHOP_IDS.map((id) => {
                const gear = GEAR[id];
                const price = gear?.price ?? (id === "item.lantern_salve" ? 12 : 15);
                const name = gear?.name ?? ITEMS[id]?.name ?? id;
                return (
                  <div key={id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-amber">{name}</p>
                      <p className="text-parchment/70">{gear?.blurb ?? ITEMS[id]?.blurb} · {price} gold</p>
                    </div>
                    <MenuButton
                      tone="ghost"
                      onClick={() => {
                        const bought = buyItem(save, id);
                        if (!bought.ok) {
                          push(bought.reason);
                          return;
                        }
                        commit(setFlag(bought.save, "flag.bought_gear"));
                        push(`Bought ${name}.`);
                      }}
                    >
                      Buy
                    </MenuButton>
                  </div>
                );
              })}
            </div>
          )}
          {panel === "stall" && (
            <div className="flex flex-col gap-3 text-sm">
              <p>Tamsin prices a cloak the way the fog prices a boat: you pay, and it is still not yours to explain.</p>
              {MIST_SHOP.map((id) => {
                const gear = GEAR[id];
                const price = gear?.price ?? (id === "item.lantern_salve" ? 12 : 15);
                const name = gear?.name ?? ITEMS[id]?.name ?? id;
                return (
                  <div key={id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-amber">{name}</p>
                      <p className="text-parchment/70">{gear?.blurb ?? ITEMS[id]?.blurb} · {price} gold</p>
                    </div>
                    <MenuButton
                      tone="ghost"
                      onClick={() => {
                        const bought = buyItem(save, id);
                        if (!bought.ok) {
                          push(bought.reason);
                          return;
                        }
                        commit(setFlag(bought.save, "flag.bought_gear"));
                        push(`Bought ${name}.`);
                      }}
                    >
                      Buy
                    </MenuButton>
                  </div>
                );
              })}
            </div>
          )}
          {panel === "board" && (
            <div className="flex flex-col gap-3 text-sm">
              <p>Your breath stays where it is. So does the pack. A fight will not host this.</p>
              <p className="text-amber">Now: {JOB_KITS.find((j) => j.id === save.roster.wanderer?.jobId)?.name ?? "Wayfinder"}.</p>
              {JOB_KITS.filter((job) => job.bearer === "wanderer").map((job) => (
                <div key={job.id} className="rounded-md bg-ink/50 p-2">
                  <p className="font-semibold text-amber">{job.name}</p>
                  <p className="text-parchment/70">{job.requires}</p>
                  <MenuButton
                    tone="ghost"
                    onClick={() => {
                      const changed = switchJob(save, job.id);
                      if (!changed.ok) {
                        push(changed.reason);
                        return;
                      }
                      commit(changed.save);
                      push(changed.text);
                    }}
                  >
                    Take {job.name}
                  </MenuButton>
                </div>
              ))}
            </div>
          )}
          {panel === "skiff" && (
            <div className="flex flex-col gap-3 text-sm">
              <p>{SKY_COPY.skiffFly} Two pads. No open sky.</p>
              <svg viewBox="0 0 320 120" className="w-full rounded-md bg-ink" role="img" aria-label="A route between the Vale roof and the Skyweave berth.">
                <defs>
                  <linearGradient id="skiff-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a4a62" />
                    <stop offset="100%" stopColor="#1a1420" />
                  </linearGradient>
                </defs>
                <rect width="320" height="120" fill="url(#skiff-sky)" />
                <path d="M0 78 Q80 70 160 78 T320 74" fill="none" stroke="#c8bba8" strokeOpacity="0.45" />
                <line x1="48" y1="78" x2="272" y2="78" stroke="#4ec8c0" strokeDasharray="6 5" />
                <circle cx="48" cy="78" r="5" fill="#e8b15a" />
                <circle cx="272" cy="78" r="5" fill="#e8b15a" />
                <path d="M132 70 L168 70 L160 86 L140 86 Z" fill="#8a8070" />
                <image href={artUrl("skiff.png")} x="118" y="36" width="92" height="52" />
                <text x="28" y="28" fill="#f3e6c8" fontSize="13">Vale roof</text>
                <text x="228" y="28" fill="#f3e6c8" fontSize="13">Berth</text>
              </svg>
              {SKIFF_DOCKS.map((dock) => (
                <MenuButton
                  key={dock.id}
                  tone="ghost"
                  onClick={() => {
                    const flown = flyTo(save, dock.id);
                    if (!flown.ok) {
                      push(flown.reason);
                      return;
                    }
                    const finish = () => {
                      commit(flown.save);
                      setLifting(null);
                      setPanel("none");
                      startMusic(musicFor(dock.mapId));
                      push(flown.text);
                    };
                    if (save.settings.reducedMotion) finish();
                    else {
                      setLifting(dock.name);
                      window.setTimeout(finish, 680);
                    }
                  }}
                >
                  Cast off for {dock.name}
                </MenuButton>
              ))}
              <MenuButton
                tone="ghost"
                onClick={() => {
                  const noted = noteHullShadow(save);
                  if (noted.ok) commit(noted.save);
                  push(noted.ok ? noted.text : noted.reason);
                }}
              >
                Note the shadow under the hull
              </MenuButton>
            </div>
          )}
          {panel === "rest" && (
            <div className="flex flex-col gap-3 text-sm">
              <p>{save.mapId === "map.ferry" ? CROSSING_COPY.nedda : "Salla taps the ledger. Eight gold. Beds, lamps, and the kind of quiet that puts a person's breath back where they left it."}</p>
              <MenuButton
                onClick={() => {
                  const rested = restParty(save);
                  if (!rested.ok) {
                    push(rested.reason);
                    return;
                  }
                  commit(setFlag(rested.save, "flag.rested"));
                  setPanel("none");
                  push("You sleep. The party wakes mended. Sight, if it is yours, has three looks left. A trade, if you have one, can be changed where the road is quiet.");
                  playSfx("heal");
                }}
              >
                Rest (8 gold)
              </MenuButton>
              <MenuButton tone="ghost" onClick={() => setPanel("board")}>Change a trade</MenuButton>
            </div>
          )}
          {panel === "atlas" && (
            <div className="flex flex-col gap-3">
              <svg viewBox="0 0 860 260" className="w-full rounded-md bg-ink" role="img" aria-label="A map of walked roads and roads that are not open.">
                {ATLAS_ROADS.map((road) => {
                  const a = ATLAS.find((p) => p.id === road.from);
                  const b = ATLAS.find((p) => p.id === road.to);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={`${road.from}-${road.to}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={road.future ? "#8b6bb8" : "#4ec8c0"}
                      strokeOpacity={road.future ? 0.35 : 0.55}
                      strokeDasharray={road.future ? "4 4" : undefined}
                    />
                  );
                })}
                {ATLAS.map((place) => {
                  const state = placeState(save, place);
                  const fill = state === "here" ? "#e8b15a" : state === "walked" ? "#4ec8c0" : state === "open" ? "#8b6bb8" : "#3a3044";
                  return (
                    <g key={place.id}>
                      <circle cx={place.x} cy={place.y} r={state === "here" ? 8 : 6} fill={fill} />
                      <text x={place.x + 10} y={place.y + 4} fill="#f3e6c8" fontSize="11">{place.name}</text>
                    </g>
                  );
                })}
              </svg>
              <ul className="flex flex-col gap-2 text-sm">
                {ATLAS.map((place) => {
                  const state = placeState(save, place);
                  const label = state === "here" ? "You are here" : state === "walked" ? "Walked" : state === "open" ? "Road open, not yet walked" : state === "locked" ? "Not open" : "Still shut";
                  return (
                    <li key={place.id} className="rounded-md bg-ink/50 p-2">
                      <span className="text-amber">{place.name}</span>
                      <span className="block text-parchment/70">{place.blurb} {label}.</span>
                      {canTravel(save, place.id) && (
                        <MenuButton
                          tone="ghost"
                          onClick={() => {
                            const next = markPlace({ ...save, mapId: place.id, spawnId: place.spawn, encounter: null });
                            commit(next);
                            setPanel("none");
                            startMusic(musicFor(place.id));
                          }}
                        >
                          Travel
                        </MenuButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {panel === "arts" && (
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-auto text-sm">
              <p className="text-parchment/80">
                The trades that exist. Evolutions are earned in the world. Wayfinder, Elementalist, and Riverward can be changed where the road is quiet. Sera's Skywright kit is hers. Later jobs stay listed and cannot be chosen.
              </p>
              {JOB_KITS.map((job) => {
                const held = job.bearer ? (save.knownSpells[job.bearer] ?? []) : [];
                const companionKit = Boolean(job.bearer && job.bearer !== "wanderer" && (save.party.includes(job.bearer) || (save.reserve ?? []).includes(job.bearer)));
                const unlocked = job.playable && (job.id === "job.wanderer" || save.jobsUnlocked.includes(job.id) || companionKit);
                return (
                  <div key={job.id} className="rounded-md bg-ink/50 p-2">
                    <p className="font-semibold text-amber">
                      {job.name} · {job.playable ? job.who : "Later"}
                      {job.playable ? (unlocked ? " · open" : " · not yet") : ""}
                    </p>
                    <p className="text-parchment/80">{job.requires}</p>
                    {job.arts.map((id) => {
                      const art = ABILITIES[id];
                      if (!art) return null;
                      const earned = id.startsWith("act.") || id.startsWith("atk.") || held.includes(id) || (job.bearer === "wanderer" && id === "spell.ember");
                      const wait = art.cost.cooldownTicks ? ` · ${art.cost.cooldownTicks} turn wait` : "";
                      return (
                        <p key={id} className={earned ? "text-parchment" : "text-parchment/50"}>
                          {art.name}
                          {earned ? "" : " — not earned"}
                          {" · "}
                          {art.cost.mp} MP{wait}. {art.blurb}
                        </p>
                      );
                    })}
                    <p className="text-parchment/70">{job.synergy}</p>
                  </div>
                );
              })}
            </div>
          )}
          {panel === "help" && (
            <ul className="list-disc pl-4 text-sm">
              <li>WASD or arrows step a tile. On a phone, use the pad.</li>
              <li>E, Enter, or the Act button talks, loots, and starts fights.</li>
              <li>Battles: Attack, Magic, Defend, Item. Ascension adds movement and a real-time cast.</li>
              <li>Everything mandatory can be done with buttons. VR is optional and not required.</li>
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function blocked(mapId: string, x: number, y: number): boolean {
  if (mapId === "map.vale") {
    if (y <= 2) return true;
    if (x <= 1 && y < 9) return true;
    if (x >= 3 && x <= 5 && y >= 3 && y <= 5) return true;
  }
  if (mapId === "map.woods") {
    if (y <= 1 || y >= 10) return true;
    if ((x === 5 || x === 16) && y < 5) return true;
  }
  if (mapId === "map.shrine") {
    if (x <= 1 || x >= 14 || y <= 1) return true;
  }
  if (mapId === "map.inn") {
    if (x === 0 || x === 9 || y === 0 || (y >= 7 && x !== 5)) return true;
    if (x >= 1 && x <= 2 && y >= 2 && y <= 3) return true;
  }
  if (mapId === "map.smith") {
    if (x === 0 || x === 7 || y === 0 || (y >= 6 && x !== 4)) return true;
  }
  if (mapId === "map.reach") {
    if (y <= 1 || y >= 11) return true;
    if ((x === 9 || x === 14) && (y <= 3 || y >= 9)) return true;
  }
  if (mapId === "map.barrow") {
    if (x <= 0 || x >= 13 || y <= 0) return true;
    if (y >= 9 && x !== 7) return true;
  }
  if (mapId === "map.lowbell") {
    if (y <= 0 || y >= 10) return true;
    if (x >= 15 && y !== 8) return true;
    if (x <= 0 && y !== 5) return true;
  }
  if (mapId === "map.ferry") {
    if (y <= 1 || (x >= 17 && y !== 3)) return true;
    if (y >= 10 && x !== 8) return true;
    if (x <= 0 && y !== 6) return true;
    if (x >= 2 && x <= 4 && y >= 2 && y <= 3) return true;
  }
  if (mapId === "map.hold") {
    if (y <= 0 || y >= 9 || x <= 0 || x >= 17) return true;
    if (x === 6 || x === 12) return true;
  }
  if (mapId === "map.highroad") {
    if (y <= 0 || y >= 7 || x >= 13) return true;
    if (x <= 0 && y !== 4) return true;
    if (x >= 11) return true;
  }
  if (mapId === "map.ridge") {
    if (y <= 1 || y >= 11) return true;
    if (x <= 0 && y !== 6) return true;
    if (x >= 17 && y !== 6 && y !== 2) return true;
  }
  if (mapId === "map.cave") {
    if (y <= 0 || y >= 7 || x >= 11) return true;
    if (x <= 0 && y !== 4) return true;
  }
  if (mapId === "map.glass") {
    if (y <= 0 || y >= 9 || x <= 0 || x >= 17) return true;
    if (x === 6 || x === 12) return true;
  }
  if (mapId === "map.berth") {
    if (y <= 0 || y >= 7 || x >= 13) return true;
    if (x <= 0 && y !== 4) return true;
  }
  return false;
}

function ahead(pos: { x: number; y: number }, facing: string) {
  if (facing === "n") return { x: pos.x, y: pos.y - 1 };
  if (facing === "s") return { x: pos.x, y: pos.y + 1 };
  if (facing === "w") return { x: pos.x - 1, y: pos.y };
  return { x: pos.x + 1, y: pos.y };
}

function currentObjective(save: SaveGame): string {
  const cantorDone = flag(save, "flag.cantor_spared") || flag(save, "flag.cantor_defeated");
  if (flag(save, "flag.flown")) {
    return flag(save, "flag.hull_shadow")
      ? "The route is open. The noon at the glass, and the shadow under the hull, are recorded. They are not explained."
      : "The First Stay flies two pads. Something under the hull leaves early.";
  }
  if (flag(save, "flag.ridge_complete")) return "The gale is settled. The First Stay at the berth will fly to the Vale roof, and back. It is a route, not a sky.";
  if (flag(save, "flag.sera_joined")) return "Sera is with you, in the four or at the rig. The glass wants the chart and the sky. A gust is west of the lens.";
  if (flag(save, "flag.ferry_complete")) {
    const twice = flag(save, "flag.twice_departed") ? "" : " The two departures can still be written down.";
    return `The high road continues. Skyweave is past Wren. A rig on the ridge is arguing with the wind.${twice}`;
  }
  if (flag(save, "flag.hold_open")) return "The hold is open. Past the vault lights, you may ask the ferryman which departure, or end the boarding.";
  if (flag(save, "flag.bell_solved")) return "Lowbell's dock leads to Mistwater. The plate under the station wants an older cut. Sight shows it. It does not turn it.";
  if (cantorDone && !flag(save, "flag.bell_solved")) return "Lowbell is down the river stair. The bell there wants the walk and the other view.";
  if (flag(save, "flag.chapter_complete") && !flag(save, "flag.nessa_joined")) return "Past the prism, Hollowwood is open. Someone on the trail has been waiting.";
  if (flag(save, "flag.nessa_joined") && !flag(save, "flag.moss_hymn")) return "Give the moss its hymn: wind, then flame, then stone.";
  if (flag(save, "flag.moss_hymn") && !cantorDone) return "The barrow mouth is open. The Cantor is singing.";
  if (flag(save, "flag.chapter_complete")) return "The shrine is quiet. A trail at the prism's far side leads into the Reach.";
  if (!flag(save, "flag.clock_anomaly")) return "Walk the festival. The clock is north of the square. Nim is sketching nearby.";
  if (!flag(save, "flag.mira_joined")) return "Find Mira by the east lanterns. The woods should not be walked alone.";
  if (!flag(save, "flag.kael_joined")) return "East, into Glasspine. Kael keeps the path.";
  if (!flag(save, "flag.woods_cleared")) return "Something flickers in the pines. Meet it.";
  if (!flag(save, "flag.runes_decoded")) return "The shrine's rune wall is waiting for an order.";
  if (!flag(save, "flag.conduits_aligned")) return "Turn the conduit ring to the last rune.";
  if (save.wardenOutcome === "none") return "The Crystal Warden is awake. You may break it, or ask it to sleep.";
  return "Listen to how the shrine ends.";
}

function makeEncounter(save: SaveGame, id: "enc.festival" | "enc.woods" | "enc.warden" | "enc.thicket" | "enc.cantor" | "enc.crossing" | "enc.vault" | "enc.ferryman" | "enc.gust" | "enc.galekeeper"): EncounterState {
  const party = save.party.map((pid, i) => {
    const mate = prepareForBattle(save, pid);
    mate.position = formationSlot(save.formation ?? "line", i);
    return mate;
  });
  const enemies =
    id === "enc.festival"
      ? [{ ...structuredClone(ENEMY_TEMPLATES.shardling), id: "shard-f", position: { x: 0, z: -1.6 } }]
      : id === "enc.woods"
        ? [
            { ...structuredClone(ENEMY_TEMPLATES.shardling), id: "shard-w", position: { x: -0.8, z: -1.6 } },
            { ...structuredClone(ENEMY_TEMPLATES.glowmoth), id: "moth-w", position: { x: 0.9, z: -1.3 } },
          ]
        : id === "enc.thicket"
          ? [
              { ...structuredClone(ENEMY_TEMPLATES.briarling), id: "briar-a", position: { x: -0.7, z: -1.5 } },
              { ...structuredClone(ENEMY_TEMPLATES.briarling), id: "briar-b", position: { x: 0.8, z: -1.2 } },
            ]
          : id === "enc.cantor"
            ? [{ ...structuredClone(ENEMY_TEMPLATES.cantor), id: "cantor", position: { x: 0, z: -2.1 } }]
            : id === "enc.crossing"
              ? [
                  { ...structuredClone(ENEMY_TEMPLATES.mistling), id: "mist-a", position: { x: -0.8, z: -1.5 } },
                  { ...structuredClone(ENEMY_TEMPLATES.mistling), id: "mist-b", position: { x: 0.85, z: -1.2 } },
                ]
              : id === "enc.vault"
                ? [
                    { ...structuredClone(ENEMY_TEMPLATES.driftlantern), id: "lantern-a", position: { x: -0.9, z: -1.4 } },
                    { ...structuredClone(ENEMY_TEMPLATES.driftlantern), id: "lantern-b", position: { x: 0.95, z: -1.6 } },
                    { ...structuredClone(ENEMY_TEMPLATES.mistling), id: "mist-v", position: { x: 0.1, z: -1.1 } },
                  ]
                : id === "enc.ferryman"
                  ? [{ ...structuredClone(ENEMY_TEMPLATES.ferryman), id: "ferryman", position: { x: 0, z: -2.1 } }]
                  : id === "enc.gust"
                    ? [
                        { ...structuredClone(ENEMY_TEMPLATES.gustling), id: "gust-a", position: { x: -0.8, z: -1.4 } },
                        { ...structuredClone(ENEMY_TEMPLATES.gustling), id: "gust-b", position: { x: 0.85, z: -1.2 } },
                      ]
                    : id === "enc.galekeeper"
                      ? [{ ...structuredClone(ENEMY_TEMPLATES.galekeeper), id: "gale", position: { x: 0, z: -2.1 } }]
                  : [{ ...structuredClone(ENEMY_TEMPLATES.warden), id: "warden", position: { x: 0, z: -2.2 } }];
  return createEncounter({
    encounterId: id,
    seed: hashSeed(save.playerName + id),
    party,
    enemies,
    mode: "legacy",
    switchUnlocked: save.ascensionUnlocked,
    rewardsAlready: Object.keys(save.flags)
      .filter((k) => k.startsWith("rewarded."))
      .map((k) => k.replace("rewarded.", "")),
  });
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

function MapCanvas({
  mapId,
  width,
  height,
  pos,
  facing,
  party,
  hotspots,
  reduced,
  sight = false,
  appearance = "lantern",
  sightSteps = 0,
  follow = true,
  life = true,
  comfort = "gentle",
}: {
  mapId: string;
  width: number;
  height: number;
  pos: { x: number; y: number };
  facing: string;
  party: string[];
  hotspots: MapHotspot[];
  reduced: boolean;
  sight?: boolean;
  appearance?: string;
  sightSteps?: number;
  follow?: boolean;
  life?: boolean;
  comfort?: "gentle" | "standard";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const glideRef = useRef(1);
  const fromRef = useRef(pos);
  const toRef = useRef(pos);
  const paintRef = useRef<() => void>(() => {});
  paintRef.current = () => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = width * TILE;
    const cssH = height * TILE;
    c.width = cssW * dpr;
    c.height = cssH * dpr;
    c.style.width = "100%";
    c.style.height = "auto";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = reduced ? 1 : glideRef.current;
    const body = glide(fromRef.current, toRef.current, t);
    paintExploration(ctx, {
      mapId,
      width,
      height,
      sight,
      tick,
      reduced,
      pos,
      facing,
      party,
      hotspots,
      hover,
      blocked: (x, y) => blocked(mapId, x, y),
      appearance,
      moving: !reduced && t < 1,
      sightSteps: sight ? sightSteps : 0,
      body,
      life,
    });
    const frame = frameRef.current;
    if (!follow || !frame) {
      c.style.transform = "";
      return;
    }
    const look = cameraOrigin(body.x, body.y, width, height);
    const mapCssW = c.clientWidth || frame.clientWidth;
    const mapCssH = c.clientHeight || mapCssW * (height / Math.max(1, width));
    const tilePx = frame.clientWidth < 720 ? 72 : 84;
    const zoom = Math.min(4.2, Math.max(1.15, (tilePx * width) / Math.max(1, mapCssW)));
    const focusX = look.x * mapCssW * zoom;
    const focusY = look.y * mapCssH * zoom;
    const place = (view: number, content: number, focus: number) => {
      if (content <= view) return (view - content) / 2;
      return Math.min(0, Math.max(view - content, view / 2 - focus));
    };
    c.style.transformOrigin = "0 0";
    c.style.transition = "none";
    c.style.transform = `translate(${place(frame.clientWidth, mapCssW * zoom, focusX)}px, ${place(frame.clientHeight, mapCssH * zoom, focusY)}px) scale(${zoom})`;
  };
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setTick((n) => (n + 1) % 240), 90);
    return () => window.clearInterval(id);
  }, [reduced]);
  useEffect(() => {
    paintRef.current();
  }, [mapId, width, height, pos, facing, party, hotspots, reduced, sight, tick, hover, appearance, sightSteps, follow, life, comfort]);
  useEffect(() => {
    fromRef.current = glide(fromRef.current, toRef.current, reduced ? 1 : glideRef.current);
    toRef.current = pos;
    if (reduced) {
      glideRef.current = 1;
      paintRef.current();
      return;
    }
    const started = performance.now();
    const dur = comfort === "gentle" ? 220 : 140;
    let raf = 0;
    const loop = (now: number) => {
      glideRef.current = Math.min(1, (now - started) / dur);
      paintRef.current();
      if (glideRef.current < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pos.x, pos.y, reduced, comfort]);
  return (
    <div ref={frameRef} className={follow ? "relative h-[62vh] max-h-[520px] min-h-56 overflow-hidden" : "relative"}>
    <canvas
      ref={ref}
      className="block w-full"
      role="img"
      aria-label={`${MAPS[mapId]?.name ?? "Map"}. You stand on a tile. Nearby names appear when you stand close or point.`}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
        setHover((prev) => (prev?.x === x && prev?.y === y ? prev : { x, y }));
      }}
      onMouseLeave={() => setHover(null)}
    />
    </div>
  );
}

function Pad({ onMove, onAct }: { onMove: (x: number, y: number) => void; onAct: () => void }) {
  const b = "min-h-14 min-w-14 rounded-md border border-line bg-ink text-lg text-parchment";
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="grid grid-cols-3 gap-1">
        <span />
        <button type="button" className={b} onClick={() => onMove(0, -1)} aria-label="North">N</button>
        <span />
        <button type="button" className={b} onClick={() => onMove(-1, 0)} aria-label="West">W</button>
        <button type="button" className={b} onClick={() => onMove(0, 1)} aria-label="South">S</button>
        <button type="button" className={b} onClick={() => onMove(1, 0)} aria-label="East">E</button>
      </div>
      <button type="button" className="min-h-14 min-w-24 rounded-md bg-amber font-semibold text-ink" onClick={onAct}>
        Act
      </button>
    </div>
  );
}

function PartyStrip({ save, verbose = false }: { save: SaveGame; verbose?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {save.party.map((id) => {
        const c = save.roster[id];
        const def = CHARACTERS[id];
        if (!c) return null;
        const worn = withGear(c, save.equipment?.[id]);
        const jobName = Object.values(JOBS).find((j) => j.id === c.jobId)?.name ?? def?.title;
        return (
          <li key={id} className="rounded-md bg-ink/60 p-2">
            <div className="flex items-center gap-2">
              <Portrait hue={def?.portraitHue ?? 30} name={c.name} appearance={id === "wanderer" ? save.appearance : undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-parchment/60">Lv {c.level} · {jobName}</span>
                </div>
                <Meter label="HP" value={c.hp} max={c.maxHp} color="bg-danger" />
                <Meter label="MP" value={c.mp} max={c.maxMp} color="bg-teal" />
              </div>
            </div>
            {verbose && (
              <p className="mt-1 text-xs text-parchment/70">
                {def?.voice} Atk {worn.attack} · Def {worn.defense} · Spd {worn.speed}
                {save.bonds?.[id] ? ` · bond ${save.bonds[id]}` : ""}
                {save.equipment?.[id]?.weapon ? ` · ${GEAR[save.equipment[id]!.weapon!]?.name ?? "weapon"}` : ""}
                {save.equipment?.[id]?.armor ? ` · ${GEAR[save.equipment[id]!.armor!]?.name ?? "armor"}` : ""}
                {save.equipment?.[id]?.accessory ? ` · ${GEAR[save.equipment[id]!.accessory!]?.name ?? "charm"}` : ""}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Portrait({
  name,
  appearance,
  hue = 30,
  large = false,
  mood = "none",
}: {
  name: string;
  appearance?: string;
  hue?: number;
  large?: boolean;
  mood?: string;
}) {
  const spec = portraitSpec(name, appearance);
  const x = spec.cols <= 1 ? "0%" : `${(spec.col / (spec.cols - 1)) * 100}%`;
  const y = spec.rows <= 1 ? "0%" : `${(spec.row / (spec.rows - 1)) * 100}%`;
  const filter = spec.filter === "none" ? mood : mood === "none" ? spec.filter : `${spec.filter} ${mood}`;
  return (
    <span
      className={
        large
          ? "portrait dialogue-face inline-block h-24 w-24 shrink-0 rounded-md border border-amber/50 bg-ink sm:h-28 sm:w-28"
          : "portrait inline-block h-11 w-11 shrink-0 rounded-md border border-amber/50 bg-ink"
      }
      style={{
        backgroundColor: `hsl(${hue} 30% 14%)`,
        backgroundImage: `url(${artUrl(spec.file)})`,
        backgroundSize: `${spec.cols * 100}% ${spec.rows * 100}%`,
        backgroundPosition: `${x} ${y}`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        filter: filter === "none" ? undefined : filter,
      }}
      aria-hidden
    />
  );
}

function Meter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[11px] text-parchment/70">
        <span>{label}</span>
        <span className="tabular-nums">{value}/{max}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DialogueBox({
  speaker,
  text,
  choices,
  onNext,
  onChoice,
  appearance,
  reduced = false,
}: {
  speaker: string;
  text: string;
  choices?: { label: string; next: string; flag?: string }[];
  onNext: () => void;
  onChoice: (c: { label: string; next: string; flag?: string }) => void;
  appearance?: string;
  reduced?: boolean;
}) {
  const [count, setCount] = useState(reduced ? text.length : 1);
  useEffect(() => {
    if (reduced) {
      setCount(text.length);
      return;
    }
    setCount(1);
    const id = window.setInterval(() => {
      setCount((n) => (n >= text.length ? n : Math.min(text.length, n + 2)));
    }, 16);
    return () => window.clearInterval(id);
  }, [text, reduced]);
  const shown = text.slice(0, count);
  const done = count >= text.length;
  return (
    <div
      className="dialogue-plate dialogue-rise fixed inset-x-0 bottom-0 z-40 border-t border-amber/40 bg-ink-2/95 p-4"
      role="dialog"
      aria-label={speaker}
      onClick={() => { if (!done) setCount(text.length); }}
    >
      <div className="mx-auto flex max-w-3xl gap-3">
        <Portrait hue={SPEAKER_HUE[speaker] ?? 36} name={speaker} appearance={appearance} large mood={portraitMood(shown)} />
        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-widest text-amber uppercase">{speaker}</p>
          <p className="mt-1 min-h-8 text-lg">{shown}{done ? "" : " ▍"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {choices?.length ? (
              choices.map((c) => (
                <MenuButton key={c.label} onClick={() => onChoice(c)}>
                  {c.label}
                </MenuButton>
              ))
            ) : (
              <MenuButton onClick={() => (done ? onNext() : setCount(text.length))}>{done ? "Continue" : "Skip"}</MenuButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/70 p-3 sm:items-center" role="dialog" aria-modal aria-label={title}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-md border border-line bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl">{title}</h3>
          <button type="button" className="min-h-11 rounded-md px-3 text-amber" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Battle({
  save,
  commit,
  push,
  onLeave,
}: {
  save: SaveGame;
  commit: (s: SaveGame) => SaveGame;
  push: (t: string) => void;
  onLeave: (s: SaveGame, victory: boolean, encounterId: string) => void;
}) {
  const enc = save.encounter!;
  const [pick, setPick] = useState<"root" | "magic" | "item" | "target">("root");
  const [pending, setPending] = useState<{ abilityId: string; kind: CombatAction["kind"] } | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; text: string; x: number }[]>([]);
  const [intro, setIntro] = useState(
    enc.encounterId === "enc.warden" ||
      enc.encounterId === "enc.cantor" ||
      enc.encounterId === "enc.ferryman" ||
      enc.encounterId === "enc.galekeeper",
  );
  const encRef = useRef(enc);
  const saveRef = useRef(save);
  encRef.current = enc;
  saveRef.current = save;
  const arena = useRef<HTMLCanvasElement>(null);
  const [iris, setIris] = useState(!save.settings.reducedMotion);
  const asc = useRef({ x: 0, z: 2.2, keys: new Set<string>() });
  const [ascPos, setAscPos] = useState({ x: 0, z: 2.2 });
  const enemyTimer = useRef<number | null>(null);
  const battlePad = useRef<boolean[]>([]);

  const active = enc.combatants.find((c) => c.id === enc.activeActorId);
  const foes = enc.combatants.filter((c) => c.side === "enemy");
  const party = enc.combatants.filter((c) => c.side === "party");

  function float(text: string) {
    const id = Date.now() + Math.random();
    setFloaters((f) => [...f.slice(-4), { id, text, x: 20 + Math.random() * 60 }]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 900);
  }

  function commitEnc(nextEnc: EncounterState, note?: string) {
    const base = saveRef.current;
    let nextSave: SaveGame = { ...base, encounter: nextEnc, mode: nextEnc.mode };
    if (nextEnc.pack) {
      nextSave = {
        ...nextSave,
        inventory: nextSave.inventory.map((slot) =>
          slot.itemId in nextEnc.pack! ? { ...slot, qty: Math.max(0, nextEnc.pack![slot.itemId] ?? 0) } : slot,
        ),
      };
    }
    if (nextEnc.pendingReward && !base.flags[`rewarded.${nextEnc.pendingReward.id}`]) {
      nextSave = applyReward(nextSave, nextEnc.pendingReward);
    }
    const settled = { ...nextEnc, pendingReward: null };
    if (nextEnc.outcome === "victory" || nextEnc.outcome === "mercy") {
      if (nextEnc.encounterId === "enc.woods") nextSave = setFlag(nextSave, "flag.woods_cleared");
      if (nextEnc.encounterId === "enc.festival") nextSave = setFlag(nextSave, "flag.festival_fought");
      if (nextEnc.encounterId === "enc.warden") {
        nextSave = setFlag(nextSave, "flag.chapter_complete");
        nextSave.chapterComplete = true;
      }
      for (const id of nextSave.party) {
        const live = settled.combatants.find((c) => c.id === id);
        if (live && nextSave.roster[id]) {
          nextSave.roster[id] = { ...nextSave.roster[id]!, hp: Math.max(1, live.hp), mp: live.mp };
        }
      }
      nextSave.encounter = null;
    } else if (nextEnc.outcome === "defeat") {
      for (const id of nextSave.party) {
        const r = nextSave.roster[id];
        if (r) nextSave.roster[id] = { ...r, hp: r.maxHp, mp: r.maxMp };
      }
      nextSave.encounter = null;
    } else {
      nextSave.encounter = settled;
    }
    commit(nextSave);
    if (note) float(note);
    if (nextEnc.outcome === "victory" || nextEnc.outcome === "mercy") {
      playSfx("victory");
      window.setTimeout(() => onLeave(nextSave, true, nextEnc.encounterId), 1100);
    }
    if (nextEnc.outcome === "defeat") {
      window.setTimeout(() => onLeave(nextSave, false, nextEnc.encounterId), 1100);
    }
  }

  function doAction(action: CombatAction) {
    const current = encRef.current;
    if (current.outcome !== "ongoing") return;
    const stamped = structuredClone(current);
    stamped.pack = Object.fromEntries(saveRef.current.inventory.map((slot) => [slot.itemId, slot.qty]));
    if (stamped.mode === "ascension") {
      const mover = stamped.combatants.find((c) => c.id === action.actorId && c.side === "party");
      if (mover) mover.position = { x: asc.current.x, z: asc.current.z };
    }
    const res = proposeAction(stamped, action);
    if (!res.ok) {
      push(res.reason ?? "That did not hold.");
      playSfx("ui");
      return;
    }
    if (action.kind === "cast") {
      const base = saveRef.current;
      const n = (base.spellMastery[action.abilityId] ?? 0) + 1;
      base.spellMastery = { ...base.spellMastery, [action.abilityId]: n };
    }
    const last = res.state.events[res.state.events.length - 1];
    if (last?.kind === "damage" || last?.kind === "shield") playSfx("hit");
    else if (last?.kind === "heal" || last?.kind === "mp") playSfx("heal");
    else if (action.kind === "cast") playSfx("spell");
    else playSfx("ui");
    setPick("root");
    setPending(null);
    commitEnc(res.state, last?.text);
  }

  function chooseAbility(abilityId: string, kind: CombatAction["kind"]) {
    const ab = ABILITIES[abilityId];
    if (!ab || !active) return;
    if (ab.targeting === "self") {
      doAction({
        version: 1,
        actorId: active.id,
        abilityId,
        kind,
        targetIds: [active.id],
        modeOrigin: enc.mode,
        timeOrTurn: enc.turnIndex,
      });
      return;
    }
    if (ab.targeting === "one_ally") {
      setPending({ abilityId, kind });
      setPick("target");
      return;
    }
    const livingFoes = foes.filter((f) => f.alive);
    if (livingFoes.length === 1) {
      doAction({
        version: 1,
        actorId: active.id,
        abilityId,
        kind,
        targetIds: [livingFoes[0]!.id],
        modeOrigin: enc.mode,
        timeOrTurn: enc.turnIndex,
      });
      return;
    }
    setPending({ abilityId, kind });
    setPick("target");
  }

  useEffect(() => {
    if (enc.phase !== "enemy" || enc.outcome !== "ongoing") return;
    const snapshot = enc;
    const boss =
      enc.encounterId === "enc.warden" ||
      enc.encounterId === "enc.cantor" ||
      enc.encounterId === "enc.ferryman" ||
      enc.encounterId === "enc.galekeeper";
    enemyTimer.current = window.setTimeout(() => {
      if (encRef.current !== snapshot && encRef.current.tick !== snapshot.tick) return;
      const res = resolveEnemyTurn(encRef.current.phase === "enemy" ? encRef.current : snapshot);
      if (!res.ok) return;
      const last = res.state.events[res.state.events.length - 1];
      playSfx(last?.kind === "damage" ? "hurt" : "hit");
      commitEnc(res.state, last?.text);
    }, save.settings.reducedMotion ? 180 : boss ? 1100 : 480);
    playSfx("warn");
    return () => {
      if (enemyTimer.current) window.clearTimeout(enemyTimer.current);
    };
    // commitEnc closes over latest refs; re-bind only when the turn identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enc.tick, enc.phase, enc.activeActorId, save.settings.reducedMotion]);

  useEffect(() => {
    if (!intro) return;
    const t = window.setTimeout(() => setIntro(false), save.settings.reducedMotion ? 350 : 1700);
    return () => window.clearTimeout(t);
  }, [intro, save.settings.reducedMotion]);

  useEffect(() => {
    if (save.settings.reducedMotion) return;
    playSfx("rise");
    const t = window.setTimeout(() => setIris(false), 460);
    return () => window.clearTimeout(t);
  }, [save.settings.reducedMotion]);

  useEffect(() => {
    const c = arena.current;
    if (!c) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (enc.mode === "ascension") {
        const k = asc.current.keys;
        let x = 0;
        let z = 0;
        if (k.has("KeyA") || k.has("ArrowLeft")) x -= 1;
        if (k.has("KeyD") || k.has("ArrowRight")) x += 1;
        if (k.has("KeyW") || k.has("ArrowUp")) z -= 1;
        if (k.has("KeyS") || k.has("ArrowDown")) z += 1;
        const len = Math.hypot(x, z) || 1;
        asc.current.x = clamp(asc.current.x + (x / len) * 3.2 * dt, -3.2, 3.2);
        asc.current.z = clamp(asc.current.z + (z / len) * 3.2 * dt, -0.2, 3.4);
        setAscPos({ x: asc.current.x, z: asc.current.z });
      }
      drawArena(c, enc, asc.current, save.settings.reducedMotion, now, save.appearance);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enc, save.settings.reducedMotion]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      asc.current.keys.add(e.code);
      if (enc.mode === "ascension" && enc.phase === "player" && active?.side === "party") {
        if (e.code === "KeyF" || e.code === "Space") {
          e.preventDefault();
          const foe = nearestFoe(enc, asc.current);
          if (foe) {
            const ab = active.id === "mira" ? "spell.tide" : active.id === "kael" ? "atk.oathcut" : active.id === "sera" ? "spell.gust" : "spell.ember";
            const known = active.id === "kael" ? "atk.oathcut" : ab;
            doAction({
              version: 1,
              actorId: active.id,
              abilityId: known,
              kind: known.startsWith("spell") ? "cast" : "attack",
              targetIds: [foe.id],
              modeOrigin: "ascension",
              timeOrTurn: enc.turnIndex,
              aimEvidence: { x: asc.current.x, y: asc.current.z, confidence: 1 },
            });
          }
        }
        if (e.code === "KeyQ") {
          doAction({
            version: 1,
            actorId: active.id,
            abilityId: "act.dodge",
            kind: "dodge",
            targetIds: [active.id],
            modeOrigin: "ascension",
            timeOrTurn: enc.turnIndex,
          });
        }
      }
      if (e.code === "Tab" && save.ascensionUnlocked && enc.phase === "player") {
        e.preventDefault();
        doAction({
          version: 1,
          actorId: active?.id ?? party[0]!.id,
          abilityId: "act.defend",
          kind: "switch",
          targetIds: [],
          modeOrigin: enc.mode,
          timeOrTurn: enc.turnIndex,
        });
      }
    };
    const up = (e: KeyboardEvent) => asc.current.keys.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const probe = {
      getYaw: () => 0,
      getSpeed: () => (asc.current.keys.has("KeyW") ? 1 : 0),
      setKeys: (codes: string[]) => {
        asc.current.keys = new Set(codes);
      },
      getPos: () => ({ ...asc.current, keys: undefined }),
    };
    (window as unknown as { __controlsTest?: typeof probe }).__controlsTest = probe;
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enc, active?.id, save.ascensionUnlocked]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const pads = navigator.getGamepads?.() ?? [];
      const p = pads[0];
      const prev = battlePad.current;
      battlePad.current = p ? p.buttons.map((b) => b.pressed) : [];
      if (!p || enc.phase !== "player" || enc.outcome !== "ongoing" || !active || active.side !== "party") return;
      const edge = (i: number) => Boolean(p.buttons[i]?.pressed) && !prev[i];
      if (enc.mode === "ascension") {
        if (p.buttons[14]?.pressed) asc.current.x = clamp(asc.current.x - 0.35, -3.2, 3.2);
        if (p.buttons[15]?.pressed) asc.current.x = clamp(asc.current.x + 0.35, -3.2, 3.2);
        if (p.buttons[12]?.pressed) asc.current.z = clamp(asc.current.z - 0.35, -0.2, 3.4);
        if (p.buttons[13]?.pressed) asc.current.z = clamp(asc.current.z + 0.35, -0.2, 3.4);
      }
      if (edge(0)) {
        const foe = enc.mode === "ascension" ? nearestFoe(enc, asc.current) : enc.combatants.find((c) => c.side === "enemy" && c.alive);
        const strike = active.id === "kael" ? "atk.oathcut" : "atk.strike";
        if (foe) {
          doAction({
            version: 1,
            actorId: active.id,
            abilityId: strike,
            kind: "attack",
            targetIds: [foe.id],
            modeOrigin: enc.mode,
            timeOrTurn: enc.turnIndex,
          });
        }
      }
      if (edge(1)) chooseAbility("act.defend", "defend");
      if (edge(2) && (CHARACTERS[active.id]?.abilities ?? []).includes("act.dodge")) chooseAbility("act.dodge", "dodge");
      if (edge(3) && save.ascensionUnlocked) {
        doAction({
          version: 1,
          actorId: active.id,
          abilityId: "act.defend",
          kind: "switch",
          targetIds: [],
          modeOrigin: enc.mode,
          timeOrTurn: enc.turnIndex,
        });
      }
    }, 140);
    return () => window.clearInterval(id);
  }, [enc, active, save.ascensionUnlocked]);

  const abilitiesFor = active
    ? [...new Set([...(CHARACTERS[active.id]?.abilities ?? ["atk.strike", "act.defend"]), ...(save.knownSpells[active.id] ?? [])])]
    : [];
  const magic = abilitiesFor.filter((id) => ABILITIES[id]?.kind === "spell");
  const attacks = abilitiesFor.filter((id) => ABILITIES[id]?.kind === "attack");

  const targets =
    pending && ABILITIES[pending.abilityId]?.targeting === "one_ally"
      ? party.filter((p) => p.alive)
      : foes.filter((f) => f.alive);

  return (
    <div className="battle-shell mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-3 py-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.22em] text-amber uppercase">{enc.mode === "legacy" ? "Legacy" : "Ascension"} · {enc.encounterId.replace("enc.", "")}</p>
          <h2 className="font-display text-2xl">
            {enc.encounterId === "enc.warden"
              ? "Crystal Warden"
              : enc.encounterId === "enc.cantor"
                ? "Thorn Cantor"
                : enc.encounterId === "enc.ferryman"
                  ? "Late Ferryman"
                  : enc.encounterId === "enc.galekeeper"
                    ? "Galekeeper"
                    : enc.encounterId === "enc.gust"
                      ? "Early gust"
                  : enc.encounterId === "enc.thicket"
                  ? "Briar thicket"
                  : enc.encounterId === "enc.crossing"
                    ? "Flood mist"
                    : enc.encounterId === "enc.vault"
                      ? "Vault lights"
                  : enc.encounterId === "enc.festival"
                    ? "Lantern crash"
                    : "Glasspine flicker"}
          </h2>
        </div>
        {save.ascensionUnlocked && enc.outcome === "ongoing" && (
          <MenuButton
            tone="ghost"
            disabled={enc.phase !== "player"}
            onClick={() => {
              if (!active) return;
              doAction({
                version: 1,
                actorId: active.id,
                abilityId: "act.defend",
                kind: "switch",
                targetIds: [],
                modeOrigin: enc.mode,
                timeOrTurn: enc.turnIndex,
              });
            }}
          >
            {enc.mode === "legacy" ? "Step inside (Ascension)" : "Step back (Legacy)"}
          </MenuButton>
        )}
      </header>
      <div className="battle-stage relative overflow-hidden rounded-md border border-line bg-ink">
        <canvas ref={arena} className="block h-72 w-full sm:h-[440px]" />
        {iris && <div className="battle-iris pointer-events-none absolute inset-0 z-20 bg-ink" />}
        {intro && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink/75 text-center">
            <p className="text-xs tracking-[0.28em] text-teal uppercase">
              {enc.encounterId === "enc.cantor"
                ? "The barrow answers"
                : enc.encounterId === "enc.ferryman"
                  ? "The second boarding"
                  : enc.encounterId === "enc.galekeeper"
                    ? "The early noon"
                    : "The prism wakes"}
            </p>
            <p className="font-display text-4xl">
              {enc.encounterId === "enc.cantor"
                ? "Thorn Cantor"
                : enc.encounterId === "enc.ferryman"
                  ? "Late Ferryman"
                  : enc.encounterId === "enc.galekeeper"
                    ? "Galekeeper"
                    : "Crystal Warden"}
            </p>
            <p className="mt-2 max-w-md text-sm text-parchment/80">
              {enc.encounterId === "enc.galekeeper"
                ? "The wind is early. Under a little less than half you may ask which noon it is keeping, if you read both views, saw the glass, or chose the safer stay. Otherwise finish it. When the early gale starts, the note hits everyone."
                : enc.encounterId === "enc.ferryman"
                ? "He is still boarding. Under two fifths you may ask which departure he is keeping, if you recorded both hours or already learned how to ask. Otherwise finish the line. When the second boarding starts, the note hits everyone."
                : enc.encounterId === "enc.cantor"
                ? flag(save, "flag.warden_spared") || save.wardenOutcome === "spared"
                  ? "A song with thorns. Bring it under half if you mean to ask it to stop. Mercy here remembers the Warden you spared."
                  : "A song with thorns. The Warden was not spared, so this one will not accept a softer ending. Finish the note."
                : "A guardian that has not been spoken to kindly in a long while. Stoneguard, then Tide, opens a choice."}
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
          {floaters.map((f) => (
            <span key={f.id} className="text-sm text-amber-2">{f.text.slice(0, 80)}</span>
          ))}
        </div>
        {enc.intents[0] && (
          <p className="absolute right-3 bottom-3 max-w-xs rounded-md bg-ink/80 px-2 py-1 text-xs text-amber">
            <span className="block font-semibold">{ability(enc.intents[0].abilityId).name}</span>
            {windupAdvice(enc.intents[0].abilityId)}
          </p>
        )}
      </div>
      <div className="battle-board grid min-h-0 gap-3 lg:grid-cols-[220px_1fr]">
        <div className="battle-party min-h-0">
          <PartyStrip save={{ ...save, roster: Object.fromEntries(party.map((p) => [p.id, p])), party: party.map((p) => p.id) }} />
        </div>
        <div className="battle-commands min-h-0 rounded-md border border-line bg-panel p-3">
          {enc.outcome !== "ongoing" && <p className="font-display text-xl">{enc.outcome === "mercy" ? "A pact, not a kill." : enc.outcome === "victory" ? "The light holds." : "You fall, and wake."}</p>}
          {enc.phase === "enemy" && <p className="text-amber-2">{active?.name} is moving.</p>}
          {enc.phase === "switch_lock" && <p>The two views agree with each other…</p>}
          {enc.phase === "player" && active && (
            <div className="flex flex-col gap-2">
              {enc.encounterId === "enc.cantor" && foes.some((f) => f.alive && f.hp <= f.maxHp * 0.5) && (
                <p className="text-sm text-amber">
                  {flag(save, "flag.warden_spared") || save.wardenOutcome === "spared"
                    ? "The dirge is thin enough to ask it to stop."
                    : "The dirge is thin. It still will not take mercy."}
                </p>
              )}
              {enc.encounterId === "enc.warden" && foes.some((f) => f.mercyEligible || f.statuses.some((s) => s.id === "exposed")) && (
                <p className="text-sm text-teal">The core is open. Mercy and the last blow are both still true.</p>
              )}
              {enc.encounterId === "enc.ferryman" && foes.some((f) => f.jobId === "enemy.ferryman" && f.alive && f.hp <= f.maxHp * 0.4) && (
                <p className="text-sm text-teal">He is quiet enough to be asked which departure he is keeping. Both hours, or a guardian you already asked to sleep.</p>
              )}
              {enc.encounterId === "enc.ferryman" && foes.some((f) => f.jobId === "enemy.ferryman" && (f.phase ?? 1) >= 2) && (
                <p className="text-sm text-amber">Second boarding. The next great note hits everyone. Defend.</p>
              )}
              {enc.encounterId === "enc.galekeeper" && foes.some((f) => f.jobId === "enemy.galekeeper" && f.alive && f.hp <= f.maxHp * 0.45) && (
                <p className="text-sm text-teal">The gale is quiet enough to be asked which noon it is keeping. Both views, the glass, or the safer stay.</p>
              )}
              {enc.encounterId === "enc.galekeeper" && foes.some((f) => f.jobId === "enemy.galekeeper" && (f.phase ?? 1) >= 2) && (
                <p className="text-sm text-amber">Early gale. The next great note hits everyone. Defend.</p>
              )}
              <p className="text-sm text-teal">{active.name}'s turn. {enc.mode === "ascension" ? "WASD moves inside the ring. F or Cast strikes the nearest foe. Q dodges. The menu still works." : "Choose, then choose who wears it."}</p>
              {enc.mode === "ascension" && (
                <div className="flex flex-wrap gap-2 lg:hidden">
                  <Pad
                    onMove={(dx, dy) => {
                      asc.current.x = clamp(asc.current.x + dx * 0.6, -3.2, 3.2);
                      asc.current.z = clamp(asc.current.z + dy * 0.6, -0.2, 3.4);
                    }}
                    onAct={() => {
                      const foe = nearestFoe(enc, asc.current);
                      if (!foe || !active) return;
                      const id = active.id === "kael" ? "atk.oathcut" : active.id === "mira" ? "spell.mend" : active.id === "sera" ? "spell.gust" : "spell.ember";
                      chooseAbility(id, id.startsWith("spell") ? "cast" : "attack");
                    }}
                  />
                </div>
              )}
              {pick === "root" && (
                <div className="flex flex-wrap gap-2">
                  <MenuButton onClick={() => chooseAbility(attacks[0] ?? "atk.strike", "attack")}>Attack</MenuButton>
                  <MenuButton tone="ghost" onClick={() => setPick("magic")}>Magic</MenuButton>
                  <MenuButton tone="ghost" onClick={() => chooseAbility("act.defend", "defend")}>Defend</MenuButton>
                  {abilitiesFor.includes("act.dodge") && (
                    <MenuButton tone="ghost" onClick={() => chooseAbility("act.dodge", "dodge")}>Sidestep</MenuButton>
                  )}
                  <MenuButton tone="ghost" onClick={() => setPick("item")}>Item</MenuButton>
                  {(enc.encounterId === "enc.warden" || (enc.encounterId === "enc.cantor" && flag(save, "flag.warden_spared")) || enc.encounterId === "enc.ferryman" || enc.encounterId === "enc.galekeeper") && (
                    <MenuButton
                      tone="ghost"
                      onClick={() => {
                        const sparedWarden = flag(save, "flag.warden_spared") || save.wardenOutcome === "spared";
                        const res = tryMercy(enc, {
                          wardenSpared: sparedWarden,
                          doubleDeparture: flag(save, "flag.twice_departed"),
                          skyAsked: flag(save, "flag.sky_split") || flag(save, "flag.sight_glass") || flag(save, "flag.sera_stay"),
                        });
                        if (!res.ok) {
                          push(res.reason ?? "Not yet.");
                          return;
                        }
                        playSfx("heal");
                        commitEnc(
                          res.state,
                          enc.encounterId === "enc.cantor"
                            ? "The Cantor lets go."
                            : enc.encounterId === "enc.ferryman"
                              ? "The ferryman sits."
                              : enc.encounterId === "enc.galekeeper"
                                ? "The gale sits."
                                : "The Warden bows.",
                        );
                      }}
                    >
                      {enc.encounterId === "enc.ferryman" ? "Ask which departure" : enc.encounterId === "enc.galekeeper" ? "Ask which noon" : "Offer mercy"}
                    </MenuButton>
                  )}
                  {active.id !== "wanderer" && companionInstinct(enc, active.id) && (
                    <MenuButton
                      tone="ghost"
                      onClick={() => {
                        const hint = companionInstinct(enc, active.id);
                        if (!hint || !active) return;
                        doAction({
                          version: 1,
                          actorId: active.id,
                          abilityId: hint.abilityId,
                          kind: hint.kind,
                          targetIds: hint.targetIds,
                          modeOrigin: enc.mode,
                          timeOrTurn: enc.turnIndex,
                        });
                      }}
                    >
                      {companionInstinct(enc, active.id)?.text}
                    </MenuButton>
                  )}
                </div>
              )}
              {pick === "magic" && (
                <div className="flex flex-wrap gap-2">
                  {magic.map((id) => (
                    <MenuButton key={id} tone="ghost" onClick={() => chooseAbility(id, "cast")}>
                      {ability(id).name} · {ability(id).cost.mp} MP
                    </MenuButton>
                  ))}
                  <MenuButton tone="ghost" onClick={() => setPick("root")}>Back</MenuButton>
                </div>
              )}
              {pick === "item" && (
                <div className="flex flex-wrap gap-2">
                  {save.inventory.filter((s) => ITEMS[s.itemId]?.useAbility && s.qty > 0).map((s) => (
                    <MenuButton
                      key={s.itemId}
                      tone="ghost"
                      onClick={() => {
                        if (!active) return;
                        const use = ITEMS[s.itemId]!.useAbility!;
                        chooseAbility(use, "item");
                      }}
                    >
                      {ITEMS[s.itemId]?.name} × {s.qty}
                    </MenuButton>
                  ))}
                  <MenuButton tone="ghost" onClick={() => setPick("root")}>Back</MenuButton>
                </div>
              )}
              {pick === "target" && pending && (
                <div className="flex flex-wrap gap-2">
                  {targets.map((t) => (
                    <MenuButton
                      key={t.id}
                      onClick={() =>
                        doAction({
                          version: 1,
                          actorId: active.id,
                          abilityId: pending.abilityId,
                          kind: pending.kind,
                          targetIds: [t.id],
                          modeOrigin: enc.mode,
                          timeOrTurn: enc.turnIndex,
                        })
                      }
                    >
                      {t.name} ({t.hp})
                    </MenuButton>
                  ))}
                  <MenuButton tone="ghost" onClick={() => setPick("root")}>Back</MenuButton>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 max-h-24 overflow-auto text-xs text-parchment/70" aria-live="polite">
            {save.settings.captions && enc.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      </div>
      {enc.mode === "ascension" && (
        <p className="text-xs text-parchment/50">Position {ascPos.x.toFixed(1)}, {ascPos.z.toFixed(1)}. Bounds are the ring. Leaning past them does nothing. {XR_BINDINGS.notes}</p>
      )}
    </div>
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function nearestFoe(enc: EncounterState, pos: { x: number; z: number }) {
  const foes = enc.combatants.filter((c) => c.side === "enemy" && c.alive);
  return foes.slice().sort((a, b) => Math.hypot(a.position.x - pos.x, a.position.z - pos.z) - Math.hypot(b.position.x - pos.x, b.position.z - pos.z))[0];
}

function drawArena(
  canvas: HTMLCanvasElement,
  enc: EncounterState,
  hero: { x: number; z: number },
  reduced: boolean,
  now = 0,
  appearance = "lantern",
) {
  paintArena(canvas, enc, hero, reduced, now, appearance);
}

function Ending({ save, onTitle, onAgain }: { save: SaveGame; onTitle: () => void; onAgain: () => void }) {
  const spared = save.wardenOutcome === "spared";
  const reach = flag(save, "flag.cantor_spared") || flag(save, "flag.cantor_defeated");
  const cantorKind = flag(save, "flag.cantor_spared");
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-5 py-12">
      <p className="text-xs tracking-[0.28em] text-teal uppercase">{reach ? "Into the Reach" : "Chapter I complete"}</p>
      <h2 className="font-display text-5xl">{reach ? "A song out of season" : "The Crystal Awakening"}</h2>
      {reach ? (
        <>
          <p>
            {reachClose(save.playerName, wardenMemory(save), cantorKind)} The Reach exhales like a wood that has been holding a verse too long.
          </p>
          <p>
            The hymn still does not match any season Lantern Vale keeps. Mira writes the notes and leaves the margin empty. Somewhere under the clock, a warm stone is not a door. Not yet. The drawing Nim made is still only a drawing.
          </p>
          <p className="text-amber-2">Something in the wood is early. It has not said its name, and you do not owe it one tonight.</p>
        </>
      ) : (
        <>
          <p>
            {spared
              ? `${save.playerName}, the Warden sleeps. Mira writes the pact in the margin, not the victory column. Kael puts his sword away like a person, not a gate.`
              : `${save.playerName}, the prism goes dark. The Vale will call it a victory. Mira does not argue. She only leaves a blank line where a name might have gone.`}
          </p>
          <p>
            On the shrine floor your name is still cut beside a date the village does not own. Nim's wooden door is still only a drawing. The clock in Lantern Vale is still willing to strike ten while wearing nine and nine.
          </p>
          <p className="text-amber-2">North of the prism, the trees keep a second season. The trail is open if you want it. The festival will still be there when you come back.</p>
        </>
      )}
      <p className="text-sm text-parchment/60">
        What you chose is kept: the Warden {spared ? "sleeps" : "fell"}
        {reach ? `, and the Cantor ${cantorKind ? "was spared" : "was silenced"}` : ""}. Gold {save.gold}. The rest of the road can wait.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <MenuButton onClick={onTitle}>Title</MenuButton>
        <MenuButton tone="ghost" onClick={onAgain}>{reach ? "Walk the Reach again" : "Walk on"}</MenuButton>
      </div>
    </div>
  );
}

function SettingsSheet({
  save,
  onChange,
  onClose,
  onReset,
  onExport,
  onImport,
}: {
  save: SaveGame | null;
  onChange: (s: SaveGame["settings"]) => void;
  onClose: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (f: File) => void;
  showBackToTitle: boolean;
}) {
  const s = save?.settings ?? {
    textScale: "md" as const,
    captions: true,
    muted: false,
    masterVolume: 0.7,
    reducedMotion: false,
    motionDetail: "full" as const,
    highContrast: false,
    cameraComfort: "gentle" as const,
    buttonOnly: false,
    showHelp: true,
  };
  const set = (patch: Partial<typeof s>) => onChange({ ...s, ...patch });
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex items-center justify-between gap-3">
          Text size
          <select className="min-h-11 rounded-md border border-line bg-ink px-2" value={s.textScale} onChange={(e) => set({ textScale: e.target.value as typeof s.textScale })}>
            <option value="sm">Small</option>
            <option value="md">Comfortable</option>
            <option value="lg">Large</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3">
          Captions
          <input type="checkbox" checked={s.captions} onChange={(e) => set({ captions: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          Mute
          <input type="checkbox" checked={s.muted} onChange={(e) => set({ muted: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={s.masterVolume} onChange={(e) => set({ masterVolume: Number(e.target.value) })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          Reduced motion
          <input type="checkbox" checked={s.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          Quiet world
          <input type="checkbox" checked={s.motionDetail === "quiet"} onChange={(e) => set({ motionDetail: e.target.checked ? "quiet" : "full" })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          High contrast
          <input type="checkbox" checked={s.highContrast} onChange={(e) => set({ highContrast: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between gap-3">
          Camera comfort
          <select className="min-h-11 rounded-md border border-line bg-ink px-2" value={s.cameraComfort} onChange={(e) => set({ cameraComfort: e.target.value as typeof s.cameraComfort })}>
            <option value="gentle">Gentle</option>
            <option value="standard">Standard</option>
          </select>
        </label>
        <p className="text-xs text-parchment/60">Button-only play is the default path. No fight or puzzle requires a gesture, a headset, or a stick.</p>
        <div className="flex flex-wrap gap-2">
          <MenuButton tone="ghost" onClick={onExport} disabled={!save}>Export chronicle</MenuButton>
          <label className="min-h-11 cursor-pointer rounded-md border border-line px-4 py-2">
            Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
              }}
            />
          </label>
          <MenuButton tone="danger" onClick={onReset}>Reset save</MenuButton>
        </div>
      </div>
    </Modal>
  );
}
