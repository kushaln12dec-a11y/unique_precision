import { useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import { parseDateValue, formatHoursToHHMM } from "../../../utils/date";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import type { TableRow } from "../utils/jobDataTransform";
import ActionButtons from "../components/ActionButtons";

type UseTableColumnsProps = {
  expandableRows: Map<number, any>;
  isAdmin: boolean;
  setViewingJob: (job: TableRow) => void;
  setShowJobViewModal: (show: boolean) => void;
  handleEditJob: (groupId: number) => void;
  handleDeleteClick: (groupId: number, customer: string) => void;
};

export const useTableColumns = ({
  expandableRows,
  isAdmin,
  setViewingJob,
  setShowJobViewModal,
  handleEditJob,
  handleDeleteClick,
}: UseTableColumnsProps): Column<TableRow>[] => {
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
                  className="accordion-toggle-button programmer-accordion-toggle"
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
        key: "cut",
        label: "Cut (mm)",
        sortable: true,
        sortKey: "cut",
        render: (row) => Number(row.parent.cut || 0).toFixed(2),
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        sortKey: "description",
        render: (row) => row.parent.description || "—",
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
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: true,
        sortKey: "totalHrs",
        render: (row) => (row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "—"),
      },
      ...(isAdmin
        ? [
            {
              key: "totalAmount",
              label: "Total Amount (₹)",
              sortable: true,
              sortKey: "totalAmount",
              render: (row: TableRow) =>
                row.groupTotalAmount ? `₹${row.groupTotalAmount.toFixed(2)}` : "—",
            },
          ]
        : []),
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
          const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
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
            onView={() => {
              setViewingJob(row);
              setShowJobViewModal(true);
            }}
            onEdit={() => handleEditJob(row.groupId)}
            onDelete={() => handleDeleteClick(row.groupId, row.parent.customer || "entry")}
            viewLabel={`View ${row.parent.customer || "entry"}`}
            editLabel={`Edit ${row.parent.customer || "entry"}`}
            deleteLabel={`Delete ${row.parent.customer || "entry"}`}
          />
        ),
      },
    ],
    [expandableRows, isAdmin, setViewingJob, setShowJobViewModal, handleEditJob, handleDeleteClick]
  );
};
