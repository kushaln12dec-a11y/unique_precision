import type { QuantityQaStatus } from "../../../types/job";
import type { QuantityProgressStatus } from "./qaProgress";
import type { PauseSession } from "../types/cutInput";
import { parseOperatorDateTime } from "./operatorTimeUtils";

type QuantityInput = {
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string[] | string;
  idleTime?: string;
  idleTimeDuration?: string;
  pauseSessions?: PauseSession[];
  startTimeEpochMs?: number | null;
};

export const getOperatorOpsName = (value: string[] | string | undefined) =>
  Array.isArray(value) ? value.join(", ") : value || "";

export const getAssignedToValue = (opsName: string) => opsName.trim() || "Unassign";

const getSegmentStartMs = (qtyData: QuantityInput) => {
  if (qtyData.startTimeEpochMs && Number.isFinite(Number(qtyData.startTimeEpochMs))) {
    return Number(qtyData.startTimeEpochMs);
  }
  return parseOperatorDateTime(qtyData.startTime) ?? null;
};

export const getPauseSessionsForCurrentSegment = (qtyData: QuantityInput) => {
  const sessions = Array.isArray(qtyData.pauseSessions) ? qtyData.pauseSessions : [];
  const segmentStartMs = getSegmentStartMs(qtyData);
  if (!segmentStartMs) return sessions;
  return sessions.filter((session) => Number(session?.pauseStartTime || 0) >= segmentStartMs);
};

export const buildSingleCapturePayload = (
  qtyData: QuantityInput,
  imageBase64: string | null,
  quantityIndex: number,
  operatorLogId?: string
) => ({
  startTime: qtyData.startTime,
  endTime: qtyData.endTime,
  machineHrs: qtyData.machineHrs,
  machineNumber: qtyData.machineNumber,
  opsName: getOperatorOpsName(qtyData.opsName),
  idleTime: qtyData.idleTime || "",
  idleTimeDuration: qtyData.idleTimeDuration || "",
  pauseSessions: getPauseSessionsForCurrentSegment(qtyData),
  lastImage: imageBase64,
  quantityIndex,
  captureMode: "SINGLE" as const,
  fromQty: quantityIndex + 1,
  toQty: quantityIndex + 1,
  operatorLogId,
});

export const buildRangeCapturePayload = (
  qtyData: QuantityInput,
  imageBase64: string | null,
  quantityIndex: number,
  fromQty: number,
  toQty: number,
  operatorLogId?: string
) => ({
  startTime: qtyData.startTime,
  endTime: qtyData.endTime,
  machineHrs: qtyData.machineHrs,
  machineNumber: qtyData.machineNumber,
  opsName: getOperatorOpsName(qtyData.opsName),
  idleTime: qtyData.idleTime || "",
  idleTimeDuration: qtyData.idleTimeDuration || "",
  pauseSessions: getPauseSessionsForCurrentSegment(qtyData),
  lastImage: imageBase64,
  quantityIndex,
  captureMode: "RANGE" as const,
  fromQty,
  toQty,
  operatorLogId,
});

export const applyQaStatusToQuantities = (
  existing: Record<number, QuantityProgressStatus>,
  quantityNumbers: number[],
  status: QuantityQaStatus
) => {
  const next: Record<number, QuantityProgressStatus> = { ...existing };
  quantityNumbers.forEach((qty) => {
    next[qty] = status;
  });
  return next;
};
