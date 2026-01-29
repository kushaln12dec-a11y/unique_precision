import React, { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { calculateTotals, type CutForm } from "../programmerUtils";
import "./JobDetailsModal.css";

interface JobDetailsModalProps {
  job: {
    groupId: number;
    parent: JobEntry;
    entries: JobEntry[];
    groupTotalHrs: number;
    groupTotalAmount: number;
  } | null;
  userRole?: string | null;
  onClose: () => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ job, userRole, onClose }) => {
  const isProgrammer = userRole === "PROGRAMMER";
  if (!job) return null;

  const amounts = useMemo(() => {
    const totals = job.entries.map((entry) => calculateTotals(entry as CutForm));
    const totalWedmAmount = totals.reduce((sum, t) => sum + t.wedmAmount, 0);
    const totalSedmAmount = totals.reduce((sum, t) => sum + t.sedmAmount, 0);
    return {
      perCut: totals.map((t) => ({ wedmAmount: t.wedmAmount, sedmAmount: t.sedmAmount })),
      totalWedmAmount,
      totalSedmAmount,
    };
  }, [job.entries]);

  const formatDate = (dateString: string) => {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString || "—";
    const day = parsed.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    const hours = parsed.getHours().toString().padStart(2, "0");
    const minutes = parsed.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  return (
    <>
      <div className="job-details-overlay" onClick={onClose} />
      <div className="job-details-modal">
        <div className="job-details-header">
          <h2>Job Details - {job.parent.customer || "N/A"}</h2>
          <button className="job-details-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="job-details-content">
          <div className="job-details-section">
            <h3>Job Information</h3>
            <div className="job-details-grid">
              <div className="job-details-item">
                <label>Customer:</label>
                <span>{job.parent.customer || "—"}</span>
              </div>
              <div className="job-details-item">
                <label>Created At:</label>
                <span>{formatDate(job.parent.createdAt)}</span>
              </div>
              <div className="job-details-item">
                <label>Created By:</label>
                <span>{job.parent.createdBy || "—"}</span>
              </div>
              <div className="job-details-item">
                <label>Ref Number:</label>
                <span>#{(job.parent as any).refNumber || job.groupId || "—"}</span>
              </div>
              <div className="job-details-item">
                <label>Priority:</label>
                <span>{job.parent.priority || "—"}</span>
              </div>
              <div className="job-details-item">
                <label>Complex:</label>
                <span>{job.parent.critical ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          <div className="job-details-section">
            <h3>Cuts ({job.entries.length})</h3>
            <div className="cuts-container">
              {job.entries.map((cut, index) => (
                <div key={cut.id} className="cut-item">
                  <div className="cut-item-header">
                    <h4>Cut {index + 1}</h4>
                  </div>
                  <div className="cut-item-grid">
                    <div className="cut-detail">
                      <label>Rate (₹/hr):</label>
                      <span>₹{Number(cut.rate || 0).toFixed(2)}</span>
                    </div>
                    <div className="cut-detail">
                      <label>Cut Length (mm):</label>
                      <span>{Number(cut.cut || 0).toFixed(2)}</span>
                    </div>
                    <div className="cut-detail">
                      <label>Thickness (mm):</label>
                      <span>{Number(cut.thickness || 0).toFixed(2)}</span>
                    </div>
                    <div className="cut-detail">
                      <label>Pass:</label>
                      <span>{cut.passLevel || "—"}</span>
                    </div>
                    <div className="cut-detail">
                      <label>Setting:</label>
                      <span>{cut.setting || "—"}</span>
                    </div>
                    <div className="cut-detail">
                      <label>Quantity:</label>
                      <span>{Number(cut.qty || 0)}</span>
                    </div>
                    <div className="cut-detail">
                      <label>SEDM:</label>
                      <span>{cut.sedm || "—"}</span>
                    </div>
                    <div className="cut-detail">
                      <label>PIP Finish:</label>
                      <span>{cut.pipFinish ? "Yes" : "No"}</span>
                    </div>
                    <div className="cut-detail">
                      <label>Total Hrs/Piece:</label>
                      <span>{cut.totalHrs ? cut.totalHrs.toFixed(3) : "0.000"}</span>
                    </div>
                    {!isProgrammer && (
                      <>
                        <div className="cut-detail">
                          <label>WEDM Amount (₹):</label>
                          <span>₹{amounts.perCut[index]?.wedmAmount.toFixed(2) || "0.00"}</span>
                        </div>
                        <div className="cut-detail">
                          <label>SEDM Amount (₹):</label>
                          <span>₹{amounts.perCut[index]?.sedmAmount.toFixed(2) || "0.00"}</span>
                        </div>
                      </>
                    )}
                    {cut.description && (
                      <div className="cut-detail full-width">
                        <label>Description:</label>
                        <span>{cut.description}</span>
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
              <span>{job.groupTotalHrs ? job.groupTotalHrs.toFixed(3) : "0.000"}</span>
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
                  <span>₹{job.groupTotalAmount ? job.groupTotalAmount.toFixed(2) : "0.00"}</span>
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
    </>
  );
};

export default JobDetailsModal;
