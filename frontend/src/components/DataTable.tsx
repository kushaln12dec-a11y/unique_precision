import React from "react";
import type { ReactNode } from "react";
import SortIcon from "../pages/Programmer/components/SortIcon";
import AccordionToggle from "../pages/Programmer/components/AccordionToggle";
import Pagination from "./Pagination";
import "./DataTable.css";

export type Column<T> = {
  key: string;
  label: string | ReactNode;
  sortable?: boolean;
  sortKey?: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type ExpandableRow<T> = {
  isExpanded: boolean;
  onToggle: () => void;
  expandedContent: ReactNode;
  ariaLabel: string;
};

type PaginationConfig = {
  currentPage: number;
  entriesPerPage: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
  onEntriesPerPageChange: (entries: number) => void;
  entriesPerPageOptions?: number[];
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  sortField?: string | null;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
  emptyMessage?: string;
  expandableRows?: Map<string | number, ExpandableRow<T>>;
  showAccordion?: boolean;
  getRowKey: (row: T, index: number) => string | number;
  getRowClassName?: (row: T, index: number) => string;
  className?: string;
  pagination?: PaginationConfig;
};

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  sortField = null,
  sortDirection = "asc",
  onSort,
  emptyMessage = "No data available",
  expandableRows,
  showAccordion = false,
  getRowKey,
  getRowClassName,
  className = "",
  pagination,
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.sortKey || column.key);
    }
  };

  const totalColumns = columns.length + (showAccordion ? 1 : 0);

  // Calculate pagination values if pagination is enabled
  const displayData = pagination
    ? data.slice(
        (pagination.currentPage - 1) * pagination.entriesPerPage,
        pagination.currentPage * pagination.entriesPerPage
      )
    : data;

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.totalEntries / pagination.entriesPerPage))
    : 1;

  const indexOfFirstEntry = pagination
    ? (pagination.currentPage - 1) * pagination.entriesPerPage
    : 0;

  const indexOfLastEntry = pagination
    ? Math.min(
        indexOfFirstEntry + pagination.entriesPerPage,
        pagination.totalEntries
      )
    : data.length;

  return (
    <>
      <div className={`data-table-wrapper ${className}`}>
        <table className="data-table">
          <thead>
            <tr>
              {showAccordion && <th className="accordion-header-cell" />}
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`${column.sortable ? "sortable" : ""} ${
                    column.headerClassName || ""
                  }`}
                >
                  <span className="th-content">
                    {column.label}
                    {column.sortable && (
                      <SortIcon
                        field={column.sortKey || column.key}
                        sortField={sortField}
                        sortDirection={sortDirection}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 && (
              <tr>
                <td colSpan={totalColumns} className="empty-state-row">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {displayData.map((row, index) => {
              const rowKey = getRowKey(row, index);
              const expandable = expandableRows?.get(rowKey);
              const rowClassName = getRowClassName
                ? getRowClassName(row, index)
                : "";

              return (
                <React.Fragment key={rowKey}>
                  <tr className={rowClassName}>
                    {showAccordion && expandable && (
                      <AccordionToggle
                        isExpanded={expandable.isExpanded}
                        onToggle={expandable.onToggle}
                        ariaLabel={expandable.ariaLabel}
                      />
                    )}
                    {showAccordion && !expandable && (
                      <td className="accordion-toggle-cell" />
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className={column.className || ""}>
                        {column.render
                          ? column.render(row, index)
                          : String(row[column.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                  {expandable && expandable.isExpanded && (
                    <tr className="child-row">
                      <td colSpan={columns.length} className="child-row-content">
                        {expandable.expandedContent}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalEntries > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={totalPages}
          totalEntries={pagination.totalEntries}
          entriesPerPage={pagination.entriesPerPage}
          indexOfFirstEntry={indexOfFirstEntry}
          indexOfLastEntry={indexOfLastEntry}
          onPageChange={pagination.onPageChange}
          onEntriesPerPageChange={pagination.onEntriesPerPageChange}
          entriesPerPageOptions={pagination.entriesPerPageOptions}
        />
      )}
    </>
  );
}

export default DataTable;
