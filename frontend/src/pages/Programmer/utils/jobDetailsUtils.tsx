import type { ReactNode } from "react";
import type { JobEntry } from "../../../types/job";
import { formatDecimalHoursToHHMMhrs, formatDisplayDateTime } from "../../../utils/date";
import { estimatedHoursFromAmount, formatEstimatedTime, formatJobRefDisplay } from "../../../utils/jobFormatting";
import { formatMachineLabel } from "../../../utils/jobFormatting";
import { getQaProgressCounts } from "../../Operator/utils/qaProgress";
import { getThicknessDisplayValue } from "../programmerUtils";

export type DetailPair = { label: string; value: ReactNode };

export const toRows = (pairs: DetailPair[], pairCountPerRow = 2): DetailPair[][] => {
  const rows: DetailPair[][] = [];
  for (let index = 0; index < pairs.length; index += pairCountPerRow) {
    rows.push(pairs.slice(index, index + pairCountPerRow));
  }
  return rows;
};

const formatDate = (dateString: string) => formatDisplayDateTime(dateString || "");
const formatCreatedBy = (value: unknown) => String(value || "-").trim() || "-";

export const buildJobInfoPairs = (displayCut: JobEntry | null, displayGroupId: string | number): DetailPair[] => [
  { label: "Customer", value: displayCut?.customer || "-" },
  { label: "Created By", value: formatCreatedBy(displayCut?.createdBy) },
  { label: "Created At", value: formatDate(displayCut?.createdAt || "") },
  { label: "Updated By", value: (displayCut as any)?.updatedBy || "-" },
  { label: "Updated At", value: (displayCut as any)?.updatedAt ? formatDate((displayCut as any).updatedAt) : "-" },
  { label: "Job Number", value: formatJobRefDisplay((displayCut as any)?.refNumber || displayGroupId || "") },
  { label: "Priority", value: displayCut?.priority || "-" },
  { label: "Complex", value: displayCut?.critical ? "Yes" : "No" },
];

export const buildCutDetailPairs = ({
  cutItem,
  canSeeAmounts,
  canSeeOperatorFields,
  showOperatorSpecificLayout,
  isSingleCut,
  amounts,
}: {
  cutItem: JobEntry;
  canSeeAmounts: boolean;
  canSeeOperatorFields: boolean;
  showOperatorSpecificLayout: boolean;
  isSingleCut: boolean;
  amounts: { wedmAmount: number; sedmAmount: number };
}): DetailPair[] => {
  const basePairs: DetailPair[] = [
    { label: "Customer", value: cutItem.customer || "-" },
    { label: "Cut Length (mm)", value: Number(cutItem.cut || 0).toFixed(2) },
    { label: "Description", value: cutItem.description || "-" },
    { label: "Program Ref File Name", value: (cutItem as any).programRefFile || (cutItem as any).programRefFileName || "-" },
    { label: "TH (MM)", value: getThicknessDisplayValue(cutItem.thickness) },
    { label: "Pass", value: cutItem.passLevel || "-" },
    { label: "Setting", value: cutItem.setting || "-" },
    { label: "Quantity", value: Number(cutItem.qty || 0) },
    { label: "SEDM", value: cutItem.sedm || "-" },
    { label: "Material", value: cutItem.material || "-" },
    { label: "PIP Finish", value: cutItem.pipFinish ? "Yes" : "No" },
    { label: "Complex", value: cutItem.critical ? "Yes" : "No" },
    { label: "Priority", value: cutItem.priority || "-" },
    { label: "Remark", value: (cutItem as any).remark || "-" },
    {
      label: showOperatorSpecificLayout ? "Estimated Time" : "Cut Length Hrs",
      value: showOperatorSpecificLayout
        ? formatEstimatedTime(estimatedHoursFromAmount(amounts.wedmAmount || 0))
        : cutItem.totalHrs ? formatDecimalHoursToHHMMhrs(cutItem.totalHrs) : "00:00hrs",
    },
  ];

  if (canSeeAmounts) {
    basePairs.splice(1, 0, {
      label: "Rate (Rs./hr)",
      value: `Rs. ${Number(cutItem.rate || 0).toFixed(2)}`,
    });
  }

  if (showOperatorSpecificLayout) {
    const qty = Math.max(1, Number(cutItem.qty || 1));
    const counts = getQaProgressCounts(cutItem, qty);
    basePairs.push({
      label: "QC Progress",
      value: `NOT STARTED ${counts.empty} | RUNNING ${counts.running} | HOLD ${counts.ready} | LOGGED ${counts.saved} | QC ${counts.sent}`,
    });
  }

  if (isSingleCut) {
    basePairs.push(
      { label: "Created By", value: formatCreatedBy(cutItem.createdBy) },
      { label: "Created At", value: formatDate(cutItem.createdAt) },
      { label: "Updated By", value: (cutItem as any).updatedBy || "-" },
      { label: "Updated At", value: (cutItem as any).updatedAt ? formatDate((cutItem as any).updatedAt) : "-" }
    );
  }

  if (canSeeAmounts) {
    basePairs.push(
      { label: "WEDM Amount (Rs.)", value: `Rs. ${amounts.wedmAmount.toFixed(2)}` },
      { label: "SEDM Amount (Rs.)", value: `Rs. ${amounts.sedmAmount.toFixed(2)}` }
    );
  }

  if (canSeeOperatorFields) {
    if ((cutItem as any).startTime) basePairs.push({ label: "Start Time", value: (cutItem as any).startTime });
    if ((cutItem as any).endTime) basePairs.push({ label: "End Time", value: (cutItem as any).endTime });
    if ((cutItem as any).machineHrs) basePairs.push({ label: "Machine Hrs", value: (cutItem as any).machineHrs });
    if ((cutItem as any).machineNumber) {
      basePairs.push({ label: "Machine #", value: formatMachineLabel((cutItem as any).machineNumber) });
    }
    if ((cutItem as any).opsName) basePairs.push({ label: "Operator Name", value: (cutItem as any).opsName });
    if ((cutItem as any).idleTime) basePairs.push({ label: "Idle Time", value: (cutItem as any).idleTime });
  }

  return basePairs;
};
