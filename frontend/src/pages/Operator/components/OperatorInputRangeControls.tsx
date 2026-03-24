import React from "react";

type Props = {
  totalQuantity: number;
  captureMode: "PER_QUANTITY" | "RANGE";
  setCaptureMode: React.Dispatch<React.SetStateAction<"PER_QUANTITY" | "RANGE">>;
  rangeFrom: string;
  setRangeFrom: React.Dispatch<React.SetStateAction<string>>;
  rangeTo: string;
  setRangeTo: React.Dispatch<React.SetStateAction<string>>;
  isRangeValid: boolean;
  rangeStartQty: number;
  rangeEndQty: number;
  isRangeApproved: boolean;
  setIsRangeApproved: React.Dispatch<React.SetStateAction<boolean>>;
  qaCounts: { logged: number; sent: number; empty: number };
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
};

export const OperatorInputRangeControls: React.FC<Props> = ({
  totalQuantity,
  captureMode,
  setCaptureMode,
  rangeFrom,
  setRangeFrom,
  rangeTo,
  setRangeTo,
  isRangeValid,
  rangeStartQty,
  rangeEndQty,
  isRangeApproved,
  setIsRangeApproved,
  qaCounts,
  onShowToast,
}) => (
  <div className="capture-mode-toggle">
    <button type="button" className={`capture-mode-button ${captureMode === "PER_QUANTITY" ? "active" : ""}`} onClick={() => { setCaptureMode("PER_QUANTITY"); setIsRangeApproved(false); }}>
      Per Quantity
    </button>
    <button type="button" className={`capture-mode-button ${captureMode === "RANGE" ? "active" : ""}`} onClick={() => { setCaptureMode("RANGE"); setIsRangeApproved(false); }}>
      Range
    </button>
    {captureMode === "RANGE" && (
      <div className="capture-range-controls">
        <input type="number" min={1} max={totalQuantity} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} onBlur={(e) => {
          const v = Number.parseInt(e.target.value || "", 10);
          if (!Number.isInteger(v)) return;
          setRangeFrom(String(Math.max(1, Math.min(totalQuantity, v))));
        }} placeholder="From" className="apply-count-input" />
        <span className="capture-range-separator">to</span>
        <input type="number" min={2} max={totalQuantity} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} onBlur={(e) => {
          const v = Number.parseInt(e.target.value || "", 10);
          if (!Number.isInteger(v)) return;
          setRangeTo(String(Math.max(2, Math.min(totalQuantity, v))));
        }} placeholder="To" className="apply-count-input" />
        <span className="capture-range-hint">
          {isRangeValid ? `Qty ${rangeStartQty}-${rangeEndQty} (${rangeEndQty - rangeStartQty + 1})` : `Select range 1-${totalQuantity}`}
        </span>
        <button
          type="button"
          className={`range-approve-button ${isRangeApproved ? "approved" : ""}`}
          disabled={!isRangeValid}
          onClick={() => {
            setIsRangeApproved(true);
            onShowToast?.(`Range ${rangeStartQty}-${rangeEndQty} accepted.`, "success");
          }}
          title="Approve selected range"
          aria-label="Approve selected range"
        >
          <span className="tick-mark">âœ“</span>
          {isRangeApproved ? "Accepted" : "Accept Range"}
        </button>
      </div>
    )}
    <div className="qa-inline-status-block">
      <div className="qa-overall-summary qa-inline-summary">
        <span className="qa-summary-chip saved">Logged: {qaCounts.logged}</span>
        <span className="qa-summary-chip sent">QC: {qaCounts.sent}</span>
        <span className="qa-summary-chip empty">Yet to Start: {qaCounts.empty}</span>
      </div>
    </div>
  </div>
);

export default OperatorInputRangeControls;
