export type Penalty = "OK" | "+2" | "DNF";

export type Solve = {
  id: string;
  ms: number;
  penalty: Penalty;
  scramble: string;
  date: number;
};

export const effective = (s: Solve): number | null =>
  s.penalty === "DNF" ? null : s.ms + (s.penalty === "+2" ? 2000 : 0);

export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "DNF";
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  const pad = (n: number, l = 2) => n.toString().padStart(l, "0");
  return m > 0 ? `${m}:${pad(s)}.${pad(cs)}` : `${s}.${pad(cs)}`;
}

export function solveLabel(s: Solve): string {
  if (s.penalty === "DNF") return `DNF(${formatTime(s.ms)})`;
  return formatTime(effective(s)) + (s.penalty === "+2" ? "+" : "");
}

/** WCA average: drop best and worst, mean of the rest. */
export function average(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null;
  const window = solves.slice(0, n);
  const times = window.map(effective);
  const dnfs = times.filter((t) => t === null).length;
  if (dnfs > 1) return null;
  const valid = times.filter((t): t is number => t !== null).sort((a, b) => a - b);
  const trimmed = dnfs === 1 ? valid.slice(1) : valid.slice(1, valid.length - 1);
  if (!trimmed.length) return null;
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

export function bestWorst(solves: Solve[]) {
  const times = solves.map(effective).filter((t): t is number => t !== null);
  if (!times.length) return { best: null, worst: null, mean: null };
  return {
    best: Math.min(...times),
    worst: Math.max(...times),
    mean: times.reduce((a, b) => a + b, 0) / times.length,
  };
}
