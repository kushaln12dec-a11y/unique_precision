import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellClickedEvent,
  type GridOptions,
  type ColDef,
  type GetRowIdParams,
  type GridApi,
  type RowClassParams,
} from "ag-grid-community";
import { copyTextWithFallback, getCopyableCellText } from "../utils/clipboard";
import "./LazyAgGrid.css";

ModuleRegistry.registerModules([AllCommunityModule]);

export type LazyPageResult<T> = {
  items: T[];
  hasMore: boolean;
};

type LazyAgGridProps<T> = {
  columnDefs: ColDef<any>[];
  fetchPage: (offset: number, limit: number) => Promise<LazyPageResult<T>>;
  getRowId: (row: any) => string;
  emptyMessage?: string;
  className?: string;
  pageSize?: number;
  refreshKey?: string | number;
  rowHeight?: number;
  rows?: T[];
  onRowsChange?: (rows: T[]) => void;
  transformRows?: (rows: T[]) => any[];
  getRowClass?: (params: RowClassParams<any>) => string;
  isFullWidthRow?: (row: any) => boolean;
  fullWidthCellRenderer?: (params: any) => React.ReactNode;
  getRowHeight?: (params: { data: any }) => number | undefined;
  fitColumns?: boolean;
};

function LazyAgGrid<T extends object>({
  columnDefs,
  fetchPage,
  getRowId,
  emptyMessage = "No data available.",
  className = "",
  pageSize = 15,
  refreshKey,
  rowHeight = 56,
  rows,
  onRowsChange,
  transformRows,
  getRowClass,
  isFullWidthRow,
  fullWidthCellRenderer,
  getRowHeight,
  fitColumns = true,
}: LazyAgGridProps<T>) {
  const [internalRows, setInternalRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const gridApiRef = useRef<GridApi<T> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const fetchPageRef = useRef(fetchPage);
  const loadPageRef = useRef<(reset?: boolean) => Promise<void>>(async () => {});

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      unSortIcon: true,
      resizable: false,
      suppressMovable: true,
      minWidth: 64,
      wrapHeaderText: true,
      autoHeaderHeight: true,
    }),
    []
  );

  const effectiveColumnDefs = useMemo<ColDef<any>[]>(
    () =>
      columnDefs.map((columnDef) => ({
        ...columnDef,
        sortable: true,
        unSortIcon: true,
      })),
    [columnDefs]
  );

  const rowSelection = useMemo<GridOptions<T>["rowSelection"]>(
    () => ({
      mode: "multiRow",
      enableClickSelection: false,
      checkboxes: false,
      headerCheckbox: false,
    }),
    []
  );

  const sizeColumns = () => {
    if (!fitColumns) return;
    window.requestAnimationFrame(() => {
      const api = gridApiRef.current;
      if (!api) return;
      try {
        api.sizeColumnsToFit();
      } catch {
      }
    });
  };

  const sourceRows = rows ?? internalRows;
  const displayRows = useMemo(
    () => (transformRows ? transformRows(sourceRows) : sourceRows),
    [sourceRows, transformRows]
  );

  const estimatedContentHeight = useMemo(() => {
    if (displayRows.length === 0) return 0;
    const headerHeight = 56;
    const bodyHeight = displayRows.reduce((sum, row) => {
      const nextHeight = getRowHeight ? getRowHeight({ data: row }) : undefined;
      return sum + (nextHeight ?? rowHeight);
    }, 0);
    return headerHeight + bodyHeight + 2;
  }, [displayRows, getRowHeight, rowHeight]);

  const fitHeightToContent = !loading && !hasMore && displayRows.length > 0;

  const updateRows = (updater: (previous: T[]) => T[]) => {
    const nextRows = updater(sourceRows);
    if (onRowsChange) {
      onRowsChange(nextRows);
      return nextRows;
    }
    setInternalRows(nextRows);
    return nextRows;
  };

  const syncOverlay = () => {
    const api = gridApiRef.current;
    if (!api) return;
    if (loadingRef.current) {
      return;
    }
    if (!loadingRef.current && sourceRows.length === 0) {
      api.showNoRowsOverlay();
      return;
    }
    api.hideOverlay();
  };

  const loadPage = async (reset = false) => {
    if (loadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    syncOverlay();

    const nextOffset = reset ? 0 : offsetRef.current;

    try {
      const result = await fetchPageRef.current(nextOffset, pageSize);
      updateRows((prev) => (reset ? result.items : [...prev, ...result.items]));
      const nextPageOffset = nextOffset + pageSize;
      offsetRef.current = nextPageOffset;
      setOffset(nextPageOffset);
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      window.setTimeout(syncOverlay, 0);
    }
  };

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  useEffect(() => {
    loadPageRef.current = loadPage;
  }, [loadPage]);

  useEffect(() => {
    fetchPageRef.current = fetchPage;
    if (onRowsChange) {
      onRowsChange([]);
    } else {
      setInternalRows([]);
    }
    offsetRef.current = 0;
    setOffset(0);
    setHasMore(true);
    hasMoreRef.current = true;
    loadingRef.current = false;
    void loadPage(true);
  }, [pageSize, refreshKey]);

  useEffect(() => {
    syncOverlay();
  }, [sourceRows, loading]);

  useEffect(() => {
    sizeColumns();
  }, [displayRows.length, effectiveColumnDefs, fitColumns]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (remaining < 180) {
        void loadPageRef.current(false);
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCellClicked = async (event: CellClickedEvent<T>) => {
    const cellElement = event.event?.target instanceof HTMLElement
      ? event.event.target.closest(".ag-cell")
      : null;
    const text = getCopyableCellText(event.event?.target || null, cellElement as HTMLElement | null);
    if (!text) return;
    await copyTextWithFallback(text);
  };

  return (
    <div
      ref={containerRef}
      className={`lazy-ag-grid-shell ${className}`}
      style={
        fitHeightToContent
          ? { height: `min(${Math.max(estimatedContentHeight, 180)}px, calc(100vh - 280px))` }
          : undefined
      }
    >
      <AgGridReact<T>
        theme={themeQuartz}
        rowData={displayRows}
        columnDefs={effectiveColumnDefs}
        defaultColDef={defaultColDef}
        rowHeight={rowHeight}
        getRowHeight={getRowHeight}
        animateRows={false}
        suppressCellFocus={true}
        rowSelection={rowSelection}
        loading={loading && sourceRows.length === 0}
        overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading...</span>'
        overlayNoRowsTemplate={`<span class="ag-overlay-loading-center">${emptyMessage}</span>`}
        getRowId={(params: GetRowIdParams<T>) => getRowId(params.data)}
        getRowClass={getRowClass}
        isFullWidthRow={(params) => (isFullWidthRow ? isFullWidthRow(params.rowNode.data) : false)}
        fullWidthCellRenderer={fullWidthCellRenderer as any}
        onGridReady={(event) => {
          gridApiRef.current = event.api;
          viewportRef.current = containerRef.current?.querySelector(".ag-body-viewport") || null;
          syncOverlay();
          sizeColumns();
        }}
        onGridSizeChanged={() => {
          sizeColumns();
        }}
        onCellClicked={handleCellClicked}
      />
    </div>
  );
}

export default LazyAgGrid;
