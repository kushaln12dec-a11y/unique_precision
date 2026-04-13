import type { QuantityInputData } from "../types/cutInput";

const formatWorkedDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${safeSeconds}s`;
};

export const getOperatorQuantityHistory = (qtyData: QuantityInputData, isRangeMode: boolean) => {
  const operatorProofHistory = Array.isArray(qtyData.operatorHistory)
    ? qtyData.operatorHistory.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  const operatorHistoryDetails = Array.isArray(qtyData.operatorHistoryDetails)
    ? qtyData.operatorHistoryDetails
        .map((entry) => ({
          name: String(entry?.name || "").trim(),
          durationSeconds: Math.max(0, Number(entry?.durationSeconds || 0)),
        }))
        .filter((entry) => entry.name)
    : [];
  const normalizedWorkedByNames = Array.from(
    new Set(operatorProofHistory.map((name) => String(name || "").trim().toLowerCase()).filter(Boolean)),
  );
  const normalizedHistoryDetailNames = Array.from(
    new Set(operatorHistoryDetails.map((entry) => String(entry.name || "").trim().toLowerCase()).filter(Boolean)),
  );
  const currentAssignedNames = Array.isArray(qtyData.opsName)
    ? qtyData.opsName.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  const latestWorkedByName =
    currentAssignedNames[0] ||
    operatorProofHistory[operatorProofHistory.length - 1] ||
    operatorHistoryDetails[operatorHistoryDetails.length - 1]?.name ||
    "";
  const shouldShowWorkedBySummary =
    operatorProofHistory.length > 0 &&
    (operatorHistoryDetails.length === 0 || normalizedWorkedByNames.join("|") !== normalizedHistoryDetailNames.join("|"));
  const shouldShowOperatorHistory =
    (!isRangeMode && Boolean(latestWorkedByName)) ||
    shouldShowWorkedBySummary ||
    operatorHistoryDetails.length > 0;

  return {
    latestWorkedByName,
    operatorHistoryDetails,
    operatorProofHistory,
    shouldShowOperatorHistory,
    shouldShowWorkedBySummary,
    formatWorkedDuration,
  };
};
