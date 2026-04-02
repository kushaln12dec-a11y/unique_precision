import { useMemo, useState } from "react";
import type { JobEntry } from "../../../types/job";
import JobDetailsModal from "./JobDetailsModal";
import { getRowClassName } from "../utils/priorityUtils";
import { getUserRoleFromToken } from "../../../utils/auth";
import { getDominantQaStageClass, getQaProgressCounts } from "../../Operator/utils/qaProgress";
import { MACHINE_OPTIONS, toMachineIndex } from "../../../utils/jobFormatting";
import ChildCutsTableHeader from "./ChildCutsTableHeader";
import ChildCutsTableRow from "./ChildCutsTableRow";
import { getSelectedCutAsParentViewJob } from "../utils/childCutsTableUtils";

type ChildCutsTableProps = {
  entries: JobEntry[];
  parentSetting?: string;
  showSetNumberColumn?: boolean;
  onEdit?: (groupId: string) => void;
  onDelete?: (groupId: string, customer: string) => void;
  onImage?: (groupId: string, cutId?: string | number) => void;
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
  machineOptions?: string[];
  onViewJob?: (entry: JobEntry) => void;
};

const ChildCutsTable = ({
  entries,
  parentSetting = "",
  showSetNumberColumn = false,
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
  machineOptions = [...MACHINE_OPTIONS],
  onViewJob,
}: ChildCutsTableProps) => {
  const machineDropdownOptions = useMemo(() => {
    const normalized = machineOptions.map((value) => toMachineIndex(value)).filter(Boolean);
    return normalized.length > 0 ? normalized : [...MACHINE_OPTIONS];
  }, [machineOptions]);
  const [selectedCut, setSelectedCut] = useState<JobEntry | null>(null);
  const [showCutModal, setShowCutModal] = useState(false);
  const [localSelectedRows, setLocalSelectedRows] = useState<Set<string | number>>(new Set());
  const canAssign = getUserRoleFromToken() === "ADMIN" || getUserRoleFromToken() === "OPERATOR";
  const isExternallyControlledSelection = typeof onRowSelect === "function";
  const effectiveSelectedRows = isExternallyControlledSelection ? selectedRows : localSelectedRows;
  const entryRowKeys = useMemo(() => entries.map((entry, idx) => getRowKey(entry, idx)), [entries, getRowKey]);
  const selectedInThisTableCount = useMemo(() => entryRowKeys.filter((rowKey) => effectiveSelectedRows.has(rowKey)).length, [entryRowKeys, effectiveSelectedRows]);

  const handleRowSelect = (rowKey: string | number, selected: boolean) => {
    if (isExternallyControlledSelection) return onRowSelect?.(rowKey, selected);
    setLocalSelectedRows((prev) => {
      const next = new Set(prev);
      if (selected) next.add(rowKey);
      else next.delete(rowKey);
      return next;
    });
  };

  const getMachineNumber = (entry: JobEntry): string => {
    const direct = String((entry as any).machineNumber || "").trim();
    if (direct) return toMachineIndex(direct);
    const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
    return toMachineIndex(String(captures[captures.length - 1]?.machineNumber || "").trim());
  };

  return (
    <>
      <table className="child-jobs-table">
        <ChildCutsTableHeader
          entries={entries}
          showCheckboxes={showCheckboxes}
          showSetNumberColumn={showSetNumberColumn}
          selectedInThisTableCount={selectedInThisTableCount}
          onToggleAll={(selected) => entries.forEach((entry, idx) => handleRowSelect(getRowKey(entry, idx), selected))}
          isOperator={isOperator}
          isAdmin={isAdmin}
        />
        <tbody>
          {entries.map((entry, index) => {
            const rowKey = getRowKey(entry, index);
            const counts = getQaProgressCounts(entry, Math.max(1, Number(entry.qty || 1)));
            const stageClass = !isOperator ? "" : getDominantQaStageClass(counts);
            return (
              <ChildCutsTableRow
                key={String(rowKey)}
                entry={entry}
                index={index}
                rowKey={rowKey}
                isSelected={effectiveSelectedRows.has(rowKey)}
                rowClassName={`${getRowClassName([entry], false, true)} ${stageClass}`.trim()}
                showCheckboxes={showCheckboxes}
                showSetNumberColumn={showSetNumberColumn}
                parentSetting={parentSetting}
                isOperator={isOperator}
                isAdmin={isAdmin}
                canAssign={canAssign}
                machineDropdownOptions={machineDropdownOptions}
                getMachineNumber={getMachineNumber}
                operatorUsers={operatorUsers}
                onRowSelect={(selected) => handleRowSelect(rowKey, selected)}
                onAssignChange={onAssignChange}
                onMachineNumberChange={onMachineNumberChange}
                onView={() => {
                  if (onViewJob) return onViewJob(entry);
                  setSelectedCut(entry);
                  setShowCutModal(true);
                }}
                onEdit={!isOperator && onEdit ? () => onEdit(String(entry.groupId)) : undefined}
                onDelete={onDelete ? () => onDelete(String(entry.groupId), entry.customer || "entry") : undefined}
                onImage={isOperator && onImage ? () => onImage(String(entry.groupId), entry.id) : undefined}
                disableImageButton={disableImageButton}
              />
            );
          })}
        </tbody>
      </table>
      {showCutModal && selectedCut && (
        <JobDetailsModal
          job={getSelectedCutAsParentViewJob(selectedCut)}
          userRole={getUserRoleFromToken()}
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
