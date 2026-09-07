import { useCallback, useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/stats";

type Props = {
  onSolveComplete: (ms: number) => void;
  onStart: () => void;
  disabled?: boolean;
};

type Phase = "idle" | "holding" | "ready" | "running";

const HOLD_MS = 400;

export function CubeTimer({ onSolveComplete, onStart, disabled }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [display, setDisplay] = useState(0);
  const startAt = useRef(0);
  const holdAt = useRef(0);
  const raf = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  const tick = useCallback(() => {
    setDisplay(performance.now() - startAt.current);
    raf.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    const ms = performance.now() - startAt.current;
    setDisplay(ms);
    setPhase("idle");
    onSolveComplete(ms);
  }, [onSolveComplete]);

  const press = useCallback(() => {
    if (disabled) return;
    const p = phaseRef.current;
    if (p === "running") {
      stop();
      return;
    }
    if (p === "idle") {
      holdAt.current = performance.now();
      setDisplay(0);
      setPhase("holding");
      window.setTimeout(() => {
        if (phaseRef.current === "holding") setPhase("ready");
      }, HOLD_MS);
    }
  }, [disabled, stop]);

  const release = useCallback(() => {
    const p = phaseRef.current;
    if (p === "ready") {
      startAt.current = performance.now();
      setPhase("running");
      onStart();
      raf.current = requestAnimationFrame(tick);
    } else if (p === "holding") {
      setPhase("idle");
    }
  }, [onStart, tick]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (phaseRef.current === "running") {
        e.preventDefault();
        stop();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        press();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        release();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [press, release, stop]);

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  const color =
    phase === "ready"
      ? "text-timer-ready"
      : phase === "holding"
        ? "text-timer-hold"
        : "text-foreground";

  return (
    <div
      role="timer"
      onTouchStart={(e) => {
        e.preventDefault();
        press();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        release();
      }}
      onMouseDown={press}
      onMouseUp={release}
      className="flex select-none flex-col items-center justify-center rounded-2xl border border-border bg-card/60 px-4 py-10 touch-none"
    >
      <div
        className={`font-mono text-6xl font-bold tabular-nums transition-colors sm:text-7xl ${color}`}
      >
        {formatTime(display)}
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {phase === "running"
          ? "Press any key to stop"
          : phase === "ready"
            ? "Release to start"
            : phase === "holding"
              ? "Keep holding…"
              : "Hold space / tap & hold"}
      </p>
    </div>
  );
}
