import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import LazyAgGrid from "../../components/LazyAgGrid";
import Toast from "../../components/Toast";
import AppLoader from "../../components/AppLoader";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import type { JobEntry } from "../../types/job";
import { getQcJobsPage, setQcReportClosedByGroupId, updateQcDecisionByGroupId } from "../../services/jobApi";
import { generateInspectionReport, type InspectionReportPayload } from "../../services/inspectionReportApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setQcCustomerFilter, setQcDescriptionFilter, setQcOperatorFilter } from "../../store/slices/filtersSlice";
import { matchesSearchQuery } from "../../utils/searchUtils";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import QcFilters from "./components/QcFilters";
import QcReportTemplateModal from "./components/QcReportTemplateModal";
import { createQcColumns } from "./qcColumns";
import { buildQcRows, formatDateForTemplate, getDrawingNo, getPrimaryOperatorName, getQcRowSearchValues, type QcRow } from "./qcUtils";
import { useJobSync } from "../../hooks/useJobSync";
import { getUserDisplayNameFromToken } from "../../utils/auth";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./QC.css";
import "./components/QcReportTemplateModal.css";

const QC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { customerFilter, descriptionFilter, operatorFilter } = useAppSelector((state) => state.filters.qc);
  const [qcGridJobs, setQcGridJobs] = useState<JobEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportCloseCandidate, setReportCloseCandidate] = useState<QcRow | null>(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [templateSelection, setTemplateSelection] = useState<{
    row: QcRow;
    action: "OPEN" | "DOWNLOAD";
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "info",
    visible: false,
  });

  const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "info") => {
    setToast({ message, variant, visible: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2500);
  }, []);
  const currentUserDisplayName = (getUserDisplayNameFromToken() || "").trim().toUpperCase();

  const loadQcJobs = useCallback(async () => {
    try {
      setLoading(true);
      const page = await getQcJobsPage({ offset: 0, limit: 100 });
      setQcGridJobs(page.items);
    } catch {
      showToast("Failed to load QC queue.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    void loadQcJobs();
  }, [loadQcJobs]);

  useJobSync((event) => {
    if (event.updatedBy && event.updatedBy === currentUserDisplayName) {
      return;
    }
    void loadQcJobs();
  });

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

  const buildReportPayload = useCallback(
    (row: QcRow, templateVariant: "DEFAULT" | "TOOLING_SPARE"): InspectionReportPayload => ({
      groupId: row.groupId,
      jobId: row.jobId,
      quantityNumber: row.quantityNumber,
      quantityFrom: row.quantityFrom,
      quantityTo: row.quantityTo,
      quantityCount: row.quantityCount,
      templateVariant,
      customerId: String(row.entry.customer || row.parent.customer || ""),
      date: formatDateForTemplate(new Date()),
      drawingName: String(row.entry.description || row.parent.description || ""),
      drawingNo: getDrawingNo(row.entry) || getDrawingNo(row.parent),
      toolIdentificationNo: getDrawingNo(row.entry) || getDrawingNo(row.parent),
      consumablePartIdentificationNo: getDrawingNo(row.entry) || getDrawingNo(row.parent),
      consumablePartName: String(row.entry.description || row.parent.description || ""),
      quantity: String(Math.max(1, row.quantityCount || 1)),
      decision: row.parent.qcDecision === "APPROVED" ? "ACCEPTED" : row.parent.qcDecision === "REJECTED" ? "REJECTED" : "PENDING",
      rows: Array.from({ length: Math.max(1, row.quantityCount || 1) }, () => ({
        actualDimension: String(row.entry.cut ?? ""),
        tolerance: "",
        measuringDimension: "",
        deviation: "",
        instruments: { hm: false, sg: false, pg: false, vc: false, dm: false },
      })),
      remarks: "",
      workPieceDamage: "",
      rightAngleProblem: "",
      materialProblem: "",
      inspectedBy: "",
      approvedBy: "",
    }),
    []
  );

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

  const handleTemplateSelection = async (variant: "DEFAULT" | "TOOLING_SPARE") => {
    if (!templateSelection) return;
    const { row, action } = templateSelection;
    const payload = buildReportPayload(row, variant);
    try {
      if (action === "OPEN") {
        const params = new URLSearchParams({
          groupId: row.groupId,
          jobId: row.jobId,
          quantityNumber: String(row.quantityNumber),
          quantityFrom: String(row.quantityFrom),
          quantityTo: String(row.quantityTo),
          quantityCount: String(row.quantityCount),
          templateVariant: variant,
        });
        navigate(`/qc/inspection-report?${params.toString()}`);
      } else {
        await downloadInspectionReport(payload, `inspection-report-${row.quantityLabel}.pdf`);
      }
    } catch {
      showToast("Failed to process inspection report action.", "error");
    } finally {
      setTemplateSelection(null);
    }
  };

  const columns = useMemo(
    () =>
      createQcColumns({
        updateDecision,
        onOpenReport: (row) => setTemplateSelection({ row, action: "OPEN" }),
        onDownloadReport: (row) => setTemplateSelection({ row, action: "DOWNLOAD" }),
        openClosePrompt: (row) => {
          setReportCloseCandidate(row);
          setIsCloseConfirmOpen(true);
        },
      }),
    [updateDecision]
  );

  const handleClearAllFilters = () => {
    dispatch(setQcCustomerFilter(""));
    dispatch(setQcDescriptionFilter(""));
    dispatch(setQcOperatorFilter(""));
  };

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
                onClearAll={handleClearAllFilters}
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
                emptyMessage="No data available."
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
            { label: "Report Type", value: reportCloseCandidate.reportScopeLabel },
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

      {templateSelection && (
        <QcReportTemplateModal
          isOpen={true}
          onClose={() => setTemplateSelection(null)}
          actionLabel={templateSelection.action === "OPEN" ? "Open" : "Download"}
          onSelectTemplate={(variant) => void handleTemplateSelection(variant)}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onClose={() => setToast((prev) => ({ ...prev, visible: false }))} />
    </div>
  );
};

export default QC;
