"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  DISTRICT_BY_ID,
  INDICATOR_META,
  MEASURE_BY_ID,
  REQUIRED_DECISIONS,
  baseSummary,
  type Decision,
  type ImproveSuggestion,
  type ScoreBreakdown,
  type ScoreResult,
} from "@/lib/engine";
import { NumberTicker } from "@/components/ui/number-ticker";
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

const BASE = baseSummary();

export function ResultsPanel(props: Props) {
  return (
    <div id="results">
      <ResultsBody {...props} />
    </div>
  );
}

function ResultsBody(props: Props) {
  const { result, filled, partialIssues } = props;

  if (!result) {
    const weakest = BASE.districts.find((d) => d.id === BASE.weakestId)!;
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface/70 p-5 text-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-ink-muted">Точка отсчёта: город без решений</p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink/70 tabular-nums">
              {fmt(BASE.score, 5)}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <div>
              <dt className="text-ink-muted">Слабейший район</dt>
              <dd className="font-semibold text-ink tabular-nums">
                {weakest.nameRu}, {fmt(BASE.dMin, 2)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Значений ниже 40</dt>
              <dd className="font-semibold text-ink tabular-nums">{BASE.nCrit}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-3 font-medium text-ink">
          Выбрано {filled} из {REQUIRED_DECISIONS}. Итоги появятся, когда будут заполнены все
          пять решений.
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
          План нарушает правила. Исправьте пункты ниже: балл считается только для допустимого
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

  const weakest = result.districts.find((d) => d.id === result.weakestId)!;
  const weakestBefore = BASE.districts.find((d) => d.id === result.base.weakestId)!;

  return (
    <motion.section
      className="space-y-4"
      aria-labelledby="results-title"
      variants={REVEAL}
      initial="hidden"
      animate="show"
    >
      <div className="rounded-2xl border border-line bg-surface p-5">
        <motion.div variants={ITEM} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="results-title" className="text-sm font-normal text-ink-muted">
              Astana Quality of Life Score
            </h2>
            <p
              aria-hidden
              className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-ink tabular-nums"
            >
              <NumberTicker value={result.score} from={result.baseScore} decimals={5} duration={0.6} />
            </p>
            <p className="sr-only" role="status">
              Score {fmt(result.score, 5)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Без решений {fmt(result.baseScore, 5)}, изменение{" "}
              <NumberTicker
                value={result.scoreDelta}
                from={0}
                decimals={5}
                duration={0.6}
                signed
                className={cn("font-semibold", result.scoreDelta >= 0 ? "text-good" : "text-crit")}
              />
            </p>
          </div>
          <p className="text-sm text-ink-muted">
            Потрачено <strong className="tabular-nums text-ink">{result.cost}</strong> из 100
          </p>
        </motion.div>

        <motion.div variants={ITEM}>
          <ScoreCompare base={result.baseScore} score={result.score} />
        </motion.div>

        <motion.dl variants={ITEM} className="mt-5 grid gap-2 sm:grid-cols-3">
          <Term
            label="Средний по населению"
            weight="× 0,7"
            before={result.base.dAvg}
            after={result.dAvg}
          />
          <Term
            label="Слабейший район"
            weight="× 0,3"
            before={result.base.dMin}
            after={result.dMin}
            note={
              result.weakestId === result.base.weakestId
                ? `${weakest.nameRu}, как и до решений`
                : `${weakest.nameRu}; до решений был ${weakestBefore.nameRu}`
            }
          />
          <Term
            label="Значений ниже 40"
            weight="− 1 за каждое"
            before={result.base.nCrit}
            after={result.nCrit}
            digits={0}
            lowerIsBetter
            note={criticalNote(result)}
          />
        </motion.dl>

        <motion.p variants={ITEM} className="mt-3 text-xs text-ink-muted">
          Score = 0,7 × средний по населению + 0,3 × слабейший район − число значений ниже 40.
        </motion.p>

        {result.synergyHits.length > 0 && (
          <motion.p
            variants={ITEM}
            className="mt-3 rounded-xl bg-good-soft px-3 py-2 text-sm text-good"
          >
            Сработала синергия: {result.synergyHits.join("; ")}
          </motion.p>
        )}

        <motion.div variants={ITEM}>
          <DistrictDeltas result={result} />
        </motion.div>
      </div>

      <motion.div variants={ITEM} className="grid gap-4 lg:grid-cols-2">
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
              className="min-h-11 rounded-xl bg-teal-deep px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-ink motion-safe:active:scale-[0.97] disabled:opacity-50"
            >
              {improveLoading ? "Перебираем…" : "Найти лучшую замену"}
            </button>
            {suggestion && (
              <button
                type="button"
                onClick={onApplyImprove}
                className="min-h-11 rounded-xl border border-teal px-4 text-sm font-medium text-teal-deep transition-[background-color,transform] duration-150 ease-out hover:bg-teal-soft motion-safe:active:scale-[0.97]"
              >
                Применить замену
              </button>
            )}
          </div>
          <div aria-live="polite">
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
            className="mt-3 min-h-11 rounded-xl bg-ink px-4 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-teal-deep motion-safe:active:scale-[0.97] disabled:opacity-50"
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
      </motion.div>
    </motion.section>
  );
}

const EASE = [0.23, 1, 0.32, 1] as const;

const REVEAL: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const ITEM: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

function signed(n: number, digits = 2): string {
  if (Math.abs(n) < 0.5 * 10 ** -digits) return fmt(0, digits);
  return `${n > 0 ? "+" : "−"}${fmt(Math.abs(n), digits)}`;
}

function criticalNote(result: ScoreBreakdown): string {
  const list = result.districts.flatMap((d) =>
    d.critical.map((k) => `${d.nameRu}: ${INDICATOR_META[k].labelRu.toLowerCase()}`),
  );
  if (list.length > 0) return list.join("; ");
  const before = BASE.districts.flatMap((d) =>
    d.critical.map((k) => `${d.nameRu}: ${INDICATOR_META[k].labelRu.toLowerCase()}`),
  );
  return before.length > 0 ? `Подняты выше порога: ${before.join("; ")}` : "Ниже порога ничего нет";
}

/** Base and plan Score on one labelled axis, so the gap is read against real units. */
function ScoreCompare({ base, score }: { base: number; score: number }) {
  const lo = Math.floor((Math.min(base, score) - 1) / 5) * 5;
  const hi = Math.max(lo + 10, Math.ceil((Math.max(base, score) + 1) / 5) * 5);
  const pos = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5);
  const from = Math.min(pos(base), pos(score));
  const span = Math.abs(pos(score) - pos(base));

  return (
    <figure className="mt-5">
      <figcaption className="sr-only">
        Score без решений {fmt(base, 5)}, Score плана {fmt(score, 5)}
      </figcaption>
      <div aria-hidden className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        <motion.div
          className="absolute inset-x-0 top-1/2 h-1.5 w-full origin-left -translate-y-1/2 rounded-full bg-teal/70"
          initial={{ x: `${pos(base)}%`, scaleX: 0 }}
          animate={{ x: `${from}%`, scaleX: span / 100 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        />
        <div className="absolute inset-0" style={{ transform: `translateX(${pos(base)}%)` }}>
          <span className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-[var(--map-cold)] shadow-sm" />
        </div>
        <motion.div
          className="absolute inset-0"
          initial={{ x: `${pos(base)}%` }}
          animate={{ x: `${pos(score)}%` }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        >
          <span className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-teal-deep shadow" />
        </motion.div>
      </div>
      <div aria-hidden className="relative mt-1 h-4 text-[10px] tabular-nums text-ink-muted">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2"
            style={{ left: `${pos(t)}%` }}
          >
            {t}
          </span>
        ))}
      </div>
      <div aria-hidden className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--map-cold)]" />
          без решений <span className="tabular-nums text-ink">{fmt(base, 2)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-deep" />
          ваш план <span className="tabular-nums text-ink">{fmt(score, 2)}</span>
        </span>
      </div>
    </figure>
  );
}

function Term({
  label,
  weight,
  before,
  after,
  digits = 2,
  lowerIsBetter = false,
  note,
}: {
  label: string;
  weight: string;
  before: number;
  after: number;
  digits?: number;
  lowerIsBetter?: boolean;
  note?: string;
}) {
  const diff = after - before;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const same = Math.abs(diff) < 0.5 * 10 ** -digits;
  return (
    <div className="rounded-xl bg-bg p-3">
      <dt className="flex items-baseline justify-between gap-2 text-xs text-ink-muted">
        {label}
        <span className="tabular-nums">{weight}</span>
      </dt>
      <dd className="mt-1 tabular-nums">
        <span className="text-sm text-ink-muted">{fmt(before, digits)} → </span>
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
          {fmt(after, digits)}
        </span>{" "}
        <span
          className={cn(
            "text-xs font-semibold",
            same ? "text-ink-muted" : better ? "text-good" : "text-crit",
          )}
        >
          {signed(diff, digits)}
        </span>
      </dd>
      {note && <dd className="mt-1 text-xs text-ink-muted">{note}</dd>}
    </div>
  );
}

function DistrictDeltas({ result }: { result: ScoreBreakdown }) {
  const rows = [...result.districts].sort((a, b) => b.delta - a.delta);
  const neg = Math.max(0, ...rows.map((d) => -d.delta));
  const pos = Math.max(0, ...rows.map((d) => d.delta));
  const span = Math.max(0.5, neg + pos);
  const zero = (neg / span) * 100;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Изменения по районам</h3>
        <p className="text-xs text-ink-muted tabular-nums">
          оценка района до и после; шкала от {neg > 0 ? signed(-neg, 1) : "0"} до {signed(pos, 1)}
        </p>
      </div>
      <ul className="mt-2 divide-y divide-line/70">
        {rows.map((d, i) => {
          const width = (Math.abs(d.delta) / span) * 100;
          const up = d.delta >= 0;
          return (
            <li
              key={d.id}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_11rem]"
            >
              <span className="flex flex-col text-sm font-medium text-ink">
                {d.nameRu}
                {d.id === result.weakestId && (
                  <span className="w-fit rounded bg-ink px-1.5 text-[10px] font-medium text-white">
                    слабейший
                  </span>
                )}
              </span>
              <div aria-hidden className="relative h-3">
                <span className="absolute -inset-y-1 w-px bg-line" style={{ left: `${zero}%` }} />
                <motion.span
                  key={fmt(d.delta, 2)}
                  className={cn(
                    "absolute inset-y-0 rounded-full",
                    up ? "origin-left bg-teal" : "origin-right bg-warn",
                  )}
                  style={
                    up
                      ? { left: `${zero}%`, width: `${width}%` }
                      : { right: `${100 - zero}%`, width: `${width}%` }
                  }
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.25 + i * 0.05 }}
                />
              </div>
              <span className="col-span-2 text-xs tabular-nums text-ink-muted sm:col-span-1 sm:text-right">
                {fmt(d.before, 2)} → <span className="text-ink">{fmt(d.after, 2)}</span>{" "}
                <strong
                  className={cn(
                    Math.abs(d.delta) < 0.005 ? "text-ink-muted" : up ? "text-good" : "text-crit",
                  )}
                >
                  {signed(d.delta)}
                </strong>
                {d.critical.length > 0 && (
                  <span className="block text-warn sm:mt-0.5">
                    ниже 40: {d.critical.map((k) => INDICATOR_META[k].labelRu.toLowerCase()).join(", ")}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
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
