import React from "react";
import type { OperatorInputField } from "../types/inputFields";

type Props = {
  canOperateInputs: boolean;
  canReset: boolean;
  cutId: number | string;
  qtyIndex: number;
  isRangeMode: boolean;
  isRangeValid: boolean;
  isRangeApproved: boolean;
  rangeStartQty: number;
  rangeEndQty: number;
  rangeBadgeKey: string;
  savedRanges: Set<string>;
  qtyStartTime: string;
  qtyEndTime: string;
  isShiftOverPause: boolean;
  isPaused: boolean;
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
  onRequestResume?: (cutId: number | string, quantityIndex: number) => void;
  onRequestResetTimer?: (cutId: number | string, quantityIndex: number) => void;
  onRequestShiftOver?: (cutId: number | string, quantityIndex: number) => void;
  onInputChange: (cutId: number | string, quantityIndex: number, field: OperatorInputField, value: string | string[]) => void;
  onSaveQuantity?: (cutId: number | string, quantityIndex: number) => void;
  onSaveRange?: (cutId: number | string, sourceQuantityIndex: number, fromQty: number, toQty: number) => void;
};

const OperatorQuantityActions: React.FC<Props> = ({
  canOperateInputs,
  canReset,
  cutId,
  qtyIndex,
  isRangeMode,
  isRangeValid,
  isRangeApproved,
  rangeStartQty,
  rangeEndQty,
  rangeBadgeKey,
  savedRanges,
  qtyStartTime,
  qtyEndTime,
  isShiftOverPause,
  isPaused,
  onShowToast,
  onRequestResume,
  onRequestResetTimer,
  onRequestShiftOver,
  onInputChange,
  onSaveQuantity,
  onSaveRange,
}) => {
  const canSaveSingleQuantity = canOperateInputs && Boolean(String(qtyEndTime || "").trim());
  const canSaveRange = canOperateInputs && !isRangeMode ? false : Boolean(String(qtyEndTime || "").trim()) && isRangeValid && isRangeApproved;

  return (
    <div className="quantity-save-section">
      {isRangeMode ? (
        <button
          type="button"
          className={`btn-save-quantity ${savedRanges.has(rangeBadgeKey) ? "saved" : ""}`}
          disabled={!canSaveRange}
          onClick={() => {
            if (!String(qtyEndTime || "").trim()) return onShowToast?.("Click End Time before saving.", "error");
            if (!isRangeValid) return onShowToast?.(`Enter range between 1 and ${Math.max(rangeEndQty, rangeStartQty)}.`, "error");
            if (!isRangeApproved) return onShowToast?.("Please click Check to accept the range.", "error");
            onSaveRange?.(cutId, qtyIndex, rangeStartQty, rangeEndQty);
          }}
        >
          {savedRanges.has(rangeBadgeKey) ? "Saved" : `Save Range ${rangeStartQty}-${rangeEndQty}`}
        </button>
      ) : (
        <>
          {qtyStartTime && !qtyEndTime && (!isPaused || isShiftOverPause) && (
            <button
              type="button"
              className="mark-shift-over-button"
              disabled={!canOperateInputs}
              onClick={() => (isShiftOverPause ? onRequestResume?.(cutId, qtyIndex) : onRequestShiftOver?.(cutId, qtyIndex))}
            >
              {isShiftOverPause ? "Resume Quantity" : "Shift Over"}
            </button>
          )}
          {canReset && qtyStartTime && (
            <button
              type="button"
              className="reset-timer-button"
              onClick={() => (onRequestResetTimer ? onRequestResetTimer(cutId, qtyIndex) : onInputChange(cutId, qtyIndex, "resetTimer", ""))}
              aria-label="Reset timer"
              title="Reset timer"
            >
              Reset Quantity {qtyIndex + 1}
            </button>
          )}
          <button
            type="button"
            className="btn-save-quantity"
            disabled={!canSaveSingleQuantity}
            onClick={() => {
              if (!String(qtyEndTime || "").trim()) return onShowToast?.("Click End Time before saving.", "error");
              onSaveQuantity?.(cutId, qtyIndex);
            }}
          >
            Save Quantity {qtyIndex + 1}
          </button>
        </>
      )}
    </div>
  );
};

export default OperatorQuantityActions;
