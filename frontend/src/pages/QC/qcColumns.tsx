import CloseIcon from "@mui/icons-material/Close";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import { getDisplayDateTimeParts } from "../../utils/date";
import { formatJobRefDisplay } from "../../utils/jobFormatting";
import type { QcRow } from "./qcUtils";
import { getPrimaryOperatorName } from "./qcUtils";

type QcColumnArgs = {
  updateDecision: (groupId: string, decision: "APPROVED" | "REJECTED", label: string) => Promise<void>;
  onOpenReport: (row: QcRow) => void;
  onDownloadReport: (row: QcRow) => void;
  openClosePrompt: (row: QcRow) => void;
};

export const createQcColumns = ({
  updateDecision,
  onOpenReport,
  onDownloadReport,
  openClosePrompt,
}: QcColumnArgs) => [
  { key: "customer", label: "Customer", render: (row: QcRow) => <div className="qc-customer-cell"><span className="qc-customer-name">{row.entry.customer || row.parent.customer || "-"}</span></div> },
  { key: "description", label: "Description", render: (row: QcRow) => <MarqueeCopyText text={row.entry.description || row.parent.description || "-"} /> },
  { key: "jobRef", label: "Job ref", headerClassName: "qc-job-ref-col", className: "qc-job-ref-cell", render: (row: QcRow) => <span className="qc-job-ref-value">{formatJobRefDisplay(String(row.entry.refNumber || row.parent.refNumber || "").trim())}</span> },
  { key: "qty", label: "Qty", headerClassName: "qc-qty-col", className: "qc-qty-cell", render: (row: QcRow) => row.quantityLabel },
  { key: "operator", label: "Operator", render: (row: QcRow) => getPrimaryOperatorName(row.entry.assignedTo || row.parent.assignedTo) },
  {
    key: "createdAt",
    label: "Created At",
    render: (row: QcRow) => {
      const parts = getDisplayDateTimeParts(row.entry.createdAt || row.parent.createdAt);
      return <div className="created-at-split"><span>{parts.date}</span><span>{parts.time}</span></div>;
    },
  },
  {
    key: "decision",
    label: "Decision",
    headerClassName: "qc-decision-col",
    className: "qc-decision-cell",
    render: (row: QcRow) => (
      <div className="qc-decision-actions">
        <button type="button" className="qc-approve-btn" onClick={() => void updateDecision(row.groupId, "APPROVED", "Approved")}>Approve</button>
        <button type="button" className="qc-reject-btn" onClick={() => void updateDecision(row.groupId, "REJECTED", "Rejected")}>Reject</button>
      </div>
    ),
  },
  {
    key: "inspectionReport",
    label: "Inspection Report",
    headerClassName: "qc-inspection-col",
    className: "qc-inspection-cell",
    render: (row: QcRow) => (
      <div className="qc-inspection-report-actions">
        <button type="button" className="qc-inspection-report-btn" onClick={() => onOpenReport(row)}>Open</button>
        <button type="button" className="qc-inspection-report-download-btn" onClick={() => onDownloadReport(row)}>
          Download
        </button>
        <button type="button" className="qc-inspection-report-close-btn" aria-label="Close inspection report item" title="Close and remove from QC queue" onClick={() => openClosePrompt(row)}>
          <CloseIcon sx={{ fontSize: "0.9rem" }} />
        </button>
      </div>
    ),
  },
];
