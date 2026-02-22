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
  const truncateDescription = (value: string | undefined | null): string => {
    const text = (value || "-").trim();
    if (text === "-") return text;
    return text.length > 12 ? `${text.slice(0, 12)}...` : text;
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
        sortable: false,
        sortKey: "rate",
        render: (row) => `₹${Math.round(Number(row.parent.rate || 0))}`,
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        sortKey: "description",
        render: (row) => {
          const full = row.parent.description || "-";
          return <span title={full}>{truncateDescription(full)}</span>;
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
        key: "totalHrs",
        label: "Total Hrs/Piece",
        sortable: false,
        sortKey: "totalHrs",
        render: (row) => (row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "—"),
      },
      ...(isAdmin
        ? [
            {
              key: "totalAmount",
              label: "Total Amount (₹)",
              sortable: false,
              sortKey: "totalAmount",
              render: (row: TableRow) =>
                row.groupTotalAmount ? `₹${Math.round(row.groupTotalAmount)}` : "—",
            },
          ]
        : []),
      {
        key: "createdBy",
        label: "Created By",
        sortable: false,
        sortKey: "createdBy",
        render: (row) => row.parent.createdBy,
      },
      {
        key: "createdAt",
        label: "Created At",
        sortable: false,
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

