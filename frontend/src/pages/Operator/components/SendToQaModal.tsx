import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import type { QuantityProgressStatus } from "../utils/qaProgress";
import { getQaStageLabel } from "../utils/qaProgress";
import "./SendToQaModal.css";

export type SendToQaModalTarget = {
  jobId: string;
  groupId: string;
  customer: string;
  description: string;
  refNumber: string;
  settingLabel: string;
  totalQty: number;
  eligibleQuantityNumbers: number[];
  statusByQuantity: Record<number, QuantityProgressStatus>;
  defaultSelectedQuantityNumbers?: number[];
  rowType: "parent" | "child";
};

type SendToQaModalProps = {
  isOpen: boolean;
  targets: SendToQaModalTarget[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: Array<{ jobId: string; quantityNumbers: number[] }>) => void | Promise<void>;
};

type SelectionMode = "pick" | "range";

const getInitialSelection = (target: SendToQaModalTarget): number[] => {
  const preferred = (target.defaultSelectedQuantityNumbers || []).filter((qty) =>
    target.eligibleQuantityNumbers.includes(qty)
  );
  return preferred.length > 0 ? preferred : [...target.eligibleQuantityNumbers];
};

const isContiguous = (values: number[]): boolean =>
  values.every((value, index) => index === 0 || value === values[index - 1] + 1);

export const SendToQaModal = ({
  isOpen,
  targets,
  isSubmitting = false,
  onClose,
  onConfirm,
}: SendToQaModalProps) => {
  const [selectionModes, setSelectionModes] = useState<Record<string, SelectionMode>>({});
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number[]>>({});
  const [rangeStarts, setRangeStarts] = useState<Record<string, string>>({});
  const [rangeEnds, setRangeEnds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const nextModes: Record<string, SelectionMode> = {};
    const nextPicked: Record<string, number[]> = {};
    const nextStarts: Record<string, string> = {};
    const nextEnds: Record<string, string> = {};

    targets.forEach((target) => {
      const initialSelection = getInitialSelection(target);
      const sortedSelection = [...initialSelection].sort((a, b) => a - b);
      nextPicked[target.jobId] = sortedSelection;
      nextModes[target.jobId] = isContiguous(sortedSelection) ? "range" : "pick";
      nextStarts[target.jobId] = sortedSelection[0] ? String(sortedSelection[0]) : "";
      nextEnds[target.jobId] = sortedSelection[sortedSelection.length - 1]
        ? String(sortedSelection[sortedSelection.length - 1])
        : "";
    });

    setSelectionModes(nextModes);
    setPickedQuantities(nextPicked);
    setRangeStarts(nextStarts);
    setRangeEnds(nextEnds);
  }, [isOpen, targets]);

  const resolvedSelections = useMemo(() => {
    const map = new Map<string, number[]>();

    targets.forEach((target) => {
      const mode = selectionModes[target.jobId] || "pick";
      if (mode === "range") {
        const start = Number.parseInt(rangeStarts[target.jobId] || "", 10);
        const end = Number.parseInt(rangeEnds[target.jobId] || "", 10);
        const selected = target.eligibleQuantityNumbers.filter(
          (qty) => Number.isInteger(start) && Number.isInteger(end) && qty >= Math.min(start, end) && qty <= Math.max(start, end)
        );
        map.set(target.jobId, selected);
        return;
      }

      map.set(
        target.jobId,
        (pickedQuantities[target.jobId] || []).filter((qty) => target.eligibleQuantityNumbers.includes(qty)).sort((a, b) => a - b)
      );
    });

    return map;
  }, [targets, selectionModes, pickedQuantities, rangeStarts, rangeEnds]);

  const selectedTargetCount = Array.from(resolvedSelections.values()).filter((value) => value.length > 0).length;
  const selectedQuantityCount = Array.from(resolvedSelections.values()).reduce((sum, value) => sum + value.length, 0);

  const handleToggleQuantity = (jobId: string, quantityNumber: number) => {
    setPickedQuantities((prev) => {
      const current = new Set(prev[jobId] || []);
      if (current.has(quantityNumber)) current.delete(quantityNumber);
      else current.add(quantityNumber);
      return {
        ...prev,
        [jobId]: Array.from(current).sort((a, b) => a - b),
      };
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send To QC" size="large" className="send-to-qa-modal">
      <div className="send-to-qa-shell">
        <div className="send-to-qa-hero">
          <div>
            <p className="send-to-qa-eyebrow">Dispatch logged quantities only</p>
            <h4>Choose exactly which items should move to QC</h4>
            <p className="send-to-qa-copy">
              Parent rows, child rows, and multi-row selections are supported in one place.
            </p>
          </div>
          <div className="send-to-qa-summary">
            <span>{targets.length} row(s)</span>
            <strong>{selectedQuantityCount} qty selected</strong>
          </div>
        </div>

        <div className="send-to-qa-targets">
          {targets.map((target) => {
            const selected = resolvedSelections.get(target.jobId) || [];
            const empty = Object.values(target.statusByQuantity).filter((status) => status === "EMPTY").length;
            const sent = Object.values(target.statusByQuantity).filter((status) => status === "SENT_TO_QA").length;
            const ready = Object.values(target.statusByQuantity).filter((status) => status === "READY_FOR_QA").length;
            const saved = Object.values(target.statusByQuantity).filter((status) => status === "SAVED").length;
            const mode = selectionModes[target.jobId] || "pick";

            return (
              <section key={target.jobId} className="send-to-qa-card">
                <div className="send-to-qa-card-head">
                  <div>
                    <div className="send-to-qa-card-title-row">
                      <span className={`send-to-qa-kind ${target.rowType}`}>{target.rowType === "parent" ? "Parent" : "Child"}</span>
                      <h5>{target.customer || "Unnamed Job"}</h5>
                    </div>
                    <p>
                      {target.refNumber || "-"} • Setting {target.settingLabel || "-"} • {target.description || "No description"}
                    </p>
                  </div>
                  <div className="send-to-qa-badges">
                    <span className="qa-summary-chip saved">Logged {saved}</span>
                    <span className="qa-summary-chip ready">In Progress {ready}</span>
                    <span className="qa-summary-chip sent">QC {sent}</span>
                    <span className="qa-summary-chip empty">Yet to Start {empty}</span>
                  </div>
                </div>

                <div className="send-to-qa-card-toolbar">
                  <div className="send-to-qa-mode-switch">
                    <button
                      type="button"
                      className={mode === "pick" ? "active" : ""}
                      onClick={() => setSelectionModes((prev) => ({ ...prev, [target.jobId]: "pick" }))}
                    >
                      Pick Quantities
                    </button>
                    <button
                      type="button"
                      className={mode === "range" ? "active" : ""}
                      onClick={() => setSelectionModes((prev) => ({ ...prev, [target.jobId]: "range" }))}
                    >
                      Range Selector
                    </button>
                  </div>
                  <div className="send-to-qa-quick-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setPickedQuantities((prev) => ({
                          ...prev,
                          [target.jobId]: [...target.eligibleQuantityNumbers],
                        }));
                        setRangeStarts((prev) => ({
                          ...prev,
                          [target.jobId]: target.eligibleQuantityNumbers[0]
                            ? String(target.eligibleQuantityNumbers[0])
                            : "",
                        }));
                        setRangeEnds((prev) => ({
                          ...prev,
                          [target.jobId]: target.eligibleQuantityNumbers[target.eligibleQuantityNumbers.length - 1]
                            ? String(target.eligibleQuantityNumbers[target.eligibleQuantityNumbers.length - 1])
                            : "",
                        }));
                      }}
                    >
                      All Logged
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPickedQuantities((prev) => ({
                          ...prev,
                          [target.jobId]: [],
                        }));
                        setRangeStarts((prev) => ({ ...prev, [target.jobId]: "" }));
                        setRangeEnds((prev) => ({ ...prev, [target.jobId]: "" }));
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {mode === "range" ? (
                  <div className="send-to-qa-range-grid">
                    <label>
                      <span>From</span>
                      <select
                        value={rangeStarts[target.jobId] || ""}
                        onChange={(event) => setRangeStarts((prev) => ({ ...prev, [target.jobId]: event.target.value }))}
                      >
                        <option value="">Select</option>
                        {target.eligibleQuantityNumbers.map((qty) => (
                          <option key={`${target.jobId}-from-${qty}`} value={qty}>
                            Qty {qty}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>To</span>
                      <select
                        value={rangeEnds[target.jobId] || ""}
                        onChange={(event) => setRangeEnds((prev) => ({ ...prev, [target.jobId]: event.target.value }))}
                      >
                        <option value="">Select</option>
                        {target.eligibleQuantityNumbers.map((qty) => (
                          <option key={`${target.jobId}-to-${qty}`} value={qty}>
                            Qty {qty}
                          </option>
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
                          onClick={() => handleToggleQuantity(target.jobId, quantityNumber)}
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
          })}
        </div>

        <div className="send-to-qa-footer">
          <p>
            {selectedTargetCount > 0
              ? `Ready to send ${selectedQuantityCount} selected quantity item(s) across ${selectedTargetCount} row(s).`
              : "Select at least one logged quantity to continue."}
          </p>
          <div className="send-to-qa-actions">
            <button type="button" className="send-to-qa-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="button"
              className="send-to-qa-primary"
              disabled={selectedQuantityCount === 0 || isSubmitting}
              onClick={() => {
                const payload = targets
                  .map((target) => ({
                    jobId: target.jobId,
                    quantityNumbers: resolvedSelections.get(target.jobId) || [],
                  }))
                  .filter((item) => item.quantityNumbers.length > 0);
                void onConfirm(payload);
              }}
            >
              {isSubmitting ? "Sending..." : "Send Selected To QC"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SendToQaModal;
