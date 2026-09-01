import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import Modal from "../../../components/Modal";
import type { JobEntry } from "../../../types/job";
import { type Dispatch, type SetStateAction, useState } from "react";
import { decimalHoursToHHMMSS } from "../utils/machineHrsCalculation";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { formatCompactDurationWords, getQuantityElapsedSeconds, getCurrentSegmentWorkedSeconds } from "../utils/operatorTimeUtils";
import { getPersistedIdleDuration } from "../utils/operatorViewPageHelpers";
import { formatQuantityIdentifierFromIndex, getSettingIdentifier } from "../../../utils/jobFormatting";
import "../Operator.part08.css";

type PendingDispatch = { cutId: number | string; quantityNumbers: number[] } | null;
type PendingQuantity = { cutId: number | string; quantityIndex: number } | null;
type PendingEndTimeCapture = {
  cutId: number | string;
  quantityIndex: number;
  timestampMs: number;
  previousEndTime: string;
  previousEndTimeEpochMs: number | null;
  previousMachineHrs: string;
} | null;

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();
const formatWorkedDuration = (seconds: number) => formatCompactDurationWords(Math.max(0, Math.round(seconds)));

const buildOperatorBreakdown = (qtyData: QuantityInputData, timestampMs: number) => {
  const summary = new Map<string, number>();
  const addDuration = (rawName: unknown, durationSeconds: number) => {
    const name = normalizeOperatorName(rawName);
    const safeDuration = Math.max(0, Math.round(durationSeconds));
    if (!name || safeDuration <= 0) return;
    summary.set(name, (summary.get(name) || 0) + safeDuration);
  };

  (qtyData.operatorHistoryDetails || []).forEach((entry) => {
    addDuration(entry?.name, Number(entry?.durationSeconds || 0));
  });

  const currentSegmentSeconds = qtyData.currentSegmentWorkedSeconds !== undefined
    ? Math.max(0, qtyData.currentSegmentWorkedSeconds)
    : Math.max(0, getCurrentSegmentWorkedSeconds(qtyData, timestampMs));

  const currentOperators = Array.from(
    new Set((qtyData.opsName || []).map((name) => normalizeOperatorName(name)).filter(Boolean))
  );

  if (currentSegmentSeconds > 0) {
    if (currentOperators.length === 0) {
      addDuration(qtyData.currentPauseOperatorName || "CURRENT SEGMENT", currentSegmentSeconds);
    } else {
      const baseShare = Math.floor(currentSegmentSeconds / currentOperators.length);
      let remainder = currentSegmentSeconds % currentOperators.length;
      currentOperators.forEach((name) => {
        const share = baseShare + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        addDuration(name, share);
      });
    }
  }

  return Array.from(summary.entries())
    .map(([name, durationSeconds]) => ({ name, durationSeconds }))
    .sort((left, right) => right.durationSeconds - left.durationSeconds);
};

type OperatorViewModalsProps = {
  jobs: JobEntry[];
  cutInputs: Map<number | string, CutInputData>;
  pendingDispatch: PendingDispatch;
  setPendingDispatch: Dispatch<SetStateAction<PendingDispatch>>;
  pendingReset: PendingQuantity;
  setPendingReset: Dispatch<SetStateAction<PendingQuantity>>;
  pendingEndTimeCapture: PendingEndTimeCapture;
  handleCancelEndTimeCapture: () => void;
  handleUpdateQaStatus: (cutId: number | string, quantityNumbers: number[], status: "SENT_TO_QA" | "SAVED" | "READY_FOR_QA") => Promise<void>;
  handleResetQuantity: (cutId: number | string, quantityIndex: number) => Promise<void>;
  handleConfirmEndTimeCapture: (cutId: number | string, quantityIndex: number, timestampMs: number) => Promise<boolean>;
};

const OperatorViewModals = ({
  jobs,
  cutInputs,
  pendingDispatch,
  setPendingDispatch,
  pendingReset,
  setPendingReset,
  pendingEndTimeCapture,
  handleCancelEndTimeCapture,
  handleUpdateQaStatus,
  handleResetQuantity,
  handleConfirmEndTimeCapture,
}: OperatorViewModalsProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingDispatchJob = pendingDispatch
    ? jobs.find((job) => String(job.id) === String(pendingDispatch.cutId))
    : null;
  const pendingEndTimeJob = pendingEndTimeCapture
    ? jobs.find((job) => String(job.id) === String(pendingEndTimeCapture.cutId))
    : null;
  const pendingEndTimeQty = pendingEndTimeCapture
    ? cutInputs.get(pendingEndTimeCapture.cutId)?.quantities?.[pendingEndTimeCapture.quantityIndex] || null
    : null;
  const pendingEndTimeSetting = pendingEndTimeCapture && pendingEndTimeJob
    ? getSettingIdentifier(pendingEndTimeJob, jobs.findIndex((job) => String(job.id) === String(pendingEndTimeCapture.cutId)))
    : "N/A";
  const pendingEndTimeWorkedSeconds =
    pendingEndTimeCapture && pendingEndTimeQty
      ? (pendingEndTimeQty.currentSegmentWorkedSeconds !== undefined
        ? Math.max(0, pendingEndTimeQty.currentSegmentWorkedSeconds) + Math.max(0, Number(pendingEndTimeQty.workedDurationSeconds || 0))
        : getQuantityElapsedSeconds(pendingEndTimeQty, pendingEndTimeQty.endTimeEpochMs || pendingEndTimeCapture.timestampMs))
      : 0;
  const pendingEndTimeIdleDuration = pendingEndTimeQty
    ? getPersistedIdleDuration(Number(pendingEndTimeQty.totalPauseTime || 0), pendingEndTimeQty.idleTimeDuration)
    : "";
  const pendingEndTimeBreakdown =
    pendingEndTimeCapture && pendingEndTimeQty
      ? buildOperatorBreakdown(pendingEndTimeQty, pendingEndTimeQty.endTimeEpochMs || pendingEndTimeCapture.timestampMs)
      : [];
  const machineHoursDecimal = Number(pendingEndTimeQty?.machineHrs || 0);
  const machineHoursLabel =
    Number.isFinite(machineHoursDecimal) && machineHoursDecimal > 0
      ? `${decimalHoursToHHMMSS(machineHoursDecimal)} (${machineHoursDecimal.toFixed(3)} h)`
      : "00:00:00";

  return (
    <>
      {pendingDispatch && (
        <ConfirmDeleteModal
          title="Confirm Dispatch"
          message="Are you sure you want to dispatch selected quantity to QC?"
          details={[
            {
              label: "Setting",
              value: pendingDispatchJob
                ? getSettingIdentifier(pendingDispatchJob, jobs.findIndex((j) => String(j.id) === String(pendingDispatch.cutId)))
                : "N/A",
            },
            { label: "Quantities", value: pendingDispatch.quantityNumbers.map((qty) => formatQuantityIdentifierFromIndex(qty - 1)).join(", ") },
          ]}
          confirmButtonText={isSubmitting ? "Dispatching..." : "Dispatch To QC"}
          onConfirm={async () => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              await handleUpdateQaStatus(pendingDispatch.cutId, pendingDispatch.quantityNumbers, "SENT_TO_QA");
              setPendingDispatch(null);
            } finally {
              setIsSubmitting(false);
            }
          }}
          onCancel={() => !isSubmitting && setPendingDispatch(null)}
        />
      )}

      {pendingReset && (
        <ConfirmDeleteModal
          title="Confirm Reset"
          message="Are you sure you want to reset this quantity timer?"
          details={[
            { label: "Setting", value: getSettingIdentifier(jobs.find((j) => String(j.id) === String(pendingReset.cutId)), jobs.findIndex((j) => String(j.id) === String(pendingReset.cutId))) },
            { label: "Quantity", value: formatQuantityIdentifierFromIndex(pendingReset.quantityIndex) },
          ]}
          confirmButtonText={isSubmitting ? "Resetting..." : "Reset Timer"}
          onConfirm={async () => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            try {
              await handleResetQuantity(pendingReset.cutId, pendingReset.quantityIndex);
              setPendingReset(null);
            } finally {
              setIsSubmitting(false);
            }
          }}
          onCancel={() => !isSubmitting && setPendingReset(null)}
        />
      )}

      <Modal
        isOpen={Boolean(pendingEndTimeCapture)}
        onClose={handleCancelEndTimeCapture}
        title="Confirm End Time"
        size="medium"
      >
        {pendingEndTimeCapture && pendingEndTimeQty ? (
          <div className="operator-endtime-confirm">
            <p className="endtime-confirm-notice">
              Please review the final work session details before locking the end time for this quantity.
            </p>

            <div className="operator-endtime-summary-card">
              <div className="summary-card-header">
                <span className="summary-badge-job">Job Ref: {String(pendingEndTimeJob?.refNumber || "-")}</span>
                <span className="summary-badge-setting">Setting #{pendingEndTimeSetting}</span>
                <span className="summary-badge-qty">{formatQuantityIdentifierFromIndex(pendingEndTimeCapture.quantityIndex)}</span>
              </div>

              <div className="summary-details-grid">
                <div className="summary-detail-box highlight-box">
                  <span className="summary-label">MACHINE HOURS</span>
                  <span className="summary-value highlight">{machineHoursLabel}</span>
                </div>
                <div className="summary-detail-box">
                  <span className="summary-label">TOTAL WORKED DURATION</span>
                  <span className="summary-value">{formatWorkedDuration(pendingEndTimeWorkedSeconds)}</span>
                </div>
                {pendingEndTimeIdleDuration && (
                  <div className="summary-detail-box idle-box">
                    <span className="summary-label">IDLE TIME DURATION</span>
                    <span className="summary-value">{pendingEndTimeIdleDuration}</span>
                  </div>
                )}
              </div>
            </div>

            {pendingEndTimeBreakdown.length > 0 && (
              <div className="operator-breakdown-section">
                <h4 className="breakdown-title">Assigned Operator Breakdown</h4>
                <div className="breakdown-list">
                  {pendingEndTimeBreakdown.map((entry) => (
                    <div key={entry.name} className="breakdown-item">
                      <span className="operator-name">👤 {entry.name}</span>
                      <span className="operator-duration">{formatWorkedDuration(entry.durationSeconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="confirm-modal-footer-simple">
              <button type="button" className="btn-secondary-simple" onClick={handleCancelEndTimeCapture} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-simple"
                disabled={isSubmitting}
                onClick={async () => {
                  if (isSubmitting) return;
                  setIsSubmitting(true);
                  try {
                    await handleConfirmEndTimeCapture(
                      pendingEndTimeCapture.cutId,
                      pendingEndTimeCapture.quantityIndex,
                      pendingEndTimeCapture.timestampMs
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? "Saving..." : "Confirm & Lock End Time"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default OperatorViewModals;
