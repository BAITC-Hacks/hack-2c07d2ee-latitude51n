import { describe, expect, it } from "vitest";
import {
  EXPECTED_BASE_SCORE,
  EXPECTED_REFERENCE_SCORE,
  REFERENCE_PLAN,
  computeBaseScore,
  improveOneDecision,
  roundScore,
  scorePlan,
  validateDecisions,
} from "./index";

describe("QALA score engine", () => {
  it("matches base score 52.55768", () => {
    expect(roundScore(computeBaseScore())).toBe(EXPECTED_BASE_SCORE);
  });

  it("matches organizers reference plan ≈ 56.54307", () => {
    const result = scorePlan(REFERENCE_PLAN);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.cost).toBe(95);
    expect(roundScore(result.score)).toBe(EXPECTED_REFERENCE_SCORE);
    expect(result.synergyHits.some((s) => s.startsWith("M10+M12"))).toBe(true);
    expect(result.nCrit).toBe(0);
  });

  it("rejects over-budget plans without scoring", () => {
    const plan = [
      { measureId: "M3" as const, districtId: "esil" as const },
      { measureId: "M5" as const, districtId: "saryarka" as const },
      { measureId: "M7" as const, districtId: "nura" as const },
      { measureId: "M13" as const, districtId: "almaty" as const },
      { measureId: "M2" as const },
    ];
    const v = validateDecisions(plan);
    expect(v.ok).toBe(false);
    expect(v.cost).toBeGreaterThan(100);
    const scored = scorePlan(plan);
    expect(scored.valid).toBe(false);
  });

  it("rejects more than 2 measures of one direction", () => {
    const plan = [
      { measureId: "M1" as const, districtId: "esil" as const },
      { measureId: "M2" as const },
      { measureId: "M11" as const, districtId: "nura" as const }, // wait need 3 transport - M1 M2 and need another transport - only M3 left but M1+M3 incompatible
      { measureId: "M4" as const, districtId: "nura" as const },
      { measureId: "M12" as const },
    ];
    // Use M7 M8 M9 - 3 social
    const socialHeavy = [
      { measureId: "M7" as const, districtId: "nura" as const },
      { measureId: "M8" as const, districtId: "nura" as const },
      { measureId: "M9" as const, districtId: "esil" as const },
      { measureId: "M10" as const, districtId: "almaty" as const },
      { measureId: "M12" as const },
    ];
    const v = validateDecisions(socialHeavy);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.includes("направления"))).toBe(true);
    void plan;
  });

  it("rejects M1+M3 incompatibility", () => {
    const plan = [
      { measureId: "M1" as const, districtId: "esil" as const },
      { measureId: "M3" as const, districtId: "almaty" as const },
      { measureId: "M10" as const, districtId: "nura" as const },
      { measureId: "M12" as const },
      { measureId: "M4" as const, districtId: "saryarka" as const },
    ];
    expect(validateDecisions(plan).ok).toBe(false);
  });

  it("rejects M4+M7 same district", () => {
    const plan = [
      { measureId: "M4" as const, districtId: "nura" as const },
      { measureId: "M7" as const, districtId: "nura" as const },
      { measureId: "M10" as const, districtId: "esil" as const },
      { measureId: "M12" as const },
      { measureId: "M11" as const, districtId: "almaty" as const },
    ];
    expect(validateDecisions(plan).ok).toBe(false);
  });

  it("accepts cheapest valid pack M9+M11+M10+M12+M4", () => {
    const plan = [
      { measureId: "M9" as const, districtId: "nura" as const },
      { measureId: "M11" as const, districtId: "nura" as const },
      { measureId: "M10" as const, districtId: "nura" as const },
      { measureId: "M12" as const },
      { measureId: "M4" as const, districtId: "saryarka" as const },
    ];
    const v = validateDecisions(plan);
    expect(v.ok).toBe(true);
    expect(v.cost).toBe(61);
    expect(scorePlan(plan).valid).toBe(true);
  });

  it("improveOneDecision finds a better swap for a weak plan", () => {
    const weak = [
      { measureId: "M9" as const, districtId: "baikonur" as const },
      { measureId: "M11" as const, districtId: "baikonur" as const },
      { measureId: "M10" as const, districtId: "baikonur" as const },
      { measureId: "M12" as const },
      { measureId: "M4" as const, districtId: "baikonur" as const },
    ];
    const suggestion = improveOneDecision(weak);
    expect(suggestion).not.toBeNull();
    if (!suggestion) return;
    expect(suggestion.score).toBeGreaterThan(
      roundScore((scorePlan(weak) as { score: number }).score),
    );
  });
});
