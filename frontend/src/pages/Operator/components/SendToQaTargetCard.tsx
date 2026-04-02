import { getQaStageLabel, type QuantityProgressStatus } from "../utils/qaProgress";
import type { SendToQaModalTarget } from "./SendToQaModal";

type SelectionMode = "pick" | "range";

type SendToQaTargetCardProps = {
  target: SendToQaModalTarget;
  mode: SelectionMode;
  selected: number[];
  rangeStart: string;
  rangeEnd: string;
  onSetMode: (mode: SelectionMode) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSetRangeStart: (value: string) => void;
  onSetRangeEnd: (value: string) => void;
  onToggleQuantity: (quantityNumber: number) => void;
};

const getStatusCounts = (statusByQuantity: Record<number, QuantityProgressStatus>) => ({
  empty: Object.values(statusByQuantity).filter((status) => status === "EMPTY").length,
  running: Object.values(statusByQuantity).filter((status) => status === "RUNNING").length,
  sent: Object.values(statusByQuantity).filter((status) => status === "SENT_TO_QA").length,
  ready: Object.values(statusByQuantity).filter((status) => status === "READY_FOR_QA").length,
  saved: Object.values(statusByQuantity).filter((status) => status === "SAVED").length,
});

const SendToQaTargetCard = ({
  target,
  mode,
  selected,
  rangeStart,
  rangeEnd,
  onSetMode,
  onSelectAll,
  onClear,
  onSetRangeStart,
  onSetRangeEnd,
  onToggleQuantity,
}: SendToQaTargetCardProps) => {
  const counts = getStatusCounts(target.statusByQuantity);

  return (
    <section className="send-to-qa-card">
      <div className="send-to-qa-card-head">
        <div>
          <div className="send-to-qa-card-title-row">
            <span className={`send-to-qa-kind ${target.rowType}`}>{target.rowType === "parent" ? "Parent" : "Child"}</span>
            <h5>{target.customer || "Unnamed Job"}</h5>
          </div>
          <p>{target.refNumber || "-"} • Setting {target.settingLabel || "-"} • {target.description || "No description"}</p>
        </div>
        <div className="send-to-qa-badges">
          <span className="qa-summary-chip empty">NOT STARTED {counts.empty}</span>
          <span className="qa-summary-chip running">RUNNING {counts.running}</span>
          <span className="qa-summary-chip ready">HOLD {counts.ready}</span>
          <span className="qa-summary-chip saved">LOGGED {counts.saved}</span>
          <span className="qa-summary-chip sent">QC {counts.sent}</span>
        </div>
      </div>

      <div className="send-to-qa-card-toolbar">
        <div className="send-to-qa-mode-switch">
          <button type="button" className={mode === "pick" ? "active" : ""} onClick={() => onSetMode("pick")}>Pick Quantities</button>
          <button type="button" className={mode === "range" ? "active" : ""} onClick={() => onSetMode("range")}>Range Selector</button>
        </div>
        <div className="send-to-qa-quick-actions">
          <button type="button" onClick={onSelectAll}>All Logged / Hold</button>
          <button type="button" onClick={onClear}>Clear</button>
        </div>
      </div>

      {mode === "range" ? (
        <div className="send-to-qa-range-grid">
          <label>
            <span>From</span>
            <select value={rangeStart} onChange={(event) => onSetRangeStart(event.target.value)}>
              <option value="">Select</option>
              {target.eligibleQuantityNumbers.map((qty) => (
                <option key={`${target.jobId}-from-${qty}`} value={qty}>Qty {qty}</option>
              ))}
            </select>
          </label>
          <label>
            <span>To</span>
            <select value={rangeEnd} onChange={(event) => onSetRangeEnd(event.target.value)}>
              <option value="">Select</option>
              {target.eligibleQuantityNumbers.map((qty) => (
                <option key={`${target.jobId}-to-${qty}`} value={qty}>Qty {qty}</option>
              ))}
            </select>
          </label>
          <div className="send-to-qa-selection-preview">
            <span>Selected</span>
            <strong>{selected.length > 0 ? selected.join(", ") : "None"}</strong>
          </div>
        </div>
      ) : (
        <div className="send-to-qa-pill-grid">
          {Array.from({ length: target.totalQty }, (_, index) => {
            const quantityNumber = index + 1;
            const status = target.statusByQuantity[quantityNumber] || "EMPTY";
            const isEligible = target.eligibleQuantityNumbers.includes(quantityNumber);
            const isSelected = selected.includes(quantityNumber);
            return (
              <button
                key={`${target.jobId}-qty-${quantityNumber}`}
                type="button"
                className={`send-to-qa-pill status-${status.toLowerCase()} ${isSelected ? "selected" : ""}`}
                disabled={!isEligible}
                onClick={() => onToggleQuantity(quantityNumber)}
              >
                <span>Q{quantityNumber}</span>
                <small>{getQaStageLabel(status)}</small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SendToQaTargetCard;
