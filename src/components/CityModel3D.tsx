"use client";

import { Edges } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExtrudeGeometry, MathUtils, Shape, Vector3, type Camera, type Mesh } from "three";
import { DISTRICT_BY_ID, type DistrictId } from "@/lib/engine";
import { deltaColor, loadDistrictGeo, type DistrictCollection, type DistrictView } from "@/lib/geo";
import { cn, fmt } from "@/lib/utils";

const LON0 = 71.48;
const LAT0 = 51.12;
const KM_PER_UNIT = 5;
const X_SCALE = (111.32 * Math.cos((LAT0 * Math.PI) / 180)) / KM_PER_UNIT;
const Y_SCALE = 110.57 / KM_PER_UNIT;
const RISE_STAGGER = 0.14;

type Heights = Partial<Record<DistrictId, number>>;
type LabelEls = Partial<Record<DistrictId, HTMLDivElement | null>>;

interface Part {
  id: DistrictId;
  geometry: ExtrudeGeometry;
  label: [number, number];
}

function heightFor(score: number): number {
  return Math.max(0.2, (score - 42) * 0.075);
}

function project([lon, lat]: [number, number]): [number, number] {
  return [(lon - LON0) * X_SCALE, (lat - LAT0) * Y_SCALE];
}

function buildParts(geo: DistrictCollection): Part[] {
  return geo.features.map((f) => {
    const shapes = f.geometry.coordinates.map((poly) => {
      const shape = new Shape();
      poly[0].forEach((pt, i) => {
        const [x, y] = project(pt);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      return shape;
    });
    return {
      id: f.properties.id,
      geometry: new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false }),
      label: project(f.properties.centroid),
    };
  });
}

function District({
  part,
  view,
  focused,
  order,
  onHeight,
  reduceMotion,
}: {
  part: Part;
  view: DistrictView;
  focused: boolean;
  order: number;
  onHeight: (id: DistrictId, height: number) => void;
  reduceMotion: boolean;
}) {
  const ref = useRef<Mesh>(null);
  const target = heightFor(view.after);

  useFrame((state, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (reduceMotion) mesh.scale.z = target;
    else if (state.clock.elapsedTime >= order * RISE_STAGGER) {
      mesh.scale.z = MathUtils.damp(mesh.scale.z, target, 4, dt);
    }
    onHeight(part.id, mesh.scale.z);
  });

  return (
    <mesh
      ref={ref}
      geometry={part.geometry}
      scale={[1, 1, reduceMotion ? target : 0.01]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={deltaColor(view.delta)} roughness={0.42} metalness={0.04} />
      <Edges threshold={32} color={focused ? "#0d2744" : "#ffffff"} />
    </mesh>
  );
}

function LabelTracker({ onFrame }: { onFrame: (camera: Camera, width: number, height: number) => void }) {
  useFrame(({ camera, size }) => onFrame(camera, size.width, size.height));
  return null;
}

function CameraRig({ progress, reduceMotion }: { progress?: MotionValue<number>; reduceMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  const goal = useMemo(() => new Vector3(), []);

  useFrame((state, dt) => {
    const p = reduceMotion ? 0 : (progress?.get() ?? 0);
    const drift = reduceMotion ? 0 : state.pointer.x * 0.08;
    const azimuth = 0.55 + p * 1.8 + drift;
    const radius = 20.5 - p * 3;
    const height = 12 - p * 2.5 + (reduceMotion ? 0 : state.pointer.y * 0.4);
    goal.set(Math.sin(azimuth) * radius, height, Math.cos(azimuth) * radius);
    if (reduceMotion) camera.position.copy(goal);
    else camera.position.lerp(goal, 1 - Math.exp(-dt * 3));
    camera.lookAt(0, -0.4, 0);
  });

  return null;
}

interface CityModel3DProps {
  views: Record<DistrictId, DistrictView>;
  focus?: DistrictId | null;
  progress?: MotionValue<number>;
  active?: boolean;
}

export default function CityModel3D({ views, focus = null, progress, active = true }: CityModel3DProps) {
  const [geo, setGeo] = useState<DistrictCollection | null>(null);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const parts = useMemo(() => (geo ? buildParts(geo) : []), [geo]);
  const heights = useRef<Heights>({});
  const labels = useRef<LabelEls>({});
  const point = useRef(new Vector3());

  const recordHeight = useCallback((id: DistrictId, h: number) => {
    heights.current[id] = h;
  }, []);

  const placeLabels = useCallback(
    (camera: Camera, width: number, height: number) => {
      for (const p of parts) {
        const el = labels.current[p.id];
        if (!el) continue;
        const h = heights.current[p.id] ?? 0;
        const v = point.current.set(p.label[0], h, -p.label[1]).project(camera);
        const x = ((v.x + 1) / 2) * width;
        const y = ((1 - v.y) / 2) * height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -135%)`;
        el.style.opacity = h > 0.08 ? "1" : "0";
      }
    },
    [parts],
  );

  useEffect(() => {
    let alive = true;
    loadDistrictGeo()
      .then((g) => alive && setGeo(g))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts]);

  if (!geo) return null;

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [10, 12, 15], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        aria-label="3D-макет районов Астаны: высота района показывает его оценку"
      >
        <hemisphereLight args={["#ffffff", "#8fa6bd", 0.9]} />
        <directionalLight
          position={[7, 14, 9]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-9}
          shadow-camera-right={9}
          shadow-camera-top={9}
          shadow-camera-bottom={-9}
        />
        <directionalLight position={[-9, 5, -6]} intensity={0.3} />
        <CameraRig progress={progress} reduceMotion={reduceMotion} />
        <LabelTracker onFrame={placeLabels} />
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {parts.map((p, i) => (
            <District
              key={p.id}
              part={p}
              view={views[p.id]}
              focused={focus === p.id}
              order={i}
              onHeight={recordHeight}
              reduceMotion={reduceMotion}
            />
          ))}
          <mesh position={[0, 0, -0.02]} receiveShadow>
            <circleGeometry args={[9, 64]} />
            <shadowMaterial opacity={0.14} />
          </mesh>
        </group>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {parts.map((p) => {
          const view = views[p.id];
          const focused = focus === p.id;
          const changed = Math.abs(view.delta) > 0.005;
          return (
            <div
              key={p.id}
              ref={(el) => {
                labels.current[p.id] = el;
              }}
              className={cn(
                "absolute top-0 left-0 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] leading-tight opacity-0 shadow-[0_4px_14px_-6px_rgba(13,39,68,0.35)] transition-[background-color,color,opacity] duration-300 will-change-transform",
                focused ? "z-10 bg-ink text-white" : "hidden bg-white/90 text-ink sm:block",
              )}
            >
              <span className="font-medium">{DISTRICT_BY_ID[p.id].nameRu}</span>{" "}
              <span className="tabular-nums">{fmt(view.after, 1)}</span>
              {changed ? (
                <span className={cn("ml-1 tabular-nums", focused ? "text-teal-soft" : "text-teal-deep")}>
                  {view.delta > 0 ? "+" : ""}
                  {fmt(view.delta, 2)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
