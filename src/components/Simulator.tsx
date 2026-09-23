"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { MotionConfig } from "motion/react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CityMapPanel } from "@/components/CityMapPanel";
import type { Placement, SchematicDistrict } from "@/components/DistrictSchematic";
import { PlanBuilder, type Blocker, type PlanStatus } from "@/components/PlanBuilder";
import { ResultsPanel } from "@/components/ResultsPanel";
import {
  BUDGET,
  DISTRICTS,
  DISTRICT_BY_ID,
  MEASURES,
  MEASURE_BY_ID,
  REFERENCE_PLAN,
  baseDistrictScores,
  baseSummary,
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
const BASE = baseSummary();
const BASE_DISTRICTS: SchematicDistrict[] = BASE.districts.map((d) => ({
  id: d.id,
  nameRu: d.nameRu,
  populationShare: d.populationShare,
  before: d.score,
  after: d.score,
  delta: 0,
  indicatorsBefore: d.indicators,
  indicatorsAfter: d.indicators,
  critical: d.critical,
}));

function fits(decisions: Decision[]): boolean {
  return validateDecisions(decisions, { partial: true }).ok;
}

function describe(decision: Decision): string {
  const m = MEASURE_BY_ID[decision.measureId];
  const where = decision.districtId ? DISTRICT_BY_ID[decision.districtId].nameRu : "весь город";
  return `${m.id} «${m.nameRu}», ${where}`;
}

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
  const [previewId, setPreviewId] = useState<MeasureId | null>(null);
  const [announcement, setAnnouncement] = useState("");
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
    const out = {} as Record<MeasureId, Blocker | null>;
    for (const m of MEASURES) {
      const candidate = decisionFor(m.id, districtForPicker);
      const usedAt = slots.findIndex((d, i) => i !== activeSlot && d?.measureId === m.id);
      if (usedAt >= 0) {
        out[m.id] = {
          kind: "duplicate",
          reason: `Уже выбрано в решении ${usedAt + 1}: повторять меру нельзя.`,
          slot: usedAt,
          swaps: [],
          districts: [],
        };
        continue;
      }
      let kind: Blocker["kind"] | null = null;
      let reason = "";
      if (othersCost + m.cost > BUDGET) {
        kind = "budget";
        reason = `Не хватает бюджета: нужно ${m.cost}, свободно ${BUDGET - othersCost}.`;
      } else {
        const check = validateDecisions([...others, candidate], { partial: true });
        if (!check.ok) {
          kind = "rule";
          reason = check.errors[0];
        }
      }
      if (!kind) {
        out[m.id] = null;
        continue;
      }
      const swaps = slots.flatMap((d, j) =>
        d !== null &&
        j !== activeSlot &&
        fits([...slots.filter((s, i): s is Decision => s !== null && i !== j), candidate])
          ? [j]
          : [],
      );
      const districts =
        kind === "rule" && m.scope === "district"
          ? DISTRICTS.map((d) => d.id).filter(
              (id) => id !== districtForPicker && fits([...others, decisionFor(m.id, id)]),
            )
          : [];
      out[m.id] = { kind, reason, swaps, districts };
    }
    return out;
  }, [slots, activeSlot, districtForPicker]);

  const result = useMemo(() => (filled.length === 5 ? scorePlan(filled) : null), [filled]);

  const status: PlanStatus = !result
    ? { kind: "partial", filled: filled.length }
    : result.valid
      ? { kind: "valid", score: result.score }
      : { kind: "invalid" };

  const placements = useMemo<Placement[]>(
    () =>
      slots.flatMap((d, slot) =>
        d ? [{ slot, measureId: d.measureId, districtId: d.districtId }] : [],
      ),
    [slots],
  );

  const previewDecision = previewId ? decisionFor(previewId, districtForPicker) : null;

  const partialIssues = useMemo(
    () => (filled.length < 5 ? validateDecisions(filled, { partial: true }).errors : []),
    [filled],
  );

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

  function budgetNote(next: (Decision | null)[]): string {
    const spent = next.reduce((s, d) => s + (d ? MEASURE_BY_ID[d.measureId].cost : 0), 0);
    return `Остаток бюджета ${BUDGET - spent}.`;
  }

  function pickMeasure(measureId: MeasureId, districtId: DistrictId = districtForPicker) {
    if (districtId !== districtForPicker) setDistrictForPicker(districtId);
    const next = [...slots];
    const decision = decisionFor(measureId, districtId);
    next[activeSlot] = decision;
    updateSlots(next);
    setPreviewId(null);
    const nextEmpty = next.findIndex((d) => d === null);
    if (nextEmpty >= 0) setActiveSlot(nextEmpty);
    setAnnouncement(
      `Решение ${activeSlot + 1}: ${describe(decision)}. ${budgetNote(next)}${
        nextEmpty >= 0 ? ` Дальше решение ${nextEmpty + 1}.` : ""
      }`,
    );
  }

  function placeAt(slot: number, measureId: MeasureId) {
    const next = [...slots];
    const replaced = next[slot];
    const decision = decisionFor(measureId, districtForPicker);
    next[slot] = decision;
    updateSlots(next);
    setPreviewId(null);
    setAnnouncement(
      `Решение ${slot + 1}: ${describe(decision)}${
        replaced ? ` вместо ${replaced.measureId}` : ""
      }. ${budgetNote(next)}`,
    );
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
    const removed = slots[index];
    const next = [...slots];
    next[index] = null;
    updateSlots(next);
    setActiveSlot(index);
    if (removed) setAnnouncement(`${removed.measureId} убрана из решения ${index + 1}. ${budgetNote(next)}`);
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
        found ? null : "Ни одна допустимая замена одной меры не повышает Score: план локально оптимален.",
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
    <MotionConfig reducedMotion="user">
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
            districts={result?.valid ? result.districts : BASE_DISTRICTS}
            scored={Boolean(result?.valid)}
            weakestId={result?.valid ? result.weakestId : BASE.weakestId}
            placements={placements}
            preview={previewDecision}
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
          previewId={previewId}
          status={status}
          onPickMeasure={pickMeasure}
          onPlaceAt={placeAt}
          onPreview={setPreviewId}
          onSetDistrict={setDistrict}
          onSelectSlot={setActiveSlot}
          onClearSlot={clearSlot}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

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
    </MotionConfig>
  );
}
