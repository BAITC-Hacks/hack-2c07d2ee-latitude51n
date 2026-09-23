import type { DistrictId } from "@/lib/engine";

export type Ring = [number, number][];

export interface DistrictFeature {
  type: "Feature";
  id: number;
  properties: {
    id: DistrictId;
    nameRu: string;
    osmRelation: number;
    centroid: [number, number];
  };
  geometry: { type: "MultiPolygon"; coordinates: Ring[][] };
}

export interface DistrictCollection {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

export interface DistrictView {
  after: number;
  delta: number;
}

export const GEO_URL = "/geo/astana-districts.geojson";

let cache: Promise<DistrictCollection> | null = null;

export function loadDistrictGeo(): Promise<DistrictCollection> {
  cache ??= fetch(GEO_URL).then((res) => {
    if (!res.ok) throw new Error(`GeoJSON ${res.status}`);
    return res.json() as Promise<DistrictCollection>;
  });
  cache.catch(() => {
    cache = null;
  });
  return cache;
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Height in metres for the 3D map: exaggerates the 40–70 band where districts differ. */
export function extrusionHeight(score: number): number {
  return Math.max(0, score - 40) * 70;
}

const COLOR_STOPS: [number, [number, number, number]][] = [
  [-1, [196, 92, 38]],
  [0, [143, 166, 189]],
  [0.6, [126, 200, 188]],
  [2, [22, 179, 158]],
  [4, [10, 107, 94]],
];

export const LEGEND_STOPS = [
  { delta: -1, label: "снижение" },
  { delta: 0, label: "без изменений" },
  { delta: 0.6, label: "небольшой рост" },
  { delta: 4, label: "сильный рост" },
] as const;

export function deltaColor(delta: number): string {
  const d = Math.min(4, Math.max(-1, delta));
  let i = 0;
  while (i < COLOR_STOPS.length - 2 && d > COLOR_STOPS[i + 1][0]) i++;
  const [d0, c0] = COLOR_STOPS[i];
  const [d1, c1] = COLOR_STOPS[i + 1];
  const t = (d - d0) / (d1 - d0);
  const [r, g, b] = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  return `rgb(${r}, ${g}, ${b})`;
}
