import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyCutInputData, createEmptyQuantityInputData } from "../types/cutInput";
import { parseISTDateTimeToMs } from "../../../utils/dateTime";
import { calculateMachineHrs } from "./machineHrsCalculation";

export const ensureCutInputState = (
  current: CutInputData | undefined,
  quantityCount: number
): { cut: CutInputData; quantities: QuantityInputData[] } => {
  const cut = !current || !Array.isArray(current.quantities) ? createEmptyCutInputData(Math.max(1, quantityCount)) : current;
  const quantities = [...cut.quantities];
  while (quantities.length < quantityCount) quantities.push(createEmptyQuantityInputData());
  return { cut, quantities };
};

export const buildCopiedQuantityFields = (source: QuantityInputData) => ({
  startTime: source.startTime,
  startTimeEpochMs: source.startTimeEpochMs || null,
  endTime: source.endTime,
  endTimeEpochMs: source.endTimeEpochMs || null,
  workedDurationSeconds: source.workedDurationSeconds || 0,
  pauseTimeOffsetSeconds: source.pauseTimeOffsetSeconds || 0,
  machineHrs: source.machineHrs,
  machineNumber: source.machineNumber,
  opsName: [...(source.opsName || [])],
  operatorHistory: [...(source.operatorHistory || source.opsName || [])],
  idleTime: source.idleTime,
  idleTimeDuration: source.idleTimeDuration,
  lastImage: source.lastImage,
  lastImageFile: source.lastImageFile,
});

export const buildResetQuantityState = (qtyData: QuantityInputData): QuantityInputData => ({
  ...qtyData,
  startTime: "",
  startTimeEpochMs: null,
  endTime: "",
  endTimeEpochMs: null,
  workedDurationSeconds: 0,
  pauseTimeOffsetSeconds: 0,
  machineHrs: "",
  operatorHistoryDetails: [],
  isPaused: false,
  pauseStartTime: null,
  currentPauseOperatorName: "",
  totalPauseTime: 0,
  pausedElapsedTime: 0,
  pauseSessions: [],
  currentPauseReason: "",
});

export const parseOperatorInputStartTime = (timeStr: string): number | null => {
  return parseISTDateTimeToMs(timeStr);
};

export const getEffectiveSegmentPauseSeconds = (
  quantity: Pick<QuantityInputData, "totalPauseTime" | "pauseTimeOffsetSeconds">
) => {
  return Math.max(
    0,
    Math.floor(Number(quantity.totalPauseTime || 0) - Number(quantity.pauseTimeOffsetSeconds || 0))
  );
};

export const updateQuantityMachineHours = (
  qtyData: QuantityInputData,
  mode: "auto" | "recalculate" | "add_idle"
): QuantityInputData => {
  const updatedQtyData = { ...qtyData };
  if (!updatedQtyData.startTime || !updatedQtyData.endTime) return updatedQtyData;

  const idleTimeDuration = mode === "auto" || mode === "recalculate" || mode === "add_idle"
    ? updatedQtyData.idleTimeDuration || ""
    : "";
  updatedQtyData.machineHrs = calculateMachineHrs(
    updatedQtyData.startTime,
    updatedQtyData.endTime,
    idleTimeDuration,
    getEffectiveSegmentPauseSeconds(updatedQtyData),
    updatedQtyData.startTimeEpochMs || null,
    updatedQtyData.endTimeEpochMs || null
  );
  return updatedQtyData;
};
