import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import LazyAgGrid from "../../components/LazyAgGrid";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { getQcJobsPage, setQcReportClosedByGroupId, updateQcDecisionByGroupId } from "../../services/jobApi";
import { generateInspectionReport, type InspectionReportPayload } from "../../services/inspectionReportApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setQcCustomerFilter, setQcDescriptionFilter, setQcOperatorFilter } from "../../store/slices/filtersSlice";
import { matchesSearchQuery } from "../../utils/searchUtils";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import QcFilters from "./components/QcFilters";
import { createQcColumns } from "./qcColumns";
import { buildQcRows, getPrimaryOperatorName, getQcRowSearchValues, type QcRow } from "./qcUtils";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./QC.css";

const QC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { customerFilter, descriptionFilter, operatorFilter } = useAppSelector((state) => state.filters.qc);
  const [qcGridJobs, setQcGridJobs] = useState<JobEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportCloseCandidate, setReportCloseCandidate] = useState<QcRow | null>(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "info",
    visible: false,
  });

  const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "info") => {
    setToast({ message, variant, visible: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const page = await getQcJobsPage({ offset: 0, limit: 100 });
        setQcGridJobs(page.items);
      } catch {
        showToast("Failed to load QC queue.", "error");
      } finally {
        setLoading(false);
      }
    };
    void fetchJobs();
  }, [showToast]);

  const tableData = useMemo(() => buildQcRows(qcGridJobs), [qcGridJobs]);
  const filteredTableData = useMemo(() => {
    const searchQuery = (customerFilter || descriptionFilter).trim();
    return tableData.filter((row) => {
      const searchMatch = matchesSearchQuery(getQcRowSearchValues(row), searchQuery);
      const operatorMatch = operatorFilter
        ? getPrimaryOperatorName(row.entry.assignedTo || row.parent.assignedTo).toLowerCase() === operatorFilter.toLowerCase()
        : true;
      return searchMatch && operatorMatch;
    });
  }, [customerFilter, descriptionFilter, operatorFilter, tableData]);

  const qcOperatorOptions = useMemo(() => {
    const names = new Set<string>();
    tableData.forEach((row) => {
      const name = getPrimaryOperatorName(row.entry.assignedTo || row.parent.assignedTo);
      if (name && name !== "-") names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tableData]);

  const replaceGroupJobs = (groupId: string, updated: JobEntry[]) => {
    setQcGridJobs((prev) => [...prev.filter((job) => String(job.groupId) !== groupId), ...updated]);
  };

  const updateDecision = async (groupId: string, decision: "APPROVED" | "REJECTED", label: string) => {
    try {
      replaceGroupJobs(groupId, await updateQcDecisionByGroupId(groupId, decision));
      showToast(`QC decision updated: ${label}.`, "success");
    } catch {
      showToast("Failed to update QC decision.", "error");
    }
  };

  const downloadInspectionReport = async (payload: InspectionReportPayload, filename: string) => {
    const blob = await generateInspectionReport(payload);
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () =>
      createQcColumns({
        navigate: (path) => navigate(path),
        showToast,
        updateDecision,
        downloadInspectionReport,
        openClosePrompt: (row) => {
          setReportCloseCandidate(row);
          setIsCloseConfirmOpen(true);
        },
      }),
    [navigate, showToast]
  );

  const qcColumnDefs = useMemo(
    () =>
      columns.map((column: any) => ({
        headerName: typeof column.label === "string" ? column.label : String(column.key),
        field: column.key,
        minWidth: column.key === "description" ? 240 : column.key === "inspectionReport" || column.key === "decision" ? 220 : 130,
        cellClass: column.className,
        headerClass: column.headerClassName,
        cellRenderer: column.render ? (params: any) => column.render?.(params.data, params.node?.rowIndex || 0) : undefined,
      })),
    [columns]
  );

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/qc" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="QC" />
        <div className="roleboard-body qc-table-panel">
          <h3>QC Queue</h3>
          {loading && qcGridJobs.length === 0 ? (
            <AppLoader message="Loading QC queue..." />
          ) : (
            <>
              <QcFilters
                searchValue={customerFilter || descriptionFilter}
                operatorFilter={operatorFilter}
                operatorOptions={qcOperatorOptions}
                onSearchChange={(value) => {
                  dispatch(setQcCustomerFilter(value));
                  dispatch(setQcDescriptionFilter(value));
                }}
                onOperatorChange={(value) => dispatch(setQcOperatorFilter(value))}
              />
              <LazyAgGrid
                columnDefs={qcColumnDefs as any}
                fetchPage={async (offset, limit) => {
                  const page = await getQcJobsPage({ offset, limit });
                  return { items: page.items, hasMore: page.hasMore };
                }}
                rows={qcGridJobs}
                onRowsChange={setQcGridJobs}
                transformRows={() => filteredTableData}
                getRowId={(row: QcRow) => row.qcItemId}
                getRowClass={(params) => getParentRowClassName(params.data.parent, params.data.entries, false)}
                emptyMessage="No rows dispatched to QC yet."
                className="jobs-table-wrapper"
              />
            </>
          )}
        </div>
      </div>

      {isCloseConfirmOpen && reportCloseCandidate && (
        <ConfirmDeleteModal
          title="Confirm Close Report"
          message="Are you sure you want to close this inspection report?"
          details={[
            { label: "QC Item", value: reportCloseCandidate.quantityLabel },
            { label: "Job Ref", value: reportCloseCandidate.entry.refNumber || reportCloseCandidate.groupId },
            { label: "Customer", value: reportCloseCandidate.entry.customer || reportCloseCandidate.parent.customer || "-" },
          ]}
          confirmButtonText="Close Report"
          onConfirm={async () => {
            try {
              replaceGroupJobs(reportCloseCandidate.groupId, await setQcReportClosedByGroupId(reportCloseCandidate.groupId, true));
              showToast("Inspection report closed and removed from QC queue.", "success");
            } catch {
              showToast("Failed to close QC report.", "error");
            } finally {
              setIsCloseConfirmOpen(false);
              setReportCloseCandidate(null);
            }
          }}
          onCancel={() => {
            setIsCloseConfirmOpen(false);
            setReportCloseCandidate(null);
          }}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={() => setToast((prev) => ({ ...prev, visible: false }))} />
    </div>
  );
};

export default QC;
import type { JobEntry } from "../../types/job";
