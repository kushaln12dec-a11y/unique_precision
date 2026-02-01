import React, { useState } from "react";
import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM } from "../../../utils/date";
import ActionButtons from "./ActionButtons";
import JobDetailsModal from "./JobDetailsModal";
import { getRowClassName } from "../utils/priorityUtils";
import { getUserRoleFromToken } from "../../../utils/auth";
import { updateOperatorJob } from "../../../services/operatorApi";

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
  isOperator = false 
}) => {
  const [selectedCut, setSelectedCut] = useState<JobEntry | null>(null);
  const [showCutModal, setShowCutModal] = useState(false);
  const canAssign = getUserRoleFromToken() === "ADMIN" || getUserRoleFromToken() === "OPERATOR";

  const handleViewCut = (entry: JobEntry) => {
    setSelectedCut(entry);
    setShowCutModal(true);
  };

  const handleEdit = (entry: JobEntry) => {
    if (onEdit) {
      onEdit(entry.groupId);
    }
  };

  const handleDelete = (entry: JobEntry) => {
    if (onDelete) {
      onDelete(entry.groupId, entry.customer || "entry");
    }
  };


  return (
    <>
      <table className="child-jobs-table">
        <thead>
          <tr className="child-table-header">
            <th>Cut #</th>
            <th>Customer</th>
            <th>Rate (₹/hr)</th>
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
            <th>Total Amount (₹)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.id} className={getRowClassName([entry], false, true)}>
              <td>{index + 1}</td>
              <td>{entry.customer || "—"}</td>
              <td>₹{Number(entry.rate || 0).toFixed(2)}</td>
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
                  <select
                    value={entry.assignedTo || "Unassigned"}
                    onChange={(e) => {
                      e.stopPropagation();
                      onAssignChange(entry.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="child-assigned-to-select"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {operatorUsers.map((user) => (
                      <option key={user.id} value={user.name}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  entry.assignedTo || "—"
                )}
              </td>
              <td>
                {entry.totalHrs ? formatHoursToHHMM(entry.totalHrs) : "—"}
              </td>
              <td>
                {entry.totalAmount ? `₹${entry.totalAmount.toFixed(2)}` : "—"}
              </td>
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
