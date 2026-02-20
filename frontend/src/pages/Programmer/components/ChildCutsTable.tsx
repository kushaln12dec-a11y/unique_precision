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
};

const ChildCutsTable: React.FC<ChildCutsTableProps> = ({
  entries,
  onEdit,
  onDelete,
  onImage,
  onAssignChange,
  operatorUsers = [],
  isOperator = false,
}) => {
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
      {isOperator && (
        <div className="child-stage-legend">
          <span className="child-stage-title">Stage Legend:</span>
          <span className="qa-mini saved">Operation Logged</span>
          <span className="qa-mini ready">Inspection Ready</span>
          <span className="qa-mini sent">QA Dispatched</span>
          <span className="qa-mini empty">Pending Input</span>
        </div>
      )}

      <table className="child-jobs-table">
        <thead>
          <tr className="child-table-header">
            <th>Setting #</th>
            <th>Customer</th>
            <th>Rate (Rs/hr)</th>
            <th>Description</th>
            <th>Cut (mm)</th>
            <th>TH (MM)</th>
            <th>Pass</th>
            <th>Setting</th>
            <th>Qty</th>
            <th>SEDM</th>
            <th>Complex</th>
            <th>PIP Finish</th>
            <th>Assigned To</th>
            <th>Total Hrs/Piece</th>
            <th>Total Amount (Rs)</th>
            {isOperator && <th>Production Stage</th>}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id} className={getRowClassName([entry], false, true)}>
              <td>{index + 1}</td>
              <td>{entry.customer || "-"}</td>
              <td>Rs{Number(entry.rate || 0).toFixed(2)}</td>
              <td>{entry.description || "-"}</td>
              <td>{Number(entry.cut || 0).toFixed(2)}</td>
              <td>{Number(entry.thickness || 0).toFixed(2)}</td>
              <td>{entry.passLevel}</td>
              <td>{entry.setting}</td>
              <td>{Number(entry.qty || 0).toString()}</td>
              <td>{entry.sedm}</td>
              <td>{entry.critical ? "Yes" : "No"}</td>
              <td>{entry.pipFinish ? "Yes" : "No"}</td>
              <td>
                {isOperator && canAssign && onAssignChange && operatorUsers.length > 0 ? (
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
              <td>{entry.totalHrs ? formatHoursToHHMM(entry.totalHrs) : "-"}</td>
              <td>{entry.totalAmount ? `Rs${entry.totalAmount.toFixed(2)}` : "-"}</td>
              {isOperator && (
                <td>
                  {(() => {
                    const qty = Math.max(1, Number(entry.qty || 1));
                    const c = getQaProgressCounts(entry, qty);
                    return (
                      <div className="child-stage-summary">
                        <span className="qa-mini saved">Logged {c.saved}</span>
                        <span className="qa-mini ready">Ready {c.ready}</span>
                        <span className="qa-mini sent">QA {c.sent}</span>
                        <span className="qa-mini empty">Pending {c.empty}</span>
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
