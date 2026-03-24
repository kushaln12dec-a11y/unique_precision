import type { InspectionReportRowPayload, InstrumentSelection } from "../../services/inspectionReportApi";

export type Decision = "ACCEPTED" | "REJECTED";
export type YesNo = "YES" | "NO" | "";
export type DamageField = "workPieceDamage" | "rightAngleProblem" | "materialProblem";

export const MAX_ROWS = 30;

export const createEmptyInstruments = (): InstrumentSelection => ({
  hm: false,
  sg: false,
  pg: false,
  vc: false,
  dm: false,
});

export const createEmptyRow = (): InspectionReportRowPayload => ({
  actualDimension: "",
  tolerance: "",
  measuringDimension: "",
  deviation: "",
  instruments: createEmptyInstruments(),
});

export const getTodayIsoDate = () => {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

export const formatDateForTemplate = (isoDate: string) => {
  if (!isoDate) return "";
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

export const hasRowValue = (row: InspectionReportRowPayload) => {
  const hasText = row.actualDimension.trim() || row.tolerance.trim() || row.measuringDimension.trim() || row.deviation.trim();
  const hasInstrument = Object.values(row.instruments).some(Boolean);
  return Boolean(hasText || hasInstrument);
};
