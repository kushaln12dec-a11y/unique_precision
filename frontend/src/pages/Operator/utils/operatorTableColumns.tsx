import type { Column } from "../../../components/DataTable";
import ActionButtons from "../../Programmer/components/ActionButtons";
import CreatedByBadge from "../../../components/CreatedByBadge";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import { MultiSelectOperators } from "../components/MultiSelectOperators";
import type { OperatorDisplayRow } from "../hooks/useOperatorTable";
import { formatJobRefDisplay, formatMachineLabel, toMachineIndex, toYN } from "../../../utils/jobFormatting";
import { getDispatchableQuantityNumbers, getGroupQaProgressCounts, getQaProgressCounts, getQaStatusBadges } from "./qaProgress";
import { getThicknessDisplayValue } from "../../Programmer/programmerUtils";
import {
  getOperatorMachineNumber,
  getOperatorMachineNumbers,
  getOperatorHistoryNames,
  normalizeAssignedOperators,
  renderEstimatedTimeWithLogs,
  renderOperatorCustomerCell,
} from "./operatorTableHelpers";

// Helper to join values from child rows for a parent row; returns fallback if no values
const getParentJoinedValues = (
  row: OperatorDisplayRow,
  getValue: (entry: any) => unknown,
  fallback = ""
): string => {
  // If not a parent with children, return its own value or fallback
  if (row.kind !== "parent" || !row.hasChildren) {
    const direct = String(getValue(row.entry) || "").trim();
    return direct || fallback;
  }
  // Aggregate unique non‑empty values from all child entries
  const values = Array.from(
    new Set(
      row.tableRow.entries
        .map((entry) => String(getValue(entry) || "").trim())
        .filter(Boolean)
    )
  );
  return values.length > 0 ? values.join(", ") : fallback;
};

const splitOperatorNames = (value: unknown): string[] =>
  String(value || "")
    .split(",")
    .map((name) => name.trim().toUpperCase())
    .filter(Boolean);

const getLoggedOperatorNames = (entry: any): string[] => {
  const names = (Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [])
    .flatMap((capture: any) => splitOperatorNames(capture?.opsName || capture?.createdBy))
    .filter((name: string) => name !== "UNASSIGN" && name !== "UNASSIGNED");

  const fallbackNames = splitOperatorNames(entry.opsName).filter((name) => name !== "UNASSIGN" && name !== "UNASSIGNED");
  return Array.from(new Set([...names, ...fallbackNames]));
};

const getBilledOperatorNames = (entry: any, operatorHistoryByJobId: Map<string, string[]>): string[] =>
  Array.from(
    new Set(
      [
        ...getLoggedOperatorNames(entry),
        ...((operatorHistoryByJobId.get(String(entry.id)) || []).map((name: string) => String(name || "").trim().toUpperCase())),
      ].filter(Boolean)
    )
  );

const getParentBilledOperatorNames = (row: OperatorDisplayRow, operatorHistoryByJobId: Map<string, string[]>): string[] =>
  Array.from(
    new Set(
      row.tableRow.entries.flatMap((entry) => getBilledOperatorNames(entry, operatorHistoryByJobId))
    )
  );

const renderBilledOperatorNames = (names: string[]) => (
  <MarqueeCopyText
    text={names.length > 0 ? names.join(", ") : "-"}
    className="billed-operator-names"
    showCopyButton={false}
  />
);

const getLoggedMachineNumbers = (entry: any): string[] =>
  Array.from(
    new Set(
      (Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [])
        .map((capture: any) => formatMachineLabel(String(capture?.machineNumber || "").trim()))
        .filter(Boolean)
    )
  );

export const buildBaseOperatorColumns = (props: {
  toggleGroup: (groupId: string) => void;
  operatorNameLookup: Map<string, string>;
  canAssign: boolean;
  operatorUsers: Array<{ id: string | number; name: string }>;
  handleAssignChange: (jobId: number | string, value: string | string[]) => void;
  machineDropdownOptions: string[];
  handleMachineNumberChange: (groupId: string, machineNumber: string) => void;
  handleChildMachineNumberChange: (jobId: number | string, machineNumber: string) => void;
  isAdmin: boolean;
  handleViewJob: (row: any) => void;
  handleViewEntry: (entry: any) => void;
  handleSubmit: (groupId: string) => void;
  handleImageInput: (groupId: string, cutId?: string | number) => void;
  handleOpenQaModal: (entries: any[]) => void;
  isImageInputDisabled: boolean;
  canOperateInputs: boolean;
  isBilled?: boolean;
  getActiveRuns: () => Map<string, any>;
  getOperatorHistory: () => Map<string, string[]>;
}): Column<OperatorDisplayRow>[] => [
  {
    key: "customer",
    label: "Customer",
    sortable: false,
    sortKey: "customer",
    className: "customer-cell",
    headerClassName: "customer-header",
    render: (row) => renderOperatorCustomerCell(row, props.toggleGroup, props.getActiveRuns()),
  },
  {
    key: "programRef",
    label: "Job ref",
    sortable: false,
    render: (row) => {
      return (
        <div className="operator-job-ref-cell">
          <MarqueeCopyText text={formatJobRefDisplay(row.entry.refNumber || "") || "-"} className="job-ref-copy-text" showCopyButton={false} />
        </div>
      );
    },
  },
  { key: "programRefFileName", label: <>Program Ref<br />File Name</>, sortable: false, render: (row) => <MarqueeCopyText text={String((row.entry as any).programRefFile || (row.entry as any).programRefFileName || "-")} /> },
  { key: "description", label: "Description", sortable: false, sortKey: "description", render: (row) => <MarqueeCopyText text={getParentJoinedValues(row, (entry) => entry.description || "", "")} /> },
  { key: "cut", label: "Cut (mm)", sortable: false, sortKey: "cut", render: (row) => row.kind === "parent" && row.hasChildren ? "" : Math.round(Number(row.entry.cut || 0)) },
  { key: "thickness", label: "TH (MM)", sortable: false, sortKey: "thickness", render: (row) => row.kind === "parent" && row.hasChildren ? "" : getThicknessDisplayValue(row.entry.thickness) },
  { key: "passLevel", label: "Pass", sortable: false, sortKey: "passLevel", render: (row) => row.kind === "parent" && row.hasChildren ? "" : row.entry.passLevel },
  { key: "setting", label: "Setting", sortable: false, sortKey: "setting", render: (row) => row.kind === "parent" && row.hasChildren ? "" : row.entry.setting },
  { key: "qty", label: "Qty", sortable: false, sortKey: "qty", render: (row) => row.kind === "parent" && row.hasChildren ? "" : Number(row.entry.qty || 0).toString() },
  { key: "sedm", label: "SEDM", sortable: false, render: (row) => row.kind === "parent" && row.hasChildren ? "" : <span className={`sedm-badge ${toYN(row.entry.sedm) === "Y" ? "yes" : toYN(row.entry.sedm) === "N" ? "no" : ""}`}>{toYN(row.entry.sedm)}</span> },
  {
    key: "assignedTo",
    label: "Operator",
    sortable: false,
    className: "operator-assigned-cell",
    render: (row) => {
      const activeRunsByJobId = props.getActiveRuns();
      const operatorHistoryByJobId = props.getOperatorHistory();
      const assignedOperators = normalizeAssignedOperators(row.entry.assignedTo || "", props.operatorNameLookup);
      const activeOperatorName = String(activeRunsByJobId.get(String(row.entry.id))?.userName || "").trim().toUpperCase();
      const operatorHistory = Array.from(
        new Set(
          [
            ...getOperatorHistoryNames(row.entry),
            ...((operatorHistoryByJobId.get(String(row.entry.id)) || []).map((name: string) => String(name || "").trim().toUpperCase())),
            ...(activeOperatorName ? [activeOperatorName.toUpperCase()] : []),
          ].filter(Boolean)
        )
      );
      const latestWorkedByName = operatorHistory[operatorHistory.length - 1] || "";
      const displayAssignedValue =
        assignedOperators.join(", ") ||
        (activeOperatorName ? activeOperatorName.toUpperCase() : "") ||
        latestWorkedByName ||
        "-";

      const isGroupedParent = row.kind === "parent" && row.hasChildren;
      const shouldAllowTableAssignment = props.canAssign && !isGroupedParent;
      const readonlyAssignedValue = isGroupedParent ? "" : displayAssignedValue;

      // For parent rows, display aggregated operator names with animation (MarqueeCopyText)
      if (isGroupedParent) {
        if (props.isBilled) {
          return renderBilledOperatorNames(getParentBilledOperatorNames(row, operatorHistoryByJobId));
        }
        const aggregated = getParentJoinedValues(row, (entry) => entry.assignedTo || "", "Unassign");
        return <MarqueeCopyText text={aggregated} className="operator-assigned-text" />;
      }

      if (props.isBilled) {
        return renderBilledOperatorNames(getBilledOperatorNames(row.entry, operatorHistoryByJobId));
      }

      return shouldAllowTableAssignment ? (
        <div className="operator-assigned-cell-stack" title={operatorHistory.length ? `Worked By: ${operatorHistory.join(", ")}` : undefined}>
          <MultiSelectOperators
            className="operator-assigned-dropdown"
            selectedOperators={assignedOperators}
            availableOperators={props.operatorUsers}
            onChange={(nextValue) => props.handleAssignChange(row.entry.id, nextValue)}
            placeholder="Unassign"
            compact={assignedOperators.length > 1}
            showUnassign={true}
            selfToggleOnly={false}
          />
        </div>
      ) : (
        <div className="assigned-operators-readonly" title={isGroupedParent ? undefined : operatorHistory.length ? `Worked By: ${operatorHistory.join(", ")}` : undefined}>
          {readonlyAssignedValue}
          {!isGroupedParent && operatorHistory.length > 1 && (
            <button
              className="operator-history-toggle"
              onClick={(e) => {
                e.stopPropagation();
                alert(`Worked By: ${operatorHistory.join(", ")}`);
              }}
              title="Click to see all operators"
            >
              +{operatorHistory.length - 1}
            </button>
          )}
        </div>
      );
    },
  },
  {
    key: "machineNumber",
    label: <>Machine<br />Assign</>,
    sortable: false,
    className: "operator-machine-cell",
    render: (row) => {
      const isGroupedParent = row.kind === "parent" && row.hasChildren;
      const machineNumber = isGroupedParent ? "" : getOperatorMachineNumber(row.entry);
      
      if (isGroupedParent) {
        const aggregated = props.isBilled
          ? getParentJoinedValues(row, (entry) => getLoggedMachineNumbers(entry).join(", "), "-")
          : getParentJoinedValues(row, (entry) => formatMachineLabel(getOperatorMachineNumber(entry)), "Unassign");
        return <MarqueeCopyText text={aggregated} className="operator-machine-text" />;
      }

      if (props.isBilled) {
        const loggedMachines = getLoggedMachineNumbers(row.entry);
        return <div className="assigned-operators-readonly">{loggedMachines.join(", ") || "-"}</div>;
      }

      if (props.canAssign) {
        const selectedMachines = getOperatorMachineNumbers(row.entry).map((machine) => formatMachineLabel(machine)).filter(Boolean);
        const machineSelectOptions = props.machineDropdownOptions.map((machine) => ({ id: machine, name: formatMachineLabel(machine) }));
        return (
          <MultiSelectOperators
            className="operator-assigned-dropdown operator-machine-dropdown-wrapper"
            selectedOperators={selectedMachines}
            availableOperators={machineSelectOptions}
            onChange={(nextValue) =>
              row.kind === "parent"
                ? props.handleMachineNumberChange(row.groupId, nextValue.map((machine) => toMachineIndex(machine)).filter(Boolean).join(", "))
                : props.handleChildMachineNumberChange(row.entry.id, nextValue.map((machine) => toMachineIndex(machine)).filter(Boolean).join(", "))
            }
            placeholder="Select"
            compact={selectedMachines.length > 1}
            showUnassign={true}
            selfToggleOnly={false}
          />
        );
      }
      return (
        <div className="assigned-operators-readonly">
          {formatMachineLabel(machineNumber) || "Unassign"}
        </div>
      );
    },
  },
  { key: "estimatedTime", label: <>Estimated<br />Time</>, sortable: false, render: (row) => renderEstimatedTimeWithLogs(row, props.getActiveRuns()) },
  ...(props.isAdmin ? [{ key: "totalAmount", label: "Amount (Rs.)", sortable: false, sortKey: "totalAmount", className: "operator-amount-cell", headerClassName: "operator-amount-header", render: (row: OperatorDisplayRow) => row.kind === "parent" ? row.tableRow.groupTotalAmount ? `Rs. ${Math.round(row.tableRow.groupTotalAmount)}` : "-" : row.entry.totalAmount ? `Rs. ${Math.round(row.entry.totalAmount)}` : "-" } as Column<OperatorDisplayRow>] : []),
  {
    key: "productionStage",
    label: "Status",
    sortable: false,
    className: "status-cell",
    headerClassName: "status-header",
    render: (row) => {
      if (props.isBilled) {
        return <span className="qa-mini saved">LOGGED</span>;
      }

      const activeRunsByJobId = props.getActiveRuns();
      const counts = row.kind === "parent"
        ? getGroupQaProgressCounts(row.tableRow.entries, activeRunsByJobId)
        : getQaProgressCounts(row.entry, Math.max(1, Number(row.entry.qty || 1)), activeRunsByJobId.get(String(row.entry.id)));
      const badges = getQaStatusBadges(counts);
      return <div className="child-stage-summary"><div className="qa-badge-ticker" title={badges.map((badge) => badge.label).join(" | ")}><div className="qa-badge-track">{[...badges, ...badges].map((badge, index) => <span key={`${badge.className}-${index}`} className={`qa-mini ${badge.className}`}>{badge.label}</span>)}</div></div></div>;
    },
  },
  { key: "createdBy", label: "Created By", sortable: false, sortKey: "createdBy", className: "created-by-cell", headerClassName: "created-by-header", render: (row) => <CreatedByBadge value={row.entry.createdBy} /> },
  {
    key: "action",
    label: "Action",
    sortable: false,
    className: "action-cell",
    headerClassName: "action-header",
    render: (row) => {
      const activeRunsByJobId = props.getActiveRuns();
      const isChild = row.kind === "child";
      const targetEntries = isChild ? [row.entry] : row.tableRow.entries;
      const canSendToQa = targetEntries.some((entry) => getDispatchableQuantityNumbers(entry, activeRunsByJobId.get(String(entry.id))).length > 0);
      return (
        <ActionButtons
          onView={() => (isChild ? props.handleViewEntry(row.entry) : props.handleViewJob(row.tableRow))}
          onImage={props.isBilled ? undefined : isChild ? () => props.handleImageInput(row.groupId, row.entry.id) : !row.hasChildren ? () => props.handleSubmit(row.groupId) : undefined}
          onSubmit={!props.isBilled && props.canOperateInputs ? () => props.handleOpenQaModal(targetEntries) : undefined}
          viewLabel={`View ${row.entry.customer || "entry"}`}
          imageLabel={`Open ${row.entry.customer || "entry"}`}
          submitLabel="Send to QC"
          isOperator={true}
          disableImageButton={props.isImageInputDisabled || !props.canOperateInputs}
          hideOperatorImageButton={props.isBilled}
          disableSubmitButton={!canSendToQa}
        />
      );
    },
  },
];
