import React, { useMemo, useState } from "react";
import ImageZoomModal from "../../../components/ImageZoomModal";
import ImageUpload from "./ImageUpload";
import type { JobEntry } from "../../../types/job";
import { calculateTotals, type CutForm } from "../programmerUtils";
import { formatDecimalHoursToHHMMhrs } from "../../../utils/date";
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

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  cut,
  userRole,
  onClose,
}) => {
  const isProgrammer = userRole === "PROGRAMMER";
  const isSingleCut = !!cut;
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (!job && !cut) return null;

  const displayCut = cut || (job ? job.parent : null);
  const displayEntries = cut ? [cut] : job ? job.entries : [];
  const displayGroupId = cut ? cut.groupId : job ? job.groupId : 0;
  const displayGroupTotalHrs = cut
    ? cut.totalHrs || 0
    : job
    ? job.groupTotalHrs
    : 0;
  const displayGroupTotalAmount = cut
    ? cut.totalAmount || 0
    : job
    ? job.groupTotalAmount
    : 0;

  /*const totalQuantity = useMemo(() => {
    return displayEntries.reduce(
      (sum, entry) => sum + Number(entry.qty || 0),
      0
    );
  }, [displayEntries]);*/

  const amounts = useMemo(() => {
    const totals = displayEntries.map((entry) =>
      calculateTotals(entry as CutForm)
    );
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

  const formatDate = (dateString: string) => {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString || "—";
    const day = parsed.getDate().toString().padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    const hours = parsed.getHours().toString().padStart(2, "0");
    const minutes = parsed.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  const Location = useLocation();
  const isOperator = Location.pathname.includes("operator");
  const canSeeOperatorFields =
    isOperator && (userRole === "OPERATOR" || userRole === "ADMIN");

  return (
    <>
      <div className="job-details-overlay" onClick={onClose} />
      <div
        className={`job-details-modal ${
          isSingleCut ? "cut-details-modal" : ""
        }`}
      >
        <div className="job-details-header">
        <h2 className="job-details-title">
  <span className="job-title">Job Details - UPC001</span>
  <span className="job-meta">
    | VKSDVNKD | Total Qty: 3
  </span>
</h2>


          <button
            className="job-details-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="job-details-content">
          {!isSingleCut && (
            <div className="job-details-section">
              <h3>Job Information</h3>
              <table className="job-details-table">
                <tbody>
                  <tr>
                    <td className="job-details-label">Customer:</td>
                    <td className="job-details-value">
                      {displayCut?.customer || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="job-details-label">Created By:</td>
                    <td className="job-details-value">
                      {displayCut?.createdBy || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="job-details-label">Created At:</td>
                    <td className="job-details-value">
                      {formatDate(displayCut?.createdAt || "")}
                    </td>
                  </tr>
                  {(displayCut as any)?.updatedBy && (
                    <tr>
                      <td className="job-details-label">Updated By:</td>
                      <td className="job-details-value">
                        {(displayCut as any).updatedBy || "—"}
                      </td>
                    </tr>
                  )}
                  {(displayCut as any)?.updatedAt && (
                    <tr>
                      <td className="job-details-label">Updated At:</td>
                      <td className="job-details-value">
                        {formatDate((displayCut as any).updatedAt)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="job-details-label">Ref Number:</td>
                    <td className="job-details-value">
                      #{(displayCut as any)?.refNumber || displayGroupId || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="job-details-label">Priority:</td>
                    <td className="job-details-value">
                      {displayCut?.priority || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="job-details-label">Complex:</td>
                    <td className="job-details-value">
                      {displayCut?.critical ? "Yes" : "No"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="job-details-section">
            <h3>
              {isSingleCut
                ? "Setting Information"
                : `Settings (${displayEntries.length})`}
            </h3>
            <div className="cuts-container">
              {displayEntries.map((cutItem, index) => (
                <div key={cutItem.id} className="cut-item">
                  {!isSingleCut && (
                    <div className="cut-item-header">
                      <h4>Cut {index + 1}</h4>
                    </div>
                  )}
                  <div className="cut-item-content-wrapper">
                    <div className="cut-item-grid">
                      <div className="cut-detail">
                        <label>Customer:</label>
                        <span>{cutItem.customer || "—"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Rate (₹/hr):</label>
                        <span>₹{Number(cutItem.rate || 0).toFixed(2)}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Cut Length (mm):</label>
                        <span>{Number(cutItem.cut || 0).toFixed(2)}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Description:</label>
                        <span>{cutItem.description || "—"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>TH (MM):</label>
                        <span>{Number(cutItem.thickness || 0).toFixed(2)}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Pass:</label>
                        <span>{cutItem.passLevel || "—"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Setting:</label>
                        <span>{cutItem.setting || "—"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Quantity:</label>
                        <span>{Number(cutItem.qty || 0)}</span>
                      </div>
                      <div className="cut-detail">
                        <label>QA Progress:</label>
                        {(() => {
                          const qty = Math.max(1, Number(cutItem.qty || 1));
                          const c = getQaProgressCounts(cutItem, qty);
                          return <span>Logged {c.saved + c.ready} | QA Dispatched {c.sent} | Pending {c.empty}</span>;
                        })()}
                      </div>
                      <div className="cut-detail">
                        <label>SEDM:</label>
                        <span>{cutItem.sedm || "—"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Material:</label>
                        <span>{cutItem.material || "—"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>PIP Finish:</label>
                        <span>{cutItem.pipFinish ? "Yes" : "No"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Complex:</label>
                        <span>{cutItem.critical ? "Yes" : "No"}</span>
                      </div>
                      <div className="cut-detail">
                        <label>Priority:</label>
                        <span>{cutItem.priority || "—"}</span>
                      </div>
                      {isSingleCut && (
                        <>
                          <div className="cut-detail">
                            <label>Created By:</label>
                            <span>{cutItem.createdBy || "—"}</span>
                          </div>
                          <div className="cut-detail">
                            <label>Created At:</label>
                            <span>{formatDate(cutItem.createdAt)}</span>
                          </div>
                          {(cutItem as any).updatedBy && (
                            <div className="cut-detail">
                              <label>Updated By:</label>
                              <span>{(cutItem as any).updatedBy || "—"}</span>
                            </div>
                          )}
                          {(cutItem as any).updatedAt && (
                            <div className="cut-detail">
                              <label>Updated At:</label>
                              <span>
                                {formatDate((cutItem as any).updatedAt)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="cut-detail">
                        <label>Total Hrs/Piece:</label>
                        <span>
                          {cutItem.totalHrs
                            ? formatDecimalHoursToHHMMhrs(cutItem.totalHrs)
                            : "00:00hrs"}
                        </span>
                      </div>
                      {!isProgrammer && (
                        <>
                          <div className="cut-detail">
                            <label>WEDM Amount (₹):</label>
                            <span>
                              ₹
                              {amounts.perCut[index]?.wedmAmount.toFixed(2) ||
                                "0.00"}
                            </span>
                          </div>
                          <div className="cut-detail">
                            <label>SEDM Amount (₹):</label>
                            <span>
                              ₹
                              {amounts.perCut[index]?.sedmAmount.toFixed(2) ||
                                "0.00"}
                            </span>
                          </div>
                          {/* Operator Input Details */}
                          {canSeeOperatorFields && (
                            <>
                              {(cutItem as any).startTime && (
                                <div className="cut-detail">
                                  <label>Start Time:</label>
                                  <span>{(cutItem as any).startTime}</span>
                                </div>
                              )}

                              {(cutItem as any).endTime && (
                                <div className="cut-detail">
                                  <label>End Time:</label>
                                  <span>{(cutItem as any).endTime}</span>
                                </div>
                              )}

                              {(cutItem as any).machineHrs && (
                                <div className="cut-detail">
                                  <label>Machine Hrs:</label>
                                  <span>{(cutItem as any).machineHrs}</span>
                                </div>
                              )}

                              {(cutItem as any).machineNumber && (
                                <div className="cut-detail">
                                  <label>Machine #:</label>
                                  <span>{(cutItem as any).machineNumber}</span>
                                </div>
                              )}

                              {(cutItem as any).opsName && (
                                <div className="cut-detail">
                                  <label>Operator Name:</label>
                                  <span>{(cutItem as any).opsName}</span>
                                </div>
                              )}

                              {(cutItem as any).idleTime && (
                                <div className="cut-detail">
                                  <label>Idle Time:</label>
                                  <span>{(cutItem as any).idleTime}</span>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                    {cutItem.cutImage &&
                      (Array.isArray(cutItem.cutImage)
                        ? cutItem.cutImage.length > 0
                        : cutItem.cutImage) && (
                        <div className="cut-image-side">
                          <label>Images:</label>
                          <ImageUpload
                            images={
                              Array.isArray(cutItem.cutImage)
                                ? cutItem.cutImage
                                : cutItem.cutImage
                                ? [cutItem.cutImage]
                                : []
                            }
                            label={`Cut ${index + 1}`}
                            onImageChange={() => {}}
                            onRemove={() => {}}
                            readOnly={true}
                          />
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="job-details-totals">
            <div className="total-row">
              <label>Total Hrs/Piece:</label>
              <span>
                {displayGroupTotalHrs
                  ? formatDecimalHoursToHHMMhrs(displayGroupTotalHrs)
                  : "00:00hrs"}
              </span>
            </div>
            {!isProgrammer && (
              <>
                <div className="total-row">
                  <label>WEDM Amount (₹):</label>
                  <span>₹{amounts.totalWedmAmount.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <label>SEDM Amount (₹):</label>
                  <span>₹{amounts.totalSedmAmount.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <label>Total Amount (₹):</label>
                  <span>
                    ₹
                    {displayGroupTotalAmount
                      ? displayGroupTotalAmount.toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="job-details-footer">
          <button className="job-details-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {zoomedImage && (
        <ImageZoomModal
          imageSrc={zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </>
  );
};

export default JobDetailsModal;
