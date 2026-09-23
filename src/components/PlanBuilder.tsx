"use client";

import {
  BUDGET,
  DIRECTION_LABELS,
  DISTRICTS,
  MEASURES,
  type Decision,
  type Direction,
  type DistrictId,
  type MeasureId,
  MEASURE_BY_ID,
} from "@/lib/engine";
import { cn, fmt } from "@/lib/utils";

const DIRECTIONS: Direction[] = [
  "transport",
  "ecology",
  "social",
  "safety",
  "services",
];

interface Props {
  decisions: (Decision | null)[];
  activeSlot: number;
  districtForPicker: DistrictId;
  onPickMeasure: (measureId: MeasureId) => void;
  onSetDistrict: (districtId: DistrictId) => void;
  onSelectSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
  directionCounts: Record<Direction, number>;
}

export function PlanBuilder({
  decisions,
  activeSlot,
  districtForPicker,
  onPickMeasure,
  onSetDistrict,
  onSelectSlot,
  onClearSlot,
  directionCounts,
}: Props) {
  const used = new Set(
    decisions.filter(Boolean).map((d) => (d as Decision).measureId),
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(13,39,68,0.04)]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Пять решений
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Выберите слот, район (для районных мер) и мероприятие. Максимум 2
            меры на направление.
          </p>
        </div>
        <BudgetPill
          cost={decisions.reduce((s, d) => {
            if (!d) return s;
            return s + MEASURE_BY_ID[d.measureId].cost;
          }, 0)}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        {decisions.map((decision, index) => {
          const measure = decision
            ? MEASURE_BY_ID[decision.measureId]
            : null;
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectSlot(index)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                activeSlot === index
                  ? "border-teal bg-teal-soft ring-2 ring-teal/30"
                  : "border-line bg-bg hover:border-teal/50",
              )}
            >
              <div className="text-[11px] font-medium text-ink-muted">
                Решение {index + 1}
              </div>
              {measure ? (
                <>
                  <div className="mt-1 text-sm font-semibold leading-snug">
                    {measure.id}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                    {measure.nameRu}
                    {decision?.districtId
                      ? ` · ${DISTRICTS.find((d) => d.id === decision.districtId)?.nameRu}`
                      : " · город"}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-warn underline-offset-2 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearSlot(index);
                    }}
                  >
                    Очистить
                  </button>
                </>
              ) : (
                <div className="mt-2 text-sm text-ink-muted">Пусто</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-ink-muted">
          Район для районных мер:
        </span>
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSetDistrict(d.id)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
              districtForPicker === d.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-bg text-ink hover:border-ink/40",
            )}
          >
            {d.nameRu}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {DIRECTIONS.map((dir) => (
          <span
            key={dir}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              directionCounts[dir] >= 2
                ? "bg-warn-soft text-warn"
                : "bg-bg text-ink-muted",
            )}
          >
            {DIRECTION_LABELS[dir]}: {directionCounts[dir]}/2
          </span>
        ))}
      </div>

      <div className="grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {MEASURES.map((m) => {
          const blockedDirection = directionCounts[m.direction] >= 2 && !used.has(m.id);
          const taken = used.has(m.id);
          const disabled = taken || blockedDirection;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled && !taken}
              onClick={() => onPickMeasure(m.id)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition",
                taken
                  ? "border-teal/40 bg-teal-soft/60"
                  : disabled
                    ? "cursor-not-allowed border-line bg-bg opacity-45"
                    : "border-line bg-bg hover:border-teal hover:bg-teal-soft/40",
              )}
              title={
                blockedDirection
                  ? "Уже 2 меры этого направления"
                  : taken
                    ? "Уже выбрано"
                    : undefined
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    {m.id} · {DIRECTION_LABELS[m.direction]}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">{m.nameRu}</div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-semibold">{m.cost}</div>
                  <div className="text-ink-muted">
                    {m.scope === "city" ? "город" : "район"} · L{m.lag}
                  </div>
                </div>
              </div>
              {disabled && !taken && (
                <div className="mt-1 text-[11px] text-warn">
                  {blockedDirection
                    ? "Лимит направления — уберите другую меру"
                    : "Недоступно"}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BudgetPill({ cost }: { cost: number }) {
  const over = cost > BUDGET;
  const pct = Math.min(100, (cost / BUDGET) * 100);
  return (
    <div className="min-w-[160px]">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ink-muted">Бюджет</span>
        <span className={cn("font-semibold", over && "text-crit")}>
          {fmt(cost, 0)} / {BUDGET}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-deep">
        <div
          className={cn("h-full rounded-full", over ? "bg-crit" : "bg-teal")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
