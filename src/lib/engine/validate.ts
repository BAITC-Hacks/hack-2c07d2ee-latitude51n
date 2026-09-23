import {
  BUDGET,
  DIRECTION_LABELS,
  DISTRICT_BY_ID,
  MAX_PER_DIRECTION,
  MEASURE_BY_ID,
  REQUIRED_DECISIONS,
} from "./dataset";
import type { Decision, Direction, ValidationResult } from "./types";

function costOf(decisions: Decision[]): number {
  return decisions.reduce((sum, d) => {
    const m = MEASURE_BY_ID[d.measureId];
    return sum + (m?.cost ?? 0);
  }, 0);
}

export function validateDecisions(
  decisions: Decision[],
  { partial = false }: { partial?: boolean } = {},
): ValidationResult {
  const errors: string[] = [];
  const cost = costOf(decisions);
  const remaining = BUDGET - cost;

  if (partial ? decisions.length > REQUIRED_DECISIONS : decisions.length !== REQUIRED_DECISIONS) {
    errors.push(
      `Нужно ровно ${REQUIRED_DECISIONS} мероприятий (сейчас ${decisions.length}).`,
    );
  }

  const ids = decisions.map((d) => d.measureId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    errors.push("Повторы запрещены: каждое мероприятие максимум один раз.");
  }

  if (cost > BUDGET) {
    errors.push(`Превышен бюджет: ${cost} > ${BUDGET}.`);
  }

  const directionCounts: Partial<Record<Direction, number>> = {};

  for (const decision of decisions) {
    const measure = MEASURE_BY_ID[decision.measureId];
    if (!measure) {
      errors.push(`Неизвестное мероприятие: ${decision.measureId}.`);
      continue;
    }

    directionCounts[measure.direction] =
      (directionCounts[measure.direction] ?? 0) + 1;

    if (measure.scope === "district") {
      if (!decision.districtId) {
        errors.push(
          `${measure.id} (${measure.nameRu}) — районное: укажите район.`,
        );
      } else if (!DISTRICT_BY_ID[decision.districtId]) {
        errors.push(
          `${measure.id}: неизвестный район ${decision.districtId}.`,
        );
      }
    } else if (decision.districtId) {
      errors.push(
        `${measure.id} (${measure.nameRu}) — городское: район не указывается.`,
      );
    }
  }

  for (const [direction, count] of Object.entries(directionCounts)) {
    if ((count ?? 0) > MAX_PER_DIRECTION) {
      errors.push(
        `Не больше ${MAX_PER_DIRECTION} мер одного направления: «${DIRECTION_LABELS[direction as Direction]}» — ${count}.`,
      );
    }
  }

  const has = (id: string) => decisions.some((d) => d.measureId === id);
  if (has("M1") && has("M3")) {
    errors.push("Несовместимость: M1 и M3 нельзя вместе (BRT или ЛРТ).");
  }

  const districtOf = (id: string) =>
    decisions.find((d) => d.measureId === id)?.districtId;

  const m4 = districtOf("M4");
  const m7 = districtOf("M7");
  if (m4 && m7 && m4 === m7) {
    errors.push(
      `Несовместимость: M4 и M7 нельзя в одном районе (${DISTRICT_BY_ID[m4]?.nameRu ?? m4}) — конфликт за участок.`,
    );
  }

  const m5 = districtOf("M5");
  const m13 = districtOf("M13");
  if (m5 && m13 && m5 === m13) {
    errors.push(
      `Несовместимость: M5 и M13 нельзя в одном районе (${DISTRICT_BY_ID[m5]?.nameRu ?? m5}) — программы дублируются.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    cost,
    remaining,
  };
}
