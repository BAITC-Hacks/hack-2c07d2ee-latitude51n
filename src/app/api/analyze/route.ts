import {
  DISTRICT_BY_ID,
  MEASURE_BY_ID,
  improveOneDecision,
  scorePlan,
  type Decision,
  type ImproveSuggestion,
  type ScoreBreakdown,
} from "@/lib/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseDecisions(input: unknown): Decision[] | null {
  if (!Array.isArray(input) || input.length > 10) return null;
  const out: Decision[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const { measureId, districtId } = item as Record<string, unknown>;
    if (typeof measureId !== "string") return null;
    if (districtId !== undefined && typeof districtId !== "string") return null;
    out.push({
      measureId: measureId as Decision["measureId"],
      ...(districtId ? { districtId: districtId as Decision["districtId"] } : {}),
    });
  }
  return out;
}

function describeDecision(d: Decision): string {
  const m = MEASURE_BY_ID[d.measureId];
  const where = d.districtId ? DISTRICT_BY_ID[d.districtId].nameRu : "весь город";
  return `${m.id} «${m.nameRu}» → ${where}`;
}

function buildPrompt(
  decisions: Decision[],
  result: ScoreBreakdown,
  suggestion: ImproveSuggestion | null,
): string {
  const plan = decisions
    .map((d) => {
      const m = MEASURE_BY_ID[d.measureId];
      return `- ${describeDecision(d)} (стоимость ${m.cost}, лаг ${m.lag} кв., реализовано ${((8 - m.lag) / 8) * 100}% эффекта)`;
    })
    .join("\n");

  const districts = result.districts
    .map(
      (d) =>
        `- ${d.nameRu} (доля населения ${d.populationShare}): D ${d.before.toFixed(2)} → ${d.after.toFixed(2)} (Δ ${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(2)})${
          d.critical.length ? `; ниже 40: ${d.critical.join(", ")}` : ""
        }`,
    )
    .join("\n");

  const improve = suggestion
    ? `Лучшая замена одной меры, найденная перебором: ${describeDecision(suggestion.from)} заменить на ${describeDecision(suggestion.to)}. Новый Score ${suggestion.score.toFixed(5)} (Δ +${suggestion.scoreDelta.toFixed(5)}), стоимость ${suggestion.cost}. Сильнее всего растёт район: ${
        suggestion.winnerDistrictId
          ? `${DISTRICT_BY_ID[suggestion.winnerDistrictId].nameRu} (+${suggestion.winnerDistrictDelta.toFixed(2)} к D)`
          : "нет явного лидера"
      }.`
    : "Перебор не нашёл замены одной меры, которая повышает Score.";

  return `План:
${plan}

Итог:
- Astana Quality of Life Score: ${result.score.toFixed(5)} (без действий ${result.baseScore.toFixed(5)}, Δ ${result.scoreDelta >= 0 ? "+" : ""}${result.scoreDelta.toFixed(5)})
- Средний по населению D_avg: ${result.dAvg.toFixed(4)}; самый слабый район min D: ${result.dMin.toFixed(4)}; критических значений (<40): ${result.nCrit}
- Потрачено ${result.cost} из 100, остаток ${result.remaining}
- Синергии: ${result.synergyHits.length ? result.synergyHits.join("; ") : "нет"}

Районы:
${districts}

${improve}

Напиши на русском три коротких абзаца без markdown:
1) Сильные стороны: какие районы и показатели выиграли и почему.
2) Риски и компромиссы: кто остался слабым, что съел лаг, какие проблемы не закрыты.
3) Следующий шаг: опиши найденную замену и её цену; если замены нет, назови направление без новых чисел.`;
}

const SYSTEM_PROMPT =
  "Ты аналитик городского планирования в симуляторе «Аким на 5 часов». Все числа уже посчитаны детерминированным движком. Не пересчитывай, не округляй по-своему и не придумывай цифры: используй только значения из сообщения пользователя.";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
  }

  const decisions = parseDecisions((raw as { decisions?: unknown })?.decisions);
  if (!decisions) {
    return NextResponse.json({ error: "Нужен массив decisions." }, { status: 400 });
  }

  const result = scorePlan(decisions);
  if (!result.valid) {
    return NextResponse.json(
      { error: `План недопустим: ${result.errors.join(" ")}` },
      { status: 422 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Нет OPENAI_API_KEY в .env.local. Добавьте ключ и перезапустите сервер." },
      { status: 503 },
    );
  }

  const suggestion = improveOneDecision(decisions);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(decisions, result, suggestion) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `OpenAI вернул ${response.status}: ${detail.slice(0, 240)}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "Модель вернула пустой ответ." }, { status: 502 });
    }

    return NextResponse.json({ text, model, score: result.score });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json(
      { error: timeout ? "OpenAI не ответил за 45 секунд." : "Не удалось связаться с OpenAI." },
      { status: 502 },
    );
  }
}
