import { useRef, useState } from "react";
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

/* ---------- helpers ---------- */

type OperatorQtyEntry = {
  quantityNumber: number;
  operators: Array<{ name: string; durationLabel: string }>;
};

/** Parse "HH:MM" or decimal hours into a short human-readable duration */
const formatMachineHrsLabel = (machineHrs: unknown): string => {
  const raw = String(machineHrs || "").trim();
  if (!raw) return "";
  if (raw.includes(":")) {
    const [hRaw, mRaw] = raw.split(":");
    const h = Number(hRaw) || 0;
    const m = Number(mRaw) || 0;
    if (h === 0 && m === 0) return "";
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return parts.join(" ");
  }
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) return "";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ");
};

/** Build a map of quantity→operators from all captures on the job */
const getOperatorsByQuantity = (row: QcRow): OperatorQtyEntry[] => {
  const captures = Array.isArray(row.entry.operatorCaptures) ? row.entry.operatorCaptures : [];
  const from = row.quantityFrom;
  const to = row.quantityTo;

  const qtyMap = new Map<number, Map<string, string>>(); // qty → (name → duration)

  for (let qty = from; qty <= to; qty++) {
    const nameMap = new Map<string, string>();

    captures.forEach((c: any) => {
      const cFrom = Math.max(1, Number(c.fromQty || 1));
      const cTo = Math.max(cFrom, Number(c.toQty || cFrom));
      if (qty < cFrom || qty > cTo) return;

      const rawName = String(c.opsName || "").trim();
      if (!rawName || rawName.toUpperCase() === "UNASSIGNED" || rawName.toUpperCase() === "UNASSIGN") return;

      const names = rawName.split(",").map(n => n.trim().toUpperCase()).filter(Boolean);
      const durLabel = formatMachineHrsLabel(c.machineHrs);

      names.forEach(name => {
        const existing = nameMap.get(name) || "";
        if (!existing && durLabel) {
          nameMap.set(name, durLabel);
        } else if (!existing) {
          nameMap.set(name, "");
        }
      });
    });

    // Fallback to assignedTo if no captures found
    if (nameMap.size === 0) {
      const fallback = String(row.entry.assignedTo || row.parent.assignedTo || "").trim();
      const names = fallback.split(",").map(n => n.trim().toUpperCase()).filter(n => n && n !== "UNASSIGNED" && n !== "UNASSIGN");
      names.forEach(name => nameMap.set(name, ""));
    }

    if (nameMap.size > 0) {
      qtyMap.set(qty, nameMap);
    }
  }

  const result: OperatorQtyEntry[] = [];
  qtyMap.forEach((nameMap, qty) => {
    const operators = Array.from(nameMap.entries()).map(([name, dur]) => ({
      name,
      durationLabel: dur,
    }));
    result.push({ quantityNumber: qty, operators });
  });

  return result.sort((a, b) => a.quantityNumber - b.quantityNumber);
};

/* ---------- Compact operator cell with popover ---------- */

/**
 * Shows a compact single-line summary with an "+N more" badge.
 * Hovering the badge opens a popover listing all operators grouped by quantity.
 */
const OperatorQuantityCell = ({ row }: { row: QcRow }) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entries = getOperatorsByQuantity(row);

  if (entries.length === 0) {
    return <span className="qc-operator-empty">—</span>;
  }

  // Flatten all unique operators across all quantities for the summary line
  const allOps = entries.flatMap(e => e.operators);
  const firstName = allOps[0]?.name ?? "—";
  const firstDur = allOps[0]?.durationLabel ?? "";
  const extraCount = allOps.length - 1;
  const multiQty = entries.length > 1;

  const totalTooltipLines = entries.reduce((sum, e) => sum + e.operators.length, 0);
  const showPopover = totalTooltipLines > 1 || multiQty;

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <div
      className="qc-op-cell-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Inline summary row ── */}
      <div className="qc-op-summary">
        <span className="qc-op-first-name" title={firstDur ? `${firstName} — ${firstDur}` : firstName}>
          {firstName}
        </span>
        {firstDur && <span className="qc-op-first-dur">{firstDur}</span>}
        {showPopover && (
          <span className="qc-op-more-badge">
            {extraCount > 0 ? `+${extraCount}` : "▾"}
          </span>
        )}
      </div>

      {/* ── Popover panel ── */}
      {showPopover && open && (
        <div className="qc-op-popover">
          <div className="qc-op-popover-inner">
            {entries.map(entry => (
              <div key={entry.quantityNumber} className="qc-op-pop-group">
                {multiQty && (
                  <span className="qc-op-pop-qty-label">Qty #{entry.quantityNumber}</span>
                )}
                {entry.operators.map((op, i) => (
                  <div key={i} className="qc-op-pop-row">
                    <span className="qc-op-pop-name">{op.name}</span>
                    {op.durationLabel && (
                      <span className="qc-op-pop-dur">{op.durationLabel}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Dropdown qty cell: simple viewing dropdown if > 1 item, clean badge if 1 item
const QtyBadgeCell = ({ items, title }: { items: string[]; title?: string }) => {
  const [selected, setSelected] = useState(items[0] || "");
  if (items.length === 0) return <span className="qc-qty-empty">—</span>;
  if (items.length === 1) {
    return <span className="qc-qty-badge" title={title}>{items[0]}</span>;
  }
  return (
    <div className="qc-cell-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
      <select
        className="qc-cell-select qc-qty-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        title={title ?? items.join(", ")}
      >
        {items.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
};

/* ---------- column definitions ---------- */

export const createQcColumns = ({
  updateDecision,
  onOpenReport,
  openClosePrompt,
  showLogged = false,
}: QcColumnArgs) => [
    { key: "customer", label: "Customer", render: (row: QcRow) => <div className="qc-customer-cell"><span className="qc-customer-name">{row.entry.customer || row.parent.customer || "-"}</span></div> },
    { key: "jobRef", label: "Job ref", headerClassName: "qc-job-ref-col", className: "qc-job-ref-cell", render: (row: QcRow) => <span className="qc-job-ref-value">{formatJobRefDisplay(String(row.entry.refNumber || row.parent.refNumber || "").trim())}</span> },
    { key: "programRefFileName", label: <><span>Program Ref</span><br /><span>File Name</span></>, render: (row: QcRow) => <MarqueeCopyText text={String((row.entry as any).programRefFile || (row.entry as any).programRefFileName || row.parent.refNumber || "-")} /> },
    { key: "description", label: "Description", render: (row: QcRow) => <MarqueeCopyText text={row.entry.description || row.parent.description || "-"} /> },
    {
      key: "qty",
      label: "Qty",
      headerClassName: "qc-qty-col",
      className: "qc-qty-cell",
      render: (row: QcRow) => {
        const from = row.quantityFrom;
        const to = row.quantityTo;
        const list: string[] = [];
        for (let i = from; i <= to; i++) {
          list.push(`#${i}`);
        }
        return (
          <div className="qc-quantity-cell">
            <QtyBadgeCell items={list} title={row.reportScopeLabel} />
          </div>
        );
      },
    },
    {
      key: "operator",
      label: "Operator",
      headerClassName: "qc-operator-col",
      className: "qc-operator-cell",
      render: (row: QcRow) => <OperatorQuantityCell row={row} />,
    },

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
