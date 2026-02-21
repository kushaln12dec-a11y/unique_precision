import { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM, parseDateValue } from "../../../utils/date";
import ActionButtons from "../../Programmer/components/ActionButtons";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { MultiSelectOperators } from "../components/MultiSelectOperators";
import { getQaProgressCounts } from "../utils/qaProgress";
import type { Column } from "../../../components/DataTable";

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
  handleAssignChange: (jobId: number | string, value: string) => void;
  handleViewJob: (row: TableRow) => void;
  handleSubmit: (groupId: number) => void;
  handleImageInput: (groupId: number, cutId?: number) => void;
  isAdmin: boolean;
};

export const useOperatorTable = ({
  expandableRows,
  canAssign,
  operatorUsers,
  handleAssignChange,
  handleViewJob,
  handleSubmit,
  isAdmin,
}: UseOperatorTableProps): Column<TableRow>[] => {
  const truncateDescription = (value: string | undefined | null): string => {
    const text = (value || "-").trim();
    if (text === "-") return text;
    return text.length > 7 ? `${text.slice(0, 7)}...` : text;
  };

  return useMemo(
    () => [
      {
        key: "customer",
        label: "Customer",
        sortable: true,
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
        key: "rate",
        label: "Rate",
        sortable: true,
        sortKey: "rate",
        render: (row) => `₹${Number(row.parent.rate || 0).toFixed(2)}`,
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        sortKey: "description",
        render: (row) => {
          const full = row.parent.description || "-";
          return <span title={full}>{truncateDescription(full)}</span>;
        },
      },
      {
        key: "cut",
        label: "Cut (mm)",
        sortable: true,
        sortKey: "cut",
        render: (row) => Number(row.parent.cut || 0).toFixed(2),
      },
      {
        key: "thickness",
        label: "TH (MM)",
        sortable: true,
        sortKey: "thickness",
        render: (row) => Number(row.parent.thickness || 0).toFixed(2),
      },
      {
        key: "passLevel",
        label: "Pass",
        sortable: true,
        sortKey: "passLevel",
        render: (row) => row.parent.passLevel,
      },
      {
        key: "setting",
        label: "Setting",
        sortable: true,
        sortKey: "setting",
        render: (row) => row.parent.setting,
      },
      {
        key: "qty",
        label: "Qty",
        sortable: true,
        sortKey: "qty",
        render: (row) => Number(row.parent.qty || 0).toString(),
      },
      {
        key: "assignedTo",
        label: (
          <>
            Assigned <br /> To
          </>
        ),
        sortable: false,
        render: (row) => {
          const assignedToValue = row.parent.assignedTo || "";
          let assignedOperators: string[] = [];

          if (Array.isArray(assignedToValue)) {
            assignedOperators = [...new Set(assignedToValue.map((name) => name.trim()).filter(Boolean))];
          } else if (assignedToValue && assignedToValue !== "Unassigned") {
            assignedOperators = [...new Set(assignedToValue.split(",").map((name) => name.trim()).filter(Boolean))];
          }

          return canAssign ? (
            <MultiSelectOperators
              selectedOperators={assignedOperators}
              availableOperators={operatorUsers}
              className="operator-assigned-dropdown"
              onChange={(operators) => {
                const uniqueOperators = [...new Set(operators)];
                const value = uniqueOperators.length > 0 ? uniqueOperators.join(", ") : "Unassigned";
                handleAssignChange(row.parent.id, value);
              }}
              placeholder="Select operators..."
              compact={true}
            />
          ) : (
            <div className="assigned-operators-readonly">
              {assignedOperators.length > 0 ? (
                assignedOperators.length > 1 ? (
                  <span className="compact-display-readonly" title={assignedOperators.join(", ")}>
                    {assignedOperators[0]}+{assignedOperators.length - 1}
                  </span>
                ) : (
                  <span className="operator-badge-readonly">{assignedOperators[0]}</span>
                )
              ) : (
                <span className="unassigned-text">Unassigned</span>
              )}
            </div>
          );
        },
      },
      {
        key: "totalHrs",
        label: (
          <>
            Total
            <br />
            Hrs/Piece
          </>
        ),
        sortable: true,
        sortKey: "totalHrs",
        render: (row) => (row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "-"),
      },
      ...(isAdmin
        ? [
            {
              key: "totalAmount",
              label: "Total Amount (₹)",
              sortable: true,
              sortKey: "totalAmount",
              render: (row: TableRow) => (row.groupTotalAmount ? `₹${row.groupTotalAmount.toFixed(2)}` : "-"),
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
          const firstSetting = row.entries[0] || row.parent;
          const qty = Math.max(1, Number(firstSetting.qty || 1));
          const c = getQaProgressCounts(firstSetting, qty);
          const counts = { logged: c.saved + c.ready, sent: c.sent, empty: c.empty };
          return (
            <div className="child-stage-summary">
              <span className="qa-mini empty">Pending {counts.empty}</span>
              <span className="qa-mini saved">Logged {counts.logged}</span>
              <span className="qa-mini sent">QA {counts.sent}</span>
            </div>
          );
        },
      },
      {
        key: "createdBy",
        label: "Created By",
        sortable: true,
        sortKey: "createdBy",
        render: (row) => row.parent.createdBy,
      },
      {
        key: "createdAt",
        label: "Created At",
        sortable: true,
        sortKey: "createdAt",
        render: (row) => {
          const parsed = parseDateValue(row.parent.createdAt);
          if (!parsed) return "-";
          const date = new Date(parsed);
          const day = date.getDate().toString().padStart(2, "0");
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return (
            <div className="created-at-split">
              <span>{`${day} ${month} ${year}`}</span>
              <span>{`${hours}:${minutes}`}</span>
            </div>
          );
        },
      },
      {
        key: "action",
        label: "Act",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (row) => {
          const hasChildren = !!expandableRows?.get(row.groupId);
          return (
            <ActionButtons
              onView={() => handleViewJob(row)}
              onImage={!hasChildren ? () => handleSubmit(row.groupId) : undefined}
              viewLabel={`View ${row.parent.customer || "entry"}`}
              imageLabel={`Open ${row.parent.customer || "entry"}`}
              isOperator={true}
            />
          );
        },
      },
    ],
    [canAssign, operatorUsers, handleAssignChange, expandableRows, handleViewJob, handleSubmit, isAdmin]
  );
};
