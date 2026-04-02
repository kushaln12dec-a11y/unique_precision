import type { ReactNode } from "react";
import type { JobEntry } from "../../../types/job";
import { calculateTotals } from "../programmerUtils";
import { getQaStatusBadges, type QaProgressCounts } from "../../Operator/utils/qaProgress";

export const isUnassignedValue = (value: unknown): boolean => {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "unassigned" || normalized === "unassign";
};

export const toAlphabetSuffix = (index: number): string => {
  let current = Math.max(0, index);
  let result = "";
  do {
    result = String.fromCharCode(97 + (current % 26)) + result;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);
  return result;
};

export const getParentSerialPrefix = (parentSetting: string): string => {
  const trimmed = String(parentSetting || "").trim();
  return trimmed.match(/\d+/)?.[0] || "1";
};

export const getSelectedCutAsParentViewJob = (selectedCut: JobEntry | null) => {
  if (!selectedCut) return null;
  return {
    groupId: selectedCut.groupId,
    parent: selectedCut,
    entries: [selectedCut],
    groupTotalHrs: Number(selectedCut.totalHrs || calculateTotals(selectedCut as any).totalHrs || 0),
    groupTotalAmount: Number(selectedCut.totalAmount || calculateTotals(selectedCut as any).totalAmount || 0),
  };
};

export const buildStatusBadges = (counts: QaProgressCounts) => getQaStatusBadges(counts);

export const renderBadgeTicker = (badges: Array<{ className: string; label: string }>): ReactNode => (
  <div className="child-stage-summary">
    <div className="qa-badge-ticker" title={badges.map((badge) => badge.label).join(" | ")}>
      <div className="qa-badge-track">
        {[...badges, ...badges].map((badge, badgeIndex) => (
          <span key={`${badge.className}-${badgeIndex}`} className={`qa-mini ${badge.className}`}>
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  </div>
);
