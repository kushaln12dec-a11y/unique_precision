import { useState, useEffect, useCallback } from "react";
import Modal from "../../../components/Modal";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { User } from "../../../types/user";
import { getUsers } from "../../../services/userApi";
import { assignOperatorWork } from "../../../services/operatorApi";
import { formatOperatorDuration } from "../utils/operatorLogHelpers";

type Props = {
    isOpen: boolean;
    log: EmployeeLog | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
};

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

/** Format seconds as HH:MM:SS for display */
const fmtSec = (s: number): string => {
    const h = Math.floor(s / SECONDS_PER_HOUR);
    const m = Math.floor((s % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const sec = s % SECONDS_PER_MINUTE;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Parse "HH:MM:SS" or "H:MM" into total seconds */
const parseHhMmSs = (value: string): number | null => {
    const parts = value.trim().split(":").map((p) => Number(p.trim()));
    if (parts.some(Number.isNaN)) return null;
    if (parts.length === 3) return parts[0] * SECONDS_PER_HOUR + parts[1] * SECONDS_PER_MINUTE + parts[2];
    if (parts.length === 2) return parts[0] * SECONDS_PER_HOUR + parts[1] * SECONDS_PER_MINUTE;
    return null;
};

const AdminAssignWorkModal = ({ isOpen, log, onClose, onSuccess }: Props) => {
    const [operators, setOperators] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [assignMode, setAssignMode] = useState<"full" | "partial">("full");
    const [partialTimeInput, setPartialTimeInput] = useState("");
    const [partialInputError, setPartialInputError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const totalSeconds = Number(
        log?.durationSeconds || (log?.metadata as any)?.workedSeconds || 0
    );

    const loadOperators = useCallback(async () => {
        try {
            const ops = await getUsers(["OPERATOR"]);
            setOperators(ops);
        } catch {
            // Non-fatal — user can still see an empty list
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadOperators();
            setSelectedUserId("");
            setAssignMode("full");
            setPartialTimeInput(fmtSec(totalSeconds));
            setPartialInputError("");
            setSubmitError("");
        }
    }, [isOpen, loadOperators, totalSeconds]);

    const handlePartialChange = (value: string) => {
        setPartialTimeInput(value);
        const parsed = parseHhMmSs(value);
        if (parsed === null) {
            setPartialInputError("Use HH:MM:SS format");
        } else if (parsed <= 0) {
            setPartialInputError("Duration must be > 0");
        } else if (parsed > totalSeconds) {
            setPartialInputError(`Cannot exceed total ${fmtSec(totalSeconds)}`);
        } else {
            setPartialInputError("");
        }
    };

    const handleSubmit = async () => {
        if (!log || !selectedUserId) return;
        let workedSeconds: number | undefined;
        if (assignMode === "partial") {
            const parsed = parseHhMmSs(partialTimeInput);
            if (parsed === null || parsed <= 0 || parsed > totalSeconds) {
                setPartialInputError("Enter a valid duration within the total worked time.");
                return;
            }
            workedSeconds = parsed;
        }

        try {
            setSubmitting(true);
            setSubmitError("");
            const result = await assignOperatorWork({
                logId: String(log._id || ""),
                operatorUserId: selectedUserId,
                workedSeconds,
            });
            const verb = result.split ? "split and reassigned" : "reassigned";
            onSuccess(`Work session ${verb} successfully. Revenue recalculated.`);
            onClose();
        } catch (err: any) {
            setSubmitError(err?.message || "Failed to assign work session.");
        } finally {
            setSubmitting(false);
        }
    };

    const isValid =
        selectedUserId.trim() !== "" &&
        (assignMode === "full" ||
            (parseHhMmSs(partialTimeInput) !== null &&
                parseHhMmSs(partialTimeInput)! > 0 &&
                parseHhMmSs(partialTimeInput)! <= totalSeconds));

    if (!log) return null;

    const logUser = String(log.userName || log.userEmail || "Unknown").trim();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adjust Time & Revenue Allocation" size="small">
            <div className="aaw-modal">
                {/* Source log info */}
                <div className="aaw-info-block">
                    <div className="aaw-info-row">
                        <span className="aaw-label">Current log owner</span>
                        <span className="aaw-value aaw-owner">{logUser}</span>
                    </div>
                    <div className="aaw-info-row">
                        <span className="aaw-label">Total worked time</span>
                        <span className="aaw-value">
                            {formatOperatorDuration(totalSeconds)}
                            <span className="aaw-hms">&ensp;({fmtSec(totalSeconds)})</span>
                        </span>
                    </div>
                    <div className="aaw-info-row">
                        <span className="aaw-label">Job ref</span>
                        <span className="aaw-value">{log.refNumber || log.workItemTitle || "—"}</span>
                    </div>
                </div>

                {/* Operator selector */}
                <label className="aaw-field">
                    <span className="aaw-field-label">Assign to Operator</span>
                    <select
                        className="aaw-select"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                        <option value="">— Select Operator —</option>
                        {operators.map((op) => {
                            const name = `${op.firstName || ""} ${op.lastName || ""}`.trim() || op.email;
                            return (
                                <option key={op._id} value={op._id}>
                                    {name.toUpperCase()}
                                </option>
                            );
                        })}
                    </select>
                </label>

                {/* Assignment mode */}
                <div className="aaw-field">
                    <span className="aaw-field-label">Time to assign</span>
                    <div className="aaw-mode-toggle">
                        <button
                            type="button"
                            className={`aaw-mode-btn ${assignMode === "full" ? "active" : ""}`}
                            onClick={() => setAssignMode("full")}
                        >
                            Full session
                        </button>
                        <button
                            type="button"
                            className={`aaw-mode-btn ${assignMode === "partial" ? "active" : ""}`}
                            onClick={() => setAssignMode("partial")}
                        >
                            Partial (split)
                        </button>
                    </div>
                </div>

                {assignMode === "partial" && (
                    <label className="aaw-field">
                        <span className="aaw-field-label">Operator's worked duration (HH:MM:SS)</span>
                        <input
                            className={`aaw-duration-input ${partialInputError ? "error" : ""}`}
                            value={partialTimeInput}
                            onChange={(e) => handlePartialChange(e.target.value)}
                            placeholder="01:30:00"
                        />
                        {partialInputError && <span className="aaw-input-error">{partialInputError}</span>}
                        {!partialInputError && parseHhMmSs(partialTimeInput) !== null && (
                            <span className="aaw-input-hint">
                                Remaining {fmtSec(totalSeconds - parseHhMmSs(partialTimeInput)!)} stays with {logUser}.
                            </span>
                        )}
                    </label>
                )}

                {assignMode === "full" && (
                    <p className="aaw-mode-desc">
                        The entire work session ({fmtSec(totalSeconds)}) will be transferred to the selected operator.
                        Revenue will be recalculated accordingly.
                    </p>
                )}

                {submitError && <div className="aaw-submit-error">{submitError}</div>}

                <div className="aaw-actions">
                    <button type="button" className="aaw-cancel-btn" onClick={onClose} disabled={submitting}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="aaw-confirm-btn"
                        onClick={handleSubmit}
                        disabled={!isValid || submitting}
                    >
                        {submitting ? "Saving…" : assignMode === "partial" ? "Split & Assign" : "Reassign"}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AdminAssignWorkModal;
