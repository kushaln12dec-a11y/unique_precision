import React, { useMemo, useState } from "react";
import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM } from "../../../utils/date";
import ActionButtons from "./ActionButtons";
import JobDetailsModal from "./JobDetailsModal";
import { getRowClassName } from "../utils/priorityUtils";
import { getUserRoleFromToken } from "../../../utils/auth";
import { MultiSelectOperators } from "../../Operator/components/MultiSelectOperators";
import { getQaProgressCounts } from "../../Operator/utils/qaProgress";

type ChildCutsTableProps = {
  entries: JobEntry[];
  onEdit?: (groupId: number) => void;
  onDelete?: (groupId: number, customer: string) => void;
  onImage?: (groupId: number, cutId?: number) => void;
  onAssignChange?: (jobId: number | string, value: string) => void;
  operatorUsers?: Array<{ id: number | string; name: string }>;
  isOperator?: boolean;
  isAdmin?: boolean;
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
  operatorUsers = [],
  isOperator = false,
  isAdmin = false,
  showCheckboxes = false,
  selectedRows = new Set(),
  onRowSelect,
  getRowKey = (entry, index) => entry.id || index,
}) => {
  const truncateDescription = (value: string | undefined | null): string => {
    const text = (value || "-").trim();
    if (text === "-") return text;
    return text.length > 12 ? `${text.slice(0, 12)}...` : text;
  };

  const toYN = (value: unknown): string => {
    if (typeof value === "boolean") return value ? "Y" : "N";
    const text = String(value || "").trim().toLowerCase();
    if (text === "yes" || text === "y" || text === "true") return "Y";
    if (text === "no" || text === "n" || text === "false") return "N";
    return String(value || "-");
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
            <th className="rate-col">
              <span className="th-content">Rate</span>
            </th>
            <th className="description-col">
              <span className="th-content">Desc</span>
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
            <th className="complex-col">Cplx</th>
            <th className="pip-col">PIP</th>
            {isOperator && <th className="assigned-col">Assigned</th>}
            <th className="total-hrs-col">
              <span className="th-content">
                Hrs
                <br />
                /Piece
              </span>
            </th>
            {isAdmin && (
              <th className="total-amount-col">
                <span className="th-content">Amount</span>
              </th>
            )}
            {isOperator && <th className="status-col">Status</th>}
            <th className="act-col">Act</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const rowKey = getRowKey(entry, index);
            const isSelected = effectiveSelectedRows.has(rowKey);
            return (
              <tr key={entry.id} className={getRowClassName([entry], false, true)}>
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
              <td className="rate-col">₹{Math.round(Number(entry.rate || 0))}</td>
              <td className="description-col" title={entry.description || "-"}>{truncateDescription(entry.description)}</td>
              <td className="cut-col">{Math.round(Number(entry.cut || 0))}</td>
              <td className="th-col">{Math.round(Number(entry.thickness || 0))}</td>
              <td className="pass-col">{entry.passLevel}</td>
              <td className="setting-col">{entry.setting}</td>
              <td className="qty-col">{Number(entry.qty || 0).toString()}</td>
              <td className="sedm-col">{toYN(entry.sedm)}</td>
              <td className="complex-col">{toYN(entry.critical)}</td>
              <td className="pip-col">{toYN(entry.pipFinish)}</td>
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
              <td className="total-hrs-col">{entry.totalHrs ? formatHoursToHHMM(entry.totalHrs) : "-"}</td>
              {isAdmin && <td className="total-amount-col">{entry.totalAmount ? `₹${Math.round(entry.totalAmount)}` : "-"}</td>}
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
