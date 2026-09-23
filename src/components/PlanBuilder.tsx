"use client";

import {
  BUDGET,
  DIRECTION_LABELS,
  DISTRICT_BY_ID,
  DISTRICTS,
  MAX_PER_DIRECTION,
  MEASURES,
  MEASURE_BY_ID,
  type Decision,
  type Direction,
  type DistrictId,
  type MeasureId,
} from "@/lib/engine";
import { useState } from "react";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { cn } from "@/lib/utils";

const DIRECTIONS: Direction[] = ["transport", "ecology", "social", "safety", "services"];

interface Props {
  decisions: (Decision | null)[];
  activeSlot: number;
  districtForPicker: DistrictId;
  blockers: Record<MeasureId, string | null>;
  directionCounts: Record<Direction, number>;
  cost: number;
  onPickMeasure: (measureId: MeasureId) => void;
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
  onPickMeasure,
  onSetDistrict,
  onSelectSlot,
  onClearSlot,
}: Props) {
  const activeDecision = decisions[activeSlot];
  const [filter, setFilter] = useState<Direction | "all">("all");

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
        <BudgetMeter cost={cost} />
      </div>

      <ol className="mb-5 grid gap-2 sm:grid-cols-5">
        {decisions.map((decision, index) => {
          const measure = decision ? MEASURE_BY_ID[decision.measureId] : null;
          const active = activeSlot === index;
          return (
            <li
              key={index}
              className={cn(
                "relative rounded-xl border transition-colors",
                active
                  ? "border-teal bg-teal-soft ring-2 ring-teal/30"
                  : "border-line bg-bg hover:border-teal/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectSlot(index)}
                aria-pressed={active}
                className="block w-full rounded-xl px-3 pb-10 pt-3 text-left transition-transform duration-150 ease-out motion-safe:active:scale-[0.98]"
              >
                <span className="block text-[11px] font-medium text-ink-muted">
                  Решение {index + 1}
                </span>
                {measure ? (
                  <>
                    <span className="mt-1 block text-sm font-semibold">
                      {measure.id} · {measure.cost}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted">
                      {measure.nameRu}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-ink">
                      {decision?.districtId
                        ? DISTRICT_BY_ID[decision.districtId].nameRu
                        : "Весь город"}
                    </span>
                  </>
                ) : (
                  <span className="mt-2 block text-sm text-ink-muted">
                    {active ? "Выберите меру ниже" : "Пусто"}
                  </span>
                )}
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        className="grid max-h-[380px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
      >
        {MEASURES.filter((m) => filter === "all" || m.direction === filter).map((m) => {
          const inActive = activeDecision?.measureId === m.id;
          const blocker = inActive ? null : blockers[m.id];
          return (
            <button
              key={m.id}
              type="button"
              disabled={Boolean(blocker)}
              onClick={() => onPickMeasure(m.id)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150 ease-out",
                inActive
                  ? "border-teal bg-teal-soft"
                  : blocker
                    ? "cursor-not-allowed border-line bg-bg/60"
                    : "border-line bg-bg hover:border-teal hover:bg-teal-soft/40 motion-safe:active:scale-[0.98]",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className={cn(blocker && "opacity-50")}>
                  <span className="block text-sm font-semibold">
                    {m.id} · {DIRECTION_LABELS[m.direction]}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{m.nameRu}</span>
                </span>
                <span className={cn("shrink-0 text-right text-xs", blocker && "opacity-50")}>
                  <span className="block font-semibold">{m.cost}</span>
                  <span className="block text-ink-muted">
                    {m.scope === "city" ? "город" : "район"} · лаг {m.lag}
                  </span>
                </span>
              </span>
              {blocker && <span className="mt-1 block text-[11px] text-warn">{blocker}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BudgetMeter({ cost }: { cost: number }) {
  const share = Math.min(1, cost / BUDGET);
  return (
    <div
      className="min-w-[180px]"
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
      <div className="h-2 overflow-hidden rounded-full bg-bg-deep">
        <div
          className="h-full origin-left rounded-full bg-teal transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </div>
  );
}
