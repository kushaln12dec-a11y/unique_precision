import { useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import { formatDisplayDateTime } from "../../../utils/date";
import { estimatedTimeFromAmount, formatJobRefDisplay, toYN } from "../../../utils/jobFormatting";
import { matchesSearchQuery } from "../../../utils/searchUtils";
import type { JobEntry } from "../../../types/job";
import type { TableRow } from "../utils/jobDataTransform";
import { getThicknessDisplayValue } from "../programmerUtils";
import { useJobData } from "./useJobData";
import type { ProgrammerDisplayRow } from "./useTableColumns";

const getProgrammerHeaderName = (column: Column<ProgrammerDisplayRow>) => {
  if (typeof column.label === "string") return column.label;
  switch (column.key) {
    case "programRef":
      return "JOB REF";
    case "programRefFileName":
      return "PROGRAM REF FILE NAME";
    case "estimatedTime":
      return "ESTIMATED TIME";
    case "totalHrs":
      return "CUT LENGTH HRS";
    case "totalAmount":
      return "TOTAL AMOUNT (RS.)";
    case "createdBy":
      return "CREATED BY";
    case "createdAt":
      return "CREATED AT";
    default:
      return String(column.key);
  }
};

const PROGRAMMER_GRID_COLUMN_WIDTHS: Record<string, number> = {
  customer: 84,
  programRef: 76,
  programRefFileName: 98,
  description: 104,
  cut: 56,
  thickness: 56,
  passLevel: 44,
  setting: 58,
  qty: 38,
  sedm: 44,
  totalHrs: 76,
  estimatedTime: 72,
  totalAmount: 92,
  createdBy: 64,
  createdAt: 92,
  action: 116,
};

const getProgrammerGridColumnWidth = (columnKey: string) =>
  PROGRAMMER_GRID_COLUMN_WIDTHS[columnKey] ?? 64;

const getProgrammerRowSearchValues = (row: TableRow, isAdmin: boolean) => {
  const values: unknown[] = [
    estimatedTimeFromAmount(
      row.entries.reduce((sum, entry) => sum + (Number(entry.totalHrs || 0) * Number(entry.rate || 0)), 0)
    ),
  ];

  if (isAdmin) values.push(row.groupTotalAmount ? `Rs. ${Math.round(row.groupTotalAmount)}` : "-");

  row.entries.forEach((entry) => {
    values.push(
      entry.customer || "-",
      formatJobRefDisplay(entry.refNumber || ""),
      String((entry as any).programRefFile || (entry as any).programRefFileName || "-"),
      entry.description || "-",
      Math.round(Number(entry.cut || 0)),
      getThicknessDisplayValue(entry.thickness),
      entry.passLevel || "-",
      entry.setting || "-",
      Number(entry.qty || 0).toString(),
      toYN(entry.sedm),
      Number(entry.totalHrs || 0) ? Number(entry.totalHrs || 0).toFixed(2) : "-",
      estimatedTimeFromAmount(Number(entry.totalHrs || 0) * Number(entry.rate || 0)),
      entry.createdBy || "-",
      formatDisplayDateTime(entry.createdAt),
      ...(isAdmin ? [entry.totalAmount ? `Rs. ${Math.round(entry.totalAmount)}` : "-"] : []),
    );
  });

  return values;
};

type UseProgrammerGridArgs = {
  programmerGridJobs: JobEntry[];
  sortField: keyof JobEntry | null;
  sortDirection: "asc" | "desc";
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  isAdmin: boolean;
  selectedChildRows: Set<string | number>;
  onChildRowSelect: (rowKey: string | number, selected: boolean) => void;
  handleEditJob: (groupId: string) => void;
  handleDeleteClick: (groupId: string, customer: string) => void;
  handleViewEntry: (entry: JobEntry) => Promise<void>;
  selectedJobIds: Set<string>;
  setSelectedJobIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  customerFilter: string;
  descriptionFilter: string;
  columns: Column<ProgrammerDisplayRow>[];
};

export const useProgrammerGrid = ({
  programmerGridJobs,
  sortField,
  sortDirection,
  expandedGroups,
  toggleGroup,
  isAdmin,
  selectedChildRows,
  onChildRowSelect,
  handleEditJob,
  handleDeleteClick,
  handleViewEntry,
  selectedJobIds,
  setSelectedJobIds,
  customerFilter,
  descriptionFilter,
  columns,
}: UseProgrammerGridArgs) => {
  const { tableData } = useJobData({
    jobs: programmerGridJobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
    isAdmin,
    onViewJob: handleViewEntry,
    onEdit: handleEditJob,
    onDelete: handleDeleteClick,
    showChildCheckboxes: true,
    selectedChildRows,
    onChildRowSelect,
  });

  const jobSearchQuery = String(customerFilter || descriptionFilter || "").trim();
  const hasJobSearch = jobSearchQuery.length > 0;

  const filteredProgrammerTableData = useMemo(
    () => tableData.filter((row) => matchesSearchQuery(getProgrammerRowSearchValues(row, isAdmin), jobSearchQuery)),
    [tableData, isAdmin, jobSearchQuery]
  );

  const programmerGridRows = useMemo<ProgrammerDisplayRow[]>(
    () =>
      filteredProgrammerTableData.flatMap((row) => {
        const hasChildren = row.entries.length > 1;
        const isExpanded = expandedGroups.has(row.groupId);
        const parentRow: ProgrammerDisplayRow = {
          kind: "parent",
          groupId: row.groupId,
          tableRow: row,
          entry: row.parent,
          childIndex: null,
          hasChildren,
          isExpanded,
        };
        if (!hasChildren || !isExpanded) return [parentRow];
        return [
          parentRow,
          ...row.entries.map((entry, index) => ({
            kind: "child" as const,
            groupId: row.groupId,
            tableRow: row,
            entry,
            childIndex: index,
            hasChildren: false,
            isExpanded: false,
          })),
        ];
      }),
    [filteredProgrammerTableData, expandedGroups]
  );

  const programmerJobColumnDefs = useMemo(
    () => [
      {
        headerName: "",
        field: "__select__",
        width: 34,
        minWidth: 34,
        maxWidth: 34,
        sortable: false,
        resizable: false,
        suppressSizeToFit: true,
        suppressMovable: true,
        headerComponent: () => (
          <input
            type="checkbox"
            checked={filteredProgrammerTableData.length > 0 && filteredProgrammerTableData.every((row) => selectedJobIds.has(row.groupId))}
            onChange={(event) => {
              const checked = event.target.checked;
              setSelectedJobIds(checked ? new Set(filteredProgrammerTableData.map((row) => row.groupId)) : new Set<string>());
            }}
          />
        ),
        cellRenderer: (params: any) => {
          if (params.data?.kind === "child") {
            const entryId = params.data.entry?.id;
            if (entryId === undefined || entryId === null) return null;
            const rowKey = String(entryId);
            return (
              <input
                type="checkbox"
                checked={selectedChildRows.has(rowKey)}
                onChange={(event) => onChildRowSelect(rowKey, event.target.checked)}
                onClick={(event) => event.stopPropagation()}
              />
            );
          }

          if (params.data?.kind !== "parent") return null;
          const groupId = String(params.data.groupId);
          return (
            <input
              type="checkbox"
              checked={selectedJobIds.has(groupId)}
              onChange={(event) => {
                const selected = event.target.checked;
                setSelectedJobIds((prev) => {
                  const next = new Set(prev);
                  if (selected) next.add(groupId);
                  else next.delete(groupId);
                  return next;
                });
              }}
              onClick={(event) => event.stopPropagation()}
            />
          );
        },
      },
      ...columns.map((column) => {
        const baseWidth = getProgrammerGridColumnWidth(column.key);
        return {
          headerName: getProgrammerHeaderName(column),
          field: column.key,
          width: baseWidth,
          minWidth: baseWidth,
          resizable: false,
          suppressMovable: true,
          cellClass: column.className,
          headerClass: column.headerClassName,
          cellRenderer: column.render
            ? (params: any) => column.render?.(params.data, params.node?.rowIndex || 0)
            : (params: any) => String(params.data?.entry?.[column.key] ?? "-"),
        };
      }),
    ],
    [columns, filteredProgrammerTableData, onChildRowSelect, selectedChildRows, selectedJobIds, setSelectedJobIds]
  );

  return {
    filteredProgrammerTableData,
    programmerGridRows,
    programmerJobColumnDefs,
    hasJobSearch,
  };
};
