"use client";

import { motion, useReducedMotion } from "motion/react";
import type { DistrictId, DistrictResult } from "@/lib/engine";
import { cn, fmt } from "@/lib/utils";

const SHAPES: Record<
  DistrictId,
  { d: string; labelX: number; labelY: number }
> = {
  esil: {
    d: "M 210 40 L 360 55 L 375 150 L 280 185 L 195 140 Z",
    labelX: 280,
    labelY: 105,
  },
  almaty: {
    d: "M 360 55 L 470 90 L 455 200 L 375 210 L 375 150 Z",
    labelX: 415,
    labelY: 135,
  },
  saryarka: {
    d: "M 120 130 L 195 140 L 280 185 L 250 270 L 130 250 L 95 180 Z",
    labelX: 175,
    labelY: 200,
  },
  baikonur: {
    d: "M 280 185 L 375 210 L 360 290 L 250 270 Z",
    labelX: 315,
    labelY: 240,
  },
  nura: {
    d: "M 375 210 L 455 200 L 480 280 L 400 320 L 360 290 Z",
    labelX: 415,
    labelY: 260,
  },
};

interface Props {
  districts: DistrictResult[] | null;
  highlightIds: DistrictId[];
  selectedDistrict: DistrictId | null;
  onSelect: (id: DistrictId) => void;
  /** Render without its own card and heading, for embedding in another panel. */
  bare?: boolean;
}

export function DistrictMap({
  districts,
  highlightIds,
  selectedDistrict,
  onSelect,
  bare = false,
}: Props) {
  const reduce = useReducedMotion();

  function fillFor(id: DistrictId): string {
    const row = districts?.find((d) => d.id === id);
    if (!row) return "var(--map-idle)";
    if (row.delta > 0.15) return "var(--map-hot)";
    if (row.delta < -0.05) return "var(--warn)";
    return "var(--map-cold)";
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !bare && "rounded-2xl border border-line bg-surface p-4",
      )}
    >
      {bare ? (
        <p className="mb-2 text-xs text-ink-muted">Условная схема, не геометрия города</p>
      ) : (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
            Схема районов
          </h2>
          <p className="text-xs text-ink-muted">Условная схема, не геометрия города</p>
        </div>
      )}

      <svg
        viewBox="60 20 450 320"
        className="h-auto w-full"
        role="img"
        aria-label="Пять условных районов"
      >
        {(Object.keys(SHAPES) as DistrictId[]).map((id) => {
          const shape = SHAPES[id];
          const row = districts?.find((d) => d.id === id);
          const lit = highlightIds.includes(id) || selectedDistrict === id;
          return (
            <g key={id}>
              <motion.path
                d={shape.d}
                fill={fillFor(id)}
                stroke={lit ? "var(--ink)" : "var(--surface)"}
                strokeWidth={lit ? 3 : 2}
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={row?.nameRu ?? id}
                onClick={() => onSelect(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(id);
                  }
                }}
                animate={
                  reduce
                    ? undefined
                    : lit
                      ? { scale: 1.02 }
                      : { scale: 1 }
                }
                style={{ transformOrigin: `${shape.labelX}px ${shape.labelY}px` }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
              />
              <text
                x={shape.labelX}
                y={shape.labelY}
                textAnchor="middle"
                className="pointer-events-none select-none"
                fill="var(--ink)"
                fontSize="13"
                fontWeight="600"
              >
                {row?.nameRu ?? id}
              </text>
              {row && (
                <text
                  x={shape.labelX}
                  y={shape.labelY + 16}
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                  fill="var(--ink)"
                  fontSize="11"
                  opacity="0.85"
                >
                  {fmt(row.after, 1)}
                  {row.delta !== 0
                    ? ` (${row.delta > 0 ? "+" : ""}${fmt(row.delta, 1)})`
                    : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(districts ?? []).map((d) => (
          <li
            key={d.id}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs",
              highlightIds.includes(d.id) ? "bg-teal-soft" : "bg-bg",
            )}
          >
            <div className="font-medium">{d.nameRu}</div>
            <div className="text-ink-muted">
              {d.critical.length > 0
                ? `крит.: ${d.critical.join(", ")}`
                : "без критических"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
