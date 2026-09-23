"use client";

import { useMemo, useState, useTransition } from "react";
import { DistrictMap } from "@/components/DistrictMap";
import { PlanBuilder } from "@/components/PlanBuilder";
import { ResultsPanel } from "@/components/ResultsPanel";
import {
  MEASURE_BY_ID,
  REFERENCE_PLAN,
  type Decision,
  type Direction,
  type DistrictId,
  type ImproveSuggestion,
  type MeasureId,
  improveOneDecision,
  scorePlan,
} from "@/lib/engine";

const EMPTY: (Decision | null)[] = [null, null, null, null, null];

export function Simulator() {
  const [slots, setSlots] = useState<(Decision | null)[]>(EMPTY);
  const [activeSlot, setActiveSlot] = useState(0);
  const [districtForPicker, setDistrictForPicker] =
    useState<DistrictId>("nura");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ImproveSuggestion | null>(null);
  const [analysisLoading, startAnalysis] = useTransition();
  const [improveLoading, startImprove] = useTransition();

  const filledDecisions = useMemo(
    () => slots.filter((d): d is Decision => d !== null),
    [slots],
  );

  const directionCounts = useMemo(() => {
    const counts: Record<Direction, number> = {
      transport: 0,
      ecology: 0,
      social: 0,
      safety: 0,
      services: 0,
    };
    for (const d of filledDecisions) {
      counts[MEASURE_BY_ID[d.measureId].direction] += 1;
    }
    return counts;
  }, [filledDecisions]);

  const result = useMemo(() => {
    if (filledDecisions.length !== 5) return null;
    return scorePlan(filledDecisions);
  }, [filledDecisions]);

  const highlightIds = useMemo(() => {
    if (!result || !result.valid) {
      return filledDecisions
        .map((d) => d.districtId)
        .filter((id): id is DistrictId => Boolean(id));
    }
    return result.districts
      .filter((d) => Math.abs(d.delta) > 0.05)
      .map((d) => d.id);
  }, [result, filledDecisions]);

  function pickMeasure(measureId: MeasureId) {
    const measure = MEASURE_BY_ID[measureId];
    const next: Decision =
      measure.scope === "city"
        ? { measureId }
        : { measureId, districtId: districtForPicker };

    setSlots((prev) => {
      const copy = [...prev];
      // If measure already used in another slot, replace that slot instead
      const existing = copy.findIndex(
        (d) => d && d.measureId === measureId,
      );
      if (existing >= 0 && existing !== activeSlot) {
        copy[existing] = null;
      }
      copy[activeSlot] = next;
      return copy;
    });
    setSuggestion(null);
    setAnalysis(null);
    setActiveSlot((s) => Math.min(4, s + 1));
  }

  function clearSlot(index: number) {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = null;
      return copy;
    });
    setSuggestion(null);
    setAnalysis(null);
  }

  function loadReference() {
    setSlots(REFERENCE_PLAN.map((d) => ({ ...d })));
    setSuggestion(null);
    setAnalysis(null);
  }

  function reset() {
    setSlots(EMPTY);
    setSuggestion(null);
    setAnalysis(null);
    setActiveSlot(0);
  }

  function runImprove() {
    if (filledDecisions.length !== 5) return;
    startImprove(() => {
      const found = improveOneDecision(filledDecisions);
      setSuggestion(found);
      if (!found) {
        setAnalysis(
          (prev) =>
            prev ??
            "Лучшей допустимой замены одной меры с ростом Score не найдено.",
        );
      }
    });
  }

  function applyImprove() {
    if (!suggestion) return;
    setSlots((prev) => {
      const copy = [...prev];
      copy[suggestion.replaceIndex] = { ...suggestion.to };
      return copy;
    });
    setSuggestion(null);
    setAnalysis(null);
  }

  function runAnalyze() {
    if (!result || !result.valid) return;
    startAnalysis(async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decisions: filledDecisions,
            result,
            suggestion,
          }),
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) {
          setAnalysis(data.error ?? "Не удалось получить AI-разбор.");
          return;
        }
        setAnalysis(data.text ?? "");
      } catch {
        setAnalysis("Сеть недоступна. Проверьте запуск и OPENAI_API_KEY.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-deep">Latitude51N · QALA</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Аким на 5 часов
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-base">
            Пять решений, бюджет 100, проверяемый Astana Quality of Life Score.
            Смотрите, кто выиграл — и какой компромисс остался.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadReference}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-teal"
          >
            Пример организаторов
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-warn"
          >
            Сбросить
          </button>
        </div>
      </header>

      <DistrictMap
        districts={result && result.valid ? result.districts : null}
        highlightIds={highlightIds}
        selectedDistrict={districtForPicker}
        onSelect={setDistrictForPicker}
      />

      <PlanBuilder
        decisions={slots}
        activeSlot={activeSlot}
        districtForPicker={districtForPicker}
        onPickMeasure={pickMeasure}
        onSetDistrict={setDistrictForPicker}
        onSelectSlot={setActiveSlot}
        onClearSlot={clearSlot}
        directionCounts={directionCounts}
      />

      <ResultsPanel
        result={result}
        filled={filledDecisions.length}
        analysis={analysis}
        analysisLoading={analysisLoading}
        onAnalyze={runAnalyze}
        suggestion={suggestion}
        onImprove={runImprove}
        onApplyImprove={applyImprove}
        improveLoading={improveLoading}
      />
    </div>
  );
}
