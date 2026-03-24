import type { QuantityQaStatus } from "../../../types/job";

type QuantityInput = {
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string[] | string;
  idleTime?: string;
  idleTimeDuration?: string;
};

export const getOperatorOpsName = (value: string[] | string | undefined) =>
  Array.isArray(value) ? value.join(", ") : value || "";

export const getAssignedToValue = (opsName: string) => opsName.trim() || "Unassign";

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
  lastImage: imageBase64,
  quantityIndex,
  captureMode: "RANGE" as const,
  fromQty,
  toQty,
  operatorLogId,
});

export const applyQaStatusToQuantities = (
  existing: Record<number, QuantityQaStatus>,
  quantityNumbers: number[],
  status: QuantityQaStatus
) => {
  const next = { ...existing };
  quantityNumbers.forEach((qty) => {
    next[qty] = status;
  });
  return next;
};
