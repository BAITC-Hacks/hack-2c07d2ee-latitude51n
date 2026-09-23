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
  type Decision,
} from "./index";

const CHEAPEST: Decision[] = [
  { measureId: "M9", districtId: "nura" },
  { measureId: "M11", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M4", districtId: "saryarka" },
];

function expectRejected(plan: Decision[], fragment: string) {
  const v = validateDecisions(plan);
  expect(v.ok).toBe(false);
  expect(v.errors.some((e) => e.includes(fragment))).toBe(true);
  const scored = scorePlan(plan);
  expect(scored.valid).toBe(false);
  expect("score" in scored).toBe(false);
}

describe("control values", () => {
  it("base score is 52.55768", () => {
    expect(roundScore(computeBaseScore())).toBe(EXPECTED_BASE_SCORE);
  });

  it("organizers' reference plan scores 56.54307 at cost 95", () => {
    const result = scorePlan(REFERENCE_PLAN);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.cost).toBe(95);
    expect(result.remaining).toBe(5);
    expect(roundScore(result.score)).toBe(EXPECTED_REFERENCE_SCORE);
    expect(result.nCrit).toBe(0);
    expect(result.synergyHits).toHaveLength(1);
    expect(result.synergyHits[0]).toMatch(/^M10\+M12/);
  });

  it("cheapest valid plan costs 61", () => {
    const v = validateDecisions(CHEAPEST);
    expect(v.ok).toBe(true);
    expect(v.cost).toBe(61);
  });
});

describe("rules", () => {
  it("requires exactly five decisions", () => {
    expectRejected(CHEAPEST.slice(0, 4), "ровно 5");
  });

  it("forbids repeating a measure", () => {
    expectRejected(
      [
        { measureId: "M10", districtId: "nura" },
        { measureId: "M10", districtId: "esil" },
        { measureId: "M9", districtId: "nura" },
        { measureId: "M12" },
        { measureId: "M4", districtId: "saryarka" },
      ],
      "Повторы",
    );
  });

  it("rejects plans over budget 100", () => {
    expectRejected(
      [
        { measureId: "M3", districtId: "esil" },
        { measureId: "M5", districtId: "saryarka" },
        { measureId: "M7", districtId: "nura" },
        { measureId: "M13", districtId: "almaty" },
        { measureId: "M2" },
      ],
      "бюджет",
    );
  });

  it("allows at most two measures per direction", () => {
    expectRejected(
      [
        { measureId: "M7", districtId: "nura" },
        { measureId: "M8", districtId: "nura" },
        { measureId: "M9", districtId: "esil" },
        { measureId: "M10", districtId: "almaty" },
        { measureId: "M12" },
      ],
      "направления",
    );
  });

  it("requires a district for district measures", () => {
    expectRejected(
      [{ measureId: "M9" }, ...CHEAPEST.slice(1)],
      "укажите район",
    );
  });

  it("forbids a district for city measures", () => {
    expectRejected(
      [...CHEAPEST.slice(0, 3), { measureId: "M12", districtId: "nura" }, CHEAPEST[4]],
      "район не указывается",
    );
  });

  it("forbids M1 with M3 in any districts", () => {
    expectRejected(
      [
        { measureId: "M1", districtId: "esil" },
        { measureId: "M3", districtId: "almaty" },
        { measureId: "M10", districtId: "nura" },
        { measureId: "M12" },
        { measureId: "M4", districtId: "saryarka" },
      ],
      "M1 и M3",
    );
  });

  it("forbids M4 with M7 in the same district only", () => {
    const base: Decision[] = [
      { measureId: "M10", districtId: "esil" },
      { measureId: "M12" },
      { measureId: "M11", districtId: "almaty" },
    ];
    expectRejected(
      [
        { measureId: "M4", districtId: "nura" },
        { measureId: "M7", districtId: "nura" },
        ...base,
      ],
      "M4 и M7",
    );
    expect(
      validateDecisions([
        { measureId: "M4", districtId: "saryarka" },
        { measureId: "M7", districtId: "nura" },
        ...base,
      ]).ok,
    ).toBe(true);
  });

  it("forbids M5 with M13 in the same district only", () => {
    const base: Decision[] = [
      { measureId: "M10", districtId: "esil" },
      { measureId: "M9", districtId: "nura" },
      { measureId: "M11", districtId: "almaty" },
    ];
    expectRejected(
      [
        { measureId: "M5", districtId: "saryarka" },
        { measureId: "M13", districtId: "saryarka" },
        ...base,
      ],
      "M5 и M13",
    );
    expect(
      validateDecisions([
        { measureId: "M5", districtId: "saryarka" },
        { measureId: "M13", districtId: "almaty" },
        ...base,
      ]).ok,
    ).toBe(true);
  });

  it("ignores decision order", () => {
    const a = scorePlan(REFERENCE_PLAN);
    const b = scorePlan([...REFERENCE_PLAN].reverse());
    expect(a.valid && b.valid).toBe(true);
    if (!a.valid || !b.valid) return;
    expect(b.score).toBeCloseTo(a.score, 10);
  });
});

describe("model behaviour", () => {
  it("changing the plan changes the score", () => {
    const a = scorePlan(REFERENCE_PLAN);
    const b = scorePlan(CHEAPEST);
    expect(a.valid && b.valid).toBe(true);
    if (!a.valid || !b.valid) return;
    expect(a.score).not.toBeCloseTo(b.score, 5);
  });

  it("applies city measures to all five districts", () => {
    const result = scorePlan(CHEAPEST);
    if (!result.valid) throw new Error("expected valid");
    for (const d of result.districts) {
      expect(d.indicatorsAfter.C2 - d.indicatorsBefore.C2).toBeCloseTo(5 * (7 / 8), 10);
    }
  });

  it("scales effects by lag (8 - L) / 8", () => {
    const result = scorePlan(REFERENCE_PLAN);
    if (!result.valid) throw new Error("expected valid");
    const nura = result.districts.find((d) => d.id === "nura")!;
    // M7 in Nura: S1 +16, lag 3 → +10
    expect(nura.indicatorsAfter.S1 - nura.indicatorsBefore.S1).toBeCloseTo(10, 10);
  });
});

describe("improveOneDecision", () => {
  it("finds a valid, strictly better single swap", () => {
    const weak: Decision[] = [
      { measureId: "M9", districtId: "baikonur" },
      { measureId: "M11", districtId: "baikonur" },
      { measureId: "M10", districtId: "baikonur" },
      { measureId: "M12" },
      { measureId: "M4", districtId: "baikonur" },
    ];
    const before = scorePlan(weak);
    if (!before.valid) throw new Error("expected valid");
    const suggestion = improveOneDecision(weak);
    expect(suggestion).not.toBeNull();
    if (!suggestion) return;
    expect(suggestion.score).toBeGreaterThan(before.score);
    const next = weak.map((d, i) => (i === suggestion.replaceIndex ? suggestion.to : d));
    expect(validateDecisions(next).ok).toBe(true);
    expect(roundScore((scorePlan(next) as { score: number }).score)).toBe(suggestion.score);
  });

  it("returns null for invalid plans", () => {
    expect(improveOneDecision(CHEAPEST.slice(0, 4))).toBeNull();
  });
});
