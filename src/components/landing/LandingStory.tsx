"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { motion, useInView, useReducedMotion, useScroll } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { TextEffect } from "@/components/ui/text-effect";
import { StartButton } from "@/components/landing/StartButton";
import { DISTRICTS, type DistrictId } from "@/lib/engine";
import { deltaColor, hasWebGL, type DistrictView } from "@/lib/geo";
import type { LandingData, StoryStateKey } from "@/lib/landing";
import { fmt } from "@/lib/utils";

const CityModel3D = dynamic(() => import("@/components/CityModel3D"), { ssr: false });

const STATE_CAPTION: Record<StoryStateKey, string> = {
  base: "Город без решений",
  plan: "План организаторов",
  improved: "После одной замены",
};

function subscribeNoop() {
  return () => {};
}

function Chapter({
  children,
  onEnter,
  className = "",
}: {
  children: ReactNode;
  onEnter: () => void;
  className?: string;
}) {
  return (
    <motion.div
      className={`flex flex-col justify-center py-16 ${className}`}
      onViewportEnter={onEnter}
      viewport={{ amount: 0.55 }}
    >
      {children}
    </motion.div>
  );
}

export function LandingStory({ data }: { data: LandingData }) {
  const story = useRef<HTMLElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const [stateKey, setStateKey] = useState<StoryStateKey>("base");
  const [focusOn, setFocusOn] = useState(false);
  const reduce = useReducedMotion();
  const webgl = useSyncExternalStore(subscribeNoop, hasWebGL, () => false);
  const visualInView = useInView(visual, { margin: "200px" });
  const { scrollYProgress } = useScroll({ target: story, offset: ["start start", "end end"] });

  const state = data.states[stateKey];
  const focus = focusOn ? state.focus : null;

  function show(key: StoryStateKey, withFocus: boolean) {
    setStateKey(key);
    setFocusOn(withFocus);
  }

  return (
    <section
      ref={story}
      id="story"
      className="relative mx-auto grid w-full max-w-7xl gap-x-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div
        ref={visual}
        className="sticky top-16 z-10 -mx-4 h-[42dvh] self-start bg-bg/85 backdrop-blur-sm sm:-mx-6 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:h-[calc(100dvh-4rem)] lg:bg-transparent lg:backdrop-blur-none"
      >
        <div className="absolute inset-0">
          {webgl ? (
            <CityModel3D
              views={state.views}
              focus={focus}
              progress={scrollYProgress}
              active={visualInView}
            />
          ) : (
            <StaticBars views={state.views} />
          )}
        </div>
        <div className="pointer-events-none absolute bottom-3 left-4 sm:left-6 lg:bottom-10 lg:left-2">
          <p className="text-xs text-ink-muted sm:text-sm">Astana Quality of Life Score</p>
          <NumberTicker
            value={state.score}
            from={reduce ? state.score : 0}
            decimals={5}
            duration={1.1}
            className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-5xl"
          />
          <p className="mt-1 text-xs font-medium text-teal-deep sm:text-sm">{STATE_CAPTION[stateKey]}</p>
        </div>
      </div>

      <div className="relative lg:col-start-1 lg:row-start-1">
        <Chapter
          onEnter={() => show("base", false)}
          className="min-h-[calc(58dvh-4rem)] pt-8 lg:min-h-[calc(100dvh-4rem)] lg:py-0"
        >
          <TextEffect
            as="h1"
            delay={0.15}
            className="font-[family-name:var(--font-display)] text-5xl leading-[1.02] font-bold tracking-tight text-ink sm:text-6xl xl:text-7xl"
          >
            {"Аким на 5\u00a0часов"}
          </TextEffect>
          <motion.p
            className="mt-6 max-w-[34ch] text-lg leading-relaxed text-ink-muted"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Сто единиц бюджета, пять решений, пять районов Астаны. Код считает Score, AI объясняет
            результат.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <StartButton size="lg" />
            <a
              href="#formula"
              className="rounded-md text-sm font-medium text-ink underline decoration-line decoration-2 underline-offset-8 hover:decoration-teal"
            >
              Как считается Score
            </a>
          </motion.div>
        </Chapter>

        <Chapter onEnter={() => show("base", true)} className="min-h-[70dvh] lg:min-h-[90dvh]">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Город до ваших решений
          </h2>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink-muted sm:text-lg">
            У каждого района десять показателей: дороги, воздух, школы, безопасность, ЖКХ. Высота
            района на макете показывает его оценку.
          </p>
          <p className="mt-6 max-w-[42ch] text-base leading-relaxed text-ink">
            Слабее всех {data.weakest.nameRu}: {fmt(data.weakest.score, 2)} из 100. Формула штрафует
            за отстающие районы, поэтому их нельзя игнорировать.
          </p>
        </Chapter>

        <Chapter onEnter={() => show("plan", true)} className="min-h-[80dvh] lg:min-h-[100dvh]">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Пять решений организаторов
          </h2>
          <ol className="mt-6 grid gap-2">
            {data.plan.lines.map((line) => (
              <li
                key={line.measureId}
                className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-xl bg-surface/80 px-4 py-3"
              >
                <span className="text-sm font-semibold tabular-nums text-teal-deep">{line.measureId}</span>
                <span className="min-w-0 text-sm text-ink">
                  {line.nameRu}
                  <span className="block text-xs text-ink-muted">{line.where}</span>
                </span>
                <span className="text-sm tabular-nums text-ink-muted">{line.cost}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-ink-muted">
            {data.plan.cost} из 100 единиц. Score вырос на{" "}
            <span className="font-semibold text-good tabular-nums">+{fmt(data.plan.delta, 5)}</span>.
            {data.plan.synergies.length > 0
              ? " Освещение с камерами и цифровая платформа обращений вместе дали Нуре ещё +2 к безопасности улиц."
              : null}
          </p>
          <Link
            href="/simulator?plan=reference"
            className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-ink underline decoration-line decoration-2 underline-offset-8 hover:decoration-teal"
          >
            Открыть этот план в симуляторе
            <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
          </Link>
        </Chapter>

        <Chapter onEnter={() => show("improved", true)} className="min-h-[80dvh] lg:min-h-[100dvh]">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Можно ли лучше? Проверим одну замену
          </h2>
          {data.improve ? (
            <>
              <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-ink-muted sm:text-lg">
                Программа перебирает каждую допустимую замену одной меры и оставляет лучшую.
              </p>
              <div className="mt-6 grid max-w-md gap-2 text-sm">
                <p className="rounded-xl border border-line px-4 py-3 text-ink-muted line-through decoration-warn/60">
                  {data.improve.from.measureId} {data.improve.from.nameRu}, {data.improve.from.where}
                </p>
                <p className="rounded-xl bg-ink px-4 py-3 font-medium text-white">
                  {data.improve.to.measureId} {data.improve.to.nameRu}, {data.improve.to.where}
                </p>
              </div>
              <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-ink">
                Score {fmt(data.improve.score, 5)}, ещё{" "}
                <span className="font-semibold text-good tabular-nums">+{fmt(data.improve.delta, 5)}</span>
                {data.improve.winner ? `. Больше всех выигрывает ${data.improve.winner}.` : "."}
              </p>
            </>
          ) : (
            <p className="mt-4 max-w-[44ch] text-base text-ink-muted">
              Ни одна замена одной меры не повышает Score этого плана.
            </p>
          )}
          <p className="mt-6 max-w-[44ch] text-sm leading-relaxed text-ink-muted">
            AI-разбор объясняет, почему план сработал. Числа он не пересчитывает: их считает код.
          </p>
        </Chapter>
      </div>
    </section>
  );
}

function StaticBars({ views }: { views: Record<DistrictId, DistrictView> }) {
  return (
    <div className="flex h-full items-end gap-3 px-6 pb-28 lg:pb-40">
      {DISTRICTS.map((d) => {
        const v = views[d.id];
        return (
          <div key={d.id} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs tabular-nums text-ink">{fmt(v.after, 1)}</span>
            <div
              className="w-full rounded-t-lg transition-[height,background-color] duration-700"
              style={{ height: `${Math.max(12, (v.after - 40) * 9)}px`, background: deltaColor(v.delta) }}
            />
            <span className="text-xs text-ink-muted">{d.nameRu}</span>
          </div>
        );
      })}
    </div>
  );
}
