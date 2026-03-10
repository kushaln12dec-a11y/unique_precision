import React, { useMemo, useState } from "react";
import ImageUpload from "./ImageUpload";
import type { JobEntry } from "../../../types/job";
import { calculateTotals, type CutForm } from "../programmerUtils";
import { formatDecimalHoursToHHMMhrs, formatDisplayDateTime } from "../../../utils/date";
import { formatMachineLabel } from "../../../utils/jobFormatting";
import "./JobDetailsModal.css";
import { useLocation } from "react-router-dom";
import { getQaProgressCounts } from "../../Operator/utils/qaProgress";

interface JobDetailsModalProps {
  job: {
    groupId: number;
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

type DetailPair = { label: string; value: React.ReactNode };

const toRows = (pairs: DetailPair[], pairCountPerRow = 2): DetailPair[][] => {
  const rows: DetailPair[][] = [];
  for (let i = 0; i < pairs.length; i += pairCountPerRow) {
    rows.push(pairs.slice(i, i + pairCountPerRow));
  }
  return rows;
};

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  cut,
  userRole,
  onClose,
}) => {
  const canSeeAmounts = userRole === "ADMIN";
  const isSingleCut = !!cut;
  const [collapsedCuts, setCollapsedCuts] = useState<Set<number>>(new Set());

  if (!job && !cut) return null;

  const displayCut = cut || (job ? job.parent : null);
  const displayEntries = cut ? [cut] : job ? job.entries : [];
  const displayGroupId = cut ? cut.groupId : job ? job.groupId : 0;
  const displayGroupTotalHrs = cut ? cut.totalHrs || 0 : job ? job.groupTotalHrs : 0;
  const displayGroupTotalAmount = cut ? cut.totalAmount || 0 : job ? job.groupTotalAmount : 0;

  const totalQuantity = useMemo(
    () => displayEntries.reduce((sum, entry) => sum + Number(entry.qty || 0), 0),
    [displayEntries]
  );

  const amounts = useMemo(() => {
    const totals = displayEntries.map((entry) => calculateTotals(entry as CutForm));
    const totalWedmAmount = totals.reduce((sum, t) => sum + t.wedmAmount, 0);
    const totalSedmAmount = totals.reduce((sum, t) => sum + t.sedmAmount, 0);
    return {
      perCut: totals.map((t) => ({
        wedmAmount: t.wedmAmount,
        sedmAmount: t.sedmAmount,
      })),
      totalWedmAmount,
      totalSedmAmount,
    };
  }, [displayEntries]);

  const formatDate = (dateString: string) => formatDisplayDateTime(dateString || "");

  const location = useLocation();
  const isOperator = location.pathname.includes("operator");
  const canSeeOperatorFields = isOperator && (userRole === "OPERATOR" || userRole === "ADMIN");

  const jobInfoPairs: DetailPair[] = [
    { label: "Customer", value: displayCut?.customer || "-" },
    { label: "Created By", value: displayCut?.createdBy || "-" },
    { label: "Created At", value: formatDate(displayCut?.createdAt || "") },
    { label: "Updated By", value: (displayCut as any)?.updatedBy || "-" },
    {
      label: "Updated At",
      value: (displayCut as any)?.updatedAt ? formatDate((displayCut as any).updatedAt) : "-",
    },
    { label: "Job Number", value: `#${(displayCut as any)?.refNumber || displayGroupId || "-"}` },
    { label: "Priority", value: displayCut?.priority || "-" },
    { label: "Complex", value: displayCut?.critical ? "Yes" : "No" },
  ];

  const isCutExpanded = (index: number): boolean => {
    if (isSingleCut) return true;
    return !collapsedCuts.has(index);
  };

  const toggleCut = (index: number) => {
    setCollapsedCuts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <>
      <div className="job-details-overlay" onClick={onClose} />
      <div className={`job-details-modal ${isSingleCut ? "cut-details-modal" : ""}`}>
        <div className="job-details-header">
          <h2 className="job-details-title">
            <span className="job-title">Job Details - {displayCut?.customer || "-"}</span>
            <span className="job-meta">
              | {displayCut?.description || "-"} | Total Qty:{" "}
              {Math.max(1, totalQuantity || Number(displayCut?.qty || 0) || 1)}
            </span>
          </h2>
          <button className="job-details-close" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <div className="job-details-content">
          <div className="job-details-section">
            <h3>Job Information</h3>
            <table className="job-details-table compact-table">
              <tbody>
                {toRows(jobInfoPairs, 2).map((row, rowIndex) => (
                  <tr key={`job-info-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <React.Fragment key={`${cell.label}-${cellIndex}`}>
                        <td className="job-details-label">{cell.label}:</td>
                        <td className="job-details-value">{cell.value}</td>
                      </React.Fragment>
                    ))}
                    {row.length === 1 && (
                      <>
                        <td className="job-details-label">-</td>
                        <td className="job-details-value">-</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="job-details-section">
            <h3>{isSingleCut ? "Setting Information" : `Settings (${displayEntries.length})`}</h3>
            <div className="cuts-container">
              {displayEntries.map((cutItem, index) => {
                const basePairs: DetailPair[] = [
                  { label: "Customer", value: cutItem.customer || "-" },
                  { label: "Rate (Rs./hr)", value: `Rs. ${Number(cutItem.rate || 0).toFixed(2)}` },
                  { label: "Cut Length (mm)", value: Number(cutItem.cut || 0).toFixed(2) },
                  { label: "Description", value: cutItem.description || "-" },
                  {
                    label: "Program Ref File Name",
                    value: (cutItem as any).programRefFile || (cutItem as any).programRefFileName || "-",
                  },
                  { label: "TH (MM)", value: Number(cutItem.thickness || 0).toFixed(2) },
                  { label: "Pass", value: cutItem.passLevel || "-" },
                  { label: "Setting", value: cutItem.setting || "-" },
                  { label: "Quantity", value: Number(cutItem.qty || 0) },
                  {
                    label: "QA Progress",
                    value: (() => {
                      const qty = Math.max(1, Number(cutItem.qty || 1));
                      const c = getQaProgressCounts(cutItem, qty);
                      return `Logged ${c.saved + c.ready} | QA Dispatched ${c.sent} | Pending ${c.empty}`;
                    })(),
                  },
                  { label: "SEDM", value: cutItem.sedm || "-" },
                  { label: "Material", value: cutItem.material || "-" },
                  { label: "PIP Finish", value: cutItem.pipFinish ? "Yes" : "No" },
                  { label: "Complex", value: cutItem.critical ? "Yes" : "No" },
                  { label: "Priority", value: cutItem.priority || "-" },
                  {
                    label: isOperator ? "Estimated Time" : "Cut Length Hrs",
                    value: isOperator
                      ? formatDecimalHoursToHHMMhrs(Number((((Number(cutItem.totalAmount || 0) || 0) / 625).toFixed(2))))
                      : (cutItem.totalHrs ? formatDecimalHoursToHHMMhrs(cutItem.totalHrs) : "00:00hrs"),
                  },
                ];

                if (isSingleCut) {
                  basePairs.push(
                    { label: "Created By", value: cutItem.createdBy || "-" },
                    { label: "Created At", value: formatDate(cutItem.createdAt) },
                    { label: "Updated By", value: (cutItem as any).updatedBy || "-" },
                    {
                      label: "Updated At",
                      value: (cutItem as any).updatedAt ? formatDate((cutItem as any).updatedAt) : "-",
                    }
                  );
                }

                if (canSeeAmounts || canSeeOperatorFields) {
                  if (canSeeAmounts) {
                    basePairs.push(
                      {
                        label: "WEDM Amount (Rs.)",
                        value: `Rs. ${amounts.perCut[index]?.wedmAmount.toFixed(2) || "0.00"}`,
                      },
                      {
                        label: "SEDM Amount (Rs.)",
                        value: `Rs. ${amounts.perCut[index]?.sedmAmount.toFixed(2) || "0.00"}`,
                      }
                    );
                  }

                  if (canSeeOperatorFields) {
                    if ((cutItem as any).startTime) {
                      basePairs.push({ label: "Start Time", value: (cutItem as any).startTime });
                    }
                    if ((cutItem as any).endTime) {
                      basePairs.push({ label: "End Time", value: (cutItem as any).endTime });
                    }
                    if ((cutItem as any).machineHrs) {
                      basePairs.push({ label: "Machine Hrs", value: (cutItem as any).machineHrs });
                    }
                    if ((cutItem as any).machineNumber) {
                      basePairs.push({
                        label: "Machine #",
                        value: formatMachineLabel((cutItem as any).machineNumber),
                      });
                    }
                    if ((cutItem as any).opsName) {
                      basePairs.push({ label: "Operator Name", value: (cutItem as any).opsName });
                    }
                    if ((cutItem as any).idleTime) {
                      basePairs.push({ label: "Idle Time", value: (cutItem as any).idleTime });
                    }
                  }
                }

                const cutImages = Array.isArray(cutItem.cutImage)
                  ? cutItem.cutImage
                  : cutItem.cutImage
                    ? [cutItem.cutImage]
                    : [];

                return (
                  <div key={cutItem.id} className={`cut-item ${isCutExpanded(index) ? "expanded" : "collapsed"}`}>
                    <button
                      type="button"
                      className="cut-item-header cut-accordion-trigger"
                      onClick={() => toggleCut(index)}
                      aria-expanded={isCutExpanded(index)}
                    >
                      <h4>Cut {index + 1}</h4>
                      {!isSingleCut && (
                        <span className={`cut-accordion-icon ${isCutExpanded(index) ? "open" : ""}`}>▾</span>
                      )}
                    </button>

                    <div
                      className={`cut-item-content-wrapper ${cutImages.length === 0 ? "no-image" : ""} ${isCutExpanded(index) ? "open" : "closed"}`}
                    >
                      {isCutExpanded(index) && (
                        <>
                          <table className="job-details-table cut-details-table compact-table">
                            <tbody>
                              {toRows(basePairs, 2).map((row, rowIndex) => (
                                <tr key={`cut-${index}-row-${rowIndex}`}>
                                  {row.map((cell, cellIndex) => (
                                    <React.Fragment key={`${cell.label}-${cellIndex}`}>
                                      <td className="job-details-label">{cell.label}:</td>
                                      <td className="job-details-value">{cell.value}</td>
                                    </React.Fragment>
                                  ))}
                                  {row.length === 1 && (
                                    <>
                                      <td className="job-details-label">-</td>
                                      <td className="job-details-value">-</td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {cutImages.length > 0 && (
                            <div className="cut-image-side">
                              <label>Image</label>
                              <ImageUpload
                                images={cutImages}
                                label={`Cut ${index + 1}`}
                                onImageChange={() => {}}
                                onRemove={() => {}}
                                readOnly={true}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="job-details-totals">
            <div className="total-row">
              <label>{isOperator ? "Estimated Time:" : "Cut Length Hrs:"}</label>
              <span>
                {isOperator
                  ? formatDecimalHoursToHHMMhrs(
                      displayEntries.reduce(
                        (sum, cutItem) => sum + Number((((Number(cutItem.totalAmount || 0) || 0) / 625).toFixed(2))),
                        0
                      )
                    )
                  : (displayGroupTotalHrs ? formatDecimalHoursToHHMMhrs(displayGroupTotalHrs) : "00:00hrs")}
              </span>
            </div>
            {canSeeAmounts && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default JobDetailsModal;
