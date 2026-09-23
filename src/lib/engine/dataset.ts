import type {
  Direction,
  District,
  DistrictId,
  Indicator,
  Measure,
  MeasureId,
} from "./types";

export const BUDGET = 100;
export const HORIZON = 8;
export const REQUIRED_DECISIONS = 5;
export const MAX_PER_DIRECTION = 2;
export const CRITICAL_THRESHOLD = 40;

export const INDICATORS: Indicator[] = [
  "T1",
  "T2",
  "E1",
  "E2",
  "S1",
  "S2",
  "B1",
  "B2",
  "C1",
  "C2",
];

export const INDICATOR_WEIGHTS: Record<Indicator, number> = {
  T1: 0.1,
  T2: 0.1,
  E1: 0.09,
  E2: 0.11,
  S1: 0.11,
  S2: 0.11,
  B1: 0.09,
  B2: 0.09,
  C1: 0.1,
  C2: 0.1,
};

export const INDICATOR_META: Record<
  Indicator,
  { labelRu: string; direction: Direction }
> = {
  T1: { labelRu: "Разгрузка дорог", direction: "transport" },
  T2: { labelRu: "Общественный транспорт", direction: "transport" },
  E1: { labelRu: "Озеленение", direction: "ecology" },
  E2: { labelRu: "Качество воздуха", direction: "ecology" },
  S1: { labelRu: "Школы и детсады", direction: "social" },
  S2: { labelRu: "Поликлиники", direction: "social" },
  B1: { labelRu: "Безопасность улиц", direction: "safety" },
  B2: { labelRu: "Безопасность дорог", direction: "safety" },
  C1: { labelRu: "Надёжность ЖКХ", direction: "services" },
  C2: { labelRu: "Скорость обращений", direction: "services" },
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  transport: "Транспорт",
  ecology: "Экология",
  social: "Соцсфера",
  safety: "Безопасность",
  services: "Сервисы",
};

export const DISTRICTS: District[] = [
  {
    id: "esil",
    name: "Esil",
    nameRu: "Есиль",
    populationShare: 0.27,
    indicators: {
      T1: 45,
      T2: 62,
      E1: 68,
      E2: 72,
      S1: 48,
      S2: 55,
      B1: 78,
      B2: 60,
      C1: 75,
      C2: 70,
    },
    profile: "Богатый район с пробками на мостах и переполненными школами.",
  },
  {
    id: "almaty",
    name: "Almaty",
    nameRu: "Алматы",
    populationShare: 0.24,
    indicators: {
      T1: 40,
      T2: 75,
      E1: 50,
      E2: 55,
      S1: 60,
      S2: 65,
      B1: 62,
      B2: 52,
      C1: 50,
      C2: 60,
    },
    profile: "Старый ЖКХ и плотные пробки.",
  },
  {
    id: "saryarka",
    name: "Saryarka",
    nameRu: "Сарыарка",
    populationShare: 0.2,
    indicators: {
      T1: 50,
      T2: 70,
      E1: 42,
      E2: 40,
      S1: 62,
      S2: 68,
      B1: 58,
      B2: 55,
      C1: 45,
      C2: 55,
    },
    profile: "Смог от частного сектора, слабое озеленение.",
  },
  {
    id: "baikonur",
    name: "Baikonur",
    nameRu: "Байконур",
    populationShare: 0.13,
    indicators: {
      T1: 52,
      T2: 68,
      E1: 55,
      E2: 50,
      S1: 58,
      S2: 60,
      B1: 52,
      B2: 58,
      C1: 55,
      C2: 58,
    },
    profile: "Середняк без ярких перекосов.",
  },
  {
    id: "nura",
    name: "Nura",
    nameRu: "Нура",
    populationShare: 0.16,
    indicators: {
      T1: 55,
      T2: 40,
      E1: 45,
      E2: 65,
      S1: 38,
      S2: 35,
      B1: 55,
      B2: 50,
      C1: 60,
      C2: 50,
    },
    profile: "Главный аутсайдер по соцсфере и транспорту.",
  },
];

export const MEASURES: Measure[] = [
  {
    id: "M1",
    direction: "transport",
    name: "Bus lanes",
    nameRu: "Выделенные полосы для автобусов",
    scope: "district",
    cost: 18,
    lag: 2,
    effects: { T1: 6, T2: 9 },
  },
  {
    id: "M2",
    direction: "transport",
    name: "Smart traffic lights",
    nameRu: "Умные светофоры",
    scope: "city",
    cost: 22,
    lag: 2,
    effects: { T1: 4, B2: 3 },
  },
  {
    id: "M3",
    direction: "transport",
    name: "LRT expansion",
    nameRu: "Линия ЛРТ / расширение",
    scope: "district",
    cost: 30,
    lag: 4,
    effects: { T1: 16, T2: 20, E2: 4 },
  },
  {
    id: "M4",
    direction: "ecology",
    name: "Park / square",
    nameRu: "Парк / сквер",
    scope: "district",
    cost: 15,
    lag: 2,
    effects: { E1: 12, E2: 3, B1: 2 },
  },
  {
    id: "M5",
    direction: "ecology",
    name: "Clean fuel for private sector",
    nameRu: "Чистое топливо частного сектора",
    scope: "district",
    cost: 25,
    lag: 3,
    effects: { E2: 14, C1: 4 },
  },
  {
    id: "M6",
    direction: "ecology",
    name: "City greening program",
    nameRu: "Городская программа озеленения",
    scope: "city",
    cost: 20,
    lag: 4,
    effects: { E1: 5, E2: 3 },
  },
  {
    id: "M7",
    direction: "social",
    name: "School + kindergarten",
    nameRu: "Школа + детсад",
    scope: "district",
    cost: 24,
    lag: 3,
    effects: { S1: 16 },
  },
  {
    id: "M8",
    direction: "social",
    name: "Family health center",
    nameRu: "Центр семейного здоровья",
    scope: "district",
    cost: 20,
    lag: 3,
    effects: { S2: 14 },
  },
  {
    id: "M9",
    direction: "social",
    name: "Courtyard sport hubs",
    nameRu: "Дворовые спорт-хабы",
    scope: "district",
    cost: 10,
    lag: 1,
    effects: { S1: 3, S2: 3, B1: 3 },
  },
  {
    id: "M10",
    direction: "safety",
    name: "Lighting and cameras",
    nameRu: "Освещение и камеры",
    scope: "district",
    cost: 12,
    lag: 1,
    effects: { B1: 12, B2: 2 },
  },
  {
    id: "M11",
    direction: "safety",
    name: "Safe crossings",
    nameRu: "Безопасные переходы и школьные зоны",
    scope: "district",
    cost: 10,
    lag: 1,
    effects: { B2: 12, T1: -2 },
  },
  {
    id: "M12",
    direction: "services",
    name: "Digital appeals platform",
    nameRu: "Единая цифровая платформа обращений",
    scope: "city",
    cost: 14,
    lag: 1,
    effects: { C2: 5 },
  },
  {
    id: "M13",
    direction: "services",
    name: "Heat and water upgrade",
    nameRu: "Модернизация тепло- и водосетей",
    scope: "district",
    cost: 28,
    lag: 4,
    effects: { C1: 18, E2: 2 },
  },
  {
    id: "M14",
    direction: "services",
    name: "Emergency utility crews",
    nameRu: "Аварийные бригады ЖКХ",
    scope: "city",
    cost: 16,
    lag: 1,
    effects: { C1: 5, C2: 2 },
  },
];

export const MEASURE_BY_ID: Record<MeasureId, Measure> = Object.fromEntries(
  MEASURES.map((m) => [m.id, m]),
) as Record<MeasureId, Measure>;

export const DISTRICT_BY_ID: Record<DistrictId, District> = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, d]),
) as Record<DistrictId, District>;

/** Organizers' reference plan (cost 95). */
export const REFERENCE_PLAN = [
  { measureId: "M7" as const, districtId: "nura" as const },
  { measureId: "M8" as const, districtId: "nura" as const },
  { measureId: "M10" as const, districtId: "nura" as const },
  { measureId: "M12" as const },
  { measureId: "M5" as const, districtId: "saryarka" as const },
];

export const EXPECTED_BASE_SCORE = 52.55768;
export const EXPECTED_REFERENCE_SCORE = 56.54307;
