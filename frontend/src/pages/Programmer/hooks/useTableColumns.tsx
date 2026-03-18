import { useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import { getDisplayDateTimeParts } from "../../../utils/date";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import type { TableRow } from "../utils/jobDataTransform";
import ActionButtons from "../components/ActionButtons";
import { estimatedTimeFromAmount, getInitials, toYN } from "../../../utils/jobFormatting";
import { calculateTotals, getThicknessDisplayValue } from "../programmerUtils";
import MarqueeCopyText from "../../../components/MarqueeCopyText";

type UseTableColumnsProps = {
  expandableRows: Map<string, any>;
  isAdmin: boolean;
  setViewingJob: (job: TableRow) => void;
  setShowJobViewModal: (show: boolean) => void;
  handleEditJob: (groupId: string) => void;
  handleDeleteClick: (groupId: string, customer: string) => void;
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
        sortable: false,
        sortKey: "customer",
        render: (row) => {
          const expandable = expandableRows?.get(row.groupId);
          const isExpanded = expandable?.isExpanded || false;
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" }}>
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
        className: "program-ref-file-col",
        headerClassName: "program-ref-file-col",
        render: (row) => {
          const value = String((row.parent as any).programRefFile || (row.parent as any).programRefFileName || "-");
          return <MarqueeCopyText text={value} />;
        },
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        sortKey: "description",
        render: (row) => {
          const full = row.parent.description || "-";
          return <MarqueeCopyText text={full} />;
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
        render: (row) => getThicknessDisplayValue(row.parent.thickness),
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
        key: "totalHrs",
        label: "Cut Length Hrs",
        sortable: false,
        sortKey: "totalHrs",
        render: (row) => {
          const totalHrs = calculateTotals(row.parent as any).totalHrs;
          return totalHrs ? `${totalHrs.toFixed(2)}hrs` : "-";
        },
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
        className: "estimated-time-col",
        headerClassName: "estimated-time-col",
        render: (row) => {
          const wedmAmount = row.entries.reduce((sum, entry) => sum + calculateTotals(entry as any).wedmAmount, 0);
          return `${estimatedTimeFromAmount(wedmAmount)}hrs`;
        },
      },
      ...(isAdmin
        ? [
            {
              key: "totalAmount",
              label: "Total Amount (Rs.)",
              sortable: false,
              sortKey: "totalAmount",
              render: (row: TableRow) =>
                row.groupTotalAmount ? `Rs. ${Math.round(row.groupTotalAmount)}` : "-",
            },
          ]
        : []),
      {
        key: "createdBy",
        label: "Created By",
        sortable: false,
        sortKey: "createdBy",
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
        key: "createdAt",
        label: "Created At",
        sortable: false,
        sortKey: "createdAt",
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.parent.createdAt);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
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
