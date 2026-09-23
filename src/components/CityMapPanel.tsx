"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DistrictMap } from "@/components/DistrictMap";
import type { DistrictId, DistrictResult } from "@/lib/engine";
import { LEGEND_STOPS, deltaColor, type DistrictView } from "@/lib/geo";
import { cn } from "@/lib/utils";

const CityMap3D = dynamic(() => import("@/components/CityMap3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ink-muted">
      Загружаем карту Астаны…
    </div>
  ),
});

type Mode = "map" | "schema";

interface Props {
  views: Record<DistrictId, DistrictView>;
  districts: DistrictResult[] | null;
  highlightIds: DistrictId[];
  selectedDistrict: DistrictId;
  focusDistrict: DistrictId | null;
  focusKey: number;
  onSelect: (id: DistrictId) => void;
}

export function CityMapPanel({
  views,
  districts,
  highlightIds,
  selectedDistrict,
  focusDistrict,
  focusKey,
  onSelect,
}: Props) {
  const [mode, setMode] = useState<Mode>("map");
  const [failure, setFailure] = useState<string | null>(null);
  const showMap = mode === "map" && !failure;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Районы Астаны
          </h2>
          <p className="text-xs text-ink-muted">
            Высота — оценка района. Нажмите на район, чтобы ставить туда районные меры.
          </p>
        </div>
        <div className="flex rounded-lg bg-bg p-0.5 text-xs font-medium" role="group" aria-label="Вид карты">
          {(
            [
              ["map", "3D-карта"],
              ["schema", "Схема"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showMap ? (
        <>
          <div className="relative mt-3 h-[380px] sm:h-[440px]">
            <CityMap3D
              views={views}
              selectedDistrict={selectedDistrict}
              focusDistrict={focusDistrict}
              focusKey={focusKey}
              onSelect={onSelect}
              onFail={setFailure}
            />
          </div>
          <Legend />
        </>
      ) : (
        <div className="p-4 pt-3">
          {failure && mode === "map" && (
            <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
              {failure} Показываем условную схему — расчёт работает так же.
            </p>
          )}
          <DistrictMap
            districts={districts}
            highlightIds={highlightIds}
            selectedDistrict={selectedDistrict}
            onSelect={onSelect}
            bare
          />
        </div>
      )}
    </section>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs text-ink-muted">
      {LEGEND_STOPS.map(({ delta, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: deltaColor(delta) }} aria-hidden />
          {label}
        </span>
      ))}
      <span className="ml-auto">Границы — OpenStreetMap, показатели синтетические</span>
    </div>
  );
}
