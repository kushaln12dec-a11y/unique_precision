import type { QuantityInputData } from "../types/cutInput";
import { formatCompactDurationWords } from "./operatorTimeUtils";

const formatWorkedDuration = (seconds: number) => {
  return formatCompactDurationWords(seconds);
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
          revenue: Math.max(0, Number(entry?.revenue || 0)),
        }))
        .filter((entry) => entry.name && entry.durationSeconds > 0)
    : [];
  const latestWorkedByName =
    operatorHistoryDetails[operatorHistoryDetails.length - 1]?.name ||
    operatorProofHistory[operatorProofHistory.length - 1] ||
    "";
  const shouldShowWorkedBySummary = false;
  const shouldShowOperatorHistory = operatorHistoryDetails.length > 0 || (!isRangeMode && Boolean(latestWorkedByName));

  return {
    latestWorkedByName,
    operatorHistoryDetails,
    operatorProofHistory,
    shouldShowOperatorHistory,
    shouldShowWorkedBySummary,
    formatWorkedDuration,
  };
};
