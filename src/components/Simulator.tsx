"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CityMapPanel } from "@/components/CityMapPanel";
import { PlanBuilder } from "@/components/PlanBuilder";
import { ResultsPanel } from "@/components/ResultsPanel";
import {
  BUDGET,
  DISTRICTS,
  MEASURES,
  MEASURE_BY_ID,
  REFERENCE_PLAN,
  baseDistrictScores,
  improveOneDecision,
  scorePlan,
  validateDecisions,
  type Decision,
  type Direction,
  type DistrictId,
  type ImproveSuggestion,
  type MeasureId,
} from "@/lib/engine";
import type { DistrictView } from "@/lib/geo";

const EMPTY: (Decision | null)[] = [null, null, null, null, null];
const BASE_SCORES = baseDistrictScores();

function decisionFor(measureId: MeasureId, districtId: DistrictId): Decision {
  return MEASURE_BY_ID[measureId].scope === "city" ? { measureId } : { measureId, districtId };
}

function viewsFor(slots: (Decision | null)[]): Record<DistrictId, DistrictView> {
  const filled = slots.filter((d): d is Decision => d !== null);
  const result = filled.length === 5 ? scorePlan(filled) : null;
  return Object.fromEntries(
    DISTRICTS.map((d) => {
      const row = result?.valid ? result.districts.find((r) => r.id === d.id) : null;
      return [d.id, row ? { after: row.after, delta: row.delta } : { after: BASE_SCORES[d.id], delta: 0 }];
    }),
  ) as Record<DistrictId, DistrictView>;
}

function mostChanged(
  prev: Record<DistrictId, DistrictView>,
  next: Record<DistrictId, DistrictView>,
): DistrictId | null {
  let best: DistrictId | null = null;
  let bestShift = 0.01;
  for (const d of DISTRICTS) {
    const shift = Math.abs(next[d.id].after - prev[d.id].after);
    if (shift > bestShift) {
      best = d.id;
      bestShift = shift;
    }
  }
  return best;
}

export function Simulator({ initialPlan = null }: { initialPlan?: Decision[] | null }) {
  const [slots, setSlots] = useState<(Decision | null)[]>(initialPlan ?? EMPTY);
  const [activeSlot, setActiveSlot] = useState(0);
  const [districtForPicker, setDistrictForPicker] = useState<DistrictId>("nura");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ImproveSuggestion | null>(null);
  const [improveNote, setImproveNote] = useState<string | null>(null);
  const [analysisLoading, startAnalysis] = useTransition();
  const [improveLoading, startImprove] = useTransition();
  const [focus, setFocus] = useState<{ id: DistrictId | null; key: number }>(() => ({
    id: initialPlan ? mostChanged(viewsFor(EMPTY), viewsFor(initialPlan)) : null,
    key: initialPlan ? 1 : 0,
  }));

  const filled = useMemo(() => slots.filter((d): d is Decision => d !== null), [slots]);
  const views = useMemo(() => viewsFor(slots), [slots]);

  const cost = filled.reduce((sum, d) => sum + MEASURE_BY_ID[d.measureId].cost, 0);

  const directionCounts = useMemo(() => {
    const counts: Record<Direction, number> = {
      transport: 0,
      ecology: 0,
      social: 0,
      safety: 0,
      services: 0,
    };
    for (const d of filled) counts[MEASURE_BY_ID[d.measureId].direction] += 1;
    return counts;
  }, [filled]);

  const blockers = useMemo(() => {
    const others = slots.filter((d, i): d is Decision => d !== null && i !== activeSlot);
    const othersCost = others.reduce((s, d) => s + MEASURE_BY_ID[d.measureId].cost, 0);
    const out = {} as Record<MeasureId, string | null>;
    for (const m of MEASURES) {
      const usedAt = slots.findIndex((d, i) => i !== activeSlot && d?.measureId === m.id);
      if (usedAt >= 0) {
        out[m.id] = `Уже выбрано в решении ${usedAt + 1}`;
        continue;
      }
      if (othersCost + m.cost > BUDGET) {
        out[m.id] = `Не хватает бюджета: нужно ${m.cost}, свободно ${BUDGET - othersCost}`;
        continue;
      }
      const check = validateDecisions([...others, decisionFor(m.id, districtForPicker)], {
        partial: true,
      });
      out[m.id] = check.ok ? null : check.errors[0];
    }
    return out;
  }, [slots, activeSlot, districtForPicker]);

  const result = useMemo(() => (filled.length === 5 ? scorePlan(filled) : null), [filled]);

  const partialIssues = useMemo(
    () => (filled.length < 5 ? validateDecisions(filled, { partial: true }).errors : []),
    [filled],
  );

  const highlightIds = useMemo(() => {
    if (result?.valid) {
      return result.districts.filter((d) => Math.abs(d.delta) > 0.05).map((d) => d.id);
    }
    return filled.map((d) => d.districtId).filter((id): id is DistrictId => Boolean(id));
  }, [result, filled]);

  function resetDerived() {
    setSuggestion(null);
    setImproveNote(null);
    setAnalysis(null);
    setAnalysisError(null);
  }

  function updateSlots(next: (Decision | null)[]) {
    const changed = mostChanged(views, viewsFor(next));
    if (changed) setFocus((f) => ({ id: changed, key: f.key + 1 }));
    setSlots(next);
    resetDerived();
  }

  function pickMeasure(measureId: MeasureId) {
    const next = [...slots];
    next[activeSlot] = decisionFor(measureId, districtForPicker);
    updateSlots(next);
    const nextEmpty = next.findIndex((d) => d === null);
    if (nextEmpty >= 0) setActiveSlot(nextEmpty);
  }

  function setDistrict(districtId: DistrictId) {
    setDistrictForPicker(districtId);
    const current = slots[activeSlot];
    if (current?.districtId && current.districtId !== districtId) {
      const next = [...slots];
      next[activeSlot] = { ...current, districtId };
      updateSlots(next);
    }
  }

  function clearSlot(index: number) {
    const next = [...slots];
    next[index] = null;
    updateSlots(next);
    setActiveSlot(index);
  }

  function loadReference() {
    updateSlots(REFERENCE_PLAN.map((d) => ({ ...d })));
    setActiveSlot(0);
  }

  function reset() {
    updateSlots(EMPTY);
    setActiveSlot(0);
  }

  function runImprove() {
    if (!result?.valid) return;
    startImprove(() => {
      const found = improveOneDecision(filled);
      setSuggestion(found);
      setImproveNote(
        found ? null : "Ни одна допустимая замена одной меры не повышает Score — план локально оптимален.",
      );
    });
  }

  function applyImprove() {
    if (!suggestion) return;
    const next = [...slots];
    next[suggestion.replaceIndex] = { ...suggestion.to };
    updateSlots(next);
    setActiveSlot(suggestion.replaceIndex);
  }

  function runAnalyze() {
    if (!result?.valid) return;
    startAnalysis(async () => {
      setAnalysisError(null);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisions: filled }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok || !data.text) {
          setAnalysisError(data.error ?? "Не удалось получить AI-разбор.");
          return;
        }
        setAnalysis(data.text);
      } catch {
        setAnalysisError("Сервер недоступен. Проверьте, что запущен npm run dev.");
      }
    });
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 outline-none sm:px-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon size={16} weight="bold" aria-hidden />
            <span className="font-[family-name:var(--font-display)] font-bold text-ink">QALA</span>
          </Link>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Аким на 5 часов
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-base">
            У вас 100 единиц бюджета и ровно пять решений. Выберите меры, посмотрите, какие
            районы выиграли, и проверьте, можно ли сделать лучше.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadReference}
            className="min-h-11 rounded-xl bg-ink px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-teal-deep motion-safe:active:scale-[0.97]"
          >
            Загрузить пример организаторов
          </button>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-medium transition-[border-color,transform] duration-150 ease-out hover:border-warn motion-safe:active:scale-[0.97]"
          >
            Начать заново
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <CityMapPanel
            views={views}
            districts={result?.valid ? result.districts : null}
            highlightIds={highlightIds}
            selectedDistrict={districtForPicker}
            focusDistrict={focus.id}
            focusKey={focus.key}
            onSelect={setDistrict}
          />
        </div>
        <PlanBuilder
          decisions={slots}
          activeSlot={activeSlot}
          districtForPicker={districtForPicker}
          blockers={blockers}
          directionCounts={directionCounts}
          cost={cost}
          onPickMeasure={pickMeasure}
          onSetDistrict={setDistrict}
          onSelectSlot={setActiveSlot}
          onClearSlot={clearSlot}
        />
      </div>

      <ResultsPanel
        result={result}
        filled={filled.length}
        partialIssues={partialIssues}
        analysis={analysis}
        analysisError={analysisError}
        analysisLoading={analysisLoading}
        onAnalyze={runAnalyze}
        suggestion={suggestion}
        improveNote={improveNote}
        onImprove={runImprove}
        onApplyImprove={applyImprove}
        improveLoading={improveLoading}
      />
    </main>
  );
}
