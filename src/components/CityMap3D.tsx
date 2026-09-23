"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { AttributionControl, LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { DistrictId } from "@/lib/engine";
import {
  deltaColor,
  extrusionHeight,
  hasWebGL,
  loadDistrictGeo,
  type DistrictCollection,
  type DistrictView,
} from "@/lib/geo";
import { fmt } from "@/lib/utils";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const SOURCE = "districts";
const LOAD_TIMEOUT_MS = 10_000;
const ANIMATION_MS = 700;

interface Props {
  views: Record<DistrictId, DistrictView>;
  selectedDistrict: DistrictId | null;
  focusDistrict: DistrictId | null;
  focusKey: number;
  onSelect: (id: DistrictId) => void;
  onFail: (reason: string) => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export default function CityMap3D({
  views,
  selectedDistrict,
  focusDistrict,
  focusKey,
  onSelect,
  onFail,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geoRef = useRef<DistrictCollection | null>(null);
  const markersRef = useRef(new Map<DistrictId, { marker: Marker; el: HTMLButtonElement }>());
  const heightsRef = useRef(new Map<DistrictId, number>());
  const frameRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const latest = useRef({ views, selectedDistrict, onSelect, onFail });
  latest.current = { views, selectedDistrict, onSelect, onFail };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!hasWebGL()) {
      latest.current.onFail("Браузер не поддерживает WebGL.");
      return;
    }

    let cancelled = false;
    const markers = markersRef.current;
    const map = new MapLibreMap({
      container,
      style: STYLE_URL,
      center: [71.45, 51.14],
      zoom: 9.6,
      pitch: 50,
      bearing: -12,
      maxPitch: 70,
      attributionControl: false,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: "Границы районов © OpenStreetMap, ODbL",
      }),
    );

    const timeout = window.setTimeout(() => {
      if (!readyRef.current) latest.current.onFail("Подложка карты не загрузилась.");
    }, LOAD_TIMEOUT_MS);

    map.on("load", async () => {
      let geo: DistrictCollection;
      try {
        geo = await loadDistrictGeo();
      } catch {
        latest.current.onFail("Не удалось загрузить границы районов.");
        return;
      }
      if (cancelled) return;
      geoRef.current = geo;

      map.addSource(SOURCE, { type: "geojson", data: geo, promoteId: "id" });
      map.addLayer({
        id: "district-extrusion",
        type: "fill-extrusion",
        source: SOURCE,
        paint: {
          "fill-extrusion-color": ["coalesce", ["feature-state", "color"], "#8fa6bd"],
          "fill-extrusion-height": ["coalesce", ["feature-state", "h"], 0],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.82,
        },
      });
      map.addLayer({
        id: "district-outline",
        type: "line",
        source: SOURCE,
        paint: {
          "line-color": "#0d2744",
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 0.8],
          "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.95, 0.4],
        },
      });

      for (const feature of geo.features) {
        const id = feature.properties.id;
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "rounded-lg bg-white/95 px-2 py-1 text-left text-[11px] leading-tight text-[#0d2744] shadow-sm ring-1 ring-[#c5d3e0] transition-shadow hover:ring-[#0d9f8c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d2744]";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          latest.current.onSelect(id);
        });
        const marker = new Marker({ element: el, anchor: "bottom" })
          .setLngLat(feature.properties.centroid)
          .addTo(map);
        markers.set(id, { marker, el });
      }

      map.on("click", "district-extrusion", (e) => {
        const id = e.features?.[0]?.properties?.id as DistrictId | undefined;
        if (id) latest.current.onSelect(id);
      });
      map.on("mouseenter", "district-extrusion", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "district-extrusion", () => {
        map.getCanvas().style.cursor = "";
      });

      const bounds = new LngLatBounds();
      for (const f of geo.features) {
        for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) bounds.extend([x, y]);
      }
      map.fitBounds(bounds, { padding: 36, pitch: 50, bearing: -12, duration: 0 });

      container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      readyRef.current = true;
      window.clearTimeout(timeout);
      applyViews(latest.current.views, true);
      applySelection(latest.current.selectedDistrict);
    });

    map.on("error", (e) => {
      if (!readyRef.current && /style|fetch|network/i.test(String(e.error?.message ?? ""))) {
        latest.current.onFail("Подложка карты недоступна.");
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      markers.forEach(({ marker }) => marker.remove());
      markers.clear();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function applyViews(next: Record<DistrictId, DistrictView>, instant = false) {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !readyRef.current) return;

    for (const f of geo.features) {
      const id = f.properties.id;
      const view = next[id];
      map.setFeatureState({ source: SOURCE, id }, { color: deltaColor(view.delta) });
      const entry = markersRef.current.get(id);
      if (entry) {
        const sign = view.delta > 0.005 ? "+" : "";
        entry.el.innerHTML = `<span style="display:block;font-weight:600">${f.properties.nameRu}</span><span style="font-variant-numeric:tabular-nums">${fmt(view.after, 1)}${
          Math.abs(view.delta) > 0.005 ? ` <span style="color:${view.delta > 0 ? "#1a7a4c" : "#b42318"}">(${sign}${fmt(view.delta, 2)})</span>` : ""
        }</span>`;
        entry.el.setAttribute("aria-label", `${f.properties.nameRu}: ${fmt(view.after, 1)}`);
      }
    }

    const from = new Map(heightsRef.current);
    const to = new Map(geo.features.map((f) => [f.properties.id, extrusionHeight(next[f.properties.id].after)]));
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const setHeights = (t: number) => {
      for (const [id, target] of to) {
        const start = from.get(id) ?? 0;
        const h = start + (target - start) * t;
        heightsRef.current.set(id, h);
        map.setFeatureState({ source: SOURCE, id }, { h });
      }
    };

    if (instant && from.size > 0) {
      setHeights(1);
      return;
    }
    if (prefersReducedMotion()) {
      setHeights(1);
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / ANIMATION_MS);
      setHeights(easeOutCubic(t));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
      else frameRef.current = null;
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function applySelection(selected: DistrictId | null) {
    const map = mapRef.current;
    const geo = geoRef.current;
    if (!map || !geo || !readyRef.current) return;
    for (const f of geo.features) {
      map.setFeatureState({ source: SOURCE, id: f.properties.id }, { selected: f.properties.id === selected });
    }
  }

  useEffect(() => {
    applyViews(views);
  }, [views]);

  useEffect(() => {
    applySelection(selectedDistrict);
  }, [selectedDistrict]);

  useEffect(() => {
    const map = mapRef.current;
    const feature = geoRef.current?.features.find((f) => f.properties.id === focusDistrict);
    if (!map || !feature || !readyRef.current) return;
    const camera = {
      center: feature.properties.centroid,
      zoom: 9.75,
      pitch: 50,
      bearing: focusKey % 2 === 0 ? -24 : 18,
    };
    if (prefersReducedMotion()) map.jumpTo(camera);
    else map.flyTo({ ...camera, duration: 1800, essential: false });
  }, [focusDistrict, focusKey]);

  return <div ref={containerRef} className="h-full w-full" />;
}
