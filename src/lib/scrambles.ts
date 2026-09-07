export type EventId =
  | "222"
  | "333"
  | "444"
  | "555"
  | "pyram"
  | "minx"
  | "skewb"
  | "sq1";

export const EVENTS: { id: EventId; name: string; short: string }[] = [
  { id: "222", name: "2x2x2", short: "2x2" },
  { id: "333", name: "3x3x3", short: "3x3" },
  { id: "444", name: "4x4x4", short: "4x4" },
  { id: "555", name: "5x5x5", short: "5x5" },
  { id: "pyram", name: "Pyraminx", short: "Pyra" },
  { id: "minx", name: "Megaminx", short: "Minx" },
  { id: "skewb", name: "Skewb", short: "Skewb" },
  { id: "sq1", name: "Square-1", short: "Sq-1" },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const randInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const AXIS: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };

function faceScramble(faces: string[], length: number, wideDepth = 0) {
  const moves: string[] = [];
  let lastAxis = -1;
  let lastFace = "";
  while (moves.length < length) {
    const face = pick(faces);
    const axis = AXIS[face] ?? -1;
    if (face === lastFace) continue;
    if (axis === lastAxis && Math.random() < 0.7) continue;
    lastAxis = axis;
    lastFace = face;
    const wide = wideDepth > 0 && Math.random() < 0.45 ? "w" : "";
    moves.push(face + wide + pick(["", "'", "2"]));
  }
  return moves.join(" ");
}

function pyraminx() {
  const moves = faceScramble(["U", "L", "R", "B"], 10).split(" ");
  const tips = ["u", "l", "r", "b"].filter(() => Math.random() < 0.6);
  return [...moves, ...tips.map((t) => t + pick(["", "'"]))].join(" ");
}

function megaminx() {
  const lines: string[] = [];
  for (let i = 0; i < 7; i++) {
    const line: string[] = [];
    for (let j = 0; j < 5; j++) line.push("R" + pick(["++", "--"]));
    for (let j = 0; j < 5; j++) line.push("D" + pick(["++", "--"]));
    line.push("U" + pick(["", "'"]));
    lines.push(line.join(" "));
  }
  return lines.join("\n");
}

function squareOne() {
  const parts: string[] = [];
  for (let i = 0; i < 12; i++) {
    parts.push(`(${randInt(-5, 6)},${randInt(-5, 6)})`);
    if (i < 11) parts.push("/");
  }
  return parts.join(" ");
}

export function generateScramble(event: EventId): string {
  switch (event) {
    case "222":
      return faceScramble(["U", "R", "F"], 11);
    case "333":
      return faceScramble(["U", "D", "L", "R", "F", "B"], 20);
    case "444":
      return faceScramble(["U", "D", "L", "R", "F", "B"], 44, 1);
    case "555":
      return faceScramble(["U", "D", "L", "R", "F", "B"], 60, 1);
    case "pyram":
      return pyraminx();
    case "minx":
      return megaminx();
    case "skewb":
      return faceScramble(["U", "L", "R", "B"], 11);
    case "sq1":
      return squareOne();
  }
}
