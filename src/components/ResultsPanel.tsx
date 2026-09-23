"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  DISTRICT_BY_ID,
  MEASURE_BY_ID,
  type Decision,
  type ImproveSuggestion,
  type ScoreResult,
} from "@/lib/engine";
import { cn, fmt } from "@/lib/utils";

interface Props {
  result: ScoreResult | null;
  filled: number;
  analysis: string | null;
  analysisLoading: boolean;
  onAnalyze: () => void;
  suggestion: ImproveSuggestion | null;
  onImprove: () => void;
  onApplyImprove: () => void;
  improveLoading: boolean;
}

export function ResultsPanel({
  result,
  filled,
  analysis,
  analysisLoading,
  onAnalyze,
  suggestion,
  onImprove,
  onApplyImprove,
  improveLoading,
}: Props) {
  const reduce = useReducedMotion();

  if (!result) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface/70 p-6 text-sm text-ink-muted">
        Выберите ровно 5 мероприятий, чтобы увидеть Score и последствия.
        Заполнено: {filled}/5.
      </section>
    );
  }

  if (!result.valid) {
    return (
      <section className="rounded-2xl border border-warn/40 bg-warn-soft p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
          Score не рассчитывается
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Исправьте план — итоговый балл считается только для допустимого набора.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {result.errors.map((e) => (
            <li key={e} className="flex gap-2">
              <span className="text-warn">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Стоимость сейчас: {result.cost} (остаток {result.remaining}).
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_0_rgba(13,39,68,0.04)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink-muted">
              Astana Quality of Life Score
            </p>
            <motion.p
              key={result.score}
              initial={reduce ? false : { opacity: 0.4, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-ink"
            >
              {fmt(result.score, 5)}
            </motion.p>
            <p className="mt-1 text-sm text-ink-muted">
              База {fmt(result.baseScore, 5)} · Δ{" "}
              <span
                className={cn(
                  result.scoreDelta >= 0 ? "text-good" : "text-crit",
                )}
              >
                {result.scoreDelta >= 0 ? "+" : ""}
                {fmt(result.scoreDelta, 5)}
              </span>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Stat label="D avg" value={fmt(result.dAvg, 2)} />
            <Stat label="min D" value={fmt(result.dMin, 2)} />
            <Stat label="N crit" value={String(result.nCrit)} />
            <Stat
              label="Бюджет"
              value={`${result.cost} / ост. ${result.remaining}`}
            />
          </dl>
        </div>

        {result.synergyHits.length > 0 && (
          <div className="mt-4 rounded-xl bg-good-soft px-3 py-2 text-sm text-good">
            Синергии: {result.synergyHits.join(" · ")}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="pb-2 font-medium">Район</th>
                <th className="pb-2 font-medium">Было</th>
                <th className="pb-2 font-medium">Стало</th>
                <th className="pb-2 font-medium">Δ</th>
                <th className="pb-2 font-medium">Критические</th>
              </tr>
            </thead>
            <tbody>
              {result.districts.map((d) => (
                <tr key={d.id} className="border-t border-line/70">
                  <td className="py-2 font-medium">{d.nameRu}</td>
                  <td className="py-2">{fmt(d.before, 2)}</td>
                  <td className="py-2">{fmt(d.after, 2)}</td>
                  <td
                    className={cn(
                      "py-2",
                      d.delta > 0 && "text-good",
                      d.delta < 0 && "text-crit",
                    )}
                  >
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
            AI-разбор
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            ИИ объясняет готовый расчёт, числа не пересчитывает.
          </p>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={analysisLoading}
            className="mt-3 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink/90 disabled:opacity-50"
          >
            {analysisLoading ? "Анализируем…" : "Объяснить сценарий"}
          </button>
          {analysis && (
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {analysis}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-[family-name:var(--font-display)] font-semibold">
            Улучшить одно решение
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            Код перебирает допустимые замены одной меры и предлагает лучший Score.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onImprove}
              disabled={improveLoading}
              className="rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-deep disabled:opacity-50"
            >
              {improveLoading ? "Ищем…" : "Найти замену"}
            </button>
            {suggestion && (
              <button
                type="button"
                onClick={onApplyImprove}
                className="rounded-xl border border-teal px-4 py-2 text-sm font-medium text-teal-deep hover:bg-teal-soft"
              >
                Применить
              </button>
            )}
          </div>
          {suggestion ? (
            <ImproveCard suggestion={suggestion} />
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Нажмите «Найти замену», чтобы сравнить варианты.
            </p>
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
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function ImproveCard({ suggestion }: { suggestion: ImproveSuggestion }) {
  const from = MEASURE_BY_ID[suggestion.from.measureId];
  const to = MEASURE_BY_ID[suggestion.to.measureId];
  const winner = suggestion.winnerDistrictId
    ? DISTRICT_BY_ID[suggestion.winnerDistrictId].nameRu
    : null;

  return (
    <div className="mt-3 rounded-xl bg-teal-soft/70 p-3 text-sm">
      <p>
        Заменить{" "}
        <strong>
          {from.id}
          {labelDistrict(suggestion.from)}
        </strong>{" "}
        →{" "}
        <strong>
          {to.id}
          {labelDistrict(suggestion.to)}
        </strong>
      </p>
      <p className="mt-1 text-ink-muted">
        Score {fmt(suggestion.score, 5)} (Δ +{fmt(suggestion.scoreDelta, 5)}) ·
        стоимость {suggestion.cost}
      </p>
      {winner && (
        <p className="mt-1">
          Больше всего выигрывает <strong>{winner}</strong> (+
          {fmt(suggestion.winnerDistrictDelta, 2)} к D района).
        </p>
      )}
    </div>
  );
}

function labelDistrict(d: Decision): string {
  if (!d.districtId) return " (город)";
  return ` (${DISTRICT_BY_ID[d.districtId].nameRu})`;
}
