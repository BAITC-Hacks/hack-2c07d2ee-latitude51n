"use client";

import { Edges, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExtrudeGeometry, Shape, type Mesh } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DistrictId } from "@/lib/engine";
import { deltaColor, loadDistrictGeo, type DistrictCollection, type DistrictView } from "@/lib/geo";

const LON0 = 71.48;
const LAT0 = 51.12;
const KM_PER_UNIT = 5;
const X_SCALE = (111.32 * Math.cos((LAT0 * Math.PI) / 180)) / KM_PER_UNIT;
const Y_SCALE = 110.57 / KM_PER_UNIT;
const ORBIT_SECONDS = 5;

function heightFor(score: number): number {
  return Math.max(0.15, (score - 40) * 0.07);
}

function buildGeometries(geo: DistrictCollection) {
  return geo.features.map((f) => {
    const shapes = f.geometry.coordinates.map((poly) => {
      const shape = new Shape();
      poly[0].forEach(([lon, lat], i) => {
        const x = (lon - LON0) * X_SCALE;
        const y = (lat - LAT0) * Y_SCALE;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      return shape;
    });
    const geometry = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
    return { id: f.properties.id, geometry };
  });
}

function District({
  geometry,
  view,
  reduceMotion,
}: {
  geometry: ExtrudeGeometry;
  view: DistrictView;
  reduceMotion: boolean;
}) {
  const ref = useRef<Mesh>(null);
  const target = heightFor(view.after);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const current = mesh.scale.z;
    mesh.scale.z = reduceMotion ? target : current + (target - current) * Math.min(1, dt * 5);
  });

  return (
    <mesh ref={ref} geometry={geometry} scale={[1, 1, reduceMotion ? target : 0.01]} castShadow>
      <meshStandardMaterial color={deltaColor(view.delta)} roughness={0.55} metalness={0.05} />
      <Edges threshold={20} color="#ffffff" />
    </mesh>
  );
}

function Scene({
  geo,
  views,
  reduceMotion,
  orbitKey,
}: {
  geo: DistrictCollection;
  views: Record<DistrictId, DistrictView>;
  reduceMotion: boolean;
  orbitKey: string;
}) {
  const parts = useMemo(() => buildGeometries(geo), [geo]);
  const controls = useRef<OrbitControlsImpl>(null);
  const orbitUntil = useRef(0);

  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts]);

  useEffect(() => {
    orbitUntil.current = reduceMotion ? 0 : performance.now() + ORBIT_SECONDS * 1000;
  }, [orbitKey, reduceMotion]);

  useFrame(() => {
    if (controls.current) controls.current.autoRotate = performance.now() < orbitUntil.current;
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 12, 8]} intensity={1.4} castShadow />
      <directionalLight position={[-8, 6, -4]} intensity={0.35} />
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {parts.map((p) => (
          <District key={p.id} geometry={p.geometry} view={views[p.id]} reduceMotion={reduceMotion} />
        ))}
        <mesh position={[0, 0, -0.02]} receiveShadow>
          <circleGeometry args={[7.5, 64]} />
          <shadowMaterial opacity={0.12} />
        </mesh>
      </group>
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableZoom={false}
        autoRotateSpeed={1.1}
        minPolarAngle={0.5}
        maxPolarAngle={1.2}
      />
    </>
  );
}

export default function Hero3D({ views }: { views: Record<DistrictId, DistrictView> }) {
  const [geo, setGeo] = useState<DistrictCollection | null>(null);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    let alive = true;
    loadDistrictGeo()
      .then((g) => alive && setGeo(g))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const orbitKey = Object.values(views)
    .map((v) => v.after.toFixed(3))
    .join("|");

  if (!geo) return null;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: [10, 12, 14], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      aria-label="3D-макет районов Астаны"
    >
      <Scene geo={geo} views={views} reduceMotion={reduceMotion} orbitKey={orbitKey} />
    </Canvas>
  );
}
