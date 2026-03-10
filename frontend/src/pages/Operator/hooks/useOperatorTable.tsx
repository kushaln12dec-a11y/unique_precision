import { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import ActionButtons from "../../Programmer/components/ActionButtons";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { getGroupQaProgressCounts } from "../utils/qaProgress";
import type { Column } from "../../../components/DataTable";
import {
  estimatedTimeFromAmount,
  formatMachineLabel,
  getInitials,
  MACHINE_OPTIONS,
  toMachineIndex,
  toYN,
} from "../../../utils/jobFormatting";

type TableRow = {
  groupId: number;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

type UseOperatorTableProps = {
  tableData: TableRow[];
  expandableRows: Map<number, any>;
  canAssign: boolean;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  currentUserName: string;
  handleAssignChange: (jobId: number | string, value: string) => void;
  handleMachineNumberChange: (groupId: number, machineNumber: string) => void;
  handleViewJob: (row: TableRow) => void;
  handleSubmit: (groupId: number) => void;
  handleImageInput: (groupId: number, cutId?: number) => void;
  handleMoveGroupToQa: (row: TableRow) => void;
  canMoveGroupToQa: (entries: JobEntry[]) => boolean;
  isAdmin: boolean;
  isImageInputDisabled: boolean;
};

export const useOperatorTable = ({
  expandableRows,
  canAssign,
  operatorUsers,
  machineOptions,
  currentUserName,
  handleAssignChange,
  handleMachineNumberChange,
  handleViewJob,
  handleSubmit,
  handleMoveGroupToQa,
  canMoveGroupToQa,
  isAdmin,
  isImageInputDisabled,
}: UseOperatorTableProps): Column<TableRow>[] => {
  const machineDropdownOptions = useMemo(() => {
    const normalized = machineOptions
      .map((value) => toMachineIndex(value))
      .filter(Boolean);
    return normalized.length > 0 ? normalized : [...MACHINE_OPTIONS];
  }, [machineOptions]);

  const getMachineNumber = (job: JobEntry): string => {
    const direct = String((job as any).machineNumber || "").trim();
    if (direct) return toMachineIndex(direct);
    const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
    const latest = captures[captures.length - 1];
    const captureMachine = String(latest?.machineNumber || "").trim();
    return toMachineIndex(captureMachine);
  };

  return useMemo(
    () => [
      {
        key: "customer",
        label: "Customer",
        sortable: false,
        sortKey: "customer",
        render: (row) => {
          const expandable = expandableRows?.get(row.groupId);
          const isExpanded = expandable?.isExpanded || false;

          return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
              {expandable && (
                <button
                  type="button"
                  className="accordion-toggle-button operator-accordion-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    expandable.onToggle();
                  }}
                  aria-label={expandable.ariaLabel}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1a1a2e",
                    minWidth: "1rem",
                    width: "1rem",
                    transition: "transform 0.2s ease",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <ArrowForwardIosSharpIcon sx={{ fontSize: "0.7rem" }} />
                </button>
              )}
              {!expandable && <span style={{ width: "1rem" }} />}
              <span>{row.parent.customer || "-"}</span>
            </div>
          );
        },
      },
      {
        key: "programRef",
        label: "Job ref",
        sortable: false,
        render: (row) => {
          const ref = row.parent.refNumber || "";
          return ref ? `#${ref}` : "-";
        },
      },
      {
        key: "programRefFileName",
        label: (
          <>
            Program Ref
            <br />
            File Name
          </>
        ),
        sortable: false,
        render: (row) => {
          const value = String((row.parent as any).programRefFile || (row.parent as any).programRefFileName || "-");
          return (
            <div className="description-marquee" title={value}>
              <span>{value}</span>
            </div>
          );
        },
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        sortKey: "description",
        render: (row) => {
          const full = row.parent.description || "-";
          return (
            <div className="description-marquee" title={full}>
              <span>{full}</span>
            </div>
          );
        },
      },
      {
        key: "cut",
        label: "Cut (mm)",
        sortable: false,
        sortKey: "cut",
        render: (row) => Math.round(Number(row.parent.cut || 0)),
      },
      {
        key: "thickness",
        label: "TH (MM)",
        sortable: false,
        sortKey: "thickness",
        render: (row) => Math.round(Number(row.parent.thickness || 0)),
      },
      {
        key: "passLevel",
        label: "Pass",
        sortable: false,
        sortKey: "passLevel",
        render: (row) => row.parent.passLevel,
      },
      {
        key: "setting",
        label: "Setting",
        sortable: false,
        sortKey: "setting",
        render: (row) => row.parent.setting,
      },
      {
        key: "qty",
        label: "Qty",
        sortable: false,
        sortKey: "qty",
        render: (row) => Number(row.parent.qty || 0).toString(),
      },
      {
        key: "sedm",
        label: "SEDM",
        sortable: false,
        render: (row) => {
          const sedm = toYN(row.parent.sedm);
          const sedmClass = sedm === "Y" ? "sedm-badge yes" : sedm === "N" ? "sedm-badge no" : "sedm-badge";
          return <span className={sedmClass}>{sedm}</span>;
        },
      },
      {
        key: "assignedTo",
        label: "Operator",
        sortable: false,
        render: (row) => {
          const assignedToValue = row.parent.assignedTo || "";
          let assignedOperators: string[] = [];

          if (Array.isArray(assignedToValue)) {
            assignedOperators = [...new Set(assignedToValue.map((name) => name.trim()).filter(Boolean))];
          } else if (assignedToValue && assignedToValue !== "Unassigned") {
            assignedOperators = [...new Set(assignedToValue.split(",").map((name) => name.trim()).filter(Boolean))];
          }

          const selectedOwner = assignedOperators[0] || "";
          const normalizedCurrentUser = currentUserName.trim().toLowerCase();
          const currentUserAlreadyInList = operatorUsers.some(
            (user) => user.name.trim().toLowerCase() === normalizedCurrentUser
          );

          return canAssign ? (
            <select
              className="operator-assigned-dropdown"
              value={selectedOwner}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const value = event.target.value.trim();
                handleAssignChange(row.parent.id, value || "Unassigned");
              }}
            >
              <option value="">Select operator</option>
              {currentUserName && !currentUserAlreadyInList ? (
                <option value={currentUserName}>Assign to me</option>
              ) : null}
              {operatorUsers.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="assigned-operators-readonly">
              {selectedOwner ? <span className="operator-badge-readonly">{selectedOwner}</span> : <span className="unassigned-text">Unassigned</span>}
            </div>
          );
        },
      },
      {
        key: "machineNumber",
        label: "Mach #",
        sortable: false,
        render: (row) => (
          <select
            className="operator-machine-input"
            value={machineDropdownOptions.includes(getMachineNumber(row.parent)) ? getMachineNumber(row.parent) : ""}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextValue = event.target.value;
              handleMachineNumberChange(row.groupId, nextValue);
            }}
          >
            <option value="">Select</option>
            {machineDropdownOptions.map((machine) => (
              <option key={machine} value={machine}>
                {formatMachineLabel(machine)}
              </option>
            ))}
          </select>
        ),
      },

      {
        key: "estimatedTime",
        label: (
          <>
            Estimated
            <br />
            Time
          </>
        ),
        sortable: false,
        render: (row) => estimatedTimeFromAmount(row.groupTotalAmount || 0),
      },
        ...(isAdmin
          ? [
          {
            key: "totalAmount",
            label: "Amount (Rs.)",
            sortable: false,
            sortKey: "totalAmount",
            className: "operator-amount-cell",
            headerClassName: "operator-amount-header",
            render: (row: TableRow) => (row.groupTotalAmount ? `Rs. ${Math.round(row.groupTotalAmount)}` : "-"),
          } as Column<TableRow>,
        ]
        : []),
      {
        key: "productionStage",
        label: "Status",
        sortable: false,
        className: "status-cell",
        headerClassName: "status-header",
        render: (row) => {
          const c = getGroupQaProgressCounts(row.entries);
          const counts = { logged: c.saved + c.ready, sent: c.sent, empty: c.empty };
          return (
            <div className="child-stage-summary">
              <span className="qa-mini empty">Not Started {counts.empty}</span>
              <span className="qa-mini saved">Logged {counts.logged}</span>
              <span className="qa-mini sent">QA {counts.sent}</span>
            </div>
          );
        },
      },
      {
        key: "createdBy",
        label: "Created By",
        sortable: false,
        sortKey: "createdBy",
        className: "created-by-cell",
        headerClassName: "created-by-header",
        render: (row) => {
          const fullName = String(row.parent.createdBy || "-").toUpperCase();
          return (
            <span className="created-by-badge" title={fullName}>
              {getInitials(fullName)}
            </span>
          );
        },
      },
      {
        key: "action",
        label: "Action",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (row) => {
          const hasChildren = !!expandableRows?.get(row.groupId);
          return (
            <ActionButtons
              onView={() => handleViewJob(row)}
              onImage={!hasChildren ? () => handleSubmit(row.groupId) : undefined}
              onSubmit={() => handleMoveGroupToQa(row)}
              viewLabel={`View ${row.parent.customer || "entry"}`}
              imageLabel={`Open ${row.parent.customer || "entry"}`}
              submitLabel="Move to QC"
              isOperator={true}
              disableImageButton={isImageInputDisabled}
              disableSubmitButton={!canMoveGroupToQa(row.entries)}
            />
          );
        },
      },
    ],
    [
      canAssign,
      operatorUsers,
      machineDropdownOptions,
      currentUserName,
      handleAssignChange,
      handleMachineNumberChange,
      expandableRows,
      handleViewJob,
      handleSubmit,
      handleMoveGroupToQa,
      canMoveGroupToQa,
      isAdmin,
      isImageInputDisabled,
    ]
  );
};

