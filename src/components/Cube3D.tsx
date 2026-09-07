import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";

const COLORS = {
  R: "#d92b2b",
  L: "#ff8c1a",
  U: "#f5f5f5",
  D: "#f3d000",
  F: "#1fa84a",
  B: "#1a5ed9",
  inner: "#111318",
};

type MoveDef = { axis: THREE.Vector3; layer: number; comp: "x" | "y" | "z"; dir: number };

const D = 0.5;
const H = Math.PI / 2;
const STICKERS: {
  key: string;
  comp: "x" | "y" | "z";
  layer: number;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
}[] = [
  { key: "R", comp: "x", layer: 1, color: COLORS.R, position: [D, 0, 0], rotation: [0, H, 0] },
  { key: "L", comp: "x", layer: -1, color: COLORS.L, position: [-D, 0, 0], rotation: [0, -H, 0] },
  { key: "U", comp: "y", layer: 1, color: COLORS.U, position: [0, D, 0], rotation: [-H, 0, 0] },
  { key: "Dn", comp: "y", layer: -1, color: COLORS.D, position: [0, -D, 0], rotation: [H, 0, 0] },
  { key: "F", comp: "z", layer: 1, color: COLORS.F, position: [0, 0, D], rotation: [0, 0, 0] },
  { key: "B", comp: "z", layer: -1, color: COLORS.B, position: [0, 0, -D], rotation: [0, Math.PI, 0] },
];

const MOVES: Record<string, MoveDef> = {
  U: { axis: new THREE.Vector3(0, 1, 0), layer: 1, comp: "y", dir: -1 },
  D: { axis: new THREE.Vector3(0, 1, 0), layer: -1, comp: "y", dir: 1 },
  R: { axis: new THREE.Vector3(1, 0, 0), layer: 1, comp: "x", dir: -1 },
  L: { axis: new THREE.Vector3(1, 0, 0), layer: -1, comp: "x", dir: 1 },
  F: { axis: new THREE.Vector3(0, 0, 1), layer: 1, comp: "z", dir: -1 },
  B: { axis: new THREE.Vector3(0, 0, 1), layer: -1, comp: "z", dir: 1 },
};

export function parseMoves(input: string): string[] {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => m.replace("w", "").replace(/[^UDLRFB'2]/g, ""))
    .filter((m) => m.length > 0 && MOVES[m[0] as string]);
}

export function invertMoves(moves: string[]): string[] {
  return [...moves].reverse().map((m) => {
    if (m.endsWith("2")) return m;
    if (m.endsWith("'")) return m[0] as string;
    return m + "'";
  });
}

type Cubie = {
  home: THREE.Vector3;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  obj: THREE.Object3D | null;
};

export type CubeHandle = {
  queue: (moves: string[]) => void;
  reset: () => void;
  history: () => string[];
  clearHistory: () => void;
  isBusy: () => boolean;
};

const TURN_MS = 170;

function CubeMesh({ api }: { api: React.RefObject<CubeHandle | null> }) {
  const cubies = useMemo<Cubie[]>(() => {
    const list: Cubie[] = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          list.push({
            home: new THREE.Vector3(x, y, z),
            pos: new THREE.Vector3(x, y, z),
            quat: new THREE.Quaternion(),
            obj: null,
          });
        }
    return list;
  }, []);

  const queueRef = useRef<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const anim = useRef<{
    def: MoveDef;
    turns: number;
    idx: number[];
    t: number;
  } | null>(null);

  const applyTransforms = (extraIdx?: number[], q?: THREE.Quaternion) => {
    cubies.forEach((c, i) => {
      if (!c.obj) return;
      if (extraIdx && q && extraIdx.includes(i)) {
        c.obj.position.copy(c.pos.clone().applyQuaternion(q));
        c.obj.quaternion.copy(q.clone().multiply(c.quat));
      } else {
        c.obj.position.copy(c.pos);
        c.obj.quaternion.copy(c.quat);
      }
    });
  };

  useImperativeHandle(api, () => ({
    queue: (moves: string[]) => {
      queueRef.current.push(...moves);
    },
    reset: () => {
      queueRef.current = [];
      anim.current = null;
      historyRef.current = [];
      cubies.forEach((c) => {
        c.pos.copy(c.home);
        c.quat.identity();
      });
      applyTransforms();
    },
    history: () => [...historyRef.current],
    clearHistory: () => {
      historyRef.current = [];
    },
    isBusy: () => !!anim.current || queueRef.current.length > 0,
  }));

  useFrame((_, delta) => {
    if (!anim.current) {
      const next = queueRef.current.shift();
      if (!next) return;
      const def = MOVES[next[0] as string];
      if (!def) return;
      const turns = next.endsWith("2") ? 2 : 1;
      const sign = next.endsWith("'") ? -1 : 1;
      const idx: number[] = [];
      cubies.forEach((c, i) => {
        if (Math.round(c.pos[def.comp]) === def.layer) idx.push(i);
      });
      historyRef.current.push(next);
      anim.current = {
        def: { ...def, dir: def.dir * sign },
        turns,
        idx,
        t: 0,
      };
    }

    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + (delta * 1000) / (TURN_MS * a.turns));
    const eased = 1 - Math.pow(1 - a.t, 3);
    const angle = (Math.PI / 2) * a.turns * a.def.dir * eased;
    const q = new THREE.Quaternion().setFromAxisAngle(a.def.axis, angle);
    applyTransforms(a.idx, q);

    if (a.t >= 1) {
      const finalQ = new THREE.Quaternion().setFromAxisAngle(
        a.def.axis,
        (Math.PI / 2) * a.turns * a.def.dir,
      );
      a.idx.forEach((i) => {
        const c = cubies[i] as Cubie;
        c.pos.applyQuaternion(finalQ).round();
        c.quat.premultiply(finalQ);
      });
      anim.current = null;
      applyTransforms();
    }
  });

  return (
    <group>
      {cubies.map((c, i) => (
        <group
          key={i}
          ref={(o) => {
            c.obj = o;
            if (o) {
              o.position.copy(c.pos);
              o.quaternion.copy(c.quat);
            }
          }}
        >
          <RoundedBox args={[0.97, 0.97, 0.97]} radius={0.1} smoothness={3}>
            <meshStandardMaterial color={COLORS.inner} roughness={0.6} />
          </RoundedBox>
          {STICKERS.filter((s) => c.home[s.comp] === s.layer).map((s) => (
            <mesh key={s.key} position={s.position} rotation={s.rotation}>
              <planeGeometry args={[0.8, 0.8]} />
              <meshStandardMaterial color={s.color} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export const Cube3D = forwardRef<CubeHandle, { overlay?: ReactNode }>(
  function Cube3D({ overlay }, ref) {
    const inner = useRef<CubeHandle | null>(null);
    useImperativeHandle(ref, () => ({
      queue: (m) => inner.current?.queue(m),
      reset: () => inner.current?.reset(),
      history: () => inner.current?.history() ?? [],
      clearHistory: () => inner.current?.clearHistory(),
      isBusy: () => inner.current?.isBusy() ?? false,
    }));

    return (
      <div className="relative h-full w-full">
        <Canvas camera={{ position: [4.6, 4.2, 5.6], fov: 42 }} dpr={[1, 2]}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[6, 9, 6]} intensity={1.5} />
          <directionalLight position={[-6, -4, -6]} intensity={0.5} />
          <CubeMesh api={inner} />
          <OrbitControls enablePan={false} minDistance={5} maxDistance={14} />
        </Canvas>
        {overlay}
      </div>
    );
  },
);
