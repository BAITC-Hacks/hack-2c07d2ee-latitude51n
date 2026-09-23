import {
  DISTRICTS,
  DISTRICT_BY_ID,
  MEASURE_BY_ID,
  REFERENCE_PLAN,
  baseDistrictScores,
  computeBaseScore,
  improveOneDecision,
  roundScore,
  scorePlan,
  type Decision,
  type DistrictId,
  type ScoreBreakdown,
} from "@/lib/engine";
import type { DistrictView } from "@/lib/geo";

export type StoryStateKey = "base" | "plan" | "improved";

export interface StoryState {
  key: StoryStateKey;
  score: number;
  views: Record<DistrictId, DistrictView>;
  focus: DistrictId | null;
}

export interface PlanLine {
  measureId: string;
  nameRu: string;
  where: string;
  cost: number;
}

export interface LandingData {
  states: Record<StoryStateKey, StoryState>;
  weakest: { nameRu: string; score: number };
  plan: { lines: PlanLine[]; cost: number; delta: number; synergies: string[] };
  improve: { from: PlanLine; to: PlanLine; score: number; delta: number; winner: string | null } | null;
}

function viewsOf(result: ScoreBreakdown): Record<DistrictId, DistrictView> {
  return Object.fromEntries(
    result.districts.map((d) => [d.id, { after: d.after, delta: d.delta }]),
  ) as Record<DistrictId, DistrictView>;
}

function mostChanged(result: ScoreBreakdown): DistrictId {
  return result.districts.reduce((a, b) => (Math.abs(b.delta) > Math.abs(a.delta) ? b : a)).id;
}

function lineOf(d: Decision): PlanLine {
  const m = MEASURE_BY_ID[d.measureId];
  return {
    measureId: m.id,
    nameRu: m.nameRu,
    where: d.districtId ? DISTRICT_BY_ID[d.districtId].nameRu : "весь город",
    cost: m.cost,
  };
}

export function buildLandingData(): LandingData {
  const baseScores = baseDistrictScores();
  const baseViews = Object.fromEntries(
    DISTRICTS.map((d) => [d.id, { after: baseScores[d.id], delta: 0 }]),
  ) as Record<DistrictId, DistrictView>;
  const weakestId = DISTRICTS.reduce((a, b) => (baseScores[b.id] < baseScores[a.id] ? b : a)).id;

  const plan = scorePlan(REFERENCE_PLAN);
  if (!plan.valid) throw new Error("Reference plan must be valid");
  const found = improveOneDecision(REFERENCE_PLAN);

  return {
    states: {
      base: { key: "base", score: roundScore(computeBaseScore()), views: baseViews, focus: weakestId },
      plan: { key: "plan", score: plan.score, views: viewsOf(plan), focus: mostChanged(plan) },
      improved: found
        ? { key: "improved", score: found.score, views: viewsOf(found.result), focus: found.winnerDistrictId }
        : { key: "improved", score: plan.score, views: viewsOf(plan), focus: mostChanged(plan) },
    },
    weakest: { nameRu: DISTRICT_BY_ID[weakestId].nameRu, score: baseScores[weakestId] },
    plan: {
      lines: REFERENCE_PLAN.map(lineOf),
      cost: plan.cost,
      delta: plan.scoreDelta,
      synergies: plan.synergyHits,
    },
    improve: found
      ? {
          from: lineOf(found.from),
          to: lineOf(found.to),
          score: found.score,
          delta: found.scoreDelta,
          winner: found.winnerDistrictId ? DISTRICT_BY_ID[found.winnerDistrictId].nameRu : null,
        }
      : null,
  };
}
