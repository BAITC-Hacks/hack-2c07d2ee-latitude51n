import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import { StartButton } from "@/components/landing/StartButton";
import { DIRECTION_LABELS, EXPECTED_BASE_SCORE, EXPECTED_REFERENCE_SCORE, type Direction } from "@/lib/engine";
import type { DistrictCollection } from "@/lib/geo";
import { fmt } from "@/lib/utils";

export function LandingNav() {
  return (
    <header className="glass-bar sticky top-0 z-30">
      <nav
        aria-label="Главное меню"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="rounded-md font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-ink"
        >
          Latitude 51
        </Link>
        <div className="flex items-center gap-7">
          <ul className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
            <li>
              <a href="#story" className="inline-flex min-h-10 items-center rounded-md px-1 transition-colors hover:text-ink">
                Как это работает
              </a>
            </li>
            <li>
              <a href="#rules" className="inline-flex min-h-10 items-center rounded-md px-1 transition-colors hover:text-ink">
                Правила
              </a>
            </li>
            <li>
              <a href="#formula" className="inline-flex min-h-10 items-center rounded-md px-1 transition-colors hover:text-ink">
                Формула
              </a>
            </li>
          </ul>
          <StartButton />
        </div>
      </nav>
    </header>
  );
}

function loadGeo(): DistrictCollection {
  const file = path.join(process.cwd(), "public", "geo", "astana-districts.geojson");
  return JSON.parse(readFileSync(file, "utf8")) as DistrictCollection;
}

function MiniMap() {
  const geo = loadGeo();
  const lat0 = 51.12;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const points = geo.features.flatMap((f) => f.geometry.coordinates.flatMap((p) => p[0]));
  const xs = points.map(([lon]) => lon * kx);
  const ys = points.map(([, lat]) => -lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const scale = 100 / Math.max(w, h);

  const paths = geo.features.map((f) => ({
    id: f.properties.id,
    d: f.geometry.coordinates
      .map(
        (poly) =>
          poly[0]
            .map(([lon, lat], i) => {
              const x = ((lon * kx - minX) * scale).toFixed(2);
              const y = ((-lat - minY) * scale).toFixed(2);
              return `${i === 0 ? "M" : "L"}${x} ${y}`;
            })
            .join("") + "Z",
      )
      .join(""),
  }));

  return (
    <svg
      viewBox={`-2 -2 ${w * scale + 4} ${h * scale + 4}`}
      className="h-full w-full"
      role="img"
      aria-label="Пять районов Астаны: районная мера выбрана для Нуры, городская действует во всех"
    >
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill={p.id === "nura" ? "var(--teal)" : "var(--teal-soft)"}
          stroke="var(--surface)"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

const DIRECTIONS = Object.keys(DIRECTION_LABELS) as Direction[];

export function RulesSection() {
  return (
    <section id="rules" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
      <h2 className="max-w-[20ch] font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Правила проверяет код, а не честное слово
      </h2>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-muted sm:text-lg">
        Если план нарушает хоть одно правило, Score не считается, а рядом написано, что исправить.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-6">
        <article className="flex flex-col justify-between gap-10 rounded-2xl bg-ink p-7 text-white md:col-span-4 md:min-h-72">
          <p className="font-[family-name:var(--font-display)] text-7xl font-bold tracking-tight sm:text-8xl">
            100
          </p>
          <div>
            <h3 className="text-lg font-semibold">единиц бюджета на весь план</h3>
            <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/75">
              Мера стоит от 10 до 30 единиц. Если сумма больше ста, симулятор покажет, сколько не хватает.
            </p>
          </div>
        </article>

        <article className="flex flex-col justify-between gap-6 rounded-2xl bg-surface p-7 md:col-span-2">
          <p className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-teal-deep">
            5
          </p>
          <div>
            <h3 className="text-lg font-semibold text-ink">Ровно пять решений</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Разные меры, без повторов. С четырьмя решениями Score не считается.
            </p>
          </div>
        </article>

        <article className="rounded-2xl bg-surface p-7 md:col-span-2">
          <h3 className="text-lg font-semibold text-ink">Не больше двух на направление</h3>
          <ul className="mt-5 flex flex-wrap gap-2">
            {DIRECTIONS.map((d) => (
              <li key={d} className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-muted">
                {DIRECTION_LABELS[d]}
              </li>
            ))}
          </ul>
        </article>

        <article className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-5 rounded-2xl bg-surface p-7 md:col-span-2">
          <div>
            <h3 className="text-lg font-semibold text-ink">Район или весь город</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Районная мера работает в выбранном районе, городская сразу во всех пяти.
            </p>
          </div>
          <MiniMap />
        </article>

        <article className="rounded-2xl bg-teal-soft p-7 md:col-span-2">
          <h3 className="text-lg font-semibold text-ink">Лаг и связи между мерами</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Мера с лагом L даёт (8 − L)/8 своего эффекта. Некоторые пары усиливают друг друга, а M1 и M3,
            M4 и M7, M5 и M13 нельзя ставить в один район.
          </p>
        </article>
      </div>
    </section>
  );
}

const SUB = "text-[0.6em]";

const TERMS: { term: ReactNode; body: string }[] = [
  { term: "D̄", body: "средняя оценка районов, взвешенная по числу жителей" },
  {
    term: (
      <>
        D<sub className={SUB}>min</sub>
      </>
    ),
    body: "оценка самого слабого района, чтобы план не бросал отстающих",
  },
  {
    term: (
      <>
        N<sub className={SUB}>крит</sub>
      </>
    ),
    body: "сколько показателей в районах опустилось ниже 40, каждый стоит балл",
  },
];

export function FormulaSection() {
  return (
    <section id="formula" className="scroll-mt-20 border-y border-line/70 bg-surface/60">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-32">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Как считается Score
          </h2>
          <p
            className="mt-10 font-[family-name:var(--font-display)] text-2xl leading-snug font-medium tracking-tight text-ink sm:text-4xl"
            aria-label="Score равен 0,7 умножить на D среднее плюс 0,3 умножить на D минимальное минус N критических"
          >
            Score = 0,7 · D̄ + 0,3 · D<sub className="text-[0.55em]">min</sub> − N
            <sub className="text-[0.55em]">крит</sub>
          </p>
          <p className="mt-8 max-w-[56ch] text-base leading-relaxed text-ink-muted">
            Оценка района D складывается из десяти показателей с весами. Мера меняет показатель на свой
            эффект, умноженный на (8 − L)/8, результат ограничен рамками от 0 до 100.
          </p>
        </div>
        <div className="flex flex-col justify-end gap-10">
          <dl className="grid gap-6">
            {TERMS.map((t) => (
              <div key={t.body} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4">
                <dt className="font-[family-name:var(--font-display)] text-lg font-semibold text-teal-deep">
                  {t.term}
                </dt>
                <dd className="text-sm leading-relaxed text-ink">{t.body}</dd>
              </div>
            ))}
          </dl>
          <p className="rounded-2xl bg-bg p-5 text-sm leading-relaxed text-ink-muted">
            Контрольные значения закреплены в тестах движка:{" "}
            <span className="font-semibold text-ink tabular-nums">{fmt(EXPECTED_BASE_SCORE, 5)}</span> без
            решений и{" "}
            <span className="font-semibold text-ink tabular-nums">{fmt(EXPECTED_REFERENCE_SCORE, 5)}</span>{" "}
            для плана организаторов.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-28 text-center sm:px-6 lg:py-36">
      <h2 className="max-w-[18ch] font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
        Попробуйте обогнать {fmt(EXPECTED_REFERENCE_SCORE, 5)}
      </h2>
      <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-ink-muted sm:text-lg">
        Соберите свой план из пяти мер и сравните его с планом организаторов.
      </p>
      <div className="mt-9">
        <StartButton size="lg" />
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-10 text-sm text-ink-muted sm:px-6 md:grid-cols-2">
        <p>
          <span className="font-[family-name:var(--font-display)] font-bold text-ink">Latitude 51</span>:
          Астана лежит на 51-й параллели северной широты. Команда Latitude51N, HackAlem AI.
        </p>
        <p className="md:text-right">
          Границы районов © OpenStreetMap. Показатели районов синтетические, из датасета хакатона.
        </p>
      </div>
    </footer>
  );
}
