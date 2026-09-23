"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import {
  CRITICAL_THRESHOLD,
  DISTRICT_BY_ID,
  INDICATORS,
  INDICATOR_META,
  MEASURE_BY_ID,
  type Decision,
  type DistrictId,
  type Indicator,
  type MeasureId,
} from "@/lib/engine";
import { deltaColor } from "@/lib/geo";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn, fmt } from "@/lib/utils";

export interface SchematicDistrict {
  id: DistrictId;
  nameRu: string;
  populationShare: number;
  before: number;
  after: number;
  delta: number;
  indicatorsBefore: Record<Indicator, number>;
  indicatorsAfter: Record<Indicator, number>;
  critical: Indicator[];
}

export interface Placement {
  slot: number;
  measureId: MeasureId;
  districtId?: DistrictId;
}

interface Props {
  districts: SchematicDistrict[];
  /** True when the numbers come from a scored, valid plan rather than the base data. */
  scored: boolean;
  weakestId: DistrictId;
  placements: Placement[];
  preview: Decision | null;
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
}

/** Reading order of the tiles; also the arrow-key order. */
const ORDER: DistrictId[] = ["saryarka", "baikonur", "almaty", "nura", "esil"];

/** Right bank above the river, left bank below it; not to scale. */
const GRID_AREAS = `"saryarka baikonur almaty" "river river river" "nura esil esil"`;

const EASE = [0.23, 1, 0.32, 1] as const;

function signed(n: number, digits = 2) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), digits)}`;
}

function changed(delta: number) {
  return Math.abs(delta) >= 0.005;
}

export function DistrictSchematic({
  districts,
  scored,
  weakestId,
  placements,
  preview,
  selected,
  onSelect,
}: Props) {
  const refs = useRef<Partial<Record<DistrictId, HTMLButtonElement | null>>>({});
  const byId = Object.fromEntries(districts.map((d) => [d.id, d])) as Record<
    DistrictId,
    SchematicDistrict
  >;
  const cityPlacements = placements.filter((p) => !p.districtId);
  const previewIsCity = preview !== null && MEASURE_BY_ID[preview.measureId].scope === "city";

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = ORDER.indexOf(selected);
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let next: number | null = null;
    if (event.key in step) next = (index + step[event.key] + ORDER.length) % ORDER.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = ORDER.length - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect(ORDER[next]);
    refs.current[ORDER[next]]?.focus();
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-ink">Условная схема</p>
        <p className="text-xs text-ink-muted">
          Цель районных мер: <strong className="text-ink">{DISTRICT_BY_ID[selected].nameRu}</strong>
        </p>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        Расположение упрощено. Показатели синтетические: это модель задачи, а не прогноз города.
      </p>

      <div
        className={cn(
          "mt-3 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-colors duration-200",
          previewIsCity ? "border-dashed border-teal bg-teal-soft/50" : "border-line bg-bg",
        )}
      >
        <span className="font-medium text-ink-muted">Весь город</span>
        <AnimatePresence initial={false}>
          {cityPlacements.map((p) => (
            <MeasureChip key={`${p.slot}-${p.measureId}`} slot={p.slot} measureId={p.measureId} />
          ))}
          {previewIsCity && preview && (
            <MeasureChip key="preview" measureId={preview.measureId} ghost />
          )}
        </AnimatePresence>
        {cityPlacements.length === 0 && !previewIsCity && (
          <span className="text-ink-muted/80">городских мер пока нет</span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Условная схема: район для районных мер"
        onKeyDown={onKeyDown}
        className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1"
        style={{ gridTemplateAreas: GRID_AREAS }}
      >
        {ORDER.map((id) => {
          const d = byId[id];
          const isSelected = selected === id;
          const here = placements.filter((p) => p.districtId === id);
          const previewHere =
            preview !== null && !previewIsCity && preview.districtId === id;
          const tone = scored && changed(d.delta) ? deltaColor(d.delta) : null;
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(id)}
              style={{
                gridArea: id,
                backgroundColor: tone
                  ? `color-mix(in srgb, ${tone} 20%, var(--surface))`
                  : undefined,
                borderColor: tone ? `color-mix(in srgb, ${tone} 60%, var(--line))` : undefined,
              }}
              className={cn(
                "relative flex min-h-[7.5rem] flex-col rounded-xl border bg-bg p-2.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out motion-safe:active:scale-[0.98]",
                !tone && "border-line hover:border-ink/30",
                isSelected && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                previewHere && "outline-2 outline-offset-2 outline-teal outline-dashed",
              )}
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-1">
                <span className="text-sm font-semibold leading-tight text-ink">{d.nameRu}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">
                  {Math.round(d.populationShare * 100)}%
                  <span className="sr-only"> жителей</span>
                </span>
              </span>
              <span className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-none text-ink sm:text-xl">
                <span className="sr-only">Оценка района </span>
                <NumberTicker value={d.after} decimals={2} duration={0.5} />
              </span>
              <span
                className={cn(
                  "mt-1 text-xs font-semibold tabular-nums",
                  !scored || !changed(d.delta)
                    ? "text-ink-muted"
                    : d.delta > 0
                      ? "text-good"
                      : "text-crit",
                )}
              >
                {scored ? (changed(d.delta) ? signed(d.delta) : "без изменений") : "до решений"}
              </span>
              <span className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                {id === weakestId && (
                  <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">
                    слабейший
                  </span>
                )}
                {d.critical.length > 0 && (
                  <span className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[10px] font-medium text-warn">
                    ниже 40: {d.critical.length}
                  </span>
                )}
                <AnimatePresence initial={false}>
                  {here.map((p) => (
                    <MeasureChip key={`${p.slot}-${p.measureId}`} slot={p.slot} measureId={p.measureId} />
                  ))}
                  {previewHere && preview && (
                    <MeasureChip key="preview" measureId={preview.measureId} ghost />
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
        <River />
      </div>

      <DistrictDetail district={byId[selected]} scored={scored} preview={preview} />
    </div>
  );
}

function River() {
  return (
    <div aria-hidden className="relative h-5" style={{ gridArea: "river" }}>
      <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path
          d="M0 12 C 40 2, 70 18, 110 10 S 180 4, 220 12 S 280 16, 300 8"
          fill="none"
          stroke="var(--map-cold)"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 bg-surface px-1 text-[10px] text-ink-muted">
        река Есиль
      </span>
    </div>
  );
}

function MeasureChip({
  measureId,
  slot,
  ghost = false,
}: {
  measureId: MeasureId;
  slot?: number;
  ghost?: boolean;
}) {
  const measure = MEASURE_BY_ID[measureId];
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2, ease: EASE }}
      title={`${measure.id} «${measure.nameRu}»`}
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        ghost
          ? "border border-dashed border-teal-deep text-teal-deep"
          : "bg-surface text-ink ring-1 ring-line",
      )}
    >
      {ghost ? (
        <>
          <span className="sr-only">Предпросмотр: </span>+{measure.id}
        </>
      ) : (
        <>
          <span className="sr-only">Решение {(slot ?? 0) + 1}: </span>
          {measure.id}
        </>
      )}
    </motion.span>
  );
}

function DistrictDetail({
  district,
  scored,
  preview,
}: {
  district: SchematicDistrict;
  scored: boolean;
  preview: Decision | null;
}) {
  const previewMeasure = preview ? MEASURE_BY_ID[preview.measureId] : null;
  const previewReaches =
    previewMeasure !== null &&
    (previewMeasure.scope === "city" || preview?.districtId === district.id);
  const touched = new Set<Indicator>(
    previewReaches && previewMeasure ? (Object.keys(previewMeasure.effects) as Indicator[]) : [],
  );

  return (
    <section
      aria-labelledby="district-detail-title"
      className="mt-4 rounded-xl border border-line bg-bg/60 p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id="district-detail-title" className="text-sm font-semibold text-ink">
          {district.nameRu}: десять показателей
        </h3>
        <span className="text-[11px] text-ink-muted">
          порог {CRITICAL_THRESHOLD}, ниже него штраф к Score
        </span>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">{DISTRICT_BY_ID[district.id].profile}</p>
      {previewReaches && previewMeasure && (
        <p className="mt-1 text-xs text-teal-deep">
          {previewMeasure.id} затрагивает отмеченные показатели. Точный эффект появится в итогах.
        </p>
      )}

      <ul className="mt-2 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {INDICATORS.map((k) => {
          const before = district.indicatorsBefore[k];
          const after = district.indicatorsAfter[k];
          const moved = scored && changed(after - before);
          const critical = after < CRITICAL_THRESHOLD;
          return (
            <li key={k} className="text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("flex items-center gap-1", critical ? "text-warn" : "text-ink")}>
                  {touched.has(k) && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-deep" aria-hidden />
                  )}
                  {INDICATOR_META[k].labelRu}
                  {touched.has(k) && <span className="sr-only"> (затрагивает {previewMeasure?.id})</span>}
                </span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {moved ? (
                    <>
                      {fmt(before, 1)} → <span className="font-semibold text-ink">{fmt(after, 1)}</span>
                    </>
                  ) : (
                    <span className={cn("font-semibold", critical ? "text-warn" : "text-ink")}>
                      {fmt(after, 1)}
                    </span>
                  )}
                </span>
              </div>
              <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-bg-deep" aria-hidden>
                <motion.div
                  className={cn("absolute inset-y-0 left-0 w-full origin-left rounded-full", critical ? "bg-warn" : "bg-teal")}
                  initial={false}
                  animate={{ scaleX: after / 100 }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
                {moved && (
                  <span
                    className="absolute inset-y-0 w-px bg-ink/60"
                    style={{ left: `${before}%` }}
                  />
                )}
                <span
                  className="absolute inset-y-0 w-px bg-ink/25"
                  style={{ left: `${CRITICAL_THRESHOLD}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
