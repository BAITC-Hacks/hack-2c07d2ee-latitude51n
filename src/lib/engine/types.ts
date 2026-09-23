export type Indicator =
  | "T1"
  | "T2"
  | "E1"
  | "E2"
  | "S1"
  | "S2"
  | "B1"
  | "B2"
  | "C1"
  | "C2";

export type Direction = "transport" | "ecology" | "social" | "safety" | "services";

export type DistrictId = "esil" | "almaty" | "saryarka" | "baikonur" | "nura";

export type MeasureId =
  | "M1"
  | "M2"
  | "M3"
  | "M4"
  | "M5"
  | "M6"
  | "M7"
  | "M8"
  | "M9"
  | "M10"
  | "M11"
  | "M12"
  | "M13"
  | "M14";

export type MeasureScope = "district" | "city";

export interface District {
  id: DistrictId;
  name: string;
  nameRu: string;
  populationShare: number;
  indicators: Record<Indicator, number>;
  profile: string;
}

export interface Measure {
  id: MeasureId;
  direction: Direction;
  name: string;
  nameRu: string;
  scope: MeasureScope;
  cost: number;
  lag: number;
  effects: Partial<Record<Indicator, number>>;
}

export interface Decision {
  measureId: MeasureId;
  /** Required for district measures; omit for city measures. */
  districtId?: DistrictId;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  cost: number;
  remaining: number;
}

export interface DistrictResult {
  id: DistrictId;
  nameRu: string;
  populationShare: number;
  before: number;
  after: number;
  delta: number;
  indicatorsBefore: Record<Indicator, number>;
  indicatorsAfter: Record<Indicator, number>;
  critical: Indicator[];
}

export interface ScoreBreakdown {
  valid: true;
  score: number;
  baseScore: number;
  scoreDelta: number;
  dAvg: number;
  dMin: number;
  nCrit: number;
  cost: number;
  remaining: number;
  districts: DistrictResult[];
  measureContributions: {
    measureId: MeasureId;
    districtId?: DistrictId;
    cost: number;
    lagFactor: number;
  }[];
  synergyHits: string[];
}

export type ScoreResult =
  | ScoreBreakdown
  | {
      valid: false;
      errors: string[];
      cost: number;
      remaining: number;
    };

export interface ImproveSuggestion {
  replaceIndex: number;
  from: Decision;
  to: Decision;
  score: number;
  scoreDelta: number;
  cost: number;
  winnerDistrictId: DistrictId | null;
  winnerDistrictDelta: number;
  result: ScoreBreakdown;
}
