import React, { useState } from "react";
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
}) => {
  const truncateDescription = (value: string | undefined | null): string => {
    const text = (value || "-").trim();
    if (text === "-") return text;
    return text.length > 7 ? `${text.slice(0, 7)}...` : text;
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
  const canAssign = getUserRoleFromToken() === "ADMIN" || getUserRoleFromToken() === "OPERATOR";

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
            <th>Setting #</th>
            <th>Customer</th>
            <th>Rate (₹/hr)</th>
            <th>Description</th>
            <th>Cut (mm)</th>
            <th>TH (MM)</th>
            <th>Pass</th>
            <th>Setting</th>
            <th>Qty</th>
            <th>SEDM</th>
            <th>Complex</th>
            <th>PIP Finish</th>
            {isOperator && <th>Assigned To</th>}
            <th>
              Total
              <br />
              Hrs/Piece
            </th>
            {isAdmin && <th>Total Amount (₹)</th>}
            {isOperator && <th>Status</th>}
            <th>Act</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id} className={getRowClassName([entry], false, true)}>
              <td>{index + 1}</td>
              <td>{entry.customer || "-"}</td>
              <td>₹{Number(entry.rate || 0).toFixed(2)}</td>
              <td title={entry.description || "-"}>{truncateDescription(entry.description)}</td>
              <td>{Number(entry.cut || 0).toFixed(2)}</td>
              <td>{Number(entry.thickness || 0).toFixed(2)}</td>
              <td>{entry.passLevel}</td>
              <td>{entry.setting}</td>
              <td>{Number(entry.qty || 0).toString()}</td>
              <td>{toYN(entry.sedm)}</td>
              <td>{toYN(entry.critical)}</td>
              <td>{toYN(entry.pipFinish)}</td>
              {isOperator && (
                <td>
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
              <td>{entry.totalHrs ? formatHoursToHHMM(entry.totalHrs) : "-"}</td>
              {isAdmin && <td>{entry.totalAmount ? `₹${entry.totalAmount.toFixed(2)}` : "-"}</td>}
              {isOperator && (
                <td>
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
              <td>
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
          ))}
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
