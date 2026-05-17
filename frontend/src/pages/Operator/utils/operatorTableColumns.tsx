import type { Column } from "../../../components/DataTable";
import ActionButtons from "../../Programmer/components/ActionButtons";
import CreatedByBadge from "../../../components/CreatedByBadge";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import SelectDropdown from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "../components/MultiSelectOperators";
import type { OperatorDisplayRow } from "../hooks/useOperatorTable";
import { formatJobRefDisplay, formatMachineLabel, toYN } from "../../../utils/jobFormatting";
import { getDispatchableQuantityNumbers, getGroupQaProgressCounts, getQaProgressCounts, getQaStatusBadges } from "./qaProgress";
import { getThicknessDisplayValue } from "../../Programmer/programmerUtils";
import {
  getOperatorMachineNumber,
  getOperatorHistoryNames,
  normalizeAssignedOperators,
  renderEstimatedTimeWithLogs,
  renderOperatorCustomerCell,
} from "./operatorTableHelpers";

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
  { key: "description", label: "Description", sortable: false, sortKey: "description", render: (row) => <MarqueeCopyText text={row.entry.description || "-"} /> },
  { key: "cut", label: "Cut (mm)", sortable: false, sortKey: "cut", render: (row) => Math.round(Number(row.entry.cut || 0)) },
  { key: "thickness", label: "TH (MM)", sortable: false, sortKey: "thickness", render: (row) => getThicknessDisplayValue(row.entry.thickness) },
  { key: "passLevel", label: "Pass", sortable: false, sortKey: "passLevel", render: (row) => row.entry.passLevel },
  { key: "setting", label: "Setting", sortable: false, sortKey: "setting", render: (row) => row.entry.setting },
  { key: "qty", label: "Qty", sortable: false, sortKey: "qty", render: (row) => Number(row.entry.qty || 0).toString() },
  { key: "sedm", label: "SEDM", sortable: false, render: (row) => <span className={`sedm-badge ${toYN(row.entry.sedm) === "Y" ? "yes" : toYN(row.entry.sedm) === "N" ? "no" : ""}`}>{toYN(row.entry.sedm)}</span> },
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

      const shouldAllowTableAssignment = props.canAssign;

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
        <div className="assigned-operators-readonly" title={operatorHistory.length ? `Worked By: ${operatorHistory.join(", ")}` : undefined}>
          {displayAssignedValue}
          {operatorHistory.length > 1 && (
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
    render: (row) =>
      props.canAssign ? (
        <SelectDropdown
          className="operator-machine-dropdown-wrapper"
          value={props.machineDropdownOptions.includes(getOperatorMachineNumber(row.entry)) ? getOperatorMachineNumber(row.entry) : ""}
          onChange={(nextValue) => row.kind === "parent" ? props.handleMachineNumberChange(row.groupId, nextValue) : props.handleChildMachineNumberChange(row.entry.id, nextValue)}
          options={[
            { label: "Unassign", value: "" },
            ...props.machineDropdownOptions.map((machine) => ({ label: formatMachineLabel(machine), value: machine })),
          ]}
          placeholder="Select"
          align="left"
          menuMinWidth={96}
        />
      ) : (
        <div className="assigned-operators-readonly">{formatMachineLabel(getOperatorMachineNumber(row.entry)) || "-"}</div>
      ),
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
          onImage={isChild ? () => props.handleImageInput(row.groupId, row.entry.id) : !row.hasChildren ? () => props.handleSubmit(row.groupId) : undefined}
          onSubmit={props.canOperateInputs ? () => props.handleOpenQaModal(targetEntries) : undefined}
          viewLabel={`View ${row.entry.customer || "entry"}`}
          imageLabel={`Open ${row.entry.customer || "entry"}`}
          submitLabel="Send to QC"
          isOperator={true}
          disableImageButton={props.isImageInputDisabled || !props.canOperateInputs}
          disableSubmitButton={!canSendToQa}
        />
      );
    },
  },
];
