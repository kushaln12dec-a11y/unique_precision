import React from "react";
import type { QuantityProgressStatus } from "../utils/qaProgress";

type Props = {
  allQuantityNumbers: number[];
  getStatus: (qty: number) => QuantityProgressStatus;
  selectableQuantityNumbers: number[];
  selectedQaQuantities: Set<number>;
  setSelectedQaQuantities: React.Dispatch<React.SetStateAction<Set<number>>>;
  sendEligible: number[];
  onSendToQa?: (cutId: number | string, quantityNumbers: number[]) => void;
  cutId: number | string;
};

export const OperatorQaSelectionStrip: React.FC<Props> = ({
  allQuantityNumbers,
  getStatus,
  selectableQuantityNumbers,
  selectedQaQuantities,
  setSelectedQaQuantities,
  sendEligible,
  onSendToQa,
  cutId,
}) => (
  <div className="qa-selection-strip">
    <div className="qa-strip-head">
      <label className="qa-select-all">
        <input
          type="checkbox"
          checked={selectableQuantityNumbers.length > 0 && selectableQuantityNumbers.every((qty) => selectedQaQuantities.has(qty))}
          onChange={(e) => setSelectedQaQuantities(e.target.checked ? new Set(selectableQuantityNumbers) : new Set())}
        />
        <span>Select All</span>
      </label>
      <div className="qa-strip-actions">
        <button type="button" className="qa-action-button sent" disabled={sendEligible.length === 0} onClick={() => onSendToQa?.(cutId, sendEligible)}>
          Dispatch To QC
        </button>
      </div>
    </div>
    <div className="qa-quantity-list">
      {allQuantityNumbers.map((qtyNo) => (
        <label key={qtyNo} className={`qa-qty-pill status-${getStatus(qtyNo).toLowerCase()}`}>
          <input
            type="checkbox"
            disabled={getStatus(qtyNo) === "SENT_TO_QA"}
            checked={selectedQaQuantities.has(qtyNo)}
            onChange={(e) => {
              if (getStatus(qtyNo) === "SENT_TO_QA") return;
              setSelectedQaQuantities((prev) => {
                const next = new Set(prev);
                if (e.target.checked) next.add(qtyNo);
                else next.delete(qtyNo);
                return next;
              });
            }}
          />
          <span>Q{qtyNo}</span>
        </label>
      ))}
    </div>
  </div>
);

export default OperatorQaSelectionStrip;
