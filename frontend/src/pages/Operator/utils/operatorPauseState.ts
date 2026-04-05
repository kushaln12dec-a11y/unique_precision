import type { QuantityInputData } from "../types/cutInput";
import { parseOperatorInputStartTime } from "./operatorInputState";

const resolvePauseOperatorName = (qtyData: QuantityInputData, fallbackName?: string) => {
  const explicitName = String(fallbackName || "").trim();
  if (explicitName) return explicitName.toUpperCase();
  const firstOpsName = Array.isArray(qtyData.opsName) ? String(qtyData.opsName[0] || "").trim() : "";
  return firstOpsName ? firstOpsName.toUpperCase() : "";
};

export const resumePausedQuantity = (qtyData: QuantityInputData, now: number, operatorName?: string): QuantityInputData => {
  if (!qtyData.pauseStartTime) {
    return {
      ...qtyData,
      isPaused: false,
      pauseStartTime: null,
      currentPauseReason: "",
    };
  }
  const pauseDuration = qtyData.pauseStartTime ? Math.floor((now - qtyData.pauseStartTime) / 1000) : 0;
  return {
    ...qtyData,
    isPaused: false,
    pauseStartTime: null,
    totalPauseTime: qtyData.totalPauseTime + pauseDuration,
    pauseSessions: [
      ...(qtyData.pauseSessions || []),
      {
        pauseStartTime: qtyData.pauseStartTime,
        pauseEndTime: now,
        pauseDuration,
        reason: qtyData.currentPauseReason || "",
        operatorName: resolvePauseOperatorName(qtyData, operatorName),
      },
    ],
    currentPauseReason: "",
  };
};

export const pauseRunningQuantity = (qtyData: QuantityInputData, now: number): QuantityInputData => {
  const startTimestamp = qtyData.startTimeEpochMs || parseOperatorInputStartTime(qtyData.startTime);
  let currentElapsed = qtyData.pausedElapsedTime;
  if (startTimestamp) {
    const elapsedMs = now - startTimestamp - qtyData.totalPauseTime * 1000;
    currentElapsed = Math.max(0, Math.floor(elapsedMs / 1000));
  }
  return {
    ...qtyData,
    isPaused: true,
    pauseStartTime: now,
    pausedElapsedTime: currentElapsed,
    currentPauseReason: "",
  };
};

export const closePauseOnEndTime = (qtyData: QuantityInputData, now: number, operatorName?: string): QuantityInputData => {
  if (!qtyData.pauseStartTime) {
    return {
      ...qtyData,
      isPaused: false,
      pauseStartTime: null,
      currentPauseReason: "",
    };
  }
  const pauseDuration = qtyData.pauseStartTime ? Math.max(0, Math.floor((now - qtyData.pauseStartTime) / 1000)) : 0;
  return {
    ...qtyData,
    isPaused: false,
    pauseStartTime: null,
    totalPauseTime: (qtyData.totalPauseTime || 0) + pauseDuration,
    pauseSessions: [
      ...(qtyData.pauseSessions || []),
      {
        pauseStartTime: qtyData.pauseStartTime,
        pauseEndTime: now,
        pauseDuration,
        reason: (qtyData.currentPauseReason || "").trim() || "Ended while idle",
        operatorName: resolvePauseOperatorName(qtyData, operatorName),
      },
    ],
    currentPauseReason: "",
  };
};
