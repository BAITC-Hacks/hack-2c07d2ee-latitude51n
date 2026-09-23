import {
  DISTRICT_BY_ID,
  MEASURE_BY_ID,
  type Decision,
  type ImproveSuggestion,
  type ScoreBreakdown,
} from "@/lib/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  decisions: Decision[];
  result: ScoreBreakdown;
  suggestion?: ImproveSuggestion | null;
}

function buildPrompt(body: Body): string {
  const { decisions, result, suggestion } = body;
  const plan = decisions
    .map((d) => {
      const m = MEASURE_BY_ID[d.measureId];
      const where = d.districtId
        ? DISTRICT_BY_ID[d.districtId].nameRu
        : "весь город";
      return `- ${m.id} «${m.nameRu}» → ${where} (стоимость ${m.cost}, лаг ${m.lag})`;
    })
    .join("\n");

  const districts = result.districts
    .map(
      (d) =>
        `- ${d.nameRu}: D ${d.before.toFixed(2)} → ${d.after.toFixed(2)} (Δ ${d.delta >= 0 ? "+" : ""}${d.delta.toFixed(2)})${
          d.critical.length ? `; критические: ${d.critical.join(", ")}` : ""
        }`,
    )
    .join("\n");

  const improve = suggestion
    ? `Предложенная замена одной меры: ${suggestion.from.measureId} → ${suggestion.to.measureId}, новый Score ${suggestion.score.toFixed(5)} (Δ +${suggestion.scoreDelta.toFixed(5)}). Победитель по приросту района: ${
        suggestion.winnerDistrictId
          ? DISTRICT_BY_ID[suggestion.winnerDistrictId].nameRu
          : "н/д"
      }.`
    : "Замена одной меры пока не искалась.";

  return `Ты — аналитик городского планирования для симулятора QALA («Аким на 5 часов»).
Числа уже посчитаны детерминированным движком. НЕ пересчитывай и НЕ выдумывай новые цифры.
Используй только данные ниже.

План:
${plan}

Итог:
- Score: ${result.score.toFixed(5)} (база ${result.baseScore.toFixed(5)}, Δ ${result.scoreDelta >= 0 ? "+" : ""}${result.scoreDelta.toFixed(5)})
- D_avg: ${result.dAvg.toFixed(4)}, min D: ${result.dMin.toFixed(4)}, N_crit: ${result.nCrit}
- Стоимость: ${result.cost}, остаток: ${result.remaining}
- Синергии: ${result.synergyHits.length ? result.synergyHits.join("; ") : "нет"}

Районы:
${districts}

${improve}

Напиши на русском 3 коротких абзаца:
1) сильные стороны плана;
2) риски и оставшиеся компромиссы (кто проигрывает или остаётся слабым);
3) один конкретный следующий шаг (если есть suggestion — опиши его; иначе предложи направление без новых чисел).
Без маркеров markdown, без таблиц.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Нет OPENAI_API_KEY в .env.local. Добавьте ключ и перезапустите dev-сервер.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  if (!body?.result?.valid || !Array.isArray(body.decisions)) {
    return NextResponse.json(
      { error: "Нужен валидный результат расчёта" },
      { status: 400 },
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const prompt = buildPrompt(body);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Ты объясняешь готовые расчёты городского симулятора. Не считаешь Score сам.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `OpenAI error ${response.status}: ${errText.slice(0, 240)}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "Пустой ответ модели" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Ошибка запроса к OpenAI",
      },
      { status: 502 },
    );
  }
}
