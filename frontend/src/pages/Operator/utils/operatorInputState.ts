import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { createEmptyCutInputData, createEmptyQuantityInputData } from "../types/cutInput";
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
  machineHrs: "",
  opsName: [],
  operatorHistory: [],
  operatorHistoryDetails: [],
  isPaused: false,
  pauseStartTime: null,
  totalPauseTime: 0,
  pausedElapsedTime: 0,
  pauseSessions: [],
  currentPauseReason: "",
});

export const parseOperatorInputStartTime = (timeStr: string): number | null => {
  if (!timeStr) return null;
  const parts = timeStr.split(" ");
  if (parts.length !== 2) return null;
  const datePart = parts[0].split("/");
  const timePart = parts[1].split(":");
  if (datePart.length !== 3 || timePart.length !== 2) return null;
  const day = parseInt(datePart[0], 10) || 0;
  const month = parseInt(datePart[1], 10) || 0;
  const year = parseInt(datePart[2], 10) || 0;
  const hours = parseInt(timePart[0], 10) || 0;
  const minutes = parseInt(timePart[1], 10) || 0;
  return new Date(year, month - 1, day, hours, minutes).getTime();
};

export const updateQuantityMachineHours = (
  qtyData: QuantityInputData,
  mode: "auto" | "recalculate" | "add_idle"
): QuantityInputData => {
  const updatedQtyData = { ...qtyData };
  if (!updatedQtyData.startTime || !updatedQtyData.endTime) return updatedQtyData;

  if (mode === "add_idle" && updatedQtyData.idleTimeDuration) {
    const baseMachineHrs = calculateMachineHrs(updatedQtyData.startTime, updatedQtyData.endTime, "");
    const idleParts = updatedQtyData.idleTimeDuration.split(":");
    if (idleParts.length === 2) {
      const idleHours = parseInt(idleParts[0], 10) || 0;
      const idleMinutes = parseInt(idleParts[1], 10) || 0;
      updatedQtyData.machineHrs = (parseFloat(baseMachineHrs) + idleHours + idleMinutes / 60).toFixed(3);
    }
    return updatedQtyData;
  }

  const baseMachineHrs = calculateMachineHrs(
    updatedQtyData.startTime,
    updatedQtyData.endTime,
    mode === "recalculate" ? updatedQtyData.idleTimeDuration || "" : ""
  );
  const pauseTimeInHours = (updatedQtyData.totalPauseTime || 0) / 3600;
  updatedQtyData.machineHrs = Math.max(0, parseFloat(baseMachineHrs) - pauseTimeInHours).toFixed(3);
  return updatedQtyData;
};
