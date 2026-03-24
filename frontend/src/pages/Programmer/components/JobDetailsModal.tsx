import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { JobEntry } from "../../../types/job";
import { calculateTotals, type CutForm } from "../programmerUtils";
import { formatDecimalHoursToHHMMhrs } from "../../../utils/date";
import { estimatedHoursFromAmount, formatEstimatedTime } from "../../../utils/jobFormatting";
import JobDetailsCutCard from "./JobDetailsCutCard";
import { buildCutDetailPairs, buildJobInfoPairs, toRows } from "../utils/jobDetailsUtils";
import "./JobDetailsModal.css";

interface JobDetailsModalProps {
  job: {
    groupId: string | number;
    parent: JobEntry;
    entries: JobEntry[];
    groupTotalHrs: number;
    groupTotalAmount: number;
  } | null;
  cut?: JobEntry | null;
  cutIndex?: number;
  userRole?: string | null;
  onClose: () => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ job, cut, userRole, onClose }) => {
  const canSeeAmounts = userRole === "ADMIN";
  const isSingleCut = !!cut;
  const [collapsedCuts, setCollapsedCuts] = useState<Set<number>>(new Set());
  const location = useLocation();

  if (!job && !cut) return null;

  const displayCut = cut || (job ? job.parent : null);
  const displayEntries = cut ? [cut] : job ? job.entries : [];
  const displayGroupId = cut ? cut.groupId : job ? job.groupId : "0";
  const displayGroupTotalHrs = cut ? cut.totalHrs || 0 : job ? job.groupTotalHrs : 0;
  const displayGroupTotalAmount = cut ? cut.totalAmount || 0 : job ? job.groupTotalAmount : 0;
  const totalQuantity = useMemo(() => displayEntries.reduce((sum, entry) => sum + Number(entry.qty || 0), 0), [displayEntries]);
  const isOperatorRoute = location.pathname.includes("operator");
  const canSeeOperatorFields = isOperatorRoute && (userRole === "OPERATOR" || userRole === "ADMIN");
  const showOperatorSpecificLayout = canSeeOperatorFields;

  const amounts = useMemo(() => {
    const totals = displayEntries.map((entry) => calculateTotals(entry as CutForm));
    return {
      perCut: totals.map((item) => ({ wedmAmount: item.wedmAmount, sedmAmount: item.sedmAmount })),
      totalWedmAmount: totals.reduce((sum, item) => sum + item.wedmAmount, 0),
      totalSedmAmount: totals.reduce((sum, item) => sum + item.sedmAmount, 0),
    };
  }, [displayEntries]);

  return (
    <>
      <div className="job-details-overlay" onClick={onClose} />
      <div className={`job-details-modal ${isSingleCut ? "cut-details-modal" : ""}`}>
        <div className="job-details-header">
          <h2 className="job-details-title">
            <span className="job-title">Job Details - {displayCut?.customer || "-"}</span>
            <span className="job-meta">| {displayCut?.description || "-"} | Total Qty: {Math.max(1, totalQuantity || Number(displayCut?.qty || 0) || 1)}</span>
          </h2>
          <button className="job-details-close" onClick={onClose} aria-label="Close">x</button>
        </div>

        <div className="job-details-content">
          <div className="job-details-section">
            <h3>Job Information</h3>
            <table className="job-details-table compact-table">
              <tbody>
                {toRows(buildJobInfoPairs(displayCut, displayGroupId), 2).map((row, rowIndex) => (
                  <tr key={`job-info-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <React.Fragment key={`${cell.label}-${cellIndex}`}>
                        <td className="job-details-label">{cell.label}:</td>
                        <td className="job-details-value">{cell.value}</td>
                      </React.Fragment>
                    ))}
                    {row.length === 1 && <>
                      <td className="job-details-label">-</td>
                      <td className="job-details-value">-</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="job-details-section">
            <h3>{isSingleCut ? "Setting Information" : `Settings (${displayEntries.length})`}</h3>
            <div className="cuts-container">
              {displayEntries.map((cutItem, index) => (
                <JobDetailsCutCard
                  key={cutItem.id}
                  cutItem={cutItem}
                  index={index}
                  isSingleCut={isSingleCut}
                  isExpanded={isSingleCut || !collapsedCuts.has(index)}
                  onToggle={() => setCollapsedCuts((prev) => {
                    const next = new Set(prev);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })}
                  pairs={buildCutDetailPairs({
                    cutItem,
                    canSeeAmounts,
                    canSeeOperatorFields,
                    showOperatorSpecificLayout,
                    isSingleCut,
                    amounts: amounts.perCut[index] || { wedmAmount: 0, sedmAmount: 0 },
                  })}
                />
              ))}
            </div>
          </div>

          <div className="job-details-totals">
            <div className="total-row">
              <label>{showOperatorSpecificLayout ? "Estimated Time:" : "Cut Length Hrs:"}</label>
              <span>{showOperatorSpecificLayout ? formatEstimatedTime(estimatedHoursFromAmount(amounts.totalWedmAmount || 0)) : (displayGroupTotalHrs ? formatDecimalHoursToHHMMhrs(displayGroupTotalHrs) : "00:00hrs")}</span>
            </div>
            {canSeeAmounts && <>
              <div className="total-row">
                <label>WEDM Amount (Rs.):</label>
                <span>Rs. {amounts.totalWedmAmount.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <label>SEDM Amount (Rs.):</label>
                <span>Rs. {amounts.totalSedmAmount.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <label>Total Amount (Rs.):</label>
                <span>{displayGroupTotalAmount ? `Rs. ${displayGroupTotalAmount.toFixed(2)}` : "0.00"}</span>
              </div>
            </>}
          </div>
        </div>
      </div>
    </>
  );
};

export default JobDetailsModal;
