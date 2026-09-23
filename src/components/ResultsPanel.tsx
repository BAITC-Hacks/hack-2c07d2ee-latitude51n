"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DISTRICT_BY_ID,
  MEASURE_BY_ID,
  type Decision,
  type ImproveSuggestion,
  type ScoreBreakdown,
  type ScoreResult,
} from "@/lib/engine";
import { cn, fmt } from "@/lib/utils";

interface Props {
  result: ScoreResult | null;
  filled: number;
  partialIssues: string[];
  analysis: string | null;
  analysisError: string | null;
  analysisLoading: boolean;
  onAnalyze: () => void;
  suggestion: ImproveSuggestion | null;
  improveNote: string | null;
  onImprove: () => void;
  onApplyImprove: () => void;
  improveLoading: boolean;
}

export function ResultsPanel(props: Props) {
  const { result, filled, partialIssues } = props;

  if (!result) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface/70 p-5 text-sm">
        <p className="font-medium text-ink">
          Выбрано {filled} из 5. Score появится, когда будут заполнены все пять решений.
        </p>
        {partialIssues.length > 0 && <IssueList issues={partialIssues} />}
      </section>
    );
  }

  if (!result.valid) {
    return (
      <section className="rounded-2xl border border-warn/40 bg-warn-soft p-5" role="alert">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
          Score не рассчитывается
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          План нарушает правила. Исправьте пункты ниже — балл считается только для допустимого
          набора.
        </p>
        <IssueList issues={result.errors} />
      </section>
    );
  }

  return <ValidResults {...props} result={result} />;
}

function IssueList({ issues }: { issues: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm">
      {issues.map((e) => (
        <li key={e} className="flex gap-2">
          <span className="text-warn" aria-hidden>
            •
          </span>
          <span>{e}</span>
        </li>
      ))}
    </ul>
  );
}

function ValidResults({
  result,
  analysis,
  analysisError,
  analysisLoading,
  onAnalyze,
  suggestion,
  improveNote,
  onImprove,
  onApplyImprove,
  improveLoading,
}: Props & { result: ScoreBreakdown }) {
  const reduce = useReducedMotion();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">Astana Quality of Life Score</p>
            <motion.p
              key={result.score.toFixed(5)}
              initial={reduce ? false : { opacity: 0.3, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight tabular-nums text-ink"
            >
              {fmt(result.score, 5)}
            </motion.p>
            <p className="mt-1 text-sm text-ink-muted">
              Без действий {fmt(result.baseScore, 5)}, изменение{" "}
              <span className={cn("font-semibold", result.scoreDelta >= 0 ? "text-good" : "text-crit")}>
                {result.scoreDelta >= 0 ? "+" : ""}
                {fmt(result.scoreDelta, 5)}
              </span>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Stat label="Средний по городу" value={fmt(result.dAvg, 2)} />
            <Stat label="Слабейший район" value={fmt(result.dMin, 2)} />
            <Stat label="Значений ниже 40" value={String(result.nCrit)} />
            <Stat label="Потрачено" value={`${result.cost} из 100`} />
          </dl>
        </div>

        <p className="mt-3 text-xs text-ink-muted">
          Score = 0,7 × средний по населению + 0,3 × слабейший район − число значений ниже 40.
        </p>

        {result.synergyHits.length > 0 && (
          <p className="mt-3 rounded-xl bg-good-soft px-3 py-2 text-sm text-good">
            Сработала синергия: {result.synergyHits.join("; ")}
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm tabular-nums">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="pb-2 font-medium">Район</th>
                <th className="pb-2 font-medium">Было</th>
                <th className="pb-2 font-medium">Стало</th>
                <th className="pb-2 font-medium">Изменение</th>
                <th className="pb-2 font-medium">Ниже 40</th>
              </tr>
            </thead>
            <tbody>
              {result.districts.map((d) => (
                <tr key={d.id} className="border-t border-line/70">
                  <td className="py-2 font-medium">{d.nameRu}</td>
                  <td className="py-2">{fmt(d.before, 2)}</td>
                  <td className="py-2">{fmt(d.after, 2)}</td>
                  <td className={cn("py-2", d.delta > 0.005 && "text-good", d.delta < -0.005 && "text-crit")}>
                    {d.delta > 0 ? "+" : ""}
                    {fmt(d.delta, 2)}
                  </td>
                  <td className="py-2 text-xs text-ink-muted">
                    {d.critical.length ? d.critical.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-[family-name:var(--font-display)] font-semibold">
            Улучшить одно решение
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Программа пробует заменить каждую меру на каждую допустимую альтернативу и
            показывает лучший результат.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onImprove}
              disabled={improveLoading}
              className="rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-deep disabled:opacity-50"
            >
              {improveLoading ? "Перебираем…" : "Найти лучшую замену"}
            </button>
            {suggestion && (
              <button
                type="button"
                onClick={onApplyImprove}
                className="rounded-xl border border-teal px-4 py-2 text-sm font-medium text-teal-deep hover:bg-teal-soft"
              >
                Применить замену
              </button>
            )}
          </div>
          <AnimatePresence mode="wait">
            {suggestion ? (
              <motion.div
                key={`${suggestion.replaceIndex}-${suggestion.to.measureId}-${suggestion.to.districtId ?? "city"}`}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
              >
                <ImproveCard suggestion={suggestion} current={result} />
              </motion.div>
            ) : improveNote ? (
              <p className="mt-3 text-sm text-ink-muted">{improveNote}</p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-[family-name:var(--font-display)] font-semibold">AI-разбор</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Сервер пересчитывает план и передаёт готовые числа модели. Модель объясняет их, но
            не считает.
          </p>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={analysisLoading}
            className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            {analysisLoading ? "Готовим разбор…" : analysis ? "Обновить разбор" : "Объяснить сценарий"}
          </button>
          {analysisError && (
            <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">
              {analysisError}
            </p>
          )}
          {analysis && (
            <div className="mt-3 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {analysis}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function labelDecision(d: Decision): string {
  const m = MEASURE_BY_ID[d.measureId];
  const where = d.districtId ? DISTRICT_BY_ID[d.districtId].nameRu : "весь город";
  return `${m.id} «${m.nameRu}», ${where}`;
}

function ImproveCard({
  suggestion,
  current,
}: {
  suggestion: ImproveSuggestion;
  current: ScoreBreakdown;
}) {
  const shifts = suggestion.result.districts
    .map((d) => ({
      name: d.nameRu,
      delta: d.after - (current.districts.find((c) => c.id === d.id)?.after ?? d.after),
    }))
    .sort((a, b) => b.delta - a.delta);
  const winner = shifts[0];
  const loser = shifts[shifts.length - 1];
  const costDiff = suggestion.cost - current.cost;

  return (
    <div className="mt-3 space-y-1.5 rounded-xl bg-teal-soft/70 p-3 text-sm">
      <p>
        Решение {suggestion.replaceIndex + 1}: <strong>{labelDecision(suggestion.from)}</strong>
      </p>
      <p>
        Заменить на: <strong>{labelDecision(suggestion.to)}</strong>
      </p>
      <p className="tabular-nums">
        Score {fmt(suggestion.score, 5)} (
        <span className="font-semibold text-good">+{fmt(suggestion.scoreDelta, 5)}</span>),
        бюджет {suggestion.cost} ({costDiff >= 0 ? "+" : ""}
        {costDiff})
      </p>
      {winner && winner.delta > 0.005 && (
        <p>
          Выигрывает <strong>{winner.name}</strong>: +{fmt(winner.delta, 2)} к оценке района.
        </p>
      )}
      {loser && loser.delta < -0.005 && (
        <p>
          Цена замены: <strong>{loser.name}</strong> теряет {fmt(Math.abs(loser.delta), 2)}.
        </p>
      )}
    </div>
  );
}
