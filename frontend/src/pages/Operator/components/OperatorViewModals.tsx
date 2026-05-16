import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import Modal from "../../../components/Modal";
import type { JobEntry } from "../../../types/job";
import type { Dispatch, SetStateAction } from "react";
import { decimalHoursToHHMMSS } from "../utils/machineHrsCalculation";
import type { CutInputData, QuantityInputData } from "../types/cutInput";
import { formatCompactDurationWords, getQuantityElapsedSeconds } from "../utils/operatorTimeUtils";
import { getPersistedIdleDuration } from "../utils/operatorViewPageHelpers";

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

  const previousWorkedSeconds = Math.max(0, Math.round(Number(qtyData.workedDurationSeconds || 0)));
  
  // Use the preserved current segment worked seconds if available, otherwise calculate
  const currentSegmentSeconds = qtyData.currentSegmentWorkedSeconds !== undefined
    ? Math.max(0, qtyData.currentSegmentWorkedSeconds)
    : Math.max(0, getQuantityElapsedSeconds(qtyData, timestampMs) - previousWorkedSeconds);
    
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
    ? String(jobs.findIndex((job) => String(job.id) === String(pendingEndTimeCapture.cutId)) + 1)
    : "N/A";
  const pendingEndTimeWorkedSeconds =
    pendingEndTimeCapture && pendingEndTimeQty
      ? (pendingEndTimeQty.currentSegmentWorkedSeconds !== undefined
          ? pendingEndTimeQty.currentSegmentWorkedSeconds + Math.max(0, Number(pendingEndTimeQty.workedDurationSeconds || 0))
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
                ? String(jobs.findIndex((j) => String(j.id) === String(pendingDispatch.cutId)) + 1)
                : "N/A",
            },
            { label: "Quantities", value: pendingDispatch.quantityNumbers.join(", ") },
          ]}
          confirmButtonText="Dispatch To QC"
          onConfirm={async () => {
            await handleUpdateQaStatus(pendingDispatch.cutId, pendingDispatch.quantityNumbers, "SENT_TO_QA");
            setPendingDispatch(null);
          }}
          onCancel={() => setPendingDispatch(null)}
        />
      )}

      {pendingReset && (
        <ConfirmDeleteModal
          title="Confirm Reset"
          message="Are you sure you want to reset this quantity timer?"
          details={[
            { label: "Setting", value: String(jobs.findIndex((j) => String(j.id) === String(pendingReset.cutId)) + 1) },
            { label: "Quantity", value: String(pendingReset.quantityIndex + 1) },
          ]}
          confirmButtonText="Reset Timer"
          onConfirm={async () => {
            await handleResetQuantity(pendingReset.cutId, pendingReset.quantityIndex);
            setPendingReset(null);
          }}
          onCancel={() => setPendingReset(null)}
        />
      )}

      <Modal
        isOpen={Boolean(pendingEndTimeCapture)}
        onClose={handleCancelEndTimeCapture}
        title="Confirm End Time"
        size="small"
      >
        {pendingEndTimeCapture && pendingEndTimeQty ? (
          <div className="operator-endtime-confirm">
            <div className="operator-endtime-summary-card">
              <div className="summary-main-row">
                <div className="summary-item">
                  <span className="summary-label">JOB REF</span>
                  <span className="summary-value highlight">{String(pendingEndTimeJob?.refNumber || "-")}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">SETTING</span>
                  <span className="summary-value">{pendingEndTimeSetting}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">QTY</span>
                  <span className="summary-value">{String(pendingEndTimeCapture.quantityIndex + 1)}</span>
                </div>
              </div>
              
              <div className="summary-details-grid">
                <div className="summary-item">
                  <span className="summary-label">MACHINE HOURS</span>
                  <span className="summary-value">{machineHoursLabel}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">TOTAL DURATION</span>
                  <span className="summary-value">{formatWorkedDuration(pendingEndTimeWorkedSeconds)}</span>
                </div>
                {pendingEndTimeIdleDuration && (
                  <div className="summary-item">
                    <span className="summary-label">IDLE TIME</span>
                    <span className="summary-value">{pendingEndTimeIdleDuration}</span>
                  </div>
                )}
              </div>
            </div>

            {pendingEndTimeBreakdown.length > 0 && (
              <div className="operator-breakdown-section">
                <h4 className="breakdown-title">Operator Breakdown</h4>
                <div className="breakdown-list">
                  {pendingEndTimeBreakdown.map((entry) => (
                    <div key={entry.name} className="breakdown-item">
                      <span className="operator-name">{entry.name}</span>
                      <span className="operator-duration">{formatWorkedDuration(entry.durationSeconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="confirm-modal-footer-simple">
              <button type="button" className="btn-secondary-simple" onClick={handleCancelEndTimeCapture}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-simple"
                onClick={async () => {
                  await handleConfirmEndTimeCapture(
                    pendingEndTimeCapture.cutId,
                    pendingEndTimeCapture.quantityIndex,
                    pendingEndTimeCapture.timestampMs
                  );
                }}
              >
                Confirm & Lock
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default OperatorViewModals;
