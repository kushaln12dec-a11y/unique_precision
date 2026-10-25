import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import Modal from "../../../components/Modal";
import type { JobEntry } from "../../../types/job";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { decimalHoursToHHMMSS } from "../utils/machineHrsCalculation";
import type { CutInputData } from "../types/cutInput";
import { formatCompactDurationWords, getQuantityElapsedSeconds } from "../utils/operatorTimeUtils";
import { getPersistedIdleDuration } from "../utils/operatorViewPageHelpers";
import { formatQuantityIdentifierFromIndex, getSettingIdentifier } from "../../../utils/jobFormatting";
import { getOperatorQuantityHistory } from "../utils/operatorQuantityHistory";
import { assignOperatorWork } from "../../../services/operatorApi";
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

const formatWorkedDuration = (seconds: number) => formatCompactDurationWords(Math.max(0, Math.round(seconds)));

type OperatorUser = { id: string | number; name: string };

type SplitEntry = {
  operatorId: string;
  /** minutes entered by admin */
  minutes: string;
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
  isAdmin?: boolean;
  allowedOperatorUsers?: OperatorUser[];
  postConfirmLogId?: string | null;
  setPostConfirmLogId?: Dispatch<SetStateAction<string | null>>;
  onAssignAfterConfirmSuccess?: (message: string) => void;
};

// ─── Admin multi-operator split modal ────────────────────────────────────────

type AdminSplitModalProps = {
  isOpen: boolean;
  logId: string;
  totalWorkedSeconds: number;
  operatorUsers: OperatorUser[];
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const AdminSplitModal = ({
  isOpen,
  logId,
  totalWorkedSeconds,
  operatorUsers,
  onClose,
  onSuccess,
}: AdminSplitModalProps) => {
  const [splits, setSplits] = useState<SplitEntry[]>([{ operatorId: "", minutes: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSplits([{ operatorId: "", minutes: "" }]);
      setError("");
    }
  }, [isOpen]);

  const addRow = () => setSplits(prev => [...prev, { operatorId: "", minutes: "" }]);
  const removeRow = (idx: number) => setSplits(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof SplitEntry, value: string) =>
    setSplits(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

  const totalAssignedMinutes = splits.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
  const totalWorkedMinutes = Math.round(totalWorkedSeconds / 60);
  const remainingMinutes = totalWorkedMinutes - totalAssignedMinutes;

  const handleSubmit = async () => {
    setError("");
    const validSplits = splits.filter(s => s.operatorId && Number(s.minutes) > 0);
    if (validSplits.length === 0) {
      setError("Add at least one operator with a time allocation.");
      return;
    }
    const duplicateIds = validSplits.map(s => s.operatorId).filter((id, i, arr) => arr.indexOf(id) !== i);
    if (duplicateIds.length > 0) {
      setError("Each operator can only appear once.");
      return;
    }
    if (totalAssignedMinutes > totalWorkedMinutes + 1) {
      setError(`Total assigned (${totalAssignedMinutes} min) exceeds worked time (${totalWorkedMinutes} min).`);
      return;
    }

    try {
      setIsSubmitting(true);
      // Call assignOperatorWork once per operator; the backend splits seconds from the source log
      for (const split of validSplits) {
        await assignOperatorWork({
          logId,
          operatorUserId: split.operatorId,
          workedSeconds: Math.round(Number(split.minutes) * 60),
        });
      }
      onSuccess(`Revenue split across ${validSplits.length} operator(s) successfully.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to assign. Try again or adjust manually via the Logs tab.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Revenue to Operator(s)" size="medium">
      <div className="aaw-split-modal">
        <p className="aaw-split-intro">
          Allocate worked time to the operator(s) who actually performed this job.
          The admin account's revenue will be reduced accordingly.
        </p>

        {/* Worked time reference */}
        <div className="aaw-split-total-bar">
          <span className="aaw-split-total-label">Total worked time</span>
          <span className="aaw-split-total-value">{totalWorkedMinutes} min</span>
          <span className={`aaw-split-remaining ${remainingMinutes < 0 ? "over" : ""}`}>
            {remainingMinutes >= 0 ? `${remainingMinutes} min unassigned` : `${Math.abs(remainingMinutes)} min over`}
          </span>
        </div>

        {/* Split rows */}
        <div className="aaw-split-rows">
          {splits.map((split, idx) => {
            const selectedUser = operatorUsers.find(u => String(u.id) === split.operatorId);
            return (
              <div key={idx} className="aaw-split-row">
                <select
                  className="aaw-split-select"
                  value={split.operatorId}
                  onChange={e => updateRow(idx, "operatorId", e.target.value)}
                >
                  <option value="">— Select operator —</option>
                  {operatorUsers.map(u => (
                    <option key={String(u.id)} value={String(u.id)}>{u.name}</option>
                  ))}
                </select>
                <div className="aaw-split-time-input-wrap">
                  <input
                    type="number"
                    className="aaw-split-time-input"
                    min={1}
                    max={totalWorkedMinutes}
                    step={1}
                    placeholder="min"
                    value={split.minutes}
                    onChange={e => updateRow(idx, "minutes", e.target.value)}
                  />
                  <span className="aaw-split-time-unit">min</span>
                </div>
                {selectedUser && split.minutes && (
                  <span className="aaw-split-name-preview" title={selectedUser.name}>
                    {selectedUser.name.split(" ")[0]}
                  </span>
                )}
                {splits.length > 1 && (
                  <button type="button" className="aaw-split-remove-btn" onClick={() => removeRow(idx)} title="Remove">✕</button>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" className="aaw-split-add-btn" onClick={addRow}>
          + Add another operator
        </button>

        {error && <div className="aaw-submit-error">{error}</div>}

        <div className="aaw-split-footer">
          <button type="button" className="aaw-cancel-btn" disabled={isSubmitting} onClick={onClose}>
            Skip
          </button>
          <button type="button" className="aaw-confirm-btn" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Saving…" : "Confirm Assignments"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main modals component ────────────────────────────────────────────────────

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
  isAdmin = false,
  allowedOperatorUsers = [] as OperatorUser[],
  postConfirmLogId = null,
  setPostConfirmLogId,
  onAssignAfterConfirmSuccess,
}: OperatorViewModalsProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);

  // When a log is created and admin has elected to split revenue, open the split modal
  useEffect(() => {
    if (postConfirmLogId && isAdmin && allowedOperatorUsers.length > 0) {
      setShowSplitModal(true);
    }
  }, [postConfirmLogId, isAdmin, allowedOperatorUsers.length]);

  const handleSplitModalClose = () => {
    setShowSplitModal(false);
    setPostConfirmLogId?.(null);
  };

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
      ? getOperatorQuantityHistory(pendingEndTimeQty, false).operatorHistoryDetails
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

      {/* ── Confirm End Time Modal ── */}
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

            {/* ── Admin-only notice ── */}
            {isAdmin && allowedOperatorUsers.length > 0 && (
              <div className="admin-assign-inline-section">
                <div className="admin-assign-inline-header">
                  <span className="admin-assign-inline-title">🔧 Admin: Revenue Assignment</span>
                  <span className="admin-assign-inline-hint">
                    After confirming, you can assign the worked time to the operator(s) who performed this job.
                    You'll be prompted to choose operator(s) and time allocation immediately after saving.
                  </span>
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

      {/* ── Admin multi-operator split modal (auto-opens after log is created) ── */}
      {isAdmin && postConfirmLogId && (
        <AdminSplitModal
          isOpen={showSplitModal}
          logId={postConfirmLogId}
          totalWorkedSeconds={pendingEndTimeWorkedSeconds}
          operatorUsers={allowedOperatorUsers}
          onClose={handleSplitModalClose}
          onSuccess={(msg) => {
            handleSplitModalClose();
            onAssignAfterConfirmSuccess?.(msg);
          }}
        />
      )}
    </>
  );
};

export default OperatorViewModals;
