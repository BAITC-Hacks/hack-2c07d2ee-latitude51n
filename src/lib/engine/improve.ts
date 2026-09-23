import { DISTRICTS, MEASURES } from "./dataset";
import { roundScore, scorePlan } from "./score";
import type { Decision, ImproveSuggestion, MeasureId } from "./types";
import { validateDecisions } from "./validate";

function enumerateCandidates(exclude: Set<MeasureId>): Decision[] {
  const out: Decision[] = [];
  for (const measure of MEASURES) {
    if (exclude.has(measure.id)) continue;
    if (measure.scope === "city") {
      out.push({ measureId: measure.id });
    } else {
      for (const district of DISTRICTS) {
        out.push({ measureId: measure.id, districtId: district.id });
      }
    }
  }
  return out;
}

/**
 * Try replacing exactly one decision; return the best valid higher-score plan.
 */
export function improveOneDecision(
  decisions: Decision[],
): ImproveSuggestion | null {
  const current = scorePlan(decisions);
  if (!current.valid) return null;

  let best: ImproveSuggestion | null = null;

  for (let i = 0; i < decisions.length; i++) {
    const used = new Set(
      decisions
        .filter((_, idx) => idx !== i)
        .map((d) => d.measureId),
    );
    const candidates = enumerateCandidates(used);

    for (const candidate of candidates) {
      const next = decisions.map((d, idx) => (idx === i ? candidate : d));
      if (!validateDecisions(next).ok) continue;
      const result = scorePlan(next);
      if (!result.valid) continue;
      if (result.score <= current.score + 1e-9) continue;

      const deltas = result.districts.map((d) => ({
        id: d.id,
        delta: d.after - (current.districts.find((c) => c.id === d.id)?.after ?? d.before),
      }));
      deltas.sort((a, b) => b.delta - a.delta);
      const winner = deltas[0];

      const suggestion: ImproveSuggestion = {
        replaceIndex: i,
        from: decisions[i],
        to: candidate,
        score: result.score,
        scoreDelta: result.score - current.score,
        cost: result.cost,
        winnerDistrictId: winner && winner.delta > 0 ? winner.id : null,
        winnerDistrictDelta: winner?.delta ?? 0,
        result,
      };

      if (!best || suggestion.score > best.score + 1e-12) {
        best = suggestion;
      } else if (
        best &&
        Math.abs(suggestion.score - best.score) < 1e-12 &&
        suggestion.cost < best.cost
      ) {
        best = suggestion;
      }
    }
  }

  return best
    ? {
        ...best,
        score: roundScore(best.score),
        scoreDelta: roundScore(best.scoreDelta),
      }
    : null;
}
