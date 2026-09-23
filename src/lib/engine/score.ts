import {
  CRITICAL_THRESHOLD,
  DISTRICT_BY_ID,
  DISTRICTS,
  EXPECTED_BASE_SCORE,
  HORIZON,
  INDICATORS,
  INDICATOR_WEIGHTS,
  MEASURE_BY_ID,
} from "./dataset";
import type {
  BaseSummary,
  Decision,
  DistrictId,
  DistrictResult,
  Indicator,
  ScoreResult,
} from "./types";
import { validateDecisions } from "./validate";

function clip(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function lagFactor(lag: number): number {
  return (HORIZON - lag) / HORIZON;
}

function districtScore(indicators: Record<Indicator, number>): number {
  return INDICATORS.reduce(
    (sum, k) => sum + INDICATOR_WEIGHTS[k] * indicators[k],
    0,
  );
}

function cloneIndicators(
  source: Record<Indicator, number>,
): Record<Indicator, number> {
  return { ...source };
}

function emptyGrid(): Record<DistrictId, Record<Indicator, number>> {
  const grid = {} as Record<DistrictId, Record<Indicator, number>>;
  for (const d of DISTRICTS) {
    grid[d.id] = cloneIndicators(d.indicators);
  }
  return grid;
}

function applyEffects(
  grid: Record<DistrictId, Record<Indicator, number>>,
  decisions: Decision[],
): string[] {
  const synergyHits: string[] = [];

  for (const decision of decisions) {
    const measure = MEASURE_BY_ID[decision.measureId];
    const factor = lagFactor(measure.lag);
    const targets: DistrictId[] =
      measure.scope === "city"
        ? DISTRICTS.map((d) => d.id)
        : [decision.districtId!];

    for (const districtId of targets) {
      for (const [key, delta] of Object.entries(measure.effects)) {
        const indicator = key as Indicator;
        grid[districtId][indicator] += (delta ?? 0) * factor;
      }
    }
  }

  // Synergies: fixed bonus, not scaled by lag.
  // For district measures, bonus applies in the district of the first measure of the pair.
  const find = (id: string) => decisions.find((d) => d.measureId === id);

  const m1 = find("M1");
  const m2 = find("M2");
  if (m1 && m2 && m1.districtId) {
    grid[m1.districtId].T1 += 2;
    synergyHits.push(`M1+M2 → T1+2 в ${DISTRICT_BY_ID[m1.districtId].nameRu}`);
  }

  const m10 = find("M10");
  const m12 = find("M12");
  if (m10 && m12 && m10.districtId) {
    grid[m10.districtId].B1 += 2;
    synergyHits.push(
      `M10+M12 → B1+2 в ${DISTRICT_BY_ID[m10.districtId].nameRu}`,
    );
  }

  const m5 = find("M5");
  const m6 = find("M6");
  if (m5 && m6 && m5.districtId) {
    grid[m5.districtId].E2 += 2;
    synergyHits.push(`M5+M6 → E2+2 в ${DISTRICT_BY_ID[m5.districtId].nameRu}`);
  }

  for (const d of DISTRICTS) {
    for (const k of INDICATORS) {
      grid[d.id][k] = clip(grid[d.id][k]);
    }
  }

  return synergyHits;
}

export function baseDistrictScores(): Record<DistrictId, number> {
  return Object.fromEntries(
    DISTRICTS.map((d) => [d.id, districtScore(d.indicators)]),
  ) as Record<DistrictId, number>;
}

export function computeBaseScore(): number {
  const scores = DISTRICTS.map((d) => districtScore(d.indicators));
  const dAvg = DISTRICTS.reduce(
    (sum, d, i) => sum + d.populationShare * scores[i],
    0,
  );
  const dMin = Math.min(...scores);
  let nCrit = 0;
  for (const d of DISTRICTS) {
    for (const k of INDICATORS) {
      if (d.indicators[k] < CRITICAL_THRESHOLD) nCrit += 1;
    }
  }
  return 0.7 * dAvg + 0.3 * dMin - 1.0 * nCrit;
}

function weakestOf(rows: { id: DistrictId; score: number }[]): DistrictId {
  return rows.reduce((min, row) => (row.score < min.score ? row : min)).id;
}

/** Aggregates of the untouched city, using the same terms as the Score formula. */
export function baseSummary(): BaseSummary {
  const districts = DISTRICTS.map((d) => ({
    id: d.id,
    nameRu: d.nameRu,
    populationShare: d.populationShare,
    score: districtScore(d.indicators),
    indicators: cloneIndicators(d.indicators),
    critical: INDICATORS.filter((k) => d.indicators[k] < CRITICAL_THRESHOLD),
  }));
  return {
    score: computeBaseScore(),
    dAvg: districts.reduce((sum, d) => sum + d.populationShare * d.score, 0),
    dMin: Math.min(...districts.map((d) => d.score)),
    nCrit: districts.reduce((sum, d) => sum + d.critical.length, 0),
    weakestId: weakestOf(districts),
    districts,
  };
}

export function scorePlan(decisions: Decision[]): ScoreResult {
  const validation = validateDecisions(decisions);
  if (!validation.ok) {
    return {
      valid: false,
      errors: validation.errors,
      cost: validation.cost,
      remaining: validation.remaining,
    };
  }

  const beforeGrid = emptyGrid();
  const afterGrid = emptyGrid();
  const synergyHits = applyEffects(afterGrid, decisions);

  const districts: DistrictResult[] = DISTRICTS.map((d) => {
    const before = districtScore(beforeGrid[d.id]);
    const after = districtScore(afterGrid[d.id]);
    const critical = INDICATORS.filter(
      (k) => afterGrid[d.id][k] < CRITICAL_THRESHOLD,
    );
    return {
      id: d.id,
      nameRu: d.nameRu,
      populationShare: d.populationShare,
      before,
      after,
      delta: after - before,
      indicatorsBefore: cloneIndicators(beforeGrid[d.id]),
      indicatorsAfter: cloneIndicators(afterGrid[d.id]),
      critical,
    };
  });

  const dAvg = districts.reduce(
    (sum, d) => sum + d.populationShare * d.after,
    0,
  );
  const dMin = Math.min(...districts.map((d) => d.after));
  const nCrit = districts.reduce((sum, d) => sum + d.critical.length, 0);
  const score = 0.7 * dAvg + 0.3 * dMin - 1.0 * nCrit;
  const baseScore = computeBaseScore();
  const summary = baseSummary();
  const base = {
    score: summary.score,
    dAvg: summary.dAvg,
    dMin: summary.dMin,
    nCrit: summary.nCrit,
    weakestId: summary.weakestId,
  };

  return {
    valid: true,
    score,
    baseScore,
    scoreDelta: score - baseScore,
    dAvg,
    dMin,
    nCrit,
    weakestId: weakestOf(districts.map((d) => ({ id: d.id, score: d.after }))),
    base,
    cost: validation.cost,
    remaining: validation.remaining,
    districts,
    measureContributions: decisions.map((decision) => {
      const measure = MEASURE_BY_ID[decision.measureId];
      return {
        measureId: decision.measureId,
        districtId: decision.districtId,
        cost: measure.cost,
        lagFactor: lagFactor(measure.lag),
      };
    }),
    synergyHits,
  };
}

/** Round for display / test comparison to 5 decimal places. */
export function roundScore(value: number, digits = 5): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function assertControlValues(): {
  base: number;
  expectedBase: typeof EXPECTED_BASE_SCORE;
} {
  return { base: roundScore(computeBaseScore()), expectedBase: EXPECTED_BASE_SCORE };
}
