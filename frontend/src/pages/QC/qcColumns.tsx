import CloseIcon from "@mui/icons-material/Close";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import { formatJobRefDisplay } from "../../utils/jobFormatting";
import type { QcRow } from "./qcUtils";

type QcColumnArgs = {
  updateDecision: (groupId: string, decision: "APPROVED" | "REJECTED", label: string) => Promise<void>;
  onOpenReport: (row: QcRow) => void;
  openClosePrompt: (row: QcRow) => void;
  showLogged?: boolean;
};

const getCaptureData = (row: QcRow): any => {
  const captures = Array.isArray(row.entry.operatorCaptures) ? row.entry.operatorCaptures : [];
  // Find the operator capture that corresponds to the starting quantity of this QC item
  const capture = captures.find((c: any) => {
    const cFrom = Math.max(1, Number(c.fromQty || 1));
    const cTo = Math.max(cFrom, Number(c.toQty || cFrom));
    return row.quantityFrom >= cFrom && row.quantityFrom <= cTo;
  });
  return capture || {};
};

const getCapturedOperatorNamesList = (row: QcRow) => {
  const capture = getCaptureData(row);
  let nameStr = "";
  if (capture.opsName) {
    nameStr = Array.isArray(capture.opsName) ? capture.opsName.join(", ") : String(capture.opsName);
  }
  if (!nameStr) {
    nameStr = String(row.entry.assignedTo || row.parent.assignedTo || "-");
  }
  const names = nameStr.split(",").map(n => n.trim().toUpperCase()).filter(n => n && n !== "UNASSIGN" && n !== "UNASSIGNED");
  return names.length > 0 ? names : ["-"];
};

const DropdownListCell = ({ items, title }: { items: string[], title?: string }) => {
  if (items.length <= 1) {
    return <span title={title}>{items[0] || "-"}</span>;
  }
  return (
    <select title={title} className="qc-dropdown-cell" style={{ padding: "0.2rem", borderRadius: "4px", border: "1px solid #ccc", background: "transparent", cursor: "pointer", maxWidth: "120px" }} onClick={(e) => e.stopPropagation()}>
      {items.map((item, idx) => (
        <option key={idx} value={item}>{item}</option>
      ))}
    </select>
  );
};

export const createQcColumns = ({
  updateDecision,
  onOpenReport,
  openClosePrompt,
  showLogged = false,
}: QcColumnArgs) => [
    { key: "customer", label: "Customer", render: (row: QcRow) => <div className="qc-customer-cell"><span className="qc-customer-name">{row.entry.customer || row.parent.customer || "-"}</span></div> },
    { key: "jobRef", label: "Job ref", headerClassName: "qc-job-ref-col", className: "qc-job-ref-cell", render: (row: QcRow) => <span className="qc-job-ref-value">{formatJobRefDisplay(String(row.entry.refNumber || row.parent.refNumber || "").trim())}</span> },
    { key: "programRefFileName", label: <>Program Ref<br />File Name</>, render: (row: QcRow) => <MarqueeCopyText text={String((row.entry as any).programRefFile || (row.entry as any).programRefFileName || row.parent.refNumber || "-")} /> },
    { key: "description", label: "Description", render: (row: QcRow) => <MarqueeCopyText text={row.entry.description || row.parent.description || "-"} /> },
    {
      key: "qty",
      label: "Qty",
      headerClassName: "qc-qty-col",
      className: "qc-qty-cell",
      render: (row: QcRow) => {
        const from = row.quantityFrom;
        const to = row.quantityTo;
        const list = [];
        for (let i = from; i <= to; i++) {
          list.push(`#${i}`);
        }
        return (
          <div className="qc-quantity-cell">
            <DropdownListCell items={list} title={row.reportScopeLabel} />
          </div>
        );
      },
    },
    { key: "operator", label: "Operator", render: (row: QcRow) => <DropdownListCell items={getCapturedOperatorNamesList(row)} /> },

    {
      key: "decision",
      label: "Decision",
      headerClassName: "qc-decision-col",
      className: "qc-decision-cell",
      render: (row: QcRow) => {
        const decision = String(row.entry.qcDecision || row.parent.qcDecision || "PENDING").toUpperCase();
        if (showLogged) {
          return (
            <span className={`qc-decision-badge ${decision === "APPROVED" ? "approved" : "rejected"}`}>
              {decision === "APPROVED" ? "Approved" : "Rejected"}
            </span>
          );
        }

        return (
          <div className="qc-decision-actions">
            <button type="button" className="qc-approve-btn" onClick={() => void updateDecision(row.groupId, "APPROVED", "Approved")}>Approve</button>
            <button type="button" className="qc-reject-btn" onClick={() => void updateDecision(row.groupId, "REJECTED", "Rejected")}>Reject</button>
          </div>
        );
      },
    },
    {
      key: "inspectionReport",
      label: "Inspection Report",
      headerClassName: "qc-inspection-col",
      className: "qc-inspection-cell",
      render: (row: QcRow) => (
        <div className="qc-inspection-report-actions">
          <button type="button" className="qc-inspection-report-btn" onClick={() => onOpenReport(row)}>Open</button>
          <button type="button" className="qc-inspection-report-close-btn" aria-label="Close inspection report item" title="Close and remove from QC queue" onClick={() => openClosePrompt(row)}>
            <CloseIcon sx={{ fontSize: "0.9rem" }} />
          </button>
        </div>
      ),
    },
  ];
