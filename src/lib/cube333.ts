// Logical 3x3x3 cubie model + a staged CFOP-style solver (Cross / F2L / OLL / PLL).

export type State = {
  cp: number[]; // corner permutation (8)
  co: number[]; // corner orientation (8)
  ep: number[]; // edge permutation (12)
  eo: number[]; // edge orientation (12)
};

const Z8 = [0, 0, 0, 0, 0, 0, 0, 0];
const Z12 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

type Move = { cp: number[]; co: number[]; ep: number[]; eo: number[] };

const BASE: Record<string, Move> = {
  U: {
    cp: [3, 0, 1, 2, 4, 5, 6, 7],
    co: Z8,
    ep: [3, 0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11],
    eo: Z12,
  },
  D: {
    cp: [0, 1, 2, 3, 5, 6, 7, 4],
    co: Z8,
    ep: [0, 1, 2, 3, 5, 6, 7, 4, 8, 9, 10, 11],
    eo: Z12,
  },
  R: {
    cp: [4, 1, 2, 0, 7, 5, 6, 3],
    co: [2, 0, 0, 1, 1, 0, 0, 2],
    ep: [8, 1, 2, 3, 11, 5, 6, 7, 4, 9, 10, 0],
    eo: Z12,
  },
  L: {
    cp: [0, 2, 6, 3, 4, 1, 5, 7],
    co: [0, 1, 2, 0, 0, 2, 1, 0],
    ep: [0, 1, 10, 3, 4, 5, 9, 7, 8, 2, 6, 11],
    eo: Z12,
  },
  F: {
    cp: [1, 5, 2, 3, 0, 4, 6, 7],
    co: [1, 2, 0, 0, 2, 1, 0, 0],
    ep: [0, 9, 2, 3, 4, 8, 6, 7, 1, 5, 10, 11],
    eo: [0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
  },
  B: {
    cp: [0, 1, 3, 7, 4, 5, 2, 6],
    co: [0, 0, 1, 2, 0, 0, 2, 1],
    ep: [0, 1, 2, 11, 4, 5, 6, 10, 8, 9, 3, 7],
    eo: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
  },
};

export const SOLVED: State = {
  cp: [0, 1, 2, 3, 4, 5, 6, 7],
  co: [...Z8],
  ep: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  eo: [...Z12],
};

export const clone = (s: State): State => ({
  cp: [...s.cp],
  co: [...s.co],
  ep: [...s.ep],
  eo: [...s.eo],
});

function compose(s: State, m: Move): State {
  const cp = new Array(8);
  const co = new Array(8);
  const ep = new Array(12);
  const eo = new Array(12);
  for (let i = 0; i < 8; i++) {
    const j = m.cp[i] as number;
    cp[i] = s.cp[j];
    co[i] = ((s.co[j] as number) + (m.co[i] as number)) % 3;
  }
  for (let i = 0; i < 12; i++) {
    const j = m.ep[i] as number;
    ep[i] = s.ep[j];
    eo[i] = ((s.eo[j] as number) + (m.eo[i] as number)) % 2;
  }
  return { cp, co, ep, eo };
}

const CACHE: Record<string, Move> = {};

function moveOf(name: string): Move | null {
  if (CACHE[name]) return CACHE[name] as Move;
  const face = name[0] as string;
  if (!BASE[face]) return null;
  const times = name.endsWith("2") ? 2 : name.endsWith("'") ? 3 : 1;
  let st = SOLVED;
  for (let i = 0; i < times; i++) st = compose(st, BASE[face] as Move);
  const m: Move = { cp: st.cp, co: st.co, ep: st.ep, eo: st.eo };
  CACHE[name] = m;
  return m;
}

export function applyMove(s: State, name: string): State {
  const m = moveOf(name);
  return m ? compose(s, m) : s;
}

export function applyMoves(s: State, moves: string[]): State {
  return moves.reduce((acc, m) => applyMove(acc, m), s);
}

export function stateFromMoves(moves: string[]): State {
  return applyMoves(clone(SOLVED), moves);
}

export function isSolved(s: State): boolean {
  for (let i = 0; i < 8; i++) if (s.cp[i] !== i || s.co[i] !== 0) return false;
  for (let i = 0; i < 12; i++) if (s.ep[i] !== i || s.eo[i] !== 0) return false;
  return true;
}

const variants = (f: string) => [f, f + "'", f + "2"];
const expand = (faces: string[]) => faces.flatMap(variants);

/** Iterative-deepening search over a restricted move set. */
function idSearch(
  start: State,
  faces: string[],
  maxDepth: number,
  goal: (s: State) => boolean,
): string[] | null {
  const moves = expand(faces);
  if (goal(start)) return [];
  const path: string[] = [];
  const dfs = (s: State, depth: number, lastFace: string): string[] | null => {
    if (depth === 0) return null;
    for (const mv of moves) {
      const face = mv[0] as string;
      if (face === lastFace) continue;
      const ns = applyMove(s, mv);
      path.push(mv);
      if (goal(ns)) return [...path];
      const res = depth > 1 ? dfs(ns, depth - 1, face) : null;
      if (res) return res;
      path.pop();
    }
    return null;
  };
  for (let d = 1; d <= maxDepth; d++) {
    const res = dfs(start, d, "");
    if (res) return res;
  }
  return null;
}

const CROSS_EDGES = [4, 5, 6, 7]; // DR DF DL DB
const SLOTS = [
  { corner: 4, edge: 8, faces: ["U", "R", "F"] }, // DFR / FR
  { corner: 5, edge: 9, faces: ["U", "F", "L"] }, // DLF / FL
  { corner: 6, edge: 10, faces: ["U", "L", "B"] }, // DBL / BL
  { corner: 7, edge: 11, faces: ["U", "B", "R"] }, // DRB / BR
];

const edgeOk = (s: State, i: number) => s.ep[i] === i && s.eo[i] === 0;
const cornerOk = (s: State, i: number) => s.cp[i] === i && s.co[i] === 0;

const crossDone = (s: State) => CROSS_EDGES.every((e) => edgeOk(s, e));
const pairDone = (s: State, i: number) =>
  cornerOk(s, SLOTS[i]!.corner) && edgeOk(s, SLOTS[i]!.edge);

const inULayer = (idx: number) => idx >= 0 && idx <= 3;

/** BFS over repetitions of one algorithm with AUF between each repetition. */
function algLoop(
  s: State,
  alg: string[],
  maxReps: number,
  goal: (s: State) => boolean,
): string[] | null {
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  type Node = { st: State; seq: string[] };
  let frontier: Node[] = [{ st: s, seq: [] }];
  for (let rep = 0; rep < maxReps; rep++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const auf of aufs) {
        const seq = [...node.seq, ...auf, ...alg];
        const st = applyMoves(node.st, [...auf, ...alg]);
        for (const finalAuf of aufs) {
          if (goal(applyMoves(st, finalAuf))) return [...seq, ...finalAuf];
        }
        next.push({ st, seq });
      }
    }
    frontier = next;
  }
  return null;
}

const A = (s: string) => s.split(" ");

const EO_ALG = A("F R U R' U' F'");
const SUNE = A("R U R' U R U2 R'");
const CORNER_CYCLE = A("U R U' L' U R' U' L");
const U_PERM = A("R U' R U R U R U' R' U' R2");

const eoDone = (s: State) => [0, 1, 2, 3].every((e) => s.eo[e] === 0);
const coDone = (s: State) => [0, 1, 2, 3].every((c) => s.co[c] === 0);
const cpDone = (s: State) => {
  // corners permuted correctly up to AUF is handled by the final AUF check
  return [0, 1, 2, 3].every((c) => s.cp[c] === c);
};

export type Stage = { name: string; moves: string[] };

export function solveCFOP(scrambleState: State): Stage[] | null {
  let s = clone(scrambleState);
  const stages: Stage[] = [];
  const push = (name: string, moves: string[]) => {
    if (!moves.length) return;
    s = applyMoves(s, moves);
    const prev = stages[stages.length - 1];
    if (prev && prev.name === name) prev.moves.push(...moves);
    else stages.push({ name, moves: [...moves] });
  };

  // ---- Cross: one edge at a time, keeping the previously placed ones ----
  const placed: number[] = [];
  for (const target of CROSS_EDGES) {
    if (edgeOk(s, target)) {
      placed.push(target);
      continue;
    }
    const goal = (st: State) =>
      edgeOk(st, target) && placed.every((e) => edgeOk(st, e));
    const sol = idSearch(s, ["U", "D", "L", "R", "F", "B"], 7, goal);
    if (!sol) return null;
    push("Cross", sol);
    placed.push(target);
  }

  // ---- F2L: pair by pair ----
  for (let i = 0; i < SLOTS.length; i++) {
    if (pairDone(s, i)) continue;
    const slot = SLOTS[i] as (typeof SLOTS)[number];
    const keep = (st: State) =>
      crossDone(st) &&
      SLOTS.every((sl, j) => j >= i || (cornerOk(st, sl.corner) && edgeOk(st, sl.edge)));

    // Phase A: bring corner + edge into the U layer (if they aren't already).
    const cornerAt = (st: State) => st.cp.indexOf(slot.corner);
    const edgeAt = (st: State) => st.ep.indexOf(slot.edge);
    if (!(inULayer(cornerAt(s)) && inULayer(edgeAt(s)))) {
      const setup = idSearch(s, slot.faces, 6, (st) =>
        keep(st) && ((inULayer(cornerAt(st)) && inULayer(edgeAt(st))) || pairDone(st, i)),
      );
      if (setup) push("F2L", setup);
    }

    if (pairDone(s, i)) continue;
    // Phase B: insert the pair.
    let sol = idSearch(s, slot.faces, 9, (st) => keep(st) && pairDone(st, i));
    if (!sol) sol = idSearch(s, ["U", "D", "L", "R", "F", "B"], 8, (st) => keep(st) && pairDone(st, i));
    if (!sol) return null;
    push("F2L", sol);
  }

  // ---- OLL (2-look) ----
  if (!eoDone(s)) {
    const sol = algLoop(s, EO_ALG, 3, eoDone);
    if (!sol) return null;
    push("OLL", sol);
  }
  if (!coDone(s)) {
    const sol = algLoop(s, SUNE, 5, (st) => coDone(st) && eoDone(st));
    if (!sol) return null;
    push("OLL", sol);
  }

  // ---- PLL (2-look) ----
  if (!cpDone(s)) {
    const sol = algLoop(s, CORNER_CYCLE, 3, cpDone);
    if (!sol) return null;
    push("PLL", sol);
  }
  if (!isSolved(s)) {
    const sol = algLoop(s, U_PERM, 4, isSolved);
    if (!sol) return null;
    push("PLL", sol);
  }

  return isSolved(s) ? stages : null;
}

export function solveMoves333(moveHistory: string[]): string[] | null {
  const stages = solveCFOP(stateFromMoves(moveHistory));
  return stages ? stages.flatMap((st) => st.moves) : null;
}
