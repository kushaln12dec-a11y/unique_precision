import { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM, parseDateValue } from "../../../utils/date";
import ActionButtons from "../../Programmer/components/ActionButtons";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { MultiSelectOperators } from "../components/MultiSelectOperators";
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
};

/**
 * Hook for generating operator table columns
 */
export const useOperatorTable = ({
  expandableRows,
  canAssign,
  operatorUsers,
  handleAssignChange,
  handleViewJob,
  handleSubmit,
}: UseOperatorTableProps): Column<TableRow>[] => {
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
              <span>{row.parent.customer || "—"}</span>
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
        render: (row) => row.parent.description || "—",
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
        label: "Total Hrs/Piece",
        sortable: true,
        sortKey: "totalHrs",
        render: (row) => (row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "—"),
      },
      {
        key: "totalAmount",
        label: "Total Amount (₹)",
        sortable: true,
        sortKey: "totalAmount",
        render: (row) => (row.groupTotalAmount ? `₹${row.groupTotalAmount.toFixed(2)}` : "—"),
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
          if (!parsed) return "—";
          const date = new Date(parsed);
          const day = date.getDate().toString().padStart(2, "0");
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return `${day} ${month} ${year} ${hours}:${minutes}`;
        },
      },
      {
        key: "action",
        label: "Action",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (row) => (
          <ActionButtons
            onView={() => handleViewJob(row)}
            onSubmit={() => handleSubmit(row.groupId)}
            viewLabel={`View ${row.parent.customer || "entry"}`}
            submitLabel={`Submit ${row.parent.customer || "entry"}`}
            isOperator={true}
          />
        ),
      },
    ],
    [canAssign, operatorUsers, handleAssignChange, expandableRows, handleViewJob, handleSubmit]
  );
};
