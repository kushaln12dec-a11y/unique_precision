import type { QuantityInputData } from "../types/cutInput";
import { formatCompactDurationWords, getCurrentSegmentWorkedSeconds } from "./operatorTimeUtils";

const formatWorkedDuration = (seconds: number) => {
  return formatCompactDurationWords(seconds);
};

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

export const getOperatorQuantityHistory = (qtyData: QuantityInputData, isRangeMode: boolean) => {
  const operatorProofHistory = Array.isArray(qtyData.operatorHistory)
    ? qtyData.operatorHistory.map((name) => String(name || "").trim()).filter(Boolean)
    : [];

  // Build a merged summary: completed segments from DB + current active segment
  const summary = new Map<string, { durationSeconds: number; revenue: number }>();
  const addEntry = (rawName: unknown, durationSeconds: number, revenue = 0) => {
    const name = normalizeOperatorName(rawName);
    if (!name || durationSeconds <= 0) return;
    const existing = summary.get(name) || { durationSeconds: 0, revenue: 0 };
    summary.set(name, {
      durationSeconds: existing.durationSeconds + Math.max(0, Math.round(durationSeconds)),
      revenue: existing.revenue + Math.max(0, revenue),
    });
  };

  // Add completed-segment history from DB logs
  (qtyData.operatorHistoryDetails || []).forEach((entry) => {
    addEntry(entry?.name, Number(entry?.durationSeconds || 0), Number(entry?.revenue || 0));
  });

  // Add current active segment contribution if not yet completed
  if (!qtyData.endTime && qtyData.startTime && !qtyData.isPaused) {
    const nowMs = Date.now();
    const currentSegmentSeconds = Math.max(0, getCurrentSegmentWorkedSeconds(qtyData, nowMs));
    if (currentSegmentSeconds > 0) {
      const currentOps = Array.from(
        new Set((qtyData.opsName || []).map((n) => normalizeOperatorName(n)).filter(Boolean))
      );
      if (currentOps.length === 0) {
        addEntry("CURRENT", currentSegmentSeconds);
      } else {
        const baseShare = Math.floor(currentSegmentSeconds / currentOps.length);
        let remainder = currentSegmentSeconds % currentOps.length;
        currentOps.forEach((name) => {
          const share = baseShare + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;
          addEntry(name, share);
        });
      }
    }
  }

  const operatorHistoryDetails = Array.from(summary.entries())
    .map(([name, detail]) => ({
      name,
      durationSeconds: Math.max(0, Math.round(detail.durationSeconds)),
      revenue: Math.max(0, Number(detail.revenue.toFixed(2))),
    }))
    .filter((entry) => entry.name && entry.durationSeconds > 0)
    .sort((a, b) => b.durationSeconds - a.durationSeconds);

  const latestWorkedByName =
    operatorHistoryDetails[0]?.name ||
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
