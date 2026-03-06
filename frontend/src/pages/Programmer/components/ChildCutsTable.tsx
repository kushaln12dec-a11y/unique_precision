import React, { useMemo, useState } from "react";
import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM } from "../../../utils/date";
import ActionButtons from "./ActionButtons";
import JobDetailsModal from "./JobDetailsModal";
import { getRowClassName } from "../utils/priorityUtils";
import { getUserRoleFromToken } from "../../../utils/auth";
import { MultiSelectOperators } from "../../Operator/components/MultiSelectOperators";
import { getQaProgressCounts } from "../../Operator/utils/qaProgress";
import { estimatedTimeFromAmount, toYN } from "../../../utils/jobFormatting";

type ChildCutsTableProps = {
  entries: JobEntry[];
  onEdit?: (groupId: number) => void;
  onDelete?: (groupId: number, customer: string) => void;
  onImage?: (groupId: number, cutId?: number) => void;
  onAssignChange?: (jobId: number | string, value: string) => void;
  onMachineNumberChange?: (jobId: number | string, value: string) => void;
  operatorUsers?: Array<{ id: number | string; name: string }>;
  isOperator?: boolean;
  isAdmin?: boolean;
  disableImageButton?: boolean;
  showCheckboxes?: boolean;
  selectedRows?: Set<string | number>;
  onRowSelect?: (rowKey: string | number, selected: boolean) => void;
  getRowKey?: (entry: JobEntry, index: number) => string | number;
};

const ChildCutsTable: React.FC<ChildCutsTableProps> = ({
  entries,
  onEdit,
  onDelete,
  onImage,
  onAssignChange,
  onMachineNumberChange,
  operatorUsers = [],
  isOperator = false,
  isAdmin = false,
  disableImageButton = false,
  showCheckboxes = false,
  selectedRows = new Set(),
  onRowSelect,
  getRowKey = (entry, index) => entry.id || index,
}) => {
  const getMachineNumber = (entry: JobEntry): string => {
    const direct = String((entry as any).machineNumber || "").trim();
    if (direct) return direct;
    const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
    const latest = captures[captures.length - 1];
    const captureMachine = String(latest?.machineNumber || "").trim();
    return ["1", "2", "3", "4", "5", "6"].includes(captureMachine) ? captureMachine : "";
  };

  const [selectedCut, setSelectedCut] = useState<JobEntry | null>(null);
  const [showCutModal, setShowCutModal] = useState(false);
  const [localSelectedRows, setLocalSelectedRows] = useState<Set<string | number>>(new Set());
  const canAssign = getUserRoleFromToken() === "ADMIN" || getUserRoleFromToken() === "OPERATOR";
  const isExternallyControlledSelection = typeof onRowSelect === "function";

  const effectiveSelectedRows = isExternallyControlledSelection ? selectedRows : localSelectedRows;
  const entryRowKeys = useMemo(() => entries.map((entry, idx) => getRowKey(entry, idx)), [entries, getRowKey]);
  const selectedInThisTableCount = useMemo(
    () => entryRowKeys.filter((rowKey) => effectiveSelectedRows.has(rowKey)).length,
    [entryRowKeys, effectiveSelectedRows]
  );

  const handleRowSelect = (rowKey: string | number, selected: boolean) => {
    if (isExternallyControlledSelection) {
      onRowSelect?.(rowKey, selected);
      return;
    }

    setLocalSelectedRows((prev) => {
      const next = new Set(prev);
      if (selected) next.add(rowKey);
      else next.delete(rowKey);
      return next;
    });
  };

  const handleViewCut = (entry: JobEntry) => {
    setSelectedCut(entry);
    setShowCutModal(true);
  };

  const handleEdit = (entry: JobEntry) => {
    if (onEdit) onEdit(entry.groupId);
  };

  const handleDelete = (entry: JobEntry) => {
    if (onDelete) onDelete(entry.groupId, entry.customer || "entry");
  };

  return (
    <>
      <table className="child-jobs-table">
        <thead>
          <tr className="child-table-header">
            {showCheckboxes && (
              <th className="checkbox-header-cell" style={{ width: "40px" }}>
                <input
                  type="checkbox"
                  checked={selectedInThisTableCount > 0 && selectedInThisTableCount === entries.length && entries.length > 0}
                  onChange={(e) => {
                    entries.forEach((entry, idx) => {
                      const rowKey = getRowKey(entry, idx);
                      handleRowSelect(rowKey, e.target.checked);
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            )}
            {!showCheckboxes && <th className="child-table-spacer checkbox-spacer"></th>}
            <th className="setting-number-col">
              <span className="th-content">Set #</span>
            </th>
            <th className="customer-col">
              <span className="th-content">Customer</span>
            </th>
            <th className="description-col">
              <span className="th-content">Desc</span>
            </th>
            <th className="program-ref-file-col">
              <span className="th-content">
                Program Ref
                <br />
                File Name
              </span>
            </th>
            <th className="cut-col">
              <span className="th-content">Cut (MM)</span>
            </th>
            <th className="th-col">
              <span className="th-content">TH (MM)</span>
            </th>
            <th className="pass-col">
              <span className="th-content">Pass</span>
            </th>
            <th className="setting-col">
              <span className="th-content">Set</span>
            </th>
            <th className="qty-col">
              <span className="th-content">Qty</span>
            </th>
            <th className="sedm-col">SEDM</th>
            {isOperator && <th className="assigned-col">Operator</th>}
            {isOperator && <th className="mach-col">Mach #</th>}
            {!isOperator && (
              <th className="total-hrs-col">
                <span className="th-content">
                  Cut Length
                  <br />
                  Hrs
                </span>
              </th>
            )}
            <th className="estimated-time-col">
              <span className="th-content">
                Estimated
                <br />
                Time
              </span>
            </th>
            {isAdmin && (
              <th className="total-amount-col">
                <span className="th-content">Amount</span>
              </th>
            )}
            {isOperator && <th className="status-col">Status</th>}
            <th className="act-col">Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const rowKey = getRowKey(entry, index);
            const isSelected = effectiveSelectedRows.has(rowKey);
            const childFlagClass = getRowClassName([entry], false, true);
            const childStageClass = (() => {
              if (!isOperator) return "";
              const qty = Math.max(1, Number(entry.qty || 1));
              const c = getQaProgressCounts(entry, qty);
              const logged = c.saved + c.ready;
              const maxCount = Math.max(logged, c.sent, c.empty);
              if (c.sent === maxCount) return "operator-stage-row-dispatched";
              if (logged === maxCount) return "operator-stage-row-logged";
              return "operator-stage-row-not-started";
            })();
            return (
              <tr key={entry.id} className={`${childFlagClass} ${childStageClass}`.trim()}>
                {showCheckboxes ? (
                  <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRowSelect(rowKey, e.target.checked);
                      }}
                    />
                  </td>
                ) : (
                  <td className="child-table-spacer checkbox-spacer"></td>
                )}
                <td className="setting-number-col">{index + 1}</td>
              <td className="customer-col">{entry.customer || "-"}</td>
              <td className="description-col" title={entry.description || "-"}>
                <div className="description-marquee">
                  <span>{entry.description || "-"}</span>
                </div>
              </td>
              <td className="program-ref-file-col" title={(entry as any).programRefFile || (entry as any).programRefFileName || "-"}>
                <div className="description-marquee">
                  <span>{String((entry as any).programRefFile || (entry as any).programRefFileName || "-")}</span>
                </div>
              </td>
              <td className="cut-col">{Math.round(Number(entry.cut || 0))}</td>
              <td className="th-col">{Math.round(Number(entry.thickness || 0))}</td>
              <td className="pass-col">{entry.passLevel}</td>
              <td className="setting-col">{entry.setting}</td>
              <td className="qty-col">{Number(entry.qty || 0).toString()}</td>
              <td className="sedm-col">
                {(() => {
                  const sedm = toYN(entry.sedm);
                  const sedmClass = sedm === "Y" ? "sedm-badge yes" : sedm === "N" ? "sedm-badge no" : "sedm-badge";
                  return <span className={sedmClass}>{sedm}</span>;
                })()}
              </td>
              {isOperator && (
                <td className="assigned-col">
                  {canAssign && onAssignChange && operatorUsers.length > 0 ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <MultiSelectOperators
                        selectedOperators={
                          entry.assignedTo && entry.assignedTo !== "Unassigned"
                            ? (() => {
                                const operators = Array.isArray(entry.assignedTo)
                                  ? entry.assignedTo
                                  : entry.assignedTo.split(",").map((name) => name.trim()).filter(Boolean);
                                return [...new Set(operators)];
                              })()
                            : []
                        }
                        availableOperators={operatorUsers}
                        className="operator-assigned-dropdown"
                        onChange={(operators) => {
                          const uniqueOperators = [...new Set(operators)];
                          const value = uniqueOperators.length > 0 ? uniqueOperators.join(", ") : "Unassigned";
                          onAssignChange(entry.id, value);
                        }}
                        placeholder="Unassigned"
                        compact={true}
                      />
                    </div>
                  ) : (
                    <div className="assigned-operators-readonly">
                      {entry.assignedTo && entry.assignedTo !== "Unassigned" ? (
                        (() => {
                          const assignedOps = Array.isArray(entry.assignedTo)
                            ? entry.assignedTo
                            : entry.assignedTo.split(", ").filter(Boolean);
                          return assignedOps.length > 1 ? (
                            <span className="compact-display-readonly" title={assignedOps.join(", ")}>
                              {assignedOps[0]}+{assignedOps.length - 1}
                            </span>
                          ) : (
                            <span className="operator-badge-readonly">{assignedOps[0]}</span>
                          );
                        })()
                      ) : (
                        <span className="unassigned-text">-</span>
                      )}
                    </div>
                  )}
                </td>
              )}
              {isOperator && (
                <td className="mach-col">
                  <select
                    className="operator-machine-input"
                    value={getMachineNumber(entry)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      onMachineNumberChange?.(entry.id, nextValue);
                    }}
                  >
                    <option value="">Select</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </td>
              )}
              {!isOperator && (
                <td className="total-hrs-col">
                  {entry.totalHrs
                    ? formatHoursToHHMM((Number(entry.totalHrs || 0) || 0) * Math.max(1, Number(entry.qty || 1)))
                    : "-"}
                </td>
              )}
              <td className="estimated-time-col">{estimatedTimeFromAmount(entry.totalAmount || 0)}</td>
              {isAdmin && <td className="total-amount-col">{entry.totalAmount ? `Rs. ${Math.round(entry.totalAmount)}` : "-"}</td>}
              {isOperator && (
                <td className="status-col">
                  {(() => {
                    const qty = Math.max(1, Number(entry.qty || 1));
                    const c = getQaProgressCounts(entry, qty);
                    return (
                      <div className="child-stage-summary">
                        <span className="qa-mini empty">Pending {c.empty}</span>
                        <span className="qa-mini saved">Logged {c.saved + c.ready}</span>
                        <span className="qa-mini sent">QA {c.sent}</span>
                      </div>
                    );
                  })()}
                </td>
              )}
              <td className="act-col">
                <ActionButtons
                  onView={() => handleViewCut(entry)}
                  onEdit={!isOperator && onEdit ? () => handleEdit(entry) : undefined}
                  onImage={isOperator && onImage ? () => onImage(entry.groupId, entry.id as number) : undefined}
                  onDelete={onDelete ? () => handleDelete(entry) : undefined}
                  viewLabel={`View cut ${index + 1} details`}
                  editLabel={`Edit cut ${index + 1}`}
                  imageLabel={`Image Input cut ${index + 1}`}
                  deleteLabel={`Delete cut ${index + 1}`}
                  isChildTable={true}
                  isOperator={isOperator}
                  disableImageButton={disableImageButton}
                />
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {showCutModal && selectedCut && (
        <JobDetailsModal
          job={null}
          cut={selectedCut}
          cutIndex={entries.findIndex((e) => e.id === selectedCut.id) + 1}
          onClose={() => {
            setShowCutModal(false);
            setSelectedCut(null);
          }}
        />
      )}
    </>
  );
};

export default ChildCutsTable;
