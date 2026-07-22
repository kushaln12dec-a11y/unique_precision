import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/Modal";
import type { JobEntry } from "../../../types/job";
import { formatJobRefDisplay, formatMachineLabel, toMachineIndex } from "../../../utils/jobFormatting";
import SelectDropdown from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "./MultiSelectOperators";
import { parseAssignedOperators } from "../utils/operatorViewPageHelpers";
import "./BulkAssignmentModal.css";

type BulkAssignmentPayloadItem = {
  jobId: string;
  fromQty: number;
  toQty: number;
  operators: string[];
  machineNumber: string;
};

type DraftRowState = {
  quantityNumber: number;
  operators: string[];
  machineNumber: string;
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

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

const dedupeStable = (values: string[]) =>
  Array.from(
    new Map(
      values
        .map((value) => normalizeOperatorName(value))
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value] as const)
    ).values()
  ).sort((left, right) => left.localeCompare(right));

const parseMachineNumbers = (value: unknown) =>
  dedupeStable(
    String(value || "")
      .split(",")
      .map((entry) => toMachineIndex(entry.trim()))
      .filter(Boolean)
  );

const getCaptureRangeForQuantity = (captures: any[], quantityNumber: number) =>
  captures.find((capture) => {
    const fromQty = Math.max(1, Number(capture?.fromQty || 1));
    const toQty = Math.max(fromQty, Number(capture?.toQty || fromQty));
    return quantityNumber >= fromQty && quantityNumber <= toQty;
  });

const getDefaultOperators = (job: JobEntry, quantityNumber: number) => {
  const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
  const capture = getCaptureRangeForQuantity(captures, quantityNumber);
  const source = capture?.opsName || job.opsName || job.assignedTo || "";
  return dedupeStable(Array.isArray(source) ? source : parseAssignedOperators(source));
};

const getDefaultMachineNumber = (job: JobEntry, quantityNumber: number) => {
  const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
  const capture = getCaptureRangeForQuantity(captures, quantityNumber);
  const source = capture?.machineNumber || job.machineNumber || "";
  return parseMachineNumbers(source)[0] || "";
};

const buildInitialDraftRows = (job: JobEntry): DraftRowState[] => {
  const totalQty = Math.max(1, Number(job.qty || 1));
  return Array.from({ length: totalQty }, (_, index) => {
    const quantityNumber = index + 1;
    return {
      quantityNumber,
      operators: getDefaultOperators(job, quantityNumber),
      machineNumber: getDefaultMachineNumber(job, quantityNumber),
    };
  });
};

const BulkAssignmentModal = ({
  isOpen,
  jobs,
  operatorUsers,
  machineOptions,
  isSubmitting = false,
  onClose,
  onConfirm,
}: BulkAssignmentModalProps) => {
  const [drafts, setDrafts] = useState<Record<string, DraftRowState[]>>({});

  useEffect(() => {
    if (!isOpen) return;
    const nextDrafts: Record<string, DraftRowState[]> = {};
    jobs.forEach((job) => {
      nextDrafts[String(job.id)] = buildInitialDraftRows(job);
    });
    setDrafts(nextDrafts);
  }, [isOpen, jobs]);

  const machineSelectOptions = useMemo(
    () => machineOptions.map((machine) => ({ id: machine, name: formatMachineLabel(machine) })),
    [machineOptions]
  );

  const payload = useMemo<BulkAssignmentPayloadItem[]>(
    () =>
      jobs.flatMap((job) =>
          (drafts[String(job.id)] || []).map((row) => ({
          jobId: String(job.id),
          fromQty: row.quantityNumber,
          toQty: row.quantityNumber,
          operators: row.operators,
          machineNumber: row.machineNumber,
        }))
      ),
    [drafts, jobs]
  );

  const totalSelectedQuantities = payload.length;
  const completeRows = payload.filter((row) => row.operators.length > 0 && Boolean(String(row.machineNumber || "").trim()));
  const hasCompleteAssignments = completeRows.length === totalSelectedQuantities && totalSelectedQuantities > 0;

  const updateRow = (jobId: string, quantityNumber: number, updater: (row: DraftRowState) => DraftRowState) => {
    setDrafts((prev) => ({
      ...prev,
      [jobId]: (prev[jobId] || []).map((row) => (row.quantityNumber === quantityNumber ? updater(row) : row)),
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Assign Selected Jobs"
      size="medium"
      className="bulk-assignment-modal"
    >
      <div className="bulk-assignment-shell">
        <div className="bulk-assignment-hero">
          <div className="bulk-assignment-summary">
            <span>{jobs.length} job(s) selected</span>
            <strong>{totalSelectedQuantities} qty rows</strong>
          </div>
        </div>

        <div className="bulk-assignment-list">
          {jobs.map((job) => {
            const rows = drafts[String(job.id)] || buildInitialDraftRows(job);
            const jobRef = formatJobRefDisplay(job.refNumber || job.id);
            const totalQty = Math.max(1, Number(job.qty || 1));

            return (
              <section key={String(job.id)} className="bulk-assignment-card">
                <div className="bulk-assignment-card-head">
                  <div>
                    <div className="bulk-assignment-card-title-row">
                      <span className="bulk-assignment-job-ref">Job Ref {jobRef || "-"}</span>
                      <span className="bulk-assignment-qty-pill">{totalQty} qty</span>
                    </div>
                    <p>
                      {job.customer || "Unnamed Job"}{" "}
                      <span className="bulk-assignment-card-desc">{job.description || "No description"}</span>
                    </p>
                  </div>
                  <div className="bulk-assignment-card-meta">
                    <span>Selected job</span>
                    <strong>{jobRef || "-"}</strong>
                  </div>
                </div>

                <div className="bulk-assignment-quantity-list">
                  {rows.map((row) => {
                    const quantityLabel = `Q${row.quantityNumber}`;
                    return (
                      <div key={`${job.id}-${row.quantityNumber}`} className="bulk-assignment-quantity-card">
                        <div className="bulk-assignment-quantity-head">
                          <div className="bulk-assignment-quantity-title">
                            <span className="bulk-assignment-quantity-pill">{quantityLabel}</span>
                            <span className="bulk-assignment-quantity-caption">Assign one machine and operator set</span>
                          </div>
                          <button
                            type="button"
                            className="bulk-assignment-clear-row"
                              onClick={() =>
                              updateRow(String(job.id), row.quantityNumber, (current) => ({
                                ...current,
                                operators: [],
                                machineNumber: "",
                              }))
                            }
                            disabled={isSubmitting}
                          >
                            Clear
                          </button>
                        </div>

                        <div className="bulk-assignment-grid">
                          <div className="bulk-assignment-select">
                            <span>Operators</span>
                            <MultiSelectOperators
                              selectedOperators={row.operators}
                              availableOperators={operatorUsers}
                              onChange={(nextValue) =>
                                updateRow(String(job.id), row.quantityNumber, (current) => ({
                                  ...current,
                                  operators: nextValue,
                                }))
                              }
                              placeholder="Select operators"
                              className="operator-assigned-dropdown bulk-assignment-multi"
                              compact={row.operators.length > 1}
                              showUnassign={true}
                              selfToggleOnly={false}
                            />
                          </div>

                          <div className="bulk-assignment-select">
                            <span>Machine</span>
                            <div className="bulk-assignment-machine-panel">
                              <SelectDropdown
                                value={String(row.machineNumber || "").trim()}
                                onChange={(nextValue) =>
                                  updateRow(String(job.id), row.quantityNumber, (current) => ({
                                    ...current,
                                    machineNumber: toMachineIndex(nextValue),
                                  }))
                                }
                                options={machineSelectOptions.map((machine) => ({ label: machine.name, value: machine.id }))}
                                placeholder="Select machine"
                                align="left"
                                className="bulk-assignment-machine-select"
                                menuMinWidth={160}
                                disabled={isSubmitting}
                              />
                              <p className="bulk-assignment-machine-note">Only one machine can be assigned to a quantity.</p>
                            </div>
                          </div>
                        </div>

                        <div className="bulk-assignment-footer">
                          <span>{quantityLabel}</span>
                          <strong>
                            {row.operators.length > 0 ? row.operators.join(", ") : "No operators selected"}
                            {row.machineNumber ? ` | ${formatMachineLabel(row.machineNumber)}` : ""}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
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
            disabled={!hasCompleteAssignments || isSubmitting}
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
