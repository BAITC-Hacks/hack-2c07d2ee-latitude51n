"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { DISTRICTS, type DistrictId } from "@/lib/engine";
import { deltaColor, hasWebGL, type DistrictView } from "@/lib/geo";
import { fmt } from "@/lib/utils";

const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });

const WIDE_QUERY = "(min-width: 640px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function canRender3D(): boolean {
  return window.matchMedia(WIDE_QUERY).matches && hasWebGL();
}

export function HeroScene({ views }: { views: Record<DistrictId, DistrictView> }) {
  const render3D = useSyncExternalStore(subscribe, canRender3D, () => false);

  return (
    <figure className="relative h-44 w-full sm:h-56 sm:w-[380px]">
      {render3D ? <Hero3D views={views} /> : <StaticBars views={views} />}
      <figcaption className="pointer-events-none absolute bottom-1 right-2 text-[11px] text-ink-muted">
        Реальные границы районов, высота — оценка
      </figcaption>
    </figure>
  );
}

function StaticBars({ views }: { views: Record<DistrictId, DistrictView> }) {
  return (
    <div className="flex h-full items-end gap-3 px-2 pb-6">
      {DISTRICTS.map((d) => {
        const v = views[d.id];
        return (
          <div key={d.id} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[11px] tabular-nums text-ink">{fmt(v.after, 1)}</span>
            <div
              className="w-full rounded-t-md transition-[height] duration-500"
              style={{ height: `${Math.max(8, (v.after - 40) * 4)}px`, background: deltaColor(v.delta) }}
            />
            <span className="text-[11px] text-ink-muted">{d.nameRu}</span>
          </div>
        );
      })}
    </div>
  );
}
