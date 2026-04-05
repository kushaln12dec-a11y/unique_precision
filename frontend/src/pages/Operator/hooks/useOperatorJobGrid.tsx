import { useMemo } from "react";
import type { Column } from "../../../components/DataTable";
import type { JobEntry } from "../../../types/job";
import { estimatedHoursFromAmount, formatEstimatedTime, formatJobRefDisplay, formatMachineLabel, toYN } from "../../../utils/jobFormatting";
import { getThicknessDisplayValue } from "../../Programmer/programmerUtils";
import { matchesSearchQuery } from "../../../utils/searchUtils";
import type { OperatorDisplayRow } from "./useOperatorTable";
import type { OperatorTableRow } from "../types";
import { getGroupQaProgressCounts } from "../utils/qaProgress";

const OPERATOR_GRID_COLUMN_WIDTHS: Record<string, number> = {
  customer: 92,
  programRef: 84,
  programRefFileName: 108,
  description: 118,
  cut: 62,
  thickness: 62,
  passLevel: 48,
  setting: 70,
  qty: 44,
  sedm: 50,
  assignedTo: 142,
  machineNumber: 70,
  estimatedTime: 92,
  totalAmount: 84,
  productionStage: 88,
  createdBy: 68,
  action: 132,
};

const getOperatorGridColumnWidth = (columnKey: string) => OPERATOR_GRID_COLUMN_WIDTHS[columnKey] ?? 70;

const getOperatorHeaderName = (column: Column<OperatorDisplayRow>) => {
  if (typeof column.label === "string") return column.label;
  switch (column.key) {
    case "programRef":
      return "JOB REF";
    case "programRefFileName":
      return "PROGRAM REF FILE NAME";
    case "machineNumber":
      return "MACHINE ASSIGN";
    case "estimatedTime":
      return "ESTIMATED TIME";
    case "totalAmount":
      return "AMOUNT (RS.)";
    case "productionStage":
      return "STATUS";
    case "createdBy":
      return "CREATED BY";
    default:
      return String(column.key);
  }
};

const getOperatorRowSearchValues = (row: OperatorTableRow, isAdmin: boolean) => {
  const counts = getGroupQaProgressCounts(row.entries);

  const stageSummary = [`NOT STARTED ${counts.empty}`, `RUNNING ${counts.running}`, `HOLD ${counts.ready}`, `LOGGED ${counts.saved}`, `QC ${counts.sent}`].join(" ");
  const estimatedTime = formatEstimatedTime(
    estimatedHoursFromAmount(row.entries.reduce((sum, entry) => sum + Number(entry.totalHrs || 0) * Number(entry.rate || 0), 0))
  );
  const values: unknown[] = [estimatedTime, stageSummary];
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
      entry.assignedTo || "Unassign",
      getOperatorRowLiveRunSearchValue(entry),
      formatMachineLabel(String(entry.machineNumber || "").trim() || "-"),
      entry.createdBy || "-",
      ...(isAdmin ? [entry.totalAmount ? `Rs. ${Math.round(entry.totalAmount)}` : "-"] : [])
    );
  });

  return values;
};

const getOperatorRowLiveRunSearchValue = (entry: JobEntry) => {
  const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
  const activeCapture = [...captures].reverse().find((capture) => capture?.startTime && !capture?.endTime);
  if (!activeCapture) return "";
  return [
    "running",
    formatMachineLabel(String(activeCapture.machineNumber || "").trim() || "-"),
    String(activeCapture.opsName || "").trim(),
    `qty ${Math.max(1, Number(activeCapture.fromQty || 1))}`,
  ]
    .filter(Boolean)
    .join(" ");
};

type Params = {
  tableData: OperatorTableRow[];
  expandedGroups: Set<string>;
  columns: Column<OperatorDisplayRow>[];
  isAdmin: boolean;
  jobSearchQuery: string;
  filteredTableData: OperatorTableRow[];
  selectedJobIds: Set<string>;
  selectedEntryIds: Set<string | number>;
  setSelectedJobIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedEntryIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  handleChildRowSelect: (groupId: string, rowKey: string | number, selected: boolean) => void;
};

export const useOperatorJobGrid = ({
  tableData,
  expandedGroups,
  columns,
  isAdmin,
  jobSearchQuery,
  filteredTableData,
  selectedJobIds,
  selectedEntryIds,
  setSelectedJobIds,
  setSelectedEntryIds,
  handleChildRowSelect,
}: Params) => {
  const filteredGridTableData = useMemo(
    () => tableData.filter((row) => matchesSearchQuery(getOperatorRowSearchValues(row, isAdmin), jobSearchQuery)),
    [tableData, isAdmin, jobSearchQuery]
  );

  const operatorGridRows = useMemo<OperatorDisplayRow[]>(
    () =>
      filteredGridTableData.flatMap((row) => {
        const hasChildren = row.entries.length > 1;
        const isExpanded = expandedGroups.has(row.groupId);
        const parentRow: OperatorDisplayRow = {
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
    [expandedGroups, filteredGridTableData]
  );

  const hasJobSearch = jobSearchQuery.length > 0;

  const operatorJobColumnDefs = useMemo(
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
            checked={filteredTableData.length > 0 && filteredTableData.every((row) => selectedJobIds.has(row.groupId))}
            onChange={(event) => {
              const checked = event.target.checked;
              const nextGroupIds = checked ? new Set(filteredTableData.map((row) => row.groupId)) : new Set<string>();
              const nextEntryIds = checked
                ? new Set(
                    filteredTableData.flatMap((row) =>
                      row.entries
                        .map((entry) => (entry.id === undefined || entry.id === null ? null : String(entry.id)))
                        .filter((id): id is string => Boolean(id))
                    )
                  )
                : new Set<string>();
              setSelectedJobIds(nextGroupIds);
              setSelectedEntryIds(nextEntryIds);
            }}
          />
        ),
        cellRenderer: (params: any) => {
          if (params.data?.kind === "child") {
            const entryId = params.data.entry?.id;
            if (entryId === undefined || entryId === null) return null;
            const key = String(entryId);
            return (
              <input
                type="checkbox"
                checked={selectedEntryIds.has(key)}
                onChange={(event) => handleChildRowSelect(String(params.data.groupId), key, event.target.checked)}
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
                const row = params.data.tableRow as OperatorTableRow;
                setSelectedEntryIds((prev) => {
                  const next = new Set(prev);
                  row.entries.forEach((entry) => {
                    if (entry.id === undefined || entry.id === null) return;
                    const key = String(entry.id);
                    if (selected) next.add(key);
                    else next.delete(key);
                  });
                  return next;
                });
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
        const baseWidth = getOperatorGridColumnWidth(column.key);
        return {
          headerName: getOperatorHeaderName(column),
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
    [columns, filteredTableData, handleChildRowSelect, selectedEntryIds, selectedJobIds, setSelectedEntryIds, setSelectedJobIds]
  );

  return {
    filteredGridTableData,
    operatorGridRows,
    operatorJobColumnDefs,
    hasJobSearch,
  };
};
