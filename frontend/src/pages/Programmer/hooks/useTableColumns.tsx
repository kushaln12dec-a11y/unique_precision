import { useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import CreatedByBadge from "../../../components/CreatedByBadge";
import { getDisplayDateTimeParts } from "../../../utils/date";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import type { JobEntry } from "../../../types/job";
import type { TableRow } from "../utils/jobDataTransform";
import ActionButtons from "../components/ActionButtons";
import { estimatedTimeFromAmount, formatJobRefDisplay, toYN } from "../../../utils/jobFormatting";
import { getThicknessDisplayValue } from "../programmerUtils";
import MarqueeCopyText from "../../../components/MarqueeCopyText";

export type ProgrammerDisplayRow = {
  kind: "parent" | "child";
  groupId: string;
  tableRow: TableRow;
  entry: JobEntry;
  childIndex: number | null;
  hasChildren: boolean;
  isExpanded: boolean;
};

type UseTableColumnsProps = {
  isAdmin: boolean;
  handleViewGroup: (groupId: string) => void;
  handleViewEntry: (entry: JobEntry) => void;
  handleEditJob: (groupId: string) => void;
  handleCloneJob: (groupId: string) => void;
  handleDeleteClick: (groupId: string, customer: string) => void;
  toggleGroup: (groupId: string) => void;
};

export const useTableColumns = ({
  isAdmin,
  handleViewGroup,
  handleViewEntry,
  handleEditJob,
  handleCloneJob,
  handleDeleteClick,
  toggleGroup,
}: UseTableColumnsProps): Column<ProgrammerDisplayRow>[] => {
  return useMemo(
    () => [
      {
        key: "customer",
        label: "Customer",
        sortable: false,
        sortKey: "customer",
        className: "customer-cell",
        headerClassName: "customer-header",
        render: (row) => {
          const isChild = row.kind === "child";
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.2rem", width: "100%" }}>
              {!isChild && row.hasChildren && (
                <button
                  type="button"
                  className="accordion-toggle-button programmer-accordion-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGroup(row.groupId);
                  }}
                  aria-label={row.isExpanded ? "Collapse settings" : "Expand settings"}
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
                    transform: row.isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <ArrowForwardIosSharpIcon sx={{ fontSize: "0.7rem" }} />
                </button>
              )}
              {isChild && <span className="inline-row-branch">|-</span>}
              {!isChild && !row.hasChildren && <span style={{ width: "1rem" }} />}
              <span>{row.entry.customer || "-"}</span>
            </div>
          );
        },
      },
      {
        key: "programRef",
        label: "Job ref",
        sortable: false,
        render: (row) => {
          const ref = row.entry.refNumber || "";
          return <MarqueeCopyText text={formatJobRefDisplay(ref) || "-"} className="job-ref-copy-text" />;
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
          const value = String((row.entry as any).programRefFile || (row.entry as any).programRefFileName || "-");
          return <MarqueeCopyText text={value} />;
        },
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        sortKey: "description",
        render: (row) => {
          const full = row.entry.description || "-";
          return <MarqueeCopyText text={full} />;
        },
      },
      {
        key: "cut",
        label: "Cut (mm)",
        sortable: false,
        sortKey: "cut",
        render: (row) => Math.round(Number(row.entry.cut || 0)),
      },
      {
        key: "thickness",
        label: "TH (MM)",
        sortable: false,
        sortKey: "thickness",
        render: (row) => getThicknessDisplayValue(row.entry.thickness),
      },
      {
        key: "passLevel",
        label: "Pass",
        sortable: false,
        sortKey: "passLevel",
        render: (row) => row.entry.passLevel,
      },
      {
        key: "setting",
        label: "Setting",
        sortable: false,
        sortKey: "setting",
        render: (row) => row.entry.setting,
      },
      {
        key: "qty",
        label: "Qty",
        sortable: false,
        sortKey: "qty",
        render: (row) => Number(row.entry.qty || 0).toString(),
      },
      {
        key: "sedm",
        label: "SEDM",
        sortable: false,
        render: (row) => {
          const sedm = toYN(row.entry.sedm);
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
          const totalHrs = Number(row.entry.totalHrs || 0);
          return totalHrs ? totalHrs.toFixed(2) : "-";
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
          const sourceEntries = row.kind === "parent" ? row.tableRow.entries : [row.entry];
          const wedmAmount = sourceEntries.reduce((sum, entry) => sum + (Number(entry.totalHrs || 0) * Number(entry.rate || 0)), 0);
          return estimatedTimeFromAmount(wedmAmount);
        },
      },
      ...(isAdmin
        ? [
            {
              key: "totalAmount",
              label: "Total Amount (Rs.)",
              sortable: false,
              sortKey: "totalAmount",
              render: (row: ProgrammerDisplayRow) =>
                row.kind === "parent"
                  ? row.tableRow.groupTotalAmount
                    ? `Rs. ${Math.round(row.tableRow.groupTotalAmount)}`
                    : "-"
                  : row.entry.totalAmount
                    ? `Rs. ${Math.round(row.entry.totalAmount)}`
                    : "-",
            },
          ]
        : []),
      {
        key: "createdBy",
        label: "Created By",
        sortable: false,
        sortKey: "createdBy",
        className: "created-by-cell",
        headerClassName: "created-by-header",
        render: (row) => <CreatedByBadge value={row.entry.createdBy} />,
      },
      {
        key: "createdAt",
        label: "Created At",
        sortable: false,
        sortKey: "createdAt",
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.entry.createdAt);
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
            onView={() => (row.kind === "parent" ? handleViewGroup(row.groupId) : handleViewEntry(row.entry))}
            onEdit={row.kind === "parent" ? () => handleEditJob(row.groupId) : () => handleEditJob(row.groupId)}
            onClone={row.kind === "parent" ? () => handleCloneJob(row.groupId) : undefined}
            onDelete={() => handleDeleteClick(row.groupId, row.entry.customer || "entry")}
            viewLabel={`View ${row.entry.customer || "entry"}`}
            editLabel={`Edit ${row.entry.customer || "entry"}`}
            cloneLabel={`Clone ${row.entry.customer || "entry"}`}
            deleteLabel={`Delete ${row.entry.customer || "entry"}`}
          />
        ),
      },
    ],
    [isAdmin, handleViewGroup, handleViewEntry, handleEditJob, handleCloneJob, handleDeleteClick, toggleGroup]
  );
};
