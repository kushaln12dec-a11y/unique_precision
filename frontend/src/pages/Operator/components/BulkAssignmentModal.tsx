import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import type { JobEntry } from "../../../types/job";
import { formatMachineLabel, toMachineIndex } from "../../../utils/jobFormatting";
import { MultiSelectOperators } from "./MultiSelectOperators";
import { parseAssignedOperators } from "../utils/operatorViewPageHelpers";
import "./BulkAssignmentModal.css";

type BulkAssignmentPayloadItem = {
  jobId: string;
  fromQty: number;
  toQty: number;
  operators: string[];
  machineNumbers: string[];
};

type DraftState = {
  fromQty: string;
  toQty: string;
  operators: string[];
  machineNumbers: string[];
};

type BulkAssignmentModalProps = {
  isOpen: boolean;
  jobs: JobEntry[];
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: BulkAssignmentPayloadItem[]) => void | Promise<void>;
};

const getDefaultOperators = (job: JobEntry) => {
  const source = Array.isArray(job.opsName) ? job.opsName : parseAssignedOperators(job.assignedTo || job.opsName || "");
  return Array.from(
    new Map(
      source
        .map((value) => String(value || "").trim().toUpperCase())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value] as const)
    ).values()
  );
};

const getDefaultMachineNumbers = (job: JobEntry) =>
  Array.from(
    new Map(
      String(job.machineNumber || "")
        .split(",")
        .map((value) => toMachineIndex(value.trim()))
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value] as const)
    ).values()
  );

const BulkAssignmentModal = ({
  isOpen,
  jobs,
  operatorUsers,
  machineOptions,
  isSubmitting = false,
  onClose,
  onConfirm,
}: BulkAssignmentModalProps) => {
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  useEffect(() => {
    if (!isOpen) return;
    const nextDrafts: Record<string, DraftState> = {};
    jobs.forEach((job) => {
      const totalQty = Math.max(1, Number(job.qty || 1));
      nextDrafts[String(job.id)] = {
        fromQty: "1",
        toQty: String(totalQty),
        operators: getDefaultOperators(job),
        machineNumbers: getDefaultMachineNumbers(job),
      };
    });
    setDrafts(nextDrafts);
  }, [isOpen, jobs]);

  const machineSelectOptions = useMemo(
    () => machineOptions.map((machine) => ({ id: machine, name: formatMachineLabel(machine) })),
    [machineOptions]
  );

  const payload = useMemo<BulkAssignmentPayloadItem[]>(() => {
    return jobs.map((job) => {
      const draft = drafts[String(job.id)];
      const totalQty = Math.max(1, Number(job.qty || 1));
      const fromQty = Math.min(totalQty, Math.max(1, Number(draft?.fromQty || 1)));
      const toQty = Math.min(totalQty, Math.max(fromQty, Number(draft?.toQty || totalQty)));
      return {
        jobId: String(job.id),
        fromQty,
        toQty,
        operators: draft?.operators || [],
        machineNumbers: draft?.machineNumbers || [],
      };
    });
  }, [drafts, jobs]);

  const hasAnyAssignment = payload.some((item) => item.operators.length > 0 || item.machineNumbers.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Assign Selected Jobs" size="large" className="bulk-assignment-modal">
      <div className="bulk-assignment-shell">
        <div className="bulk-assignment-hero">
          <div>
            <p className="bulk-assignment-eyebrow">Assign operators, machines, and quantity ranges</p>
            <h4>Set who works on which quantity, job by job</h4>
            <p className="bulk-assignment-copy">
              Each selected job gets its own quantity range and can carry multiple operators and machine numbers.
            </p>
          </div>
          <div className="bulk-assignment-summary">
            <span>{jobs.length} job(s)</span>
            <strong>{payload.reduce((sum, item) => sum + Math.max(0, item.toQty - item.fromQty + 1), 0)} qty selected</strong>
          </div>
        </div>

        <div className="bulk-assignment-list">
          {jobs.map((job) => {
            const totalQty = Math.max(1, Number(job.qty || 1));
            const draft = drafts[String(job.id)] || {
              fromQty: "1",
              toQty: String(totalQty),
              operators: [],
              machineNumbers: [],
            };
            const fromQty = Math.min(totalQty, Math.max(1, Number(draft.fromQty || 1)));
            const toQty = Math.min(totalQty, Math.max(fromQty, Number(draft.toQty || totalQty)));
            const operatorSelected = draft.operators;
            const machineSelected = draft.machineNumbers;

            return (
              <section key={String(job.id)} className="bulk-assignment-card">
                <div className="bulk-assignment-card-head">
                  <div>
                    <div className="bulk-assignment-card-title-row">
                      <span className="bulk-assignment-job-ref">{String(job.refNumber || job.id || "-")}</span>
                      <span className="bulk-assignment-qty-pill">Qty {totalQty}</span>
                    </div>
                    <p>
                      {job.customer || "Unnamed Job"}{" "}
                      <span className="bulk-assignment-card-desc">{job.description || "No description"}</span>
                    </p>
                  </div>
                  <div className="bulk-assignment-card-meta">
                    <span>Job #{String(job.id)}</span>
                    <strong>{formatMachineLabel(getDefaultMachineNumbers(job)[0] || "") || "-"}</strong>
                  </div>
                </div>

                <div className="bulk-assignment-grid">
                  <label>
                    <span>From Qty</span>
                    <select
                      value={draft.fromQty}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [String(job.id)]: {
                            ...prev[String(job.id)],
                            fromQty: event.target.value,
                            toQty: Number(event.target.value) > Number(prev[String(job.id)]?.toQty || totalQty)
                              ? event.target.value
                              : prev[String(job.id)]?.toQty || String(totalQty),
                          },
                        }))
                      }
                    >
                      {Array.from({ length: totalQty }, (_, index) => index + 1).map((qty) => (
                        <option key={`${job.id}-from-${qty}`} value={qty}>
                          Q{qty}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>To Qty</span>
                    <select
                      value={draft.toQty}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [String(job.id)]: {
                            ...prev[String(job.id)],
                            toQty: event.target.value,
                          },
                        }))
                      }
                    >
                      {Array.from({ length: totalQty }, (_, index) => index + 1)
                        .filter((qty) => qty >= fromQty)
                        .map((qty) => (
                          <option key={`${job.id}-to-${qty}`} value={qty}>
                            Q{qty}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="bulk-assignment-select">
                    <span>Operators</span>
                    <MultiSelectOperators
                      selectedOperators={operatorSelected}
                      availableOperators={operatorUsers}
                      onChange={(nextValue) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [String(job.id)]: {
                            ...prev[String(job.id)],
                            operators: nextValue,
                          },
                        }))
                      }
                      placeholder="Select operators"
                      className="operator-assigned-dropdown bulk-assignment-multi"
                      compact={operatorSelected.length > 1}
                      showUnassign={true}
                      selfToggleOnly={false}
                    />
                  </div>

                  <div className="bulk-assignment-select">
                    <span>Machines</span>
                    <MultiSelectOperators
                      selectedOperators={machineSelected.map((machine) => formatMachineLabel(machine))}
                      availableOperators={machineSelectOptions}
                      onChange={(nextValue) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [String(job.id)]: {
                            ...prev[String(job.id)],
                            machineNumbers: nextValue.map((machine) => toMachineIndex(machine)).filter(Boolean),
                          },
                        }))
                      }
                      placeholder="Select machines"
                      className="operator-assigned-dropdown bulk-assignment-multi bulk-assignment-machine"
                      compact={machineSelected.length > 1}
                      showUnassign={true}
                      selfToggleOnly={false}
                    />
                  </div>
                </div>

                <div className="bulk-assignment-footer">
                  <span>
                    Will assign {fromQty === toQty ? `Q${fromQty}` : `Q${fromQty}-Q${toQty}`}
                  </span>
                  <strong>
                    {operatorSelected.length > 0 ? operatorSelected.join(", ") : "No operators selected"}{" "}
                    {machineSelected.length > 0 ? `| ${machineSelected.map((machine) => formatMachineLabel(machine)).join(", ")}` : ""}
                  </strong>
                </div>
              </section>
            );
          })}
        </div>

        <div className="bulk-assignment-actions">
          <button type="button" className="bulk-assignment-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="bulk-assignment-primary"
            disabled={!hasAnyAssignment || isSubmitting}
            onClick={() => void onConfirm(payload)}
          >
            {isSubmitting ? "Applying..." : "Apply Selected Jobs"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export type { BulkAssignmentPayloadItem };
export default BulkAssignmentModal;
