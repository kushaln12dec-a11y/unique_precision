import CloseIcon from "@mui/icons-material/Close";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import { getDisplayDateTimeParts } from "../../utils/date";
import { formatJobRefDisplay } from "../../utils/jobFormatting";
import type { InspectionReportPayload } from "../../services/inspectionReportApi";
import type { QcRow } from "./qcUtils";
import { formatDateForTemplate, getDrawingNo, getPrimaryOperatorName } from "./qcUtils";

type QcColumnArgs = {
  navigate: (path: string) => void;
  showToast: (message: string, variant?: "success" | "error" | "info") => void;
  updateDecision: (groupId: string, decision: "APPROVED" | "REJECTED", label: string) => Promise<void>;
  downloadInspectionReport: (payload: InspectionReportPayload, filename: string) => Promise<void>;
  openClosePrompt: (row: QcRow) => void;
};

export const createQcColumns = ({
  navigate,
  showToast,
  updateDecision,
  downloadInspectionReport,
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
        <button type="button" className="qc-inspection-report-btn" onClick={() => navigate(`/qc/inspection-report?groupId=${row.groupId}&jobId=${row.jobId}&quantityNumber=${row.quantityNumber}`)}>Open</button>
        <button
          type="button"
          className="qc-inspection-report-download-btn"
          onClick={() =>
            void downloadInspectionReport(
              {
                groupId: row.groupId,
                jobId: row.jobId,
                quantityNumber: row.quantityNumber,
                customerId: String(row.entry.customer || row.parent.customer || ""),
                date: formatDateForTemplate(new Date()),
                drawingName: String(row.entry.description || row.parent.description || ""),
                drawingNo: getDrawingNo(row.entry) || getDrawingNo(row.parent),
                quantity: "1",
                decision: row.parent.qcDecision === "APPROVED" ? "ACCEPTED" : row.parent.qcDecision === "REJECTED" ? "REJECTED" : "PENDING",
                rows: [{ actualDimension: String(row.entry.cut ?? ""), tolerance: "", measuringDimension: "", deviation: "", instruments: { hm: false, sg: false, pg: false, vc: false, dm: false } }],
                remarks: "",
                workPieceDamage: "",
                rightAngleProblem: "",
                materialProblem: "",
                inspectedBy: "",
                approvedBy: "",
              },
              `inspection-report-${row.quantityLabel}.pdf`
            ).catch(() => showToast("Failed to download inspection report.", "error"))
          }
        >
          Download
        </button>
        <button type="button" className="qc-inspection-report-close-btn" aria-label="Close inspection report item" title="Close and remove from QC queue" onClick={() => openClosePrompt(row)}>
          <CloseIcon sx={{ fontSize: "0.9rem" }} />
        </button>
      </div>
    ),
  },
];
