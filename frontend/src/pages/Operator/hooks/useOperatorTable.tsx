import React, { useMemo } from "react";
import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM, parseDateValue } from "../../../utils/date";
import ChildCutsTable from "../../Programmer/components/ChildCutsTable";
import ActionButtons from "../../Programmer/components/ActionButtons";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
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
  tableData,
  expandableRows,
  canAssign,
  operatorUsers,
  handleAssignChange,
  handleViewJob,
  handleSubmit,
  handleImageInput,
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
                  <ArrowForwardIosSharpIcon 
                    sx={{ fontSize: "0.7rem" }}
                  />
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
        render: (row) =>
          canAssign ? (
            <select
              value={row.parent.assignedTo || "Unassigned"}
              onChange={(event) =>
                handleAssignChange(row.parent.id, event.target.value)
              }
            >
              <option value="Unassigned">Unassigned</option>
              {operatorUsers.map((user) => (
                <option
                  key={user.id}
                  value={user.name}
                >
                  {user.name}
                </option>
              ))}
            </select>
          ) : (
            <span>{row.parent.assignedTo || "Unassigned"}</span>
          ),
      },
      {
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: true,
        sortKey: "totalHrs",
        render: (row) =>
          row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "—",
      },
      {
        key: "totalAmount",
        label: "Total Amount (₹)",
        sortable: true,
        sortKey: "totalAmount",
        render: (row) =>
          row.groupTotalAmount
            ? `₹${row.groupTotalAmount.toFixed(2)}`
            : "—",
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
          // Format: "DD MMM YYYY HH:MM"
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
