import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CombatAction, EncounterState, SaveGame } from "../contracts.ts";
import { CHARACTERS, ENEMY_TEMPLATES } from "../content/characters.ts";
import { ability, ABILITIES } from "../content/abilities.ts";
import { DIALOGUE, ITEMS, MAPS, RUNE_ANSWER, type MapHotspot } from "../content/world.ts";
import {
  applyReward,
  clearLocal,
  deserialize,
  flag,
  freshSave,
  loadLocal,
  recruit,
  serialize,
  setFlag,
  writeLocal,
} from "../chronicle/save.ts";
import { createEncounter, proposeAction, resolveEnemyTurn, tryMercy } from "../core/combat.ts";
import { configureAudio, resumeAudio, playSfx, startMusic, unlockAudio } from "../audio.ts";
import { detectXr, requestReferenceSession, XR_BINDINGS, type XrCapability } from "../xr/adapter.ts";

type Screen = "title" | "name" | "explore" | "battle" | "ending";

type Toast = { id: number; text: string };

const TILE = 48;

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
    });
  }, [save?.settings.muted, save?.settings.masterVolume, save?.settings.reducedMotion]);

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
            startMusic(loaded.chapterComplete ? "shrine" : loaded.mapId === "map.vale" ? "vale" : "woods");
            setScreen(loaded.chapterComplete ? "ending" : loaded.encounter ? "battle" : "explore");
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
          onBegin={() => {
            const next = freshSave(name);
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
          onLeave={(next, victory) => {
            commit(next);
            if (next.chapterComplete) {
              startMusic("shrine");
              playSfx("victory");
              setScreen("ending");
            } else {
              startMusic(next.mapId === "map.vale" ? "vale" : next.mapId === "map.shrine" ? "shrine" : "woods");
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
            const next = { ...save, chapterComplete: false, mapId: "map.shrine", spawnId: "door", encounter: null };
            commit(next);
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
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
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
      <circle cx="60" cy="60" r="8" fill="#e8b15a" />
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (Math.PI * 2 * i) / 9 - Math.PI / 2;
        const x = 60 + Math.cos(a) * 40;
        const y = 60 + Math.sin(a) * 40;
        return <circle key={i} cx={x} cy={y} r={i === 0 ? 5 : 3.2} fill={i % 2 ? "#4ec8c0" : "#f3e6c8"} opacity={0.9} />;
      })}
      <circle cx="60" cy="60" r="46" fill="none" stroke="#e8b15a" strokeOpacity="0.45" />
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
          {xr?.reason ?? "Checking for a headset…"} {xrMsg ?? ""} Keyboard and mouse carry the whole chapter. Gamepad: A confirm, B back, d-pad move.
        </p>
        <p className="mt-6 text-[11px] tracking-widest text-amber/80 uppercase">9:09</p>
      </div>
    </div>
  );
}

function VillageBackdrop() {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#3a2a4a_0%,#140e18_55%,#0c0810_100%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 800 480" preserveAspectRatio="xMidYMax slice">
        <g fill="#1a120c">
          <polygon points="0,480 0,300 90,240 160,300 160,480" />
          <polygon points="150,480 150,280 250,200 340,280 340,480" />
          <polygon points="500,480 500,260 620,180 740,270 740,480" />
          <polygon points="700,480 700,310 800,250 800,480" />
        </g>
        <g fill="#e8b15a">
          <rect x="210" y="250" width="10" height="14" />
          <rect x="270" y="246" width="10" height="14" />
          <rect x="575" y="230" width="12" height="16" />
          <rect x="650" y="236" width="10" height="14" />
        </g>
        <g fill="#4ec8c0">
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx={80 + i * 80} cy={48 + (i % 3) * 10} r={i === 4 ? 2.4 : 1.4} />
          ))}
        </g>
        <rect x="360" y="150" width="70" height="200" fill="#24160f" />
        <circle cx="395" cy="188" r="28" fill="none" stroke="#e8b15a" strokeWidth="3" />
        <line x1="395" y1="188" x2="395" y2="168" stroke="#f3e6c8" strokeWidth="2" />
        <line x1="395" y1="188" x2="410" y2="196" stroke="#f3e6c8" strokeWidth="2" />
      </svg>
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
      ? "bg-amber text-ink hover:bg-amber-2"
      : tone === "danger"
        ? "bg-danger text-ink hover:opacity-90"
        : "border border-line bg-ink-2/80 text-parchment hover:border-amber";
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
  onBegin: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-5">
      <p className="text-xs tracking-[0.28em] text-teal uppercase">Before the festival</p>
      <h2 className="font-display text-4xl">What do they call you in the Vale?</h2>
      <p className="text-parchment/80">Any name. The clock will mispronounce it anyway. Sixteen letters is plenty.</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onBegin();
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
        <div className="mt-2 flex gap-3">
          <MenuButton onClick={onBegin}>Begin</MenuButton>
          <MenuButton tone="ghost" onClick={onBack}>
            Back
          </MenuButton>
        </div>
      </form>
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
  const [dialogue, setDialogue] = useState<{
    nodes: { id: string; speaker: string; text: string; choices?: { label: string; next: string; flag?: string }[]; next?: string; grant?: string }[];
    index: string;
  } | null>(null);
  const [panel, setPanel] = useState<"none" | "journal" | "party" | "bag" | "help">("none");
  const [runePick, setRunePick] = useState<string[]>(save.runeOrder);
  const [puzzle, setPuzzle] = useState<null | "runes" | "conduits">(null);
  const [conduit, setConduit] = useState(0);
  const moved = useRef(false);

  useEffect(() => {
    setPos({ x: spawn.x, y: spawn.y });
    setFacing(spawn.facing);
  }, [save.mapId, save.spawnId]);

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
      if (!save.settings.reducedMotion) playSfx("step");
    },
    [pos, map, save.settings.reducedMotion],
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
        openTalk("mira.here");
        return;
      }
      if (spot.id === "npc.kael" && flag(save, "flag.kael_joined")) {
        openTalk("kael.here");
        return;
      }
      const nodes = DIALOGUE[spot.id];
      if (!nodes) return;
      setDialogue({ nodes, index: nodes[0]!.id });
      return;
    }
    if (spot.kind === "exit") {
      const exit = map.exits.find((e) => e.id === spot.id);
      if (!exit) return;
      if (exit.requires && !flag(save, exit.requires)) {
        push(exit.requires === "flag.woods_cleared" ? "The shrine path is still a smear of light. Clear the flicker first." : "Not yet.");
        return;
      }
      if (exit.to === "map.woods" && !flag(save, "flag.mira_joined")) {
        push("Mira is still by the lanterns. The pines can wait one conversation.");
        return;
      }
      const next = writeLocal({ ...save, mapId: exit.to, spawnId: exit.spawn, encounter: null });
      commit(next);
      startMusic(exit.to === "map.vale" ? "vale" : exit.to === "map.shrine" ? "shrine" : "woods");
      return;
    }
    if (spot.kind === "item") {
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
      }
    }
  }, [save, map, commit, onBattle, push]);

  function openTalk(id: "mira.here" | "kael.here") {
    const line =
      id === "mira.here"
        ? { id, speaker: "Mira", text: "I'm with you. If the shrine starts editing our names, I want it in the book." }
        : { id, speaker: "Kael", text: "Still here. If it asks for blood, we discuss it. That part did not expire." };
    setDialogue({ nodes: [line], index: id });
  }

  function advanceDialogue(choice?: { label: string; next: string; flag?: string }) {
    if (!dialogue) return;
    let nextSave = save;
    const node = dialogue.nodes.find((n) => n.id === dialogue.index);
    if (choice?.flag) nextSave = setFlag(nextSave, choice.flag);
    const grant = node?.grant;
    if (!choice && grant) nextSave = setFlag(nextSave, grant);
    if (choice?.next === "mira.join" || grant === "flag.mira_joined" || choice?.flag === "flag.mira_joined") {
      nextSave = recruit(setFlag(nextSave, "flag.mira_joined"), "mira");
    }
    if (grant === "flag.kael_joined" || choice?.flag === "flag.kael_joined") {
      nextSave = recruit(setFlag(nextSave, "flag.kael_joined"), "kael");
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
      commit(next);
      setPuzzle(null);
      playSfx("spell");
      push("The conduits match. For a breath you see the shrine twice. Ascension is awake.");
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
      if (!p || dialogue || puzzle) return;
      if (p.buttons[12]?.pressed) tryStep(0, -1);
      if (p.buttons[13]?.pressed) tryStep(0, 1);
      if (p.buttons[14]?.pressed) tryStep(-1, 0);
      if (p.buttons[15]?.pressed) tryStep(1, 0);
    };
    const id = window.setInterval(pad, 180);
    return () => window.clearInterval(id);
  }, [tryStep, dialogue, puzzle]);

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
          <MenuButton tone="ghost" onClick={onMenu}>Settings</MenuButton>
        </div>
      </header>
      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="relative overflow-hidden rounded-md border border-line bg-ink-2">
          <MapCanvas mapId={map.id} width={map.width} height={map.height} pos={pos} facing={facing} hotspots={map.hotspots} reduced={save.settings.reducedMotion} />
          <div className="flex flex-wrap gap-2 border-t border-line p-2 lg:hidden">
            <Pad onMove={tryStep} onAct={interact} />
          </div>
        </div>
        <aside className="flex flex-col gap-3 rounded-md border border-line bg-panel p-3">
          <p className="text-sm text-parchment/80">{map.blurb}</p>
          <PartyStrip save={save} />
          <p className="text-xs text-parchment/60">Move WASD or arrows. E, Enter, or the lantern button speaks, opens, and fights. J journal, I bag, P party.</p>
          <p className="text-xs text-amber">{save.gold} gold · {save.xp} xp</p>
          {save.ascensionUnlocked && <p className="text-xs text-teal">Ascension is awake. Battles can be stepped into.</p>}
          {flag(save, "flag.temporal_sight") && (
            <p className="text-xs text-violet">Temporal Sight: a hinge-shaped seam ghosts the shrine floor. It cannot be used. Not yet.</p>
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
        <Modal title={panel === "journal" ? "Journal" : panel === "party" ? "Party" : panel === "bag" ? "Bag" : "How to walk the Vale"} onClose={() => setPanel("none")}>
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
          {panel === "party" && <PartyStrip save={save} verbose />}
          {panel === "bag" && (
            <ul className="flex flex-col gap-2 text-sm">
              {save.inventory.map((s) => (
                <li key={s.itemId}>
                  <span className="text-amber">{ITEMS[s.itemId]?.name ?? s.itemId}</span> × {s.qty}
                  <span className="block text-parchment/70">{ITEMS[s.itemId]?.blurb}</span>
                </li>
              ))}
              {save.inventory.length === 0 && <li>Empty pockets. Pim would despair.</li>}
            </ul>
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
  return false;
}

function ahead(pos: { x: number; y: number }, facing: string) {
  if (facing === "n") return { x: pos.x, y: pos.y - 1 };
  if (facing === "s") return { x: pos.x, y: pos.y + 1 };
  if (facing === "w") return { x: pos.x - 1, y: pos.y };
  return { x: pos.x + 1, y: pos.y };
}

function currentObjective(save: SaveGame): string {
  if (save.chapterComplete) return "The chapter is told. The shrine keeps its quiet.";
  if (!flag(save, "flag.clock_anomaly")) return "Walk the festival. The clock is north of the square. Nim is sketching nearby.";
  if (!flag(save, "flag.mira_joined")) return "Find Mira by the east lanterns. The woods should not be walked alone.";
  if (!flag(save, "flag.kael_joined")) return "East, into Glasspine. Kael keeps the path.";
  if (!flag(save, "flag.woods_cleared")) return "Something flickers in the pines. Meet it.";
  if (!flag(save, "flag.runes_decoded")) return "The shrine's rune wall is waiting for an order.";
  if (!flag(save, "flag.conduits_aligned")) return "Turn the conduit ring to the last rune.";
  if (save.wardenOutcome === "none") return "The Crystal Warden is awake. You may break it, or ask it to sleep.";
  return "Listen to how the shrine ends.";
}

function makeEncounter(save: SaveGame, id: "enc.festival" | "enc.woods" | "enc.warden"): EncounterState {
  const party = save.party.map((pid) => structuredClone(save.roster[pid]!)).filter(Boolean);
  const enemies =
    id === "enc.festival"
      ? [{ ...structuredClone(ENEMY_TEMPLATES.shardling), id: "shard-f", position: { x: 0, z: -1.6 } }]
      : id === "enc.woods"
        ? [
            { ...structuredClone(ENEMY_TEMPLATES.shardling), id: "shard-w", position: { x: -0.8, z: -1.6 } },
            { ...structuredClone(ENEMY_TEMPLATES.glowmoth), id: "moth-w", position: { x: 0.9, z: -1.3 } },
          ]
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
  hotspots,
  reduced,
}: {
  mapId: string;
  width: number;
  height: number;
  pos: { x: number; y: number };
  facing: string;
  hotspots: MapHotspot[];
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
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
    drawMap(ctx, mapId, width, height);
    for (const h of hotspots) {
      ctx.fillStyle = h.kind === "battle" ? "#e06a5c" : h.kind === "puzzle" ? "#8b6bb8" : h.kind === "exit" ? "#4ec8c0" : "#e8b15a";
      ctx.globalAlpha = 0.9;
      ctx.fillRect(h.x * TILE + 16, h.y * TILE + 8, 16, 22);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#140e18";
      ctx.font = "10px Source Sans 3, sans-serif";
      ctx.fillText(h.label.slice(0, 14), h.x * TILE + 2, h.y * TILE + 44);
    }
    const px = pos.x * TILE + 24;
    const py = pos.y * TILE + 28;
    ctx.fillStyle = "#f3e6c8";
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8b15a";
    const tip = facing === "n" ? [0, -16] : facing === "s" ? [0, 16] : facing === "w" ? [-16, 0] : [16, 0];
    ctx.beginPath();
    ctx.moveTo(px + tip[0], py + tip[1]);
    ctx.lineTo(px + tip[1] * 0.4, py - tip[0] * 0.4);
    ctx.lineTo(px - tip[1] * 0.4, py + tip[0] * 0.4);
    ctx.fill();
    if (!reduced) {
      ctx.strokeStyle = "rgba(232,177,90,0.25)";
      ctx.strokeRect(8, 8, cssW - 16, cssH - 16);
    }
  }, [mapId, width, height, pos, facing, hotspots, reduced]);
  return <canvas ref={ref} className="block w-full" role="img" aria-label={`${MAPS[mapId]?.name ?? "Map"}. You stand on a tile.`} />;
}

function drawMap(ctx: CanvasRenderingContext2D, mapId: string, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * TILE);
  if (mapId === "map.shrine") {
    sky.addColorStop(0, "#241830");
    sky.addColorStop(1, "#120e16");
  } else if (mapId === "map.woods") {
    sky.addColorStop(0, "#142018");
    sky.addColorStop(1, "#0c140e");
  } else {
    sky.addColorStop(0, "#2a1c28");
    sky.addColorStop(1, "#1a1214");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w * TILE, h * TILE);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (blocked(mapId, x, y)) {
        drawWall(ctx, mapId, x, y);
      } else {
        drawFloor(ctx, mapId, x, y);
      }
    }
  }
  if (mapId === "map.vale") {
    drawHouse(ctx, 3, 3, 3, 2, "#6a4030");
    drawHouse(ctx, 14, 3, 3, 2, "#4a3428");
    drawClock(ctx, 10, 2);
    // lanterns
    for (const [lx, ly] of [[6, 8], [14, 8], [8, 11], [12, 11]] as const) {
      ctx.fillStyle = "#e8b15a";
      ctx.beginPath();
      ctx.arc(lx * TILE + 8, ly * TILE + 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (mapId === "map.woods") {
    for (const [tx, ty] of [[4, 3], [6, 8], [15, 3], [17, 8], [10, 2]] as const) {
      ctx.fillStyle = "#1a2a18";
      ctx.beginPath();
      ctx.moveTo(tx * TILE + 24, ty * TILE + 4);
      ctx.lineTo(tx * TILE + 44, ty * TILE + 40);
      ctx.lineTo(tx * TILE + 4, ty * TILE + 40);
      ctx.fill();
    }
  }
  if (mapId === "map.shrine") {
    ctx.strokeStyle = "#4ec8c0";
    ctx.lineWidth = 2;
    ctx.strokeRect(6 * TILE + 6, 2 * TILE + 6, 4 * TILE - 12, 3 * TILE - 12);
    ctx.lineWidth = 1;
    ctx.fillStyle = "#8b6bb8";
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(8 * TILE + 24, 3 * TILE + 20, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, mapId: string, x: number, y: number) {
  const alt = (x + y) % 2 === 0;
  ctx.fillStyle = mapId === "map.shrine" ? (alt ? "#3a3044" : "#322838") : mapId === "map.woods" ? (alt ? "#243222" : "#1c2a1a") : alt ? "#4a3428" : "#3e2c22";
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
}

function drawWall(ctx: CanvasRenderingContext2D, mapId: string, x: number, y: number) {
  ctx.fillStyle = mapId === "map.shrine" ? "#16121c" : mapId === "map.woods" ? "#101810" : "#1a120e";
  ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  ctx.fillStyle = mapId === "map.shrine" ? "#3a3048" : "#2a2018";
  ctx.fillRect(x * TILE + 6, y * TILE + 8, TILE - 12, TILE - 16);
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roof: string) {
  ctx.fillStyle = "#3a2418";
  ctx.fillRect(x * TILE, y * TILE + 10, w * TILE, h * TILE - 10);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x * TILE - 6, y * TILE + 14);
  ctx.lineTo(x * TILE + (w * TILE) / 2, y * TILE - 8);
  ctx.lineTo((x + w) * TILE + 6, y * TILE + 14);
  ctx.fill();
  ctx.fillStyle = "#e8b15a";
  ctx.fillRect(x * TILE + 16, y * TILE + 28, 12, 16);
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#2a1c16";
  ctx.fillRect(x * TILE + 10, y * TILE, 28, 46);
  ctx.strokeStyle = "#e8b15a";
  ctx.beginPath();
  ctx.arc(x * TILE + 24, y * TILE + 16, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f3e6c8";
  ctx.fillRect(x * TILE + 23, y * TILE + 10, 2, 7);
  ctx.fillRect(x * TILE + 23, y * TILE + 15, 6, 2);
}

function Pad({ onMove, onAct }: { onMove: (x: number, y: number) => void; onAct: () => void }) {
  const b = "min-h-11 min-w-11 rounded-md border border-line bg-ink text-parchment";
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
        return (
          <li key={id} className="rounded-md bg-ink/60 p-2">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-parchment/60">{def?.title}</span>
            </div>
            <Meter label="HP" value={c.hp} max={c.maxHp} color="bg-danger" />
            <Meter label="MP" value={c.mp} max={c.maxMp} color="bg-teal" />
            {verbose && <p className="mt-1 text-xs text-parchment/70">{def?.voice}</p>}
          </li>
        );
      })}
    </ul>
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
}: {
  speaker: string;
  text: string;
  choices?: { label: string; next: string; flag?: string }[];
  onNext: () => void;
  onChoice: (c: { label: string; next: string; flag?: string }) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-2/95 p-4" role="dialog" aria-label={speaker}>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs tracking-widest text-amber uppercase">{speaker}</p>
        <p className="mt-1 text-lg">{text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {choices?.length ? (
            choices.map((c) => (
              <MenuButton key={c.label} onClick={() => onChoice(c)}>
                {c.label}
              </MenuButton>
            ))
          ) : (
            <MenuButton onClick={onNext}>Continue</MenuButton>
          )}
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
  onLeave: (s: SaveGame, victory: boolean) => void;
}) {
  const enc = save.encounter!;
  const [pick, setPick] = useState<"root" | "magic" | "item" | "target">("root");
  const [pending, setPending] = useState<{ abilityId: string; kind: CombatAction["kind"] } | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; text: string; x: number }[]>([]);
  const encRef = useRef(enc);
  const saveRef = useRef(save);
  encRef.current = enc;
  saveRef.current = save;
  const arena = useRef<HTMLCanvasElement>(null);
  const asc = useRef({ x: 0, z: 2.2, keys: new Set<string>() });
  const [ascPos, setAscPos] = useState({ x: 0, z: 2.2 });
  const enemyTimer = useRef<number | null>(null);

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
      window.setTimeout(() => onLeave(nextSave, true), 1100);
    }
    if (nextEnc.outcome === "defeat") {
      window.setTimeout(() => onLeave(nextSave, false), 1100);
    }
  }

  function doAction(action: CombatAction) {
    const current = encRef.current;
    if (current.outcome !== "ongoing") return;
    if (action.kind === "item") {
      const base = saveRef.current;
      const slot = base.inventory.find((i) => ITEMS[i.itemId]?.useAbility === action.abilityId && i.qty > 0);
      if (!slot) {
        push("That pouch is empty.");
        return;
      }
    }
    const res = proposeAction(current, action);
    if (!res.ok) {
      push(res.reason ?? "That did not hold.");
      playSfx("ui");
      return;
    }
    if (action.kind === "item") {
      const base = saveRef.current;
      const slot = base.inventory.find((i) => ITEMS[i.itemId]?.useAbility === action.abilityId);
      if (slot) slot.qty = Math.max(0, slot.qty - 1);
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
    enemyTimer.current = window.setTimeout(() => {
      if (encRef.current !== snapshot && encRef.current.tick !== snapshot.tick) return;
      const res = resolveEnemyTurn(encRef.current.phase === "enemy" ? encRef.current : snapshot);
      if (!res.ok) return;
      const last = res.state.events[res.state.events.length - 1];
      playSfx(last?.kind === "damage" ? "hurt" : "hit");
      commitEnc(res.state, last?.text);
    }, save.settings.reducedMotion ? 250 : 700);
    return () => {
      if (enemyTimer.current) window.clearTimeout(enemyTimer.current);
    };
    // commitEnc closes over latest refs; re-bind only when the turn identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enc.tick, enc.phase, enc.activeActorId, save.settings.reducedMotion]);

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
      drawArena(c, enc, asc.current, save.settings.reducedMotion);
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
            const ab = active.id === "mira" ? "spell.tide" : active.id === "kael" ? "atk.oathcut" : "spell.ember";
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

  const abilitiesFor = active ? (CHARACTERS[active.id]?.abilities ?? ["atk.strike", "act.defend"]) : [];
  const magic = abilitiesFor.filter((id) => ABILITIES[id]?.kind === "spell");
  const attacks = abilitiesFor.filter((id) => ABILITIES[id]?.kind === "attack");

  const targets =
    pending && ABILITIES[pending.abilityId]?.targeting === "one_ally"
      ? party.filter((p) => p.alive)
      : foes.filter((f) => f.alive);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-3 py-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs tracking-[0.22em] text-amber uppercase">{enc.mode === "legacy" ? "Legacy" : "Ascension"} · {enc.encounterId.replace("enc.", "")}</p>
          <h2 className="font-display text-2xl">{enc.encounterId === "enc.warden" ? "Crystal Warden" : enc.encounterId === "enc.festival" ? "Lantern crash" : "Glasspine flicker"}</h2>
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
      <div className="relative overflow-hidden rounded-md border border-line bg-ink">
        <canvas ref={arena} className="block h-[320px] w-full" />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
          {floaters.map((f) => (
            <span key={f.id} className="text-sm text-amber-2">{f.text.slice(0, 80)}</span>
          ))}
        </div>
        {enc.intents[0] && (
          <p className="absolute right-3 bottom-3 max-w-xs rounded-md bg-ink/80 px-2 py-1 text-xs text-amber">
            {enc.intents[0].telegraph}
          </p>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <PartyStrip save={{ ...save, roster: Object.fromEntries(party.map((p) => [p.id, p])), party: party.map((p) => p.id) }} />
        <div className="rounded-md border border-line bg-panel p-3">
          {enc.outcome !== "ongoing" && <p className="font-display text-xl">{enc.outcome === "mercy" ? "A pact, not a kill." : enc.outcome === "victory" ? "The light holds." : "You fall, and wake."}</p>}
          {enc.phase === "enemy" && <p className="text-amber-2">{active?.name} is moving.</p>}
          {enc.phase === "switch_lock" && <p>The two views agree with each other…</p>}
          {enc.phase === "player" && active && (
            <div className="flex flex-col gap-2">
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
                      const id = active.id === "kael" ? "atk.oathcut" : active.id === "mira" ? "spell.mend" : "spell.ember";
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
                  <MenuButton tone="ghost" onClick={() => setPick("item")}>Item</MenuButton>
                  {enc.encounterId === "enc.warden" && (
                    <MenuButton
                      tone="ghost"
                      onClick={() => {
                        const res = tryMercy(enc);
                        if (!res.ok) {
                          push(res.reason ?? "Not yet.");
                          return;
                        }
                        playSfx("heal");
                        commitEnc(res.state, "The Warden bows.");
                      }}
                    >
                      Offer mercy
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
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 640;
  const h = canvas.clientHeight || 320;
  if (canvas.width !== Math.floor(w * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = enc.mode === "ascension" ? "#120c18" : "#1a1214";
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h * 0.62;
  ctx.strokeStyle = enc.mode === "ascension" ? "rgba(78,200,192,0.45)" : "rgba(232,177,90,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.36, h * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (!reduced && enc.mode === "ascension") {
    ctx.strokeStyle = "rgba(78,200,192,0.15)";
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.12 * i, h * 0.07 * i, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const project = (x: number, z: number) => ({
    px: cx + x * (w * 0.09),
    py: cy + z * (h * 0.08),
  });
  for (const c of enc.combatants) {
    if (!c.alive && c.side === "enemy") continue;
    const pos = c.side === "party" && enc.mode === "ascension" && c.id === enc.activeActorId ? hero : c.position;
    const p = project(pos.x, c.side === "party" && enc.mode !== "ascension" ? 1.6 : pos.z);
    ctx.fillStyle = c.side === "party" ? "#f3e6c8" : c.jobId === "enemy.warden" ? "#8b6bb8" : c.jobId === "enemy.glowmoth" ? "#e8b15a" : "#4ec8c0";
    const rad = c.jobId === "enemy.warden" ? 28 : 16;
    ctx.beginPath();
    ctx.arc(p.px, p.py, rad, 0, Math.PI * 2);
    ctx.fill();
    if (c.jobId === "enemy.warden") {
      ctx.strokeStyle = c.statuses.some((s) => s.id === "exposed") ? "#e06a5c" : "#f3e6c8";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "#140e18";
    ctx.font = "12px Source Sans 3, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(c.name, p.px, p.py + rad + 14);
    ctx.fillStyle = "#e06a5c";
    ctx.fillRect(p.px - 20, p.py - rad - 10, 40 * (c.hp / c.maxHp), 4);
    if (c.id === enc.activeActorId) {
      ctx.strokeStyle = "#e8b15a";
      ctx.strokeRect(p.px - rad - 4, p.py - rad - 4, (rad + 4) * 2, (rad + 4) * 2);
    }
  }
}

function Ending({ save, onTitle, onAgain }: { save: SaveGame; onTitle: () => void; onAgain: () => void }) {
  const spared = save.wardenOutcome === "spared";
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-5 py-12">
      <p className="text-xs tracking-[0.28em] text-teal uppercase">Chapter I complete</p>
      <h2 className="font-display text-5xl">The Crystal Awakening</h2>
      <p>
        {spared
          ? `${save.playerName}, the Warden sleeps. Mira writes the pact in the margin, not the victory column. Kael puts his sword away like a person, not a gate.`
          : `${save.playerName}, the prism goes dark. The Vale will call it a victory. Mira does not argue. She only leaves a blank line where a name might have gone.`}
      </p>
      <p>
        On the shrine floor your name is still cut beside a date the village does not own. Nim's wooden door is still only a drawing. The clock in Lantern Vale is still willing to strike ten while wearing nine and nine.
      </p>
      <p className="text-amber-2">Something older than the festival is awake now. It is not finished introducing itself.</p>
      <p className="text-sm text-parchment/60">What you chose is kept: {spared ? "mercy" : "a fallen guardian"}. Gold {save.gold}. The rest of the Nine is not in this chapter, and it does not need to be, tonight.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <MenuButton onClick={onTitle}>Title</MenuButton>
        <MenuButton tone="ghost" onClick={onAgain}>Walk the shrine again</MenuButton>
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
