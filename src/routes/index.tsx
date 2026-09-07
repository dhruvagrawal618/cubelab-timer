import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Dices,
  Flag,
  RotateCcw,
  Timer as TimerIcon,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Cube3D, invertMoves, parseMoves, type CubeHandle } from "@/components/Cube3D";
import { CubeTimer } from "@/components/CubeTimer";
import {
  EVENTS,
  generateScramble,
  type EventId,
} from "@/lib/scrambles";
import {
  average,
  bestWorst,
  formatTime,
  solveLabel,
  type Penalty,
  type Solve,
} from "@/lib/stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CubeLab — 3D Rubik's Cube Simulator & WCA Speedcubing Timer" },
      {
        name: "description",
        content:
          "Practice speedcubing with an interactive 3D Rubik's cube, official WCA scrambles for 8 events, hold-to-start timer, Ao5/Ao12 stats and +2/DNF penalties.",
      },
      { property: "og:title", content: "CubeLab — 3D Cube Simulator & WCA Timer" },
      {
        property: "og:description",
        content:
          "Interactive 3D cube, WCA scrambles for 2x2 to Megaminx, and a full speedcubing timer with Ao5, Ao12 and penalties.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const KEY_MOVES: Record<string, string> = {
  u: "U",
  d: "D",
  l: "L",
  r: "R",
  f: "F",
  b: "B",
};

function Home() {
  const cube = useRef<CubeHandle>(null);
  const [event, setEvent] = useState<EventId>("333");
  const [scramble, setScramble] = useState("");
  const [sessions, setSessions] = useState<Record<string, Solve[]>>({});
  const [tab, setTab] = useState<"cube" | "timer">("timer");

  const solves = useMemo(() => sessions[event] ?? [], [sessions, event]);
  const stats = useMemo(() => bestWorst(solves), [solves]);
  const ao5 = useMemo(() => average(solves, 5), [solves]);
  const ao12 = useMemo(() => average(solves, 12), [solves]);

  const newScramble = useCallback(
    (ev: EventId) => {
      const s = generateScramble(ev);
      setScramble(s);
      const moves = parseMoves(s);
      if (moves.length) cube.current?.setScramble(moves);
      else cube.current?.reset();
    },
    [],
  );

  useEffect(() => {
    newScramble(event);
  }, [event, newScramble]);

  // Keyboard cube controls (WCA notation)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const move = KEY_MOVES[e.key.toLowerCase()];
      if (!move) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      cube.current?.queue([e.shiftKey ? move + "'" : move]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addSolve = (ms: number) => {
    const solve: Solve = {
      id: crypto.randomUUID(),
      ms,
      penalty: "OK",
      scramble,
      date: Date.now(),
    };
    setSessions((prev) => ({ ...prev, [event]: [solve, ...(prev[event] ?? [])] }));
    newScramble(event);
  };

  const patch = (id: string, penalty: Penalty) =>
    setSessions((prev) => ({
      ...prev,
      [event]: (prev[event] ?? []).map((s) =>
        s.id === id ? { ...s, penalty: s.penalty === penalty ? "OK" : penalty } : s,
      ),
    }));

  const remove = (id: string) =>
    setSessions((prev) => ({
      ...prev,
      [event]: (prev[event] ?? []).filter((s) => s.id !== id),
    }));

  const solveCube = () => {
    const hist = cube.current?.history() ?? [];
    if (!hist.length) return;
    cube.current?.queue(invertMoves(hist));
    cube.current?.clearHistory();
  };

  const cubePanel = (
    <section className="flex min-h-[420px] flex-col rounded-2xl border border-border bg-card/50 p-4 lg:h-full">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Box className="h-4 w-4 text-primary" /> Virtual Cube
        </h2>
        <span className="hidden text-xs text-muted-foreground sm:block">
          U D L R F B · Shift = prime · drag to orbit
        </span>
      </header>
      <div className="flex-1 overflow-hidden rounded-xl bg-background/60">
        <Cube3D ref={cube} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            cube.current?.reset();
            cube.current?.queue(parseMoves(generateScramble("333")));
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <Dices className="h-4 w-4" /> Scramble
        </button>
        <button
          onClick={() => cube.current?.reset()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <button
          onClick={solveCube}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          <Wand2 className="h-4 w-4" /> Solve
        </button>
      </div>
    </section>
  );

  const timerPanel = (
    <section className="flex flex-col gap-4 lg:h-full lg:overflow-y-auto">
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Scramble
          </h2>
          <button
            onClick={() => newScramble(event)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/70"
          >
            <Dices className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <p className="mt-2 whitespace-pre-line font-mono text-base leading-relaxed text-foreground">
          {scramble}
        </p>
      </div>

      <CubeTimer onSolveComplete={addSolve} onStart={() => {}} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Best", stats.best],
          ["Worst", stats.worst],
          ["Ao5", ao5],
          ["Ao12", ao12],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-xl border border-border bg-card/50 p-3 text-center"
          >
            <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
              {label as string}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-primary">
              {value === null || value === undefined ? "—" : formatTime(value as number)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Session · {solves.length} solves
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            mean {stats.mean ? formatTime(stats.mean) : "—"}
          </span>
        </div>
        {solves.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No solves yet. Hold space to start your first one.
          </p>
        ) : (
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {solves.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
              >
                <span className="w-8 text-xs text-muted-foreground">
                  {solves.length - i}.
                </span>
                <span className="flex-1 font-mono text-sm">{solveLabel(s)}</span>
                <span className="flex items-center gap-1">
                  <button
                    onClick={() => patch(s.id, "+2")}
                    className={`rounded px-1.5 py-1 text-xs font-semibold hover:bg-secondary ${s.penalty === "+2" ? "text-accent" : "text-muted-foreground"}`}
                  >
                    +2
                  </button>
                  <button
                    onClick={() => patch(s.id, "DNF")}
                    className={`rounded px-1.5 py-1 hover:bg-secondary ${s.penalty === "DNF" ? "text-destructive" : "text-muted-foreground"}`}
                    aria-label="DNF"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded px-1.5 py-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                    aria-label="Delete solve"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {solves.length > 0 && (
          <button
            onClick={() => setSessions((p) => ({ ...p, [event]: [] }))}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" /> Clear session
          </button>
        )}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            Cube<span className="text-primary">Lab</span>
          </h1>
          <div className="flex flex-wrap gap-1.5">
            {EVENTS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEvent(e.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  event === e.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {e.short}
              </button>
            ))}
          </div>
        </header>

        <div className="flex gap-1.5 rounded-xl bg-secondary/50 p-1 lg:hidden">
          {(
            [
              ["cube", "Play Cube", Box],
              ["timer", "Timer", TimerIcon],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className={tab === "cube" ? "block" : "hidden lg:block"}>{cubePanel}</div>
          <div className={tab === "timer" ? "block" : "hidden lg:block"}>{timerPanel}</div>
        </div>
      </div>
    </main>
  );
}
