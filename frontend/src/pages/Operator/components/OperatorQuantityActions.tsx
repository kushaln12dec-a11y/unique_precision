import React from "react";
import type { OperatorInputField } from "../types/inputFields";

type Props = {
  canOperateInputs: boolean;
  canReset: boolean;
  canRunAssignedJob: boolean;
  runBlockedReason?: string;
  cutId: number | string;
  qtyIndex: number;
  quantityLabel?: string;
  rangeQuantityLabel?: string;
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
  isAlreadySaved?: boolean;
};

const OperatorQuantityActions: React.FC<Props> = ({
  canOperateInputs,
  canReset,
  canRunAssignedJob,
  runBlockedReason,
  cutId,
  qtyIndex,
  quantityLabel,
  isRangeMode,
  qtyStartTime,
  qtyEndTime,
  isShiftOverPause,
  isPaused,
  onShowToast,
  onRequestResume,
  onRequestResetTimer,
  onRequestShiftOver,
  onInputChange,
}) => {
  const showRunBlockedToast = () => onShowToast?.(runBlockedReason || "Your name must be assigned to this job before you can run it.", "error");
  const singleLabel = quantityLabel || `Quantity ${qtyIndex + 1}`;

  return (
    <div className="quantity-save-section">
      {!isRangeMode && (
        <>
          {qtyStartTime && !qtyEndTime && (!isPaused || isShiftOverPause) && (
            <button
              type="button"
              className="mark-shift-over-button"
              disabled={!canOperateInputs || !canRunAssignedJob}
              onClick={() => {
                if (!canRunAssignedJob) return showRunBlockedToast();
                isShiftOverPause ? onRequestResume?.(cutId, qtyIndex) : onRequestShiftOver?.(cutId, qtyIndex);
              }}
            >
              {isShiftOverPause ? "Resume Quantity" : "Shift Over"}
            </button>
          )}
          {canReset && qtyStartTime && (
            <button
              type="button"
              className="reset-timer-button"
              onClick={() => {
                if (!canRunAssignedJob) return showRunBlockedToast();
                onRequestResetTimer ? onRequestResetTimer(cutId, qtyIndex) : onInputChange(cutId, qtyIndex, "resetTimer", "");
              }}
              aria-label="Reset timer"
              title="Reset timer"
            >
              Reset {singleLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default OperatorQuantityActions;
