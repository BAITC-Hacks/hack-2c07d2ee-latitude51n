"use client";

import {
  BUDGET,
  DIRECTION_LABELS,
  DISTRICT_BY_ID,
  DISTRICTS,
  MAX_PER_DIRECTION,
  MEASURES,
  MEASURE_BY_ID,
  REQUIRED_DECISIONS,
  type Decision,
  type Direction,
  type DistrictId,
  type MeasureId,
} from "@/lib/engine";
import { AnimatePresence, motion } from "motion/react";
import { useState, type PointerEvent } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { cn, fmt } from "@/lib/utils";

const DIRECTIONS: Direction[] = ["transport", "ecology", "social", "safety", "services"];

const EASE = [0.23, 1, 0.32, 1] as const;

export interface Blocker {
  kind: "duplicate" | "budget" | "rule";
  reason: string;
  /** Slot that already holds this measure (duplicate only). */
  slot?: number;
  /** Other slots where this measure could go instead and keep the plan within the rules. */
  swaps: number[];
  /** Other districts where this district measure would be allowed. */
  districts: DistrictId[];
}

export type PlanStatus =
  | { kind: "partial"; filled: number }
  | { kind: "invalid" }
  | { kind: "valid"; score: number };

interface Props {
  decisions: (Decision | null)[];
  activeSlot: number;
  districtForPicker: DistrictId;
  blockers: Record<MeasureId, Blocker | null>;
  directionCounts: Record<Direction, number>;
  cost: number;
  previewId: MeasureId | null;
  status: PlanStatus;
  onPickMeasure: (measureId: MeasureId, districtId?: DistrictId) => void;
  onPlaceAt: (slot: number, measureId: MeasureId) => void;
  onPreview: (measureId: MeasureId | null) => void;
  onSetDistrict: (districtId: DistrictId) => void;
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
}

export function PlanBuilder({
  decisions,
  activeSlot,
  districtForPicker,
  blockers,
  directionCounts,
  cost,
  previewId,
  status,
  onPickMeasure,
  onPlaceAt,
  onPreview,
  onSetDistrict,
  onSelectSlot,
  onClearSlot,
}: Props) {
  const activeDecision = decisions[activeSlot];
  const [filter, setFilter] = useState<Direction | "all">("all");

  function hover(measureId: MeasureId | null) {
    return (event: PointerEvent) => {
      if (event.pointerType === "mouse") onPreview(measureId);
    };
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Пять решений
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Выберите слот, затем район и мероприятие. Городские меры действуют во всех
            районах.
          </p>
        </div>
        <BudgetMeter
          decisions={decisions}
          activeSlot={activeSlot}
          cost={cost}
          previewId={previewId}
        />
      </div>

      <ol className="grid gap-2 sm:grid-cols-5" aria-label="Слоты решений">
        {decisions.map((decision, index) => {
          const measure = decision ? MEASURE_BY_ID[decision.measureId] : null;
          const active = activeSlot === index;
          return (
            <li
              key={index}
              className={cn(
                "relative rounded-xl border transition-colors duration-200",
                measure ? "border-line bg-surface" : "border-dashed border-line bg-bg",
                active && "border-transparent bg-teal-soft/60",
                !active && "hover:border-teal/50",
              )}
            >
              {active && (
                <motion.span
                  layoutId="active-slot"
                  aria-hidden
                  className="pointer-events-none absolute -inset-px rounded-xl ring-2 ring-teal"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              )}
              <button
                type="button"
                onClick={() => onSelectSlot(index)}
                aria-pressed={active}
                className="relative block min-h-[7.25rem] w-full rounded-xl px-3 pb-10 pt-3 text-left transition-transform duration-150 ease-out motion-safe:active:scale-[0.98]"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums transition-colors duration-200",
                      measure ? "bg-ink text-white" : "bg-bg-deep text-ink-muted",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="sr-only">Решение {index + 1}</span>
                  <span aria-hidden>{measure ? DIRECTION_LABELS[measure.direction] : "Решение"}</span>
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  {measure && decision ? (
                    <motion.span
                      key={`${decision.measureId}-${decision.districtId ?? "city"}`}
                      className="block"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      <span className="mt-1.5 block text-sm font-semibold tabular-nums">
                        {measure.id} · {measure.cost}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">
                        {measure.nameRu}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-ink">
                        {decision.districtId
                          ? DISTRICT_BY_ID[decision.districtId].nameRu
                          : "Весь город"}
                      </span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="empty"
                      className="mt-2 block text-sm text-ink-muted"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {active ? "Выберите меру ниже" : "Пусто"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              {measure && (
                <button
                  type="button"
                  onClick={() => onClearSlot(index)}
                  aria-label={`Убрать ${measure.id} из решения ${index + 1}`}
                  className="absolute bottom-1 left-1.5 inline-flex min-h-8 items-center rounded-lg px-1.5 text-xs font-medium text-warn underline-offset-2 hover:underline focus-visible:underline"
                >
                  Убрать
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <StatusLine status={status} />

      <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-ink-muted">Район для районных мер:</span>
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSetDistrict(d.id)}
            aria-pressed={districtForPicker === d.id}
            className={cn(
              "min-h-9 rounded-lg border px-3 text-xs font-medium transition-[background-color,border-color,transform] duration-150 ease-out motion-safe:active:scale-[0.97]",
              districtForPicker === d.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-bg text-ink hover:border-ink/40",
            )}
          >
            {d.nameRu}
          </button>
        ))}
      </div>
      {activeDecision?.districtId && (
        <p className="-mt-1 mb-3 text-xs text-ink-muted">
          Выбор района перенесёт {activeDecision.measureId} из решения {activeSlot + 1} в
          этот район.
        </p>
      )}

      <AnimatedTabs
        label="Направления"
        value={filter}
        onValueChange={setFilter}
        className="mb-3 flex-wrap gap-1 rounded-xl bg-bg p-1"
        indicatorClassName="rounded-lg bg-surface shadow-sm ring-1 ring-line"
        tabClassName="min-h-9 rounded-lg px-3 text-xs font-medium text-ink-muted transition-colors data-[checked=true]:text-ink"
        tabs={[
          { id: "all", label: "Все" },
          ...DIRECTIONS.map((dir) => ({
            id: dir,
            label: (
              <>
                {DIRECTION_LABELS[dir]}{" "}
                <span
                  className={cn(
                    "tabular-nums",
                    directionCounts[dir] >= MAX_PER_DIRECTION && "text-warn",
                  )}
                >
                  {directionCounts[dir]}/{MAX_PER_DIRECTION}
                </span>
              </>
            ),
          })),
        ]}
      />

      <div
        role="tabpanel"
        aria-label={filter === "all" ? "Все мероприятия" : DIRECTION_LABELS[filter]}
        className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
        onPointerLeave={hover(null)}
      >
        {MEASURES.filter((m) => filter === "all" || m.direction === filter).map((m) => {
          const inActive = activeDecision?.measureId === m.id;
          const blocker = inActive ? null : blockers[m.id];
          const noteId = `blocker-${m.id}`;
          return (
            <div
              key={m.id}
              onPointerEnter={hover(m.id)}
              className={cn(
                "rounded-xl border transition-[background-color,border-color] duration-150 ease-out",
                inActive
                  ? "border-teal bg-teal-soft"
                  : blocker
                    ? "border-line bg-bg/60"
                    : "border-line bg-bg hover:border-teal hover:bg-teal-soft/40",
              )}
            >
              <button
                type="button"
                aria-disabled={blocker ? true : undefined}
                aria-describedby={blocker ? noteId : undefined}
                onFocus={() => onPreview(m.id)}
                onBlur={() => onPreview(null)}
                onClick={() => {
                  if (!blocker) onPickMeasure(m.id);
                }}
                className={cn(
                  "block w-full rounded-xl px-3 py-2.5 text-left transition-transform duration-150 ease-out",
                  blocker ? "cursor-not-allowed" : "motion-safe:active:scale-[0.98]",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className={cn(blocker && "opacity-55")}>
                    <span className="block text-sm font-semibold">
                      {m.id} · {DIRECTION_LABELS[m.direction]}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">{m.nameRu}</span>
                  </span>
                  <span className={cn("shrink-0 text-right text-xs", blocker && "opacity-55")}>
                    <span className="block font-semibold tabular-nums">{m.cost}</span>
                    <span className="block text-ink-muted">
                      {m.scope === "city" ? "город" : "район"} · лаг {m.lag}
                    </span>
                  </span>
                </span>
              </button>
              {blocker && (
                <BlockerNote
                  id={noteId}
                  blocker={blocker}
                  measureId={m.id}
                  decisions={decisions}
                  onPlaceAt={onPlaceAt}
                  onPickMeasure={onPickMeasure}
                  onSelectSlot={onSelectSlot}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusLine({ status }: { status: PlanStatus }) {
  if (status.kind === "partial") {
    const left = REQUIRED_DECISIONS - status.filled;
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: REQUIRED_DECISIONS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-5 rounded-full transition-colors duration-300",
                i < status.filled ? "bg-teal" : "bg-bg-deep",
              )}
            />
          ))}
        </span>
        Заполнено {status.filled} из {REQUIRED_DECISIONS}.{" "}
        {left === 1 ? "Осталось одно решение до итогов." : `Осталось ${left} до итогов.`}
      </p>
    );
  }
  if (status.kind === "invalid") {
    return (
      <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
        План нарушает правила, поэтому Score не считается.{" "}
        <a href="#results" className="font-semibold underline underline-offset-2">
          Что исправить
        </a>
      </p>
    );
  }
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-teal-soft px-3 py-2 text-xs text-ink"
    >
      <span>
        План готов. Score <strong className="tabular-nums">{fmt(status.score, 5)}</strong>
      </span>
      <a
        href="#results"
        className="inline-flex min-h-8 items-center rounded-md px-1 font-semibold text-teal-deep underline-offset-2 hover:underline"
      >
        Смотреть итоги ↓
      </a>
    </motion.p>
  );
}

function BlockerNote({
  id,
  blocker,
  measureId,
  decisions,
  onPlaceAt,
  onPickMeasure,
  onSelectSlot,
}: {
  id: string;
  blocker: Blocker;
  measureId: MeasureId;
  decisions: (Decision | null)[];
  onPlaceAt: (slot: number, measureId: MeasureId) => void;
  onPickMeasure: (measureId: MeasureId, districtId?: DistrictId) => void;
  onSelectSlot: (index: number) => void;
}) {
  const action =
    "inline-flex min-h-8 items-center rounded-lg border border-line bg-surface px-2 text-[11px] font-medium text-ink transition-[border-color,transform] duration-150 ease-out hover:border-teal motion-safe:active:scale-[0.97]";
  const hint =
    blocker.kind === "duplicate"
      ? null
      : blocker.swaps.length === 0 && blocker.districts.length === 0
        ? blocker.kind === "budget"
          ? "Одной заменой в бюджет не уложиться: уберите более дорогую меру."
          : "Сначала уберите конфликтующую меру."
        : null;

  return (
    <div id={id} className="px-3 pb-2.5">
      <p className="text-[11px] text-warn">{blocker.reason}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {blocker.kind === "duplicate" && blocker.slot !== undefined && (
          <button type="button" className={action} onClick={() => onSelectSlot(blocker.slot!)}>
            Открыть решение {blocker.slot + 1}
          </button>
        )}
        {blocker.swaps.slice(0, 2).map((slot) => (
          <button
            key={slot}
            type="button"
            className={action}
            onClick={() => onPlaceAt(slot, measureId)}
          >
            Вместо решения {slot + 1} ({decisions[slot]?.measureId})
          </button>
        ))}
        {blocker.districts.slice(0, 2).map((districtId) => (
          <button
            key={districtId}
            type="button"
            className={action}
            onClick={() => onPickMeasure(measureId, districtId)}
          >
            В район {DISTRICT_BY_ID[districtId].nameRu}
          </button>
        ))}
      </div>
    </div>
  );
}

function BudgetMeter({
  decisions,
  activeSlot,
  cost,
  previewId,
}: {
  decisions: (Decision | null)[];
  activeSlot: number;
  cost: number;
  previewId: MeasureId | null;
}) {
  const preview = previewId && decisions[activeSlot]?.measureId !== previewId ? previewId : null;
  const segments = decisions.flatMap((d, slot) => {
    if (slot === activeSlot && preview) {
      return [{ key: `preview-${preview}`, slot, cost: MEASURE_BY_ID[preview].cost, preview: true }];
    }
    return d
      ? [{ key: `${slot}-${d.measureId}`, slot, cost: MEASURE_BY_ID[d.measureId].cost, preview: false }]
      : [];
  });
  const previewTotal = segments.reduce((sum, s) => sum + s.cost, 0);
  const scale = Math.max(BUDGET, previewTotal);
  const over = preview !== null && previewTotal > BUDGET;

  return (
    <div
      className="w-full min-w-[220px] sm:w-64"
      role="meter"
      aria-label="Бюджет"
      aria-valuemin={0}
      aria-valuemax={BUDGET}
      aria-valuenow={cost}
      aria-valuetext={`Потрачено ${cost} из ${BUDGET}, остаток ${BUDGET - cost}`}
    >
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span className="text-ink-muted">Бюджет</span>
        <span className="font-semibold tabular-nums">
          {cost} / {BUDGET} · остаток {BUDGET - cost}
        </span>
      </div>
      <div className="relative flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-bg-deep">
        {segments.map((s) => (
          <motion.div
            key={s.key}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ flexBasis: `${(s.cost / scale) * 100}%` }}
            className={cn(
              "h-full shrink-0 first:rounded-l-full",
              s.preview
                ? over
                  ? "bg-[repeating-linear-gradient(135deg,var(--warn)_0_3px,var(--warn-soft)_3px_6px)]"
                  : "bg-[repeating-linear-gradient(135deg,var(--teal)_0_3px,var(--teal-soft)_3px_6px)]"
                : s.slot === activeSlot
                  ? "bg-teal-deep"
                  : "bg-teal",
            )}
          />
        ))}
        {over && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-0.5 bg-ink"
            style={{ left: `${(BUDGET / scale) * 100}%` }}
          />
        )}
      </div>
      <p className={cn("mt-1 min-h-4 text-[11px] tabular-nums", over ? "text-warn" : "text-ink-muted")}>
        {preview
          ? over
            ? `С ${preview}: ${previewTotal} из ${BUDGET}, не хватает ${previewTotal - BUDGET}`
            : `С ${preview}: ${previewTotal} из ${BUDGET}, останется ${BUDGET - previewTotal}`
          : " "}
      </p>
    </div>
  );
}
