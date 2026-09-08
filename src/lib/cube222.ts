// Logical 2x2x2 model (corners only, DBL fixed) + Layer -> CLL solver.

type S = { cp: number[]; co: number[] };

// corners: URF0 UFL1 ULB2 UBR3 DFR4 DLF5 DBL6 DRB7 ; DBL(6) is the fixed reference.
const BASE: Record<string, S> = {
  U: { cp: [3, 0, 1, 2, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
  R: { cp: [4, 1, 2, 0, 7, 5, 6, 3], co: [2, 0, 0, 1, 1, 0, 0, 2] },
  F: { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [1, 2, 0, 0, 2, 1, 0, 0] },
};

const SOLVED: S = { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] };

const compose = (s: S, m: S): S => {
  const cp = new Array(8);
  const co = new Array(8);
  for (let i = 0; i < 8; i++) {
    const j = m.cp[i] as number;
    cp[i] = s.cp[j];
    co[i] = ((s.co[j] as number) + (m.co[i] as number)) % 3;
  }
  return { cp, co };
};

const CACHE: Record<string, S> = {};
function moveOf(name: string): S | null {
  if (CACHE[name]) return CACHE[name] as S;
  const face = name[0] as string;
  if (!BASE[face]) return null;
  const times = name.endsWith("2") ? 2 : name.endsWith("'") ? 3 : 1;
  let st = SOLVED;
  for (let i = 0; i < times; i++) st = compose(st, BASE[face] as S);
  CACHE[name] = st;
  return st;
}

export function apply222(s: S, moves: string[]): S {
  return moves.reduce((acc, m) => {
    const mv = moveOf(m);
    return mv ? compose(acc, mv) : acc;
  }, s);
}

/** 2x2 scrambles use U/R/F only after normalisation; other faces are equivalent. */
const EQUIV: Record<string, string> = { D: "U", L: "R", B: "F" };
const INVERT: Record<string, string> = { "": "'", "'": "", "2": "2" };

export function normalize222(moves: string[]): string[] {
  // D/L/B turns equal the opposite-face turn in the reverse direction (whole-cube rotation aside).
  return moves.map((m) => {
    const f = m[0] as string;
    const suffix = m.slice(1);
    if (!EQUIV[f]) return m;
    return (EQUIV[f] as string) + (INVERT[suffix] ?? suffix);
  });
}

export function state222FromMoves(moves: string[]): S {
  return apply222({ cp: [...SOLVED.cp], co: [...SOLVED.co] }, normalize222(moves));
}

const isSolved = (s: S) => s.cp.every((c, i) => c === i && s.co[i] === 0);
const layerDone = (s: S) => [4, 5, 7].every((i) => s.cp[i] === i && s.co[i] === 0);

const MOVES = ["U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2"];

function idSearch(start: S, maxDepth: number, goal: (s: S) => boolean): string[] | null {
  if (goal(start)) return [];
  const path: string[] = [];
  const dfs = (s: S, depth: number, last: string): string[] | null => {
    for (const mv of MOVES) {
      const f = mv[0] as string;
      if (f === last) continue;
      const ns = compose(s, moveOf(mv) as S);
      path.push(mv);
      if (goal(ns)) return [...path];
      if (depth > 1) {
        const r = dfs(ns, depth - 1, f);
        if (r) return r;
      }
      path.pop();
    }
    return null;
  };
  for (let d = 1; d <= maxDepth; d++) {
    const r = dfs(start, d, "");
    if (r) return r;
  }
  return null;
}

export type Stage222 = { name: string; moves: string[] };

/** Solve the bottom layer, then finish the last layer with a single CLL algorithm. */
export function solveCLL(state: S): Stage222[] | null {
  const stages: Stage222[] = [];
  let s = state;
  if (!layerDone(s)) {
    const layer = idSearch(s, 9, layerDone);
    if (!layer) return null;
    s = apply222(s, layer);
    stages.push({ name: "Layer", moves: layer });
  }
  if (!isSolved(s)) {
    const cll = idSearch(s, 11, isSolved);
    if (!cll) return null;
    s = apply222(s, cll);
    stages.push({ name: "CLL", moves: cll });
  }
  return isSolved(s) ? stages : null;
}

export function solveMoves222(history: string[]): string[] | null {
  const stages = solveCLL(state222FromMoves(history));
  return stages ? stages.flatMap((st) => st.moves) : null;
}
