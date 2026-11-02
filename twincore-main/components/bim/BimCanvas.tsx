































































































+'use client';

import { CameraControls, CameraControlsImpl, Edges } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ELEMENTS, ROOF_Y, X_AXES, Z_AXES, levelName, type Category, type Element } from '@/lib/bim';
import { useTranslations } from 'next-intl';
import { readPersistent, writePersistent } from '@/lib/persist';
import { FLOORS, FLOOR_HEIGHT_M } from '@/lib/twin';
import { HOVER, SELECT, type Batch, type Look, type Styler } from './colors';
import { SHEET, sitePlanSvg } from './sitePlan';
import { CITY_STREETS, NEIGHBOURS } from './neighbours';
import { RIVER_LEVEL, TERRAIN_GLSL, terrainHeight } from './terrain';

const { ACTION } = CameraControlsImpl;
const BG = '#0a1222'; // framed viewer
const PAGE = '#060b18'; // page background (blend mode)
const N = ELEMENTS.length;
type Solid = Exclude<Batch, 'hidden'>;
const SOLIDS: Solid[] = ['opaque', 'glass', 'ghost'];

export type Pose = { position: [number, number, number]; target: [number, number, number] };
export type ViewName = 'iso' | 'top' | 'front';
export const VIEWS: Record<ViewName, Pose> = {
  iso: { position: [112, 86, 130], target: [0, 13, 0] },
  top: { position: [0, 210, 0.1], target: [0, 0, 0] },
  front: { position: [0, 22, 170], target: [0, 18, 0] },
};

export type BimCanvasProps = {
  styler: Styler;
  styleKey: string; // change to restyle the model
  visible?: Record<Category, boolean>;
  selected?: (e: Element) => boolean;
  selectedKey?: string;
  // Elements that light up together with the hovered one (e.g. all panels of an apartment).
  hoverGroup?: (hovered: Element, e: Element) => boolean;
  pickable?: (e: Element) => boolean;
  onPick?: (e: Element | null) => void;
  onHover?: (e: Element | null) => void;
  cut?: number | null; // section plane height in metres
  markers?: Marker[]; // sensor pins on the model
  onMarker?: (id: string) => void;
  markerSel?: string | null;
  markerCard?: React.ReactNode; // callout shown beside the selected marker
  crane?: number | null; // top of the frame in floors
  craneSide?: 'east' | 'west'; // which side of the building the tower crane stands
  traffic?: boolean; // when set, draws the street and lot; true = traffic runs on the street
  cars?: boolean; // the few cars that turn in and park (true) or back out and leave (false)
  paper?: boolean; // the site plan lies on the ground (true) or fades away (false)
  siteSelect?: boolean; // site selection: the plot is scanned and marked
  smooth?: number; // camera glide time for view changes, seconds
  terrain?: boolean; // elevation around the site (river valley, hills) for the risk simulations
  water?: number | null; // flood simulation: water level in metres above the river's normal level
  plume?: { dir: number; wind: number; pollution: number } | null; // air: wind direction (deg), wind speed (m/s), emissions 0..1
  congestion?: number; // traffic simulation 0..1: slows traffic and colours the street
  labels?: boolean;
  plain?: boolean; // labels for non-engineers: no grid bubbles, "Floor 5 · 12.8 m" every few floors instead of every level code
  levelTags?: boolean; // level markers beside the building (default on)
  levelSide?: 'left' | 'right'; // which corner carries them
  maxPolar?: number; // lowest camera angle (polar angle; 0 = straight above). The hero allows looking up.
  cameraKey: string; // persistence key for the camera pose
  view?: { pose: Pose; nonce: number };
  autoRotate?: boolean;
  ghost?: { face: number; edge: number }; // opacity of planned (ghost) elements and their outlines
  sway?: boolean; // idle motion: rock gently around the start angle instead of turning all the way round
  defaultView?: Pose; // starting camera when the user hasn't moved it yet
  // Frameless hero mode: transparent background, shadow-only ground, faint context, so the model sits on the page.
  blend?: boolean;
  active: boolean; // wheel / touch navigation enabled
  running: boolean; // render loop on (false when off screen)
  onInteract?: () => void;
};

const ALL: Record<Category, boolean> = { structure: true, facade: true, mep: true };
const GHOST_FAINT = { face: 0.07, edge: 0.16 };

export default function BimCanvas(props: BimCanvasProps) {
  // Only trust a saved camera that really is a pose (two numeric triples); anything else falls back to the default.
  const raw = readPersistent<unknown>(props.cameraKey);
  const isTriple = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));
  const stored = raw && typeof raw === 'object' && isTriple((raw as Pose).position) && isTriple((raw as Pose).target) ? (raw as Pose) : undefined;
  const saved = stored ?? props.defaultView ?? VIEWS.iso;
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const card = useRef<HTMLDivElement>(null);
  const tp = useTranslations('bim.plainLevel');
  const plainText = (l: Label) =>
    l.level == null ? l.text : `${l.level >= FLOORS ? tp('roof') : tp('floor', { n: l.level + 1 })} · ${+(l.level * FLOOR_HEIGHT_M).toFixed(1)} ${tp('m')}`;
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.5]}
        frameloop={props.running ? 'always' : 'never'}
        camera={{ fov: 30, near: 1.5, far: 1200, position: saved.position }}
        gl={{ antialias: true, alpha: !!props.blend }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        onPointerMissed={(e) => e.type === 'click' && props.onPick?.(null)}
      >
        {!props.blend && <color attach="background" args={[BG]} />}
        <fog attach="fog" args={props.blend ? [PAGE, 240, 560] : [BG, 320, 760]} />
        <hemisphereLight args={['#f2f6ff', '#3a2c2a', 1.1]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[70, 110, 55]}
          intensity={2.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-55}
          shadow-camera-right={55}
          shadow-camera-top={55}
          shadow-camera-bottom={-55}
          shadow-camera-near={20}
          shadow-camera-far={320}
          shadow-bias={-0.0002}
          shadow-normalBias={0.06}
        />
        <Site blend={!!props.blend} terrain={!!props.terrain} />
        <Model {...props} />
        {props.labels && <LabelProjector spans={spans} levelTags={props.levelTags ?? true} levelSide={props.levelSide ?? 'right'} plain={!!props.plain} />}
        <Crane top={props.crane == null ? null : props.crane * FLOOR_HEIGHT_M} side={props.craneSide} />
        {props.traffic !== undefined && <Parking traffic={props.traffic} cars={!!props.cars} congestion={props.congestion ?? 0} />}
        {props.water != null && <Water level={props.water} />}
        {props.plume && <AirSim dir={props.plume.dir} wind={props.plume.wind} pollution={props.plume.pollution} />}
        {props.paper !== undefined && <Paper show={props.paper} />}
        {props.siteSelect !== undefined && <SiteSelect on={props.siteSelect} />}
        {props.markers && <Markers list={props.markers} onPick={props.onMarker} sel={props.markerSel ?? null} />}
        {props.markers && props.markerCard && <CardProjector card={card} pos={props.markers.find((m) => m.id === props.markerSel)?.pos ?? null} />}
        <Controls {...props} initial={saved} fit={!stored} />
      </Canvas>
      {props.labels && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {LABELS.map((l, i) => (
            <span
              key={l.key}
              ref={(el) => void (spans.current[i] = el)}
              className={`absolute top-0 left-0 will-change-transform ${l.kind === 'bubble' ? bubble : l.side === 'left' ? levelLeft : level}`}
              style={{ transform: 'translate(-9999px, 0)' }}
            >
              {props.plain ? plainText(l) : l.text}
            </span>
          ))}
        </div>
      )}
      {props.markerCard && props.markerSel && (
        <div ref={card} className="pointer-events-none absolute top-0 left-0 z-10 will-change-transform" style={{ transform: 'translate(-9999px, 0)' }}>
          <div key={props.markerSel} className="animate-pop pointer-events-auto">
            {props.markerCard}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------

function Model({ styler, styleKey, visible = ALL, selected, selectedKey, hoverGroup, pickable, onPick, onHover, cut, ghost = GHOST_FAINT }: BimCanvasProps) {
  const [hover, setHover] = useState<number | null>(null);
  const slots = useRef<Record<Solid, Element[]>>({ opaque: [], glass: [], ghost: [] });
  const looks = useRef<Look[]>([]);
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);

  const { meshes, materials, edges } = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // Faces are pushed back slightly so their outlines don't z-fight with them while the camera moves.
    const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const materials = {
      opaque: new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02, ...offset }),
      // Glass writes depth: instanced panels can't be depth-sorted, and unsorted see-through glass shimmers.
      glass: new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.86, ...offset }),
      ghost: new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.07, depthWrite: false, ...offset }),
      edge: new THREE.LineBasicMaterial({ color: '#0b1120', transparent: true, opacity: 0.6 }),
      mullion: new THREE.LineBasicMaterial({ color: '#2a3550', transparent: true, opacity: 0.95 }),
      ghostEdge: new THREE.LineBasicMaterial({ color: '#8ea6cc', transparent: true, opacity: 0.16, depthWrite: false }),
    };
    const make = (b: Solid) => {
      const m = new THREE.InstancedMesh(geo, materials[b], N);
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
      m.count = 0;
      m.frustumCulled = false;
      m.castShadow = b === 'opaque';
      m.receiveShadow = b !== 'ghost';
      if (b === 'ghost') m.raycast = () => {};
      return m;
    };
    const line = (mat: THREE.LineBasicMaterial) => {
      const l = new THREE.LineSegments(new THREE.BufferGeometry(), mat);
      l.frustumCulled = false;
      l.raycast = () => {};
      return l;
    };
    return {
      materials,
      meshes: { opaque: make('opaque'), glass: make('glass'), ghost: make('ghost') },
      edges: { opaque: line(materials.edge), glass: line(materials.mullion), ghost: line(materials.ghostEdge) },
    };
  }, []);

  // How strongly "not built / planned" elements show: faint in 4D, a clear wireframe for a plan view.
  useEffect(() => {
    materials.ghost.opacity = ghost.face;
    materials.ghostEdge.opacity = ghost.edge;
  }, [ghost.face, ghost.edge, materials]);

  // Section plane on every material.
  useEffect(() => {
    clip.constant = cut ?? 0;
    for (const m of Object.values(materials)) {
      const want = cut == null ? 0 : 1;
      if ((m.clippingPlanes?.length ?? 0) !== want) {
        m.clippingPlanes = want ? [clip] : [];
        m.needsUpdate = true;
      }
    }
  }, [cut, clip, materials]);

  // Assign elements to batches, place instances and rebuild the outline geometry.
  useLayoutEffect(() => {
    const s: Record<Solid, Element[]> = { opaque: [], glass: [], ghost: [] };
    looks.current = ELEMENTS.map((e) => {
      const look: Look = visible[e.category] ? styler(e) : { batch: 'hidden', color: '' };
      if (look.batch !== 'hidden') s[look.batch].push(e);
      return look;
    });
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (const b of SOLIDS) {
      const mesh = meshes[b];
      s[b].forEach((e, i) => mesh.setMatrixAt(i, m.compose(p.set(...e.pos), q, sc.set(...e.size))));
      mesh.count = s[b].length;
      mesh.instanceMatrix.needsUpdate = true;
      edges[b].geometry.setAttribute('position', new THREE.BufferAttribute(boxEdges(s[b]), 3));
    }
    slots.current = s;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- styleKey identifies the styler
  }, [styleKey, visible.structure, visible.facade, visible.mep, meshes, edges]);

  // Colours: base look, then hover group, then selection.
  useLayoutEffect(() => {
    const c = new THREE.Color();
    const hovered = hover == null ? null : ELEMENTS[hover];
    for (const b of SOLIDS) {
      const mesh = meshes[b];
      slots.current[b].forEach((e, i) => {
        let col = looks.current[e.index].color;
        if (b !== 'ghost') {
          if (selected?.(e)) col = SELECT;
          else if (hovered && (hoverGroup ? hoverGroup(hovered, e) : hovered === e)) col = HOVER;
        }
        mesh.setColorAt(i, c.set(col));
      });
      mesh.instanceColor!.needsUpdate = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey, selectedKey, hover, visible.structure, visible.facade, visible.mep, meshes]);

  const clipped = (e: Element) => cut != null && e.pos[1] - e.size[1] / 2 > cut;
  const hit = (b: Solid, ev: ThreeEvent<PointerEvent | MouseEvent>) => {
    const e = slots.current[b][ev.instanceId ?? -1];
    if (!e || clipped(e) || (pickable && !pickable(e))) return null;
    ev.stopPropagation();
    return e;
  };
  const events = (b: Solid) =>
    b === 'ghost'
      ? {}
      : {
          onPointerMove: (ev: ThreeEvent<PointerEvent>) => {
            const e = hit(b, ev);
            if (e && e.index !== hover) {
              setHover(e.index);
              onHover?.(e);
              document.body.style.cursor = 'pointer';
            }
          },
          onPointerOut: () => {
            setHover(null);
            onHover?.(null);
            document.body.style.cursor = '';
          },
          onClick: (ev: ThreeEvent<MouseEvent>) => {
            if (ev.delta > 5) return; // that was an orbit drag
            const e = hit(b, ev);
            if (e) onPick?.(e);
          },
        };

  return (
    <group>
      {SOLIDS.map((b) => (
        <primitive key={b} object={meshes[b]} {...events(b)} />
      ))}
      {SOLIDS.map((b) => (
        <primitive key={`e-${b}`} object={edges[b]} />
      ))}
    </group>
  );
}

// 12 edges per box as line-segment pairs.
function boxEdges(list: Element[]) {
  const out = new Float32Array(list.length * 72);
  let o = 0;
  for (const e of list) {
    const [x, y, z] = e.pos;
    const [w, h, d] = e.size.map((v) => v / 2);
    const c = [
      [x - w, y - h, z - d],
      [x + w, y - h, z - d],
      [x + w, y - h, z + d],
      [x - w, y - h, z + d],
      [x - w, y + h, z - d],
      [x + w, y + h, z - d],
      [x + w, y + h, z + d],
      [x - w, y + h, z + d],
    ];
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ]) {
      out.set(c[a], o);
      out.set(c[b], o + 3);
      o += 6;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------

// Background buildings: lower and darker than the subject, but each with windows, a few lit, and a front door.
const rand = (n: number) => {
  const x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

// Paints one façade: wall, floor lines, a window per bay and floor (about one in seven lit), and optionally a door
// with a small canopy at street level. Returns the colour map and a glow map holding only the lit windows.
// Façades of the same size share textures (a handful of window patterns each), so a whole city stays light.
const FACADE_CACHE = new Map<string, { map: THREE.Texture; glow: THREE.Texture }>();
function facadeTextures(widthM: number, heightM: number, seed: number, door: boolean) {
  const bays = Math.max(2, Math.round(widthM / 3.6));
  const floors = Math.max(2, Math.round(heightM / 3.2));
  const key = `${bays}x${floors}:${seed % 4}:${door}`;
  const hit = FACADE_CACHE.get(key);
  if (hit) return hit;
  const made = paintFacade(bays, floors, seed % 4, door);
  FACADE_CACHE.set(key, made);
  return made;
}

function paintFacade(bays: number, floors: number, seed: number, door: boolean) {
  const cell = 16;
  const make = () => {
    const cv = document.createElement('canvas');
    cv.width = bays * cell;
    cv.height = floors * cell;
    return cv;
  };
  const base = make();
  const glow = make();
  const g = base.getContext('2d')!;
  const e = glow.getContext('2d')!;
  g.fillStyle = '#16233d';
  g.fillRect(0, 0, base.width, base.height);
  e.fillStyle = '#000';
  e.fillRect(0, 0, glow.width, glow.height);
  g.fillStyle = '#1b2840';
  for (let f = 1; f < floors; f++) g.fillRect(0, f * cell - 1, base.width, 2);
  const doorBay = Math.floor(bays / 2);
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const x = b * cell;
      const y = f * cell;
      const street = f === floors - 1; // canvas top is the roof, the last row is the ground floor
      if (door && street && b === doorBay) {
        g.fillStyle = '#334155';
        g.fillRect(x + 1, y + 2, cell - 2, 2); // canopy
        g.fillStyle = '#0b1324';
        g.fillRect(x + 4, y + 4, cell - 8, cell - 4); // door
        e.fillStyle = '#1e3a8a';
        e.fillRect(x + 4, y + 4, cell - 8, cell - 4); // light from the lobby
        continue;
      }
      const lit = rand(seed * 131 + f * 17 + b) < 0.09;
      g.fillStyle = lit ? '#4f6ea3' : '#101b31';
      g.fillRect(x + 4, y + 5, cell - 8, cell - 8);
      if (lit) {
        e.fillStyle = '#2f4f86';
        e.fillRect(x + 4, y + 5, cell - 8, cell - 8);
      }
    }
  }
  const tex = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: tex(base, true), glow: tex(glow, true) };
}

function Neighbour({ x, z, w, h, d, seed, blend, terrain }: { x: number; z: number; w: number; h: number; d: number; seed: number; blend: boolean; terrain: boolean }) {
  // on sloping ground the building is founded at the lowest corner, so it never floats
  const base = terrain ? Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => terrainHeight(x + (a * w) / 2, z + (b * d) / 2))) - 0.3 : 0;
  const materials = useMemo(() => {
    const front = facadeTextures(w, h, seed, true);
    const side = facadeTextures(d, h, seed + 7, false);
    const back = facadeTextures(w, h, seed + 13, false);
    // Muted further on the front page so the subject stays the brightest thing in the scene.
    const tint = blend ? '#9c918e' : '#b8adaa';
    const wall = (t: { map: THREE.Texture; glow: THREE.Texture }) =>
      new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.glow, emissive: '#ffffff', emissiveIntensity: blend ? 0.3 : 0.4, color: tint, roughness: 0.95 });
    const roof = new THREE.MeshStandardMaterial({ color: '#18243b', roughness: 1 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return [wall(side), wall(side), roof, roof, wall(front), wall(back)];
  }, [w, h, d, seed, blend]);

  // the textures are shared (see facadeTextures), so only the materials go
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  return (
    <mesh position={[x, base + h / 2, z]} material={materials} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <Edges color={blend ? '#3f3331' : '#334155'} />
    </mesh>
  );
}

// The street grid of the city: darker carriageways with a faint centre line (the main street in front of the
// site is drawn with the parking and traffic).
function CityStreets({ blend }: { blend: boolean }) {
  const { x, z, width, radius } = CITY_STREETS;
  const r = radius + 40;
  const road = blend ? '#0b1427' : '#0d1729';
  return (
    <group position-y={0.012}>
      {x.map((sx) => (
        <mesh key={`x${sx}`} position={[sx, 0, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[width, 2 * r]} />
          <meshStandardMaterial color={road} roughness={1} />
        </mesh>
      ))}
      {z
        .filter((sz) => sz !== 35)
        .map((sz) => (
          <mesh key={`z${sz}`} position={[0, 0.002, sz]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[2 * r, width]} />
            <meshStandardMaterial color={road} roughness={1} />
          </mesh>
        ))}
    </group>
  );
}

function Site({ blend, terrain }: { blend: boolean; terrain: boolean }) {
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (const a of X_AXES) pts.push(a.x, 0.03, -23, a.x, 0.03, 23);
    for (const a of Z_AXES) pts.push(-23, 0.03, a.z, 23, 0.03, a.z);
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(g, new THREE.LineDashedMaterial({ color: '#8ea6cc', dashSize: 2.2, gapSize: 0.8, transparent: true, opacity: 0.55 }));
    l.computeLineDistances();
    return l;
  }, []);
  const boundary = useMemo(() => {
    const w = 40;
    const d = 30;
    const g = new THREE.BufferGeometry().setFromPoints(
      [
        [-w, -d],
        [w, -d],
        [w, d],
        [-w, d],
        [-w, -d],
      ].map(([x, z]) => new THREE.Vector3(x, 0.04, z)),
    );
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#3b82f6', dashSize: 1.2, gapSize: 1, transparent: true, opacity: 0.7 }));
    l.computeLineDistances();
    return l;
  }, []);

  return (
    <group>
      {blend ? (
        // Only the shadow lands on the page; no ground colour to clash with the background.
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[900, 900]} />
          <shadowMaterial opacity={0.42} />
        </mesh>
      ) : (
        <>
          {terrain ? (
            <Terrain />
          ) : (
            <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
              <planeGeometry args={[900, 900]} />
              <meshStandardMaterial color="#0f1a2e" roughness={1} />
            </mesh>
          )}
          <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
            <planeGeometry args={[80, 60]} />
            <meshStandardMaterial color="#16233d" roughness={1} />
          </mesh>
        </>
      )}
      <primitive object={grid} />
      <primitive object={boundary} />
      {!terrain && <CityStreets blend={blend} />}
      {NEIGHBOURS.map(([x, z, w, h, d], i) => (
        <Neighbour key={i} x={x} z={z} w={w} h={h} d={d} seed={i + 1} blend={blend} terrain={terrain} />
      ))}
    </group>
  );
}

const bubble = 'grid h-6 w-6 place-items-center rounded-full border border-[#8ea6cc] bg-[#0a1222]/80 text-[11px] font-medium text-[#eaf1ff]';
const level = 'border-b border-[#8ea6cc]/60 pl-1 text-[10px] whitespace-nowrap text-[#8ea6cc] tabular-nums';
const levelLeft = 'border-b border-[#8ea6cc]/60 pr-1 text-[10px] whitespace-nowrap text-[#8ea6cc] tabular-nums';

// Grid bubbles and level tags, drawn as plain DOM over the canvas and moved every frame.
// Level tags exist on two corners; the viewer shows the side that suits its layout.
type Side = 'left' | 'right';
type Label = { key: string; pos: [number, number, number]; text: string; kind: 'bubble' | 'level'; side?: Side; level?: number };
// in plain mode only every fourth floor and the roof carry a tag, so each one has room to say what it is
const plainShows = (l: Label, every = 4) => l.kind === 'level' && l.level != null && (l.level % every === 0 || l.level >= FLOORS);
const levelTag = (l: number, side: Side): Label => ({
  key: `l${side}${l}`,
  // right: north-east corner, left: south-west corner (as seen from the south-east)
  pos: side === 'right' ? [21, l * FLOOR_HEIGHT_M, -20] : [-21, l * FLOOR_HEIGHT_M, 20],
  text: `${levelName(l)} +${(l * FLOOR_HEIGHT_M).toFixed(2)}`,
  kind: 'level',
  side,
  level: l,
});
const LABELS: Label[] = [
  ...X_AXES.map((a): Label => ({ key: `x${a.name}`, pos: [a.x, 0.1, 25], text: a.name, kind: 'bubble' })),
  ...Z_AXES.map((a): Label => ({ key: `z${a.name}`, pos: [25, 0.1, a.z], text: a.name, kind: 'bubble' })),
  ...Array.from({ length: FLOORS + 1 }, (_, l) => levelTag(l, 'right')),
  ...Array.from({ length: FLOORS + 1 }, (_, l) => levelTag(l, 'left')),
];

// Keeps the marker callout beside its marker as the camera moves, inside the view.
function CardProjector({ card, pos }: { card: React.RefObject<HTMLDivElement | null>; pos: [number, number, number] | null }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const el = card.current;
    if (!el) return;
    if (pos) v.set(pos[0], pos[1], pos[2]).project(camera);
    if (!pos || v.z > 1) {
      el.style.transform = 'translate(-9999px, 0)';
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const px = (v.x * 0.5 + 0.5) * size.width;
    const py = (-v.y * 0.5 + 0.5) * size.height;
    // beside the marker — to the right when it fits, otherwise to the left — vertically centred on it
    const x = px + 28 + w < size.width - 8 ? px + 28 : Math.max(8, px - 28 - w);
    const y = Math.min(size.height - h - 8, Math.max(8, py - h / 2));
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  });
  return null;
}

function LabelProjector({ spans, levelTags, levelSide, plain }: { spans: React.RefObject<(HTMLSpanElement | null)[]>; levelTags: boolean; levelSide: Side; plain: boolean }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const widths = useRef<number[]>([]); // measured once per label (the text only changes with the language)
  useFrame(({ camera, size }) => {
    LABELS.forEach((l, i) => {
      const el = spans.current[i];
      if (!el) return;
      v.set(...l.pos).project(camera);
      // Level tags crowd small viewports; keep only the grid bubbles there (the few plain tags still fit).
      if (v.z > 1 || (plain && !plainShows(l, size.width < 480 ? 8 : 4)) || (l.kind === 'level' && (!levelTags || l.side !== levelSide || (size.width < 600 && !plain)))) {
        el.style.transform = 'translate(-9999px, 0)';
        return;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      // a level tag that would run past the edge of the frame is left out (on a phone the model fills the frame, and a
      // tag moved onto the building would only cover it)
      const ew = widths.current[i] || (widths.current[i] = el.offsetWidth);
      if (l.kind === 'level' && (l.side === 'left' ? x - ew < 4 : x + ew > size.width - 4)) {
        el.style.transform = 'translate(-9999px, 0)';
        return;
      }
      const ax = l.kind === 'bubble' ? '-50%' : l.side === 'left' ? '-100%' : '0%';
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${ax}, -50%)`;
    });
  });
  return null;
}

// Street and parking along the front of the plot. Once the building is finished there is traffic on the street;
// during operation five cars turn in, run along the aisle and nose into bays well apart from one another, and
// back out and leave when that stage is over.
const AISLE_Z = 28;
const BAY_Z = 23;
const STREET_Z = 35;
const LANE_EAST = 33.3; // eastbound lane (nearer the plot)
const LANE_WEST = 36.7; // westbound lane
const BAYS = [...Array.from({ length: 11 }, (_, i) => -36 + i * 2.75), ...Array.from({ length: 11 }, (_, i) => 8.5 + i * 2.75)];
const CAR_BAYS = [1, 6, 10, 14, 19]; // five cars, never in neighbouring bays
const CAR_COLORS = ['#d6cfc9', '#9fbcc8', '#60a5fa', '#7d7672', '#8ea6cc'];
// A pool of through-traffic cars, alternating lanes. How many are in use depends on the traffic density.
const TRAFFIC_COLORS = ['#c2bbb4', '#334155', '#9fbcc8', '#d6cfc9', '#334155', '#8f8681', '#d9604e', '#aab3ba', '#7d7672', '#e6dccb'];
const TRAFFIC = Array.from({ length: 44 }, (_, i) => ({
  lane: i % 2 ? LANE_WEST : LANE_EAST,
  speed: 24 + ((i * 7) % 9), // m/s in scene terms: brisk city traffic
  color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
}));
// Cars in use for a density 0..1 (0 = the everyday street on the front page).
const carsFor = (density: number) => (density > 0 ? Math.round(4 + density ** 0.8 * (TRAFFIC.length - 4)) : 6);
const TGAP = 5.2; // bumper-to-bumper distance through traffic keeps (centre to centre, car is 4.4 m)
const ROAD_FROM = -150;
const ROAD_TO = 170;
const LOT_GATE_X = 42;

type Path = { pts: [number, number][]; len: number[]; total: number };
const makePath = (pts: [number, number][]): Path => {
  const len = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  return { pts, len, total: len.reduce((a, b) => a + b, 0) };
};
const IN_FROM = -50; // where the parking cars appear on the near lane (west, so they never cross the far lane)
const OUT_TO = 140;
// In: along the near lane, right turn through the gate, along the aisle, nose into the bay.
const inPath = (bayX: number) =>
  makePath([
    [IN_FROM, LANE_EAST],
    [LOT_GATE_X, LANE_EAST],
    [LOT_GATE_X, AISLE_Z],
    [bayX, AISLE_Z],
    [bayX, BAY_Z],
  ]);
// Out: reverse out of the bay, drive to the gate, wait for a gap, right turn onto the near lane, away east.
const outPath = (bayX: number) =>
  makePath([
    [bayX, BAY_Z],
    [bayX, AISLE_Z],
    [LOT_GATE_X, AISLE_Z],
    [LOT_GATE_X, LANE_EAST],
    [OUT_TO, LANE_EAST],
  ]);

function at(path: Path, d: number) {
  let rest = d;
  for (let i = 0; i < path.len.length; i++) {
    if (rest <= path.len[i] || i === path.len.length - 1) {
      const [x0, z0] = path.pts[i];
      const [x1, z1] = path.pts[i + 1];
      const k = path.len[i] ? Math.min(1, rest / path.len[i]) : 0;
      return { x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, yaw: Math.atan2(-(z1 - z0), x1 - x0), seg: i, segLeft: path.len[i] - rest };
    }
    rest -= path.len[i];
  }
  return { x: 0, z: 0, yaw: 0, seg: 0, segLeft: 0 };
}
// Distance along a path at the start of segment i.
const segStart = (p: Path, i: number) => p.len.slice(0, i).reduce((a, b) => a + b, 0);

// A small saloon: body, glasshouse, round wheels, head- and tail-lights. Facing +x.
const WHEEL = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14).rotateX(Math.PI / 2);
function Car({ color, refFn }: { color: string; refFn: (g: THREE.Group | null) => void }) {
  return (
    <group ref={refFn} visible={false}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[4.4, 0.6, 1.8]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[-0.2, 1.08, 0]} castShadow>
        <boxGeometry args={[2.2, 0.5, 1.62]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[-0.2, 1.1, 0]}>
        <boxGeometry args={[2.24, 0.36, 1.66]} />
        <meshStandardMaterial color="#1f2a2e" roughness={0.1} metalness={0.6} />
      </mesh>
      {[-1.35, 1.35].map((x) =>
        [-0.82, 0.82].map((z) => <mesh key={`${x}${z}`} geometry={WHEEL} position={[x, 0.36, z]} material-color="#141010" />),
      )}
      <mesh position={[2.21, 0.62, 0]}>
        <boxGeometry args={[0.04, 0.16, 1.4]} />
        <meshBasicMaterial color="#eef4ff" />
      </mesh>
      <mesh position={[-2.21, 0.66, 0]}>
        <boxGeometry args={[0.04, 0.14, 1.5]} />
        <meshBasicMaterial color="#d9442f" />
      </mesh>
    </group>
  );
}

type LotCar = { mode: 'idle' | 'in' | 'parked' | 'out'; d: number; startAt: number };
const LANE_SPEED = 20; // m/s for lot cars while on the street
const LOT_SPEED = 13; // m/s inside the lot
const GAP = 7; // metres to keep to the vehicle in front

function Parking({ traffic, cars, congestion }: { traffic: boolean; cars: boolean; congestion: number }) {
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const ins = useMemo(() => CAR_BAYS.map((b) => inPath(BAYS[b])), []);
  const outs = useMemo(() => CAR_BAYS.map((b) => outPath(BAYS[b])), []);
  const parked = useRef<(THREE.Group | null)[]>([]);
  const moving = useRef<(THREE.Group | null)[]>([]);
  const barrier = useRef<THREE.Group>(null);
  const st = useRef({
    lot: CAR_BAYS.map((): LotCar => ({ mode: 'idle', d: 0, startAt: Infinity })),
    carsOn: false,
    trafficOn: false,
    traffic: TRAFFIC.map(() => ({ x: 0, alive: false, spawnAt: Infinity })),
    arm: 0,
  });

  const lines = useMemo(() => {
    const p: number[] = [];
    // parking bay separators, both rows
    for (const x0 of [BAYS[0], BAYS[11]])
      for (let i = 0; i <= 11; i++) {
        const x = x0 - 1.375 + i * 2.75;
        p.push(x, 0.03, BAY_Z - 2.6, x, 0.03, BAY_Z + 2.4);
      }
    // road edge lines, broken where the driveway joins
    for (const z of [31.75, 38.25]) {
      if (z < 35) {
        p.push(ROAD_FROM, 0.03, z, LOT_GATE_X - 3, 0.03, z, LOT_GATE_X + 3, 0.03, z, ROAD_TO, 0.03, z);
      } else p.push(ROAD_FROM, 0.03, z, ROAD_TO, 0.03, z);
    }
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#8ea6cc', transparent: true, opacity: 0.5 }));
  }, []);
  const centre = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ROAD_FROM, 0.03, STREET_Z), new THREE.Vector3(ROAD_TO, 0.03, STREET_Z)]);
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#e2ebfb', dashSize: 3, gapSize: 3, transparent: true, opacity: 0.6 }));
    l.computeLineDistances();
    return l;
  }, []);
  const lamps = useMemo(() => Array.from({ length: 12 }, (_, i) => -110 + i * 22), []);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.25); // a dropped frame shouldn't teleport anyone
    const s = st.current;
    const now = clock.elapsedTime;
    if (s.carsOn !== cars) {
      s.carsOn = cars;
      if (cars) s.lot.forEach((c, i) => c.mode === 'idle' && (c.startAt = now + 0.2 + i * 1.0));
    }
    if (s.trafficOn !== traffic) {
      s.trafficOn = traffic;
      if (traffic) s.traffic.forEach((c, i) => !c.alive && (c.spawnAt = now + i * 0.9));
      else {
        // The street goes quiet (the cycle starts over): clear every car at once, so the next run starts fresh.
        s.traffic.forEach((c) => {
          c.alive = false;
          c.spawnAt = Infinity;
        });
        s.lot.forEach((c) => {
          c.mode = 'idle';
          c.d = 0;
          c.startAt = Infinity;
        });
        s.carsOn = false;
      }
    }

    // Everything currently on each lane, by x — used for keeping distance. East = near lane (x increasing),
    // west = far lane (x decreasing). Lot cars only ever use the near lane.
    const near: { x: number; who: string }[] = [];
    const far: { x: number; who: string }[] = [];
    TRAFFIC.forEach((c, i) => s.traffic[i].alive && (c.lane === LANE_EAST ? near : far).push({ x: s.traffic[i].x, who: `t${i}` }));
    s.lot.forEach((c, i) => {
      if (c.mode === 'in') {
        const q = at(ins[i], c.d);
        if (q.seg === 0) near.push({ x: q.x, who: `l${i}` });
      } else if (c.mode === 'out') {
        const q = at(outs[i], c.d);
        if (q.seg === 4 || (q.seg === 3 && q.segLeft < 2)) near.push({ x: q.x, who: `l${i}` });
      }
    });
    // gap to the vehicle ahead in the direction of travel
    const gapAhead = (x: number, who: string, east = true) =>
      (east ? near : far).reduce((g, v) => {
        const d = east ? v.x - x : x - v.x;
        return v.who !== who && d > 0 && d < g ? d : g;
      }, Infinity);
    // 0 = stop, 1 = free road: brake smoothly from GAP + 10 m down to GAP
    const follow = (x: number, who: string, east = true, gap = GAP) => Math.min(1, Math.max(0, (gapAhead(x, who, east) - gap) / 8));
    const laneClear = (x0: number, x1: number, who: string, east = true) => !(east ? near : far).some((v) => v.who !== who && v.x > x0 && v.x < x1);

    // The parking cars
    s.lot.forEach((c, i) => {
      const pin = ins[i];
      const pout = outs[i];
      if (still) {
        c.mode = cars ? 'parked' : 'idle';
      } else if (c.mode === 'idle') {
        // wait for a clear stretch of lane before appearing
        if (cars && now >= c.startAt && laneClear(IN_FROM - 12, IN_FROM + 14, `l${i}`)) {
          c.mode = 'in';
          c.d = 0;
        }
      } else if (c.mode === 'in') {
        const q = at(pin, c.d);
        // slow for the turn at the gate, then along the aisle, easing into the bay
        const v = q.seg === 0 ? LANE_SPEED * follow(q.x, `l${i}`) * Math.min(1, 0.35 + q.segLeft / 15) : LOT_SPEED * Math.min(1, 0.3 + (pin.total - c.d) / 5);
        c.d = Math.min(pin.total, c.d + v * dt);
        if (c.d >= pin.total) c.mode = 'parked';
      } else if (c.mode === 'parked') {
        if (!cars) {
          c.mode = 'out';
          c.d = 0;
          c.startAt = now + (CAR_BAYS.length - 1 - i) * 0.8;
        }
      } else if (c.mode === 'out' && now >= c.startAt) {
        const q = at(pout, c.d);
        let v = q.seg === 0 ? 3 : q.seg >= 3 ? LANE_SPEED * follow(q.x, `l${i}`) : LOT_SPEED;
        // at the gate: give way to anything coming along the near lane
        const atGate = q.seg === 2 && q.segLeft < 0.5;
        if (atGate && !laneClear(LOT_GATE_X - 30, LOT_GATE_X + 8, `l${i}`)) v = 0;
        c.d = Math.min(pout.total, c.d + v * dt);
        if (c.d >= pout.total) c.mode = 'idle';
      }

      const g = parked.current[i];
      if (!g) return;
      g.visible = c.mode !== 'idle';
      if (c.mode === 'in' || c.mode === 'parked') {
        const q = at(pin, c.mode === 'parked' ? pin.total : c.d);
        g.position.set(q.x, 0, q.z);
        g.rotation.y = q.yaw;
      } else if (c.mode === 'out') {
        const q = at(pout, c.d);
        g.position.set(q.x, 0, q.z);
        // backing out of the bay: still facing into it
        g.rotation.y = q.seg === 0 ? q.yaw + Math.PI : q.yaw;
      }
    });

    // The gate barrier lifts while a lot car is near it
    const nearGate = s.lot.some((c, i) => {
      if (c.mode === 'in') return Math.abs(segStart(ins[i], 1) - c.d) < 9;
      if (c.mode === 'out') return Math.abs(segStart(outs[i], 3) - c.d) < 9;
      return false;
    });
    s.arm += ((nearGate ? 1 : 0) - s.arm) * Math.min(1, dt * 4);
    if (barrier.current) barrier.current.rotation.x = -s.arm * 1.35;

    // Through traffic: as many cars as the density calls for, each keeping its distance to the one ahead in its lane.
    // A car only enters when its end of the road is clear; cars over the current count finish their run and stop.
    const inUse = carsFor(congestion);
    const cruise = 1 - 0.25 * congestion; // busy roads still move briskly; the queue itself does the slowing
    TRAFFIC.forEach((c, i) => {
      const tc = s.traffic[i];
      const east = c.lane === LANE_EAST;
      const wanted = traffic && i < inUse && !still;
      const start = east ? ROAD_FROM : ROAD_TO;
      if (!tc.alive && wanted && now >= tc.spawnAt && laneClear(start - 9, start + 9, `t${i}`, east)) {
        tc.alive = true;
        tc.x = start;
        tc.spawnAt = now + 0.3;
      }
      if (tc.alive) {
        tc.x += (east ? 1 : -1) * c.speed * cruise * follow(tc.x, `t${i}`, east, TGAP) * dt;
        if (east ? tc.x > ROAD_TO : tc.x < ROAD_FROM) {
          tc.alive = false;
          tc.spawnAt = wanted ? now + (0.2 + (i % 5) * 0.35) * (1.2 - congestion) : Infinity;
        }
      } else if (wanted && tc.spawnAt === Infinity) tc.spawnAt = now + (i % 9) * 0.6 * (1.1 - congestion);
      const g = moving.current[i];
      if (!g) return;
      g.visible = tc.alive;
      g.position.set(tc.x, 0, c.lane);
      g.rotation.y = east ? 0 : Math.PI;
    });
  });
  const kerb = (z: number) => (
    <mesh key={z} position={[10, 0.08, z]} receiveShadow castShadow>
      <boxGeometry args={[ROAD_TO - ROAD_FROM, 0.16, 1.8]} />
      <meshStandardMaterial color="#182740" roughness={1} />
    </mesh>
  );
  return (
    <group>
      {/* carriageway, raised pavements (open where the lot's driveway crosses), lot asphalt */}
      <mesh rotation-x={-Math.PI / 2} position={[10, 0.01, STREET_Z]} receiveShadow>
        <planeGeometry args={[ROAD_TO - ROAD_FROM, 8]} />
        <meshStandardMaterial color={congestion > 0.05 ? new THREE.Color('#0f1a2e').lerp(new THREE.Color('#3b82f6'), congestion * 0.75) : '#0f1a2e'} roughness={1} />
      </mesh>
      {kerb(39.9)}
      <group>
        <mesh position={[(ROAD_FROM + LOT_GATE_X - 3) / 2, 0.08, 30.1]} receiveShadow castShadow>
          <boxGeometry args={[LOT_GATE_X - 3 - ROAD_FROM, 0.16, 1.8]} />
          <meshStandardMaterial color="#182740" roughness={1} />
        </mesh>
        <mesh position={[(LOT_GATE_X + 3 + ROAD_TO) / 2, 0.08, 30.1]} receiveShadow castShadow>
          <boxGeometry args={[ROAD_TO - LOT_GATE_X - 3, 0.16, 1.8]} />
          <meshStandardMaterial color="#182740" roughness={1} />
        </mesh>
      </group>
      {/* zebra crossing in front of the entrance */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-4.5 + i * 1.5, 0.025, STREET_Z]}>
          <planeGeometry args={[0.75, 6]} />
          <meshBasicMaterial color="#e2ebfb" transparent opacity={0.55} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[2, 0.015, 25.4]} receiveShadow>
        <planeGeometry args={[84, 9.2]} />
        <meshStandardMaterial color="#111d33" roughness={1} />
      </mesh>
      {/* lot entrance: driveway across the pavement, gate posts, a barrier that lifts, and a P sign */}
      <mesh rotation-x={-Math.PI / 2} position={[LOT_GATE_X, 0.02, 30.3]} receiveShadow>
        <planeGeometry args={[6, 3.4]} />
        <meshStandardMaterial color="#111d33" roughness={1} />
      </mesh>
      {[LOT_GATE_X - 3.1, LOT_GATE_X + 3.1].map((x) => (
        <mesh key={x} position={[x, 0.6, 29.6]} castShadow>
          <boxGeometry args={[0.4, 1.2, 0.4]} />
          <meshStandardMaterial color="#d6cfc9" />
        </mesh>
      ))}
      <group ref={barrier} position={[LOT_GATE_X - 3.1, 1.05, 29.6]}>
        <mesh position={[3.1, 0, 0]}>
          <boxGeometry args={[6, 0.12, 0.12]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      </group>
      <group position={[LOT_GATE_X + 4.2, 0, 30.2]}>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[0.12, 2.8, 0.12]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0, 2.9, 0]}>
          <boxGeometry args={[1.1, 1.1, 0.08]} />
          <meshStandardMaterial color="#3b6ea5" />
        </mesh>
        <mesh position={[0, 2.9, 0.05]}>
          <boxGeometry args={[0.38, 0.62, 0.02]} />
          <meshBasicMaterial color="#eaf1ff" />
        </mesh>
      </group>
      <primitive object={lines} />      <primitive object={centre} />
      {/* street lamps on both pavements, staggered */}
      {lamps.map((x, i) => {
        const z = i % 2 ? 40.2 : 29.8;
        const arm = i % 2 ? -1 : 1;
        return (
          <group key={x} position={[x, 0, z]}>
            <mesh position={[0, 3.2, 0]}>
              <boxGeometry args={[0.18, 6.4, 0.18]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 6.3, arm * 0.8]}>
              <boxGeometry args={[0.18, 0.14, 1.6]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 6.15, arm * 1.5]}>
              <boxGeometry args={[0.5, 0.16, 0.5]} />
              <meshBasicMaterial color="#cfe0ff" />
            </mesh>
          </group>
        );
      })}
      {ins.map((_, i) => (
        <Car key={`p${i}`} color={CAR_COLORS[i]} refFn={(g) => void (parked.current[i] = g)} />
      ))}
      {TRAFFIC.map((c, i) => (
        <Car key={`t${i}`} color={c.color} refFn={(g) => void (moving.current[i] = g)} />
      ))}
    </group>
  );
}

// The site plan as a sheet of paper on the ground. It drops onto the plot and settles flat; the building then
// rises out of it, and once the building is up the paper fades away.
function Paper({ show }: { show: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const st = useRef({ k: 0, o: 0 });
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#c3cfdb', transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      cv.getContext('2d')!.drawImage(img, 0, 0);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      m.map = tex;
      m.needsUpdate = true;
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sitePlanSvg())}`;
    return m;
  }, []);
  useEffect(() => () => {
    material.map?.dispose();
    material.dispose();
  }, [material]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const s = st.current;
    // k: 0 = held up above the site, 1 = lying on it. o: opacity.
    if (show) {
      s.k = still ? 1 : Math.min(1, s.k + dt / 1.4);
      s.o = still ? 1 : Math.min(1, s.o + dt / 0.6);
    } else {
      s.o = still ? 0 : Math.max(0, s.o - dt / 1.2);
      if (s.o === 0) s.k = 0;
    }
    const e = 1 - (1 - s.k) ** 3; // ease out
    m.visible = s.o > 0.001;
    material.opacity = s.o;
    m.position.y = 0.06 + (1 - e) * 22;
    m.rotation.set(-Math.PI / 2 + (1 - e) * 0.55, 0, (1 - e) * 0.18);
  });

  return (
    <mesh ref={mesh} material={material} position={[SHEET.x0 + SHEET.w / 2, 0.06, SHEET.z0 + SHEET.d / 2]} visible={false} renderOrder={-1}>
      <planeGeometry args={[SHEET.w, SHEET.d]} />
    </mesh>
  );
}
// Ground with real relief for the risk simulations: river channel, floodplain, hills. Coloured by height , so the shape
// of the land reads at a glance.
function Terrain() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 900, 220, 220).rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const low = new THREE.Color('#2a2420');
    const mid = new THREE.Color('#3b322e');
    const high = new THREE.Color('#3b4a63');
    const bed = new THREE.Color('#2f3330');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h - 0.06); // level ground sits just under the plot and street surfaces
      if (h < RIVER_LEVEL) c.copy(bed);
      else if (h < 0) c.copy(low).lerp(mid, (h - RIVER_LEVEL) / -RIVER_LEVEL);
      else c.copy(mid).lerp(high, Math.min(1, h / 14));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

// Flood simulation. The water surface sits `level` metres above the river's normal level and only shows where the
// ground is lower than it, so the flood fills the channel first, then the floodplain, then the street and plot.
// Gentle swell moves the surface; the fine detail (ripples drifting with the current) is in the fragment shader,
// with sky reflection, sun glints, depth-based colour and silty water in the shallows, as real floods look.
const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uLevel;
varying vec3 vWorld;
${TERRAIN_GLSL}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 p = world.xz;
  float depth = uLevel - terrainHeight(p.x, p.y);
  float swell = clamp(depth / 3.0, 0.0, 1.0);
  float h = 0.09 * sin(dot(p, vec2(0.21, 0.07)) + uTime * 1.1) + 0.05 * sin(dot(p, vec2(-0.09, 0.19)) + uTime * 1.6);
  world.y = uLevel + h * swell;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const WATER_FRAG = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform vec3 uSun;
varying vec3 vWorld;
${TERRAIN_GLSL}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// ripple height field: three octaves, two of them drifting with the current (downstream, east)
float ripples(vec2 p) {
  float t = uTime;
  return noise(p * 0.18 + vec2(t * 0.10, t * 0.03)) * 0.55
       + noise(p * 0.45 - vec2(t * 0.06, -t * 0.12)) * 0.30
       + noise(p * 1.10 + vec2(t * 0.25, 0.0)) * 0.15;
}
void main() {
  float ground = terrainHeight(vWorld.x, vWorld.z);
  float depth = uLevel - ground;
  if (depth < 0.0) discard;

  // normal from the ripple field (finite differences)
  vec2 p = vWorld.xz;
  float e = 0.35;
  float h0 = ripples(p);
  vec3 n = normalize(vec3((h0 - ripples(p + vec2(e, 0.0))) * 2.2, 1.0, (h0 - ripples(p + vec2(0.0, e))) * 2.2));

  vec3 view = normalize(cameraPosition - vWorld);
  float cosT = max(dot(n, view), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);

  // what the water reflects: a dusk sky, warm at the horizon, cooler overhead
  vec3 r = reflect(-view, n);
  vec3 sky = mix(vec3(0.55, 0.46, 0.42), vec3(0.30, 0.36, 0.44), smoothstep(0.0, 0.6, r.y));

  // body colour: clear green-blue in the deep channel, silty brown where the flood spreads thin
  vec3 deep = vec3(0.05, 0.16, 0.20);
  vec3 mid = vec3(0.13, 0.29, 0.30);
  vec3 silt = vec3(0.36, 0.30, 0.22);
  vec3 body = mix(mid, deep, smoothstep(1.0, 5.0, depth));
  body = mix(silt, body, smoothstep(0.1, 1.4, depth));

  vec3 col = mix(body, sky, fres * 0.85);
  // sun: a broad sheen plus small sharp glints on the ripples
  vec3 l = normalize(uSun);
  float sp = max(dot(reflect(-l, n), view), 0.0);
  col += vec3(1.0, 0.9, 0.78) * (pow(sp, 40.0) * 0.25 + pow(sp, 400.0) * 1.2);

  // a thin, broken waterline where the flood meets sloping ground
  float slopeG = length(vec2(terrainHeight(p.x + 1.0, p.y) - ground, terrainHeight(p.x, p.y + 1.0) - ground));
  float edge = (1.0 - smoothstep(0.0, 0.12, depth)) * smoothstep(0.01, 0.08, slopeG);
  col = mix(col, vec3(0.85, 0.83, 0.78), edge * smoothstep(0.45, 0.75, noise(p * 0.8 + uTime * 0.5)) * 0.7);

  // thin sheet water over streets is see-through; deep water is opaque
  float alpha = mix(0.45, 0.94, smoothstep(0.0, 2.0, depth));
  gl_FragColor = vec4(col, alpha);
}`;

function Water({ level }: { level: number }) {
  const cur = useRef(level);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        uniforms: { uTime: { value: 0 }, uLevel: { value: RIVER_LEVEL + level }, uSun: { value: new THREE.Vector3(70, 110, 55) } },
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(700, 700, 160, 160).rotateX(-Math.PI / 2), []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );
  useFrame(({ clock }, dt) => {
    // the water rises and falls over a second or so rather than jumping
    cur.current += (level - cur.current) * Math.min(1, dt * 2.5);
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uLevel.value = RIVER_LEVEL + cur.current + 0.04;
  });
  return <mesh geometry={geometry} material={material} renderOrder={2} frustumCulled={false} />;
}

const SMOKE_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute float aAge;
varying float vAlpha;
varying float vAge;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (900.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
  vAlpha = aAlpha;
  vAge = aAge;
}`;
// Wind made visible: short streaks drifting with the wind. More and faster streaks the stronger it blows.
const STREAKS = 160;
function WindStreaks({ dir, speed }: { dir: number; speed: number }) {
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAKS * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(STREAKS * 6), 3));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, fog: false }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const pts = useRef(Array.from({ length: STREAKS }, (_, i) => ({ x: (rand(i) - 0.5) * 420, y: 4 + rand(i * 3) * 45, z: (rand(i * 7) - 0.5) * 420, ph: rand(i * 11) })));
  const w = useRef({ dir, speed });
  w.current = { dir, speed };
  useFrame((_, rawDt) => {
    const dt = still ? 0 : Math.min(rawDt, 0.4);
    const a = (w.current.dir * Math.PI) / 180;
    const ux = Math.cos(a);
    const uz = Math.sin(a);
    const v = w.current.speed;
    const shown = Math.round(STREAKS * Math.min(1, 0.1 + v / 11));
    const len = 2 + v * 0.9;
    const pos = geo.attributes.position.array as Float32Array;
    const col = geo.attributes.color.array as Float32Array;
    pts.current.forEach((p, i) => {
      p.x += ux * v * 1.6 * dt;
      p.z += uz * v * 1.6 * dt;
      p.ph = (p.ph + dt * 0.35) % 1;
      // wrap around the study area so the field never empties
      if (p.x > 220) p.x -= 440;
      if (p.x < -220) p.x += 440;
      if (p.z > 220) p.z -= 440;
      if (p.z < -220) p.z += 440;
      const sway = Math.sin(p.ph * 6.283 + i) * 0.6;
      pos.set([p.x, p.y + sway, p.z, p.x - ux * len, p.y + sway, p.z - uz * len], i * 6);
      // each streak fades in and out over its cycle, so they shimmer rather than march
      const f = i < shown ? Math.sin(p.ph * Math.PI) * 0.9 : 0;
      col.set([f, f * 0.96, f * 0.94, 0, 0, 0], i * 6);
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

// Pollution haze: the fog thickens with emissions and with still air, and turns brownish. Wind clears it.
function Haze({ pollution, wind }: { pollution: number; wind: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prev = scene.fog;
    scene.fog = new THREE.Fog('#0a1222', 320, 760);
    return () => {
      scene.fog = prev;
    };
  }, [scene]);
  const goal = useMemo(() => ({ c: new THREE.Color(), brown: new THREE.Color('#6e5a4c') }), []);
  useFrame((_, dt) => {
    const fog = scene.fog;
    if (!(fog instanceof THREE.Fog)) return;
    const smog = Math.min(1, pollution * (1.25 - Math.min(1, wind / 12)));
    const k = Math.min(1, dt * 1.5);
    // even at its worst the building stays visible through the haze
    fog.near += (320 - smog * 230 - fog.near) * k;
    fog.far += (760 - smog * 330 - fog.far) * k;
    goal.c.set('#0a1222').lerp(goal.brown, smog * 0.65);
    fog.color.lerp(goal.c, k);
  });
  return null;
}

// Air simulation over the whole area: no single source, but pollution hanging over the district.
// Wind streaks show direction and speed; soft fog banks drift with the wind across the map; still air and
// heavy emissions thicken the haze, strong wind thins it and carries it away.
const BANKS = 90;
const FOG_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vAge;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, soft * soft * vAlpha);
}`;

function FogBanks({ dir, wind, pollution }: { dir: number; wind: number; pollution: number }) {
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const sim = useMemo(() => {
    const pos = new Float32Array(BANKS * 3);
    const size = new Float32Array(BANKS);
    const alpha = new Float32Array(BANKS);
    const age = new Float32Array(BANKS);
    const seed = new Float32Array(BANKS);
    for (let i = 0; i < BANKS; i++) {
      pos[i * 3] = (rand(i * 1.3) - 0.5) * 480;
      pos[i * 3 + 1] = 3 + rand(i * 2.9) * 26;
      pos[i * 3 + 2] = (rand(i * 4.7) - 0.5) * 480;
      seed[i] = rand(i * 6.1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    g.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERT,
      fragmentShader: FOG_FRAG,
      uniforms: { uColor: { value: new THREE.Color('#64748b') } },
      transparent: true,
      depthWrite: false,
    });
    return { g, m, pos, size, alpha, seed };
  }, []);
  useEffect(
    () => () => {
      sim.g.dispose();
      sim.m.dispose();
    },
    [sim],
  );
  const w = useRef({ dir, wind, pollution });
  w.current = { dir, wind, pollution };

  useFrame(({ clock }, rawDt) => {
    const dt = still ? 0 : Math.min(rawDt, 0.4);
    const t = clock.elapsedTime;
    const a = (w.current.dir * Math.PI) / 180;
    const ux = Math.cos(a);
    const uz = Math.sin(a);
    const v = w.current.wind;
    const pol = w.current.pollution;
    const calm = 1 - Math.min(1, v / 10);
    // how thick the fog is: emissions build it up, wind breaks it apart
    const density = Math.min(1, pol * (0.35 + 0.85 * calm));
    const { pos, size, alpha, seed } = sim;
    for (let i = 0; i < BANKS; i++) {
      const s = seed[i];
      // drift with the wind, plus a slow lazy wander so calm fog still breathes
      pos[i * 3] += (ux * v * 1.4 + Math.sin(t * 0.13 + s * 40) * 0.6) * dt;
      pos[i * 3 + 2] += (uz * v * 1.4 + Math.cos(t * 0.11 + s * 30) * 0.6) * dt;
      if (pos[i * 3] > 240) pos[i * 3] -= 480;
      if (pos[i * 3] < -240) pos[i * 3] += 480;
      if (pos[i * 3 + 2] > 240) pos[i * 3 + 2] -= 480;
      if (pos[i * 3 + 2] < -240) pos[i * 3 + 2] += 480;
      // calm air: fog sinks low and spreads wide; wind lifts and shreds it into smaller wisps
      pos[i * 3 + 1] += ((3 + s * (8 + 22 * (1 - calm))) - pos[i * 3 + 1]) * Math.min(1, dt * 0.3);
      size[i] = (55 + s * 70) * (0.55 + 0.45 * calm);
      const shown = s < 0.25 + density * 0.75 ? 1 : 0;
      alpha[i] += (shown * density * (0.16 + 0.2 * calm) - alpha[i]) * Math.min(1, dt * 1.2);
    }
    sim.g.attributes.position.needsUpdate = true;
    (sim.g.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (sim.g.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  });
  return <points geometry={sim.g} material={sim.m} frustumCulled={false} renderOrder={4} />;
}

function AirSim({ dir, wind, pollution }: { dir: number; wind: number; pollution: number }) {
  return (
    <group>
      <FogBanks dir={dir} wind={wind} pollution={pollution} />
      <WindStreaks dir={dir} speed={wind} />
      <Haze pollution={pollution} wind={wind} />
    </group>
  );
}

// Sensor pins: a small sphere on a stalk, coloured by status, pulsing when not OK. (IDs are listed beside the
// viewer rather than drawn in 3D: DOM labels inside the canvas broke on language switches.)
export type Marker = { id: string; pos: [number, number, number]; color: string; alert: boolean };
function Markers({ list, onPick, sel }: { list: Marker[]; onPick?: (id: string) => void; sel: string | null }) {
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const halos = useRef<(THREE.Mesh | null)[]>([]);
  const cores = useRef<(THREE.Mesh | null)[]>([]);
  const ring = useRef<THREE.Mesh>(null);
  const popAt = useRef(-1);
  const last = useRef<string | null>(null);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (sel !== last.current) {
      last.current = sel;
      popAt.current = t;
    }
    // the picked marker springs up with a little overshoot; the others settle back
    const k = Math.min(1, (t - popAt.current) / 0.5);
    const back = still ? 1 : 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;
    cores.current.forEach((c, i) => {
      if (!c) return;
      c.scale.setScalar(list[i]?.id === sel ? 1 + 0.55 * back : THREE.MathUtils.lerp(c.scale.x, 1, 0.2));
    });
    halos.current.forEach((h, i) => {
      if (!h) return;
      const m = list[i];
      const q = still || !m?.alert ? 0.4 : (t * 1.2 + i * 0.3) % 1;
      h.scale.setScalar(1 + q * 2.2);
      (h.material as THREE.MeshBasicMaterial).opacity = m?.alert ? (1 - q) * 0.6 : 0.18;
    });
    // a white ring round the picked marker, facing the camera and breathing gently
    const r = ring.current;
    const m = list.find((x) => x.id === sel);
    if (r) {
      r.visible = !!m;
      if (m) {
        r.position.set(...m.pos);
        r.quaternion.copy(camera.quaternion);
        r.scale.setScalar((1 + 0.55 * back) * (still ? 1 : 1 + 0.08 * Math.sin(t * 3)));
      }
    }
  });
  return (
    <group>
      {list.map((m, i) => (
        <group key={m.id} position={m.pos}>
          <mesh position={[0, -1.2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
            <meshBasicMaterial color="#eaf1ff" transparent opacity={0.5} />
          </mesh>
          <mesh
            ref={(c) => void (cores.current[i] = c)}
            onClick={(e) => {
              e.stopPropagation();
              onPick?.(m.id);
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <sphereGeometry args={[1.15, 20, 14]} />
            <meshBasicMaterial color={m.color} />
          </mesh>
          <mesh ref={(h) => void (halos.current[i] = h)} renderOrder={6}>
            <sphereGeometry args={[1.15, 18, 12]} />
            <meshBasicMaterial color={m.color} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <mesh ref={ring} renderOrder={7} visible={false}>
        <ringGeometry args={[1.75, 2.05, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Site selection: the chosen plot lights up — a scan ring sweeps outward from it, the boundary glows and a
// marker beacon drops onto its centre. Fades out smoothly when the step is over.
function SiteSelect({ on }: { on: boolean }) {
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const fill = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.Group>(null);
  const k = useRef(0);
  const since = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (on && k.current === 0) since.current = t;
    k.current = on ? Math.min(1, k.current + dt * 2) : Math.max(0, k.current - dt * 1.5);
    const v = k.current;
    const age = t - since.current;
    if (fill.current) {
      fill.current.visible = v > 0.01;
      (fill.current.material as THREE.MeshBasicMaterial).opacity = v * (0.16 + (still ? 0 : 0.1 * Math.sin(t * 4)));
    }
    if (ring.current) {
      const r = still ? 0.6 : (age * 0.6) % 1; // sweeps out from the plot, again and again
      ring.current.visible = v > 0.01;
      ring.current.scale.setScalar(20 + r * 90);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = v * (1 - r) * 0.6;
    }
    if (beacon.current) {
      const drop = still ? 1 : Math.min(1, age / 0.8);
      beacon.current.visible = v > 0.01;
      beacon.current.position.y = 60 * (1 - drop * drop) + 0.1;
      beacon.current.scale.setScalar(Math.max(0.001, v));
    }
  });
  return (
    <group>
      <mesh ref={fill} rotation-x={-Math.PI / 2} position-y={0.08} renderOrder={3}>
        <planeGeometry args={[80, 60]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.1} renderOrder={3}>
        <ringGeometry args={[0.97, 1, 96]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={beacon}>
        <mesh position={[0, 14, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 28, 8]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 30, 0]}>
          <sphereGeometry args={[2.2, 20, 14]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      </group>
    </group>
  );
}

// Tower crane next to the frame. It doesn't pop in: the mast climbs out of the ground and the jib slews round
// into position; while working, the trolley runs along the jib and the hook lifts a bucket at the working
// level; when the frame is done the jib swings away and the mast sinks back down.
export const CRANE_X = 25;
export const CRANE_Z = -22;
const MAST_H = ROOF_Y + 12;
const ease = (k: number) => k * k * (3 - 2 * k); // smoothstep
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

function Crane({ top, side = 'east' }: { top: number | null; side?: 'east' | 'west' }) {
  // East: beside the north-east corner (right of the building in the usual views). West: the far side, jib reaching back over.
  const base = side === 'west' ? { pos: [-27, 0, -6] as const, yaw: Math.PI } : { pos: [CRANE_X, 0, CRANE_Z] as const, yaw: 0 };
  const root = useRef<THREE.Group>(null);
  const mast = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Mesh>(null);
  const hook = useRef<THREE.Group>(null);
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const s = useRef({ v: 0, hookY: top ?? 0, last: top ?? 0 });

  useFrame(({ clock }, dt) => {
    const st = s.current;
    if (top != null) st.last = top;
    const goal = top != null ? 1 : 0;
    // ~1.8 s to rise, ~1.4 s to leave
    st.v = still ? goal : goal > st.v ? Math.min(goal, st.v + dt / 1.8) : Math.max(goal, st.v - dt / 1.4);
    const v = st.v;
    if (!root.current || !mast.current || !head.current || !trolley.current || !cable.current || !hook.current) return;
    root.current.visible = v > 0.001;
    if (!root.current.visible) return;

    const t = clock.elapsedTime;
    // Mast grows during the first 60%, the head slews in over the last 50%.
    const grow = ease(clamp01(v / 0.6));
    const slew = ease(clamp01((v - 0.5) / 0.5));
    mast.current.scale.y = Math.max(0.001, grow);
    head.current.position.y = MAST_H * grow;
    head.current.visible = grow > 0.98;
    head.current.rotation.y = base.yaw + (1 - slew) * -1.6 + (still ? 0 : Math.sin(t * 0.35) * 0.04 * slew);

    // Trolley runs along the jib; the hook follows the working level and lifts gently.
    const reach = 26 + (still ? 0 : Math.sin(t * 0.5) * 6);
    trolley.current.position.x = -reach;
    const target = st.last + 2 + (still ? 0 : (Math.sin(t * 1.1) * 0.5 + 0.5) * 3);
    st.hookY += (target - st.hookY) * Math.min(1, dt * 2);
    const hy = Math.min(MAST_H - 1, st.hookY);
    const dropped = ease(clamp01((v - 0.85) / 0.15)); // the cable pays out once the jib is in place
    const len = Math.max(0.01, (MAST_H - hy) * dropped);
    cable.current.scale.y = len;
    cable.current.position.y = -len / 2;
    hook.current.position.y = -len - 0.8;
  });

  const steel = <meshStandardMaterial color="#60a5fa" roughness={0.6} />;
  return (
    <group ref={root} position={base.pos} visible={false}>
      <group ref={mast}>
        <mesh position={[0, MAST_H / 2, 0]} castShadow>
          <boxGeometry args={[1.8, MAST_H, 1.8]} />
          {steel}
        </mesh>
      </group>
      <group ref={head}>
        <mesh position={[-22, 0.8, 0]} castShadow>
          <boxGeometry args={[48, 1.3, 1.3]} />
          {steel}
        </mesh>
        <mesh position={[8, 0.8, 0]} castShadow>
          <boxGeometry args={[14, 1.3, 1.5]} />
          {steel}
        </mesh>
        <mesh position={[13, -0.6, 0]} castShadow>
          <boxGeometry args={[3.5, 2.6, 2.4]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[0.8, 6, 0.8]} />
          {steel}
        </mesh>
        <group ref={trolley} position={[-26, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.6, 0.6, 1.6]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh ref={cable}>
            <boxGeometry args={[0.1, 1, 0.1]} />
            <meshBasicMaterial color="#eaf1ff" />
          </mesh>
          <group ref={hook}>
            <mesh castShadow>
              <boxGeometry args={[2.2, 1.6, 2.2]} />
              <meshStandardMaterial color="#d6cfc9" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------

function Controls({ cameraKey, view, autoRotate, sway, maxPolar, smooth, active, onInteract, initial, fit }: BimCanvasProps & { initial: Pose; fit: boolean }) {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const ref = useRef<CameraControlsImpl>(null);
  const touched = useRef(false);
  const still = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    // Portrait screens see a narrower slice; start further back so the whole building fits.
    const k = fit && aspect < 1 ? 1.12 / aspect : 1;
    const p = initial.position.map((v, i) => initial.target[i] + (v - initial.target[i]) * k) as [number, number, number];
    ref.current?.setLookAt(...p, ...initial.target, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  // Keep the orbit target above ground and within the neighbourhood; panning can't drag the view underground.
  useEffect(() => {
    ref.current?.setBoundary(new THREE.Box3(new THREE.Vector3(-260, 0.5, -260), new THREE.Vector3(260, 120, 260)));
  }, []);

  useEffect(() => {
    if (!view || !ref.current) return;
    touched.current = true;
    ref.current.setLookAt(...view.pose.position, ...view.pose.target, true);
  }, [view]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.mouseButtons.wheel = active ? ACTION.DOLLY : ACTION.NONE;
    c.touches.one = active ? ACTION.TOUCH_ROTATE : ACTION.NONE;
    c.touches.two = active ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.NONE;
    c.touches.three = active ? ACTION.TOUCH_TRUCK : ACTION.NONE;
  }, [active]);

  // Idle motion until the user takes over: a full slow turn, or (sway) a few degrees either side of the start angle.
  const base = useRef<number | null>(null);
  useFrame(({ clock }, dt) => {
    const c = ref.current;
    if (!c || still || touched.current) return;
    if (sway) {
      base.current ??= c.azimuthAngle;
      c.rotateTo(base.current + Math.sin(clock.elapsedTime * 0.25) * 0.2, c.polarAngle, false);
    } else if (autoRotate) c.rotate(dt * 0.06, 0, false);
  });

  const save = () => {
    const c = ref.current;
    // Auto-rotation fires rest events constantly; only persist poses the user chose.
    if (!c || !touched.current) return;
    const p = c.getPosition(new THREE.Vector3());
    const t = c.getTarget(new THREE.Vector3());
    writePersistent(cameraKey, { position: p.toArray(), target: t.toArray() });
  };

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={8}
      maxDistance={420}
      // never below the horizon, so the camera can't end up under the ground
      maxPolarAngle={Math.min(maxPolar ?? Math.PI * 0.48, Math.PI * 0.48)}
      dollyToCursor
      smoothTime={smooth ?? 0.35}
      onStart={() => {
        touched.current = true;
        onInteract?.();
      }}
      onRest={save}
      onEnd={save}
    />
  );
}
