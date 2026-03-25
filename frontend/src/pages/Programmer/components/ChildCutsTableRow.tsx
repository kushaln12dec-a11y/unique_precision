import ActionButtons from "./ActionButtons";
import type { JobEntry } from "../../../types/job";
import { getQaProgressCounts } from "../../Operator/utils/qaProgress";
import { MultiSelectOperators } from "../../Operator/components/MultiSelectOperators";
import { estimatedTimeFromAmount, formatMachineLabel, toYN } from "../../../utils/jobFormatting";
import { getThicknessDisplayValue } from "../programmerUtils";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import { buildStatusBadges, getParentSerialPrefix, isUnassignedValue, renderBadgeTicker, toAlphabetSuffix } from "../utils/childCutsTableUtils";

type ChildCutsTableRowProps = {
  entry: JobEntry;
  index: number;
  rowKey: string | number;
  isSelected: boolean;
  rowClassName: string;
  showCheckboxes: boolean;
  showSetNumberColumn: boolean;
  parentSetting: string;
  isOperator: boolean;
  isAdmin: boolean;
  canAssign: boolean;
  machineDropdownOptions: string[];
  getMachineNumber: (entry: JobEntry) => string;
  operatorUsers: Array<{ id: number | string; name: string }>;
  onRowSelect: (selected: boolean) => void;
  onAssignChange?: (jobId: number | string, value: string) => void;
  onMachineNumberChange?: (jobId: number | string, value: string) => void;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onImage?: () => void;
  disableImageButton: boolean;
};

const ChildCutsTableRow = ({
  entry,
  index,
  rowKey,
  isSelected,
  rowClassName,
  showCheckboxes,
  showSetNumberColumn,
  parentSetting,
  isOperator,
  isAdmin,
  canAssign,
  machineDropdownOptions,
  getMachineNumber,
  operatorUsers,
  onRowSelect,
  onAssignChange,
  onMachineNumberChange,
  onView,
  onEdit,
  onDelete,
  onImage,
  disableImageButton,
}: ChildCutsTableRowProps) => {
  const operatorNameLookup = operatorUsers.reduce((lookup, user) => {
    const fullName = String(user.name || "").trim();
    if (!fullName) return lookup;
    lookup.set(fullName.toLowerCase(), fullName);
    const firstToken = fullName.split(/\s+/).filter(Boolean)[0];
    if (firstToken) lookup.set(firstToken.toLowerCase(), fullName);
    return lookup;
  }, new Map<string, string>());

  const assignedOperators = !isUnassignedValue(entry.assignedTo)
    ? [
        ...new Set(
          (Array.isArray(entry.assignedTo) ? entry.assignedTo : String(entry.assignedTo).split(","))
            .map((name) => String(name).trim())
            .filter(Boolean)
            .map((name) => operatorNameLookup.get(name.toLowerCase()) || name)
        ),
      ]
    : [];

  return (
    <tr key={rowKey} className={`${rowClassName} child-row`.trim()}>
      {showCheckboxes ? (
        <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onRowSelect(e.target.checked); }} />
        </td>
      ) : (
        <td className="child-table-spacer checkbox-spacer"></td>
      )}
      {showSetNumberColumn && <td className="setting-number-col">{`${getParentSerialPrefix(parentSetting)}${toAlphabetSuffix(index)}`}</td>}
      <td className="customer-col">{entry.customer || "-"}</td>
      <td className="program-ref-file-col" title={(entry as any).programRefFile || (entry as any).programRefFileName || "-"}>
        <MarqueeCopyText text={String((entry as any).programRefFile || (entry as any).programRefFileName || "-")} />
      </td>
      <td className="description-col" title={entry.description || "-"}><MarqueeCopyText text={entry.description || "-"} /></td>
      <td className="cut-col">{Math.round(Number(entry.cut || 0))}</td>
      <td className="th-col">{getThicknessDisplayValue(entry.thickness)}</td>
      <td className="pass-col">{entry.passLevel}</td>
      <td className="setting-col">{entry.setting}</td>
      <td className="qty-col">{Number(entry.qty || 0).toString()}</td>
      <td className="sedm-col"><span className={`sedm-badge ${toYN(entry.sedm) === "Y" ? "yes" : toYN(entry.sedm) === "N" ? "no" : ""}`}>{toYN(entry.sedm)}</span></td>
      {isOperator && (
        <td className="assigned-col">
          {canAssign && onAssignChange && operatorUsers.length > 0 ? (
            <div onClick={(e) => e.stopPropagation()}>
              <MultiSelectOperators
                selectedOperators={assignedOperators}
                availableOperators={operatorUsers}
                className="operator-assigned-dropdown"
                onChange={(operators) => onAssignChange(entry.id, operators.length > 0 ? [...new Set(operators)].join(", ") : "Unassign")}
                placeholder="Unassign"
                compact
              />
            </div>
          ) : (
            <div className="assigned-operators-readonly">
              {assignedOperators.length > 1 ? (
                <span className="compact-display-readonly" title={assignedOperators.join(", ")}><span className="multi-select-display-track">{assignedOperators.join(", ")}</span></span>
              ) : assignedOperators.length === 1 ? (
                <span className="operator-badge-readonly">{assignedOperators[0]}</span>
              ) : (
                <span className="unassigned-text">-</span>
              )}
            </div>
          )}
        </td>
      )}
      {isOperator && (
        <td className="mach-col">
          <select className="operator-machine-input" value={machineDropdownOptions.includes(getMachineNumber(entry)) ? getMachineNumber(entry) : ""} onClick={(e) => e.stopPropagation()} onChange={(event) => onMachineNumberChange?.(entry.id, event.target.value)}>
            {machineDropdownOptions.map((machine) => <option key={machine} value={machine}>{formatMachineLabel(machine)}</option>)}
          </select>
        </td>
      )}
      {!isOperator && <td className="total-hrs-col">{Number(entry.totalHrs || 0) ? Number(entry.totalHrs).toFixed(2) : "-"}</td>}
      <td className="estimated-time-col">{estimatedTimeFromAmount(Number(entry.totalHrs || 0) * Number(entry.rate || 0))}</td>
      {isAdmin && <td className="total-amount-col">{entry.totalAmount ? `Rs. ${Math.round(entry.totalAmount)}` : "-"}</td>}
      {isOperator && <td className="status-col">{renderBadgeTicker(buildStatusBadges(getQaProgressCounts(entry, Math.max(1, Number(entry.qty || 1)))))}</td>}
      <td className="act-col">
        <ActionButtons
          onView={onView}
          onEdit={onEdit}
          onImage={onImage}
          onDelete={onDelete}
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
};

export default ChildCutsTableRow;
