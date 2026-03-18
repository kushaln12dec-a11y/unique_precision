import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import Toast from "../../components/Toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import CloseIcon from "@mui/icons-material/Close";
import {
  getJobs,
  setQcReportClosedByGroupId,
  updateQcDecisionByGroupId,
} from "../../services/jobApi";
import {
  generateInspectionReport,
  type InspectionReportPayload,
} from "../../services/inspectionReportApi";
import type { JobEntry } from "../../types/job";
import { getDisplayDateTimeParts, parseDateValue } from "../../utils/date";
import { isGroupFullySentToQa } from "../Operator/utils/qaProgress";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import {
  setQcCustomerFilter,
  setQcDescriptionFilter,
  setQcOperatorFilter,
} from "../../store/slices/filtersSlice";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./QC.css";

type QcRow = {
  groupId: string;
  parent: JobEntry;
  entries: JobEntry[];
  totalHrs: number;
  totalAmount: number;
};

const formatDateForTemplate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
};

const QC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [reportCloseCandidate, setReportCloseCandidate] = useState<QcRow | null>(null);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error" | "info";
    visible: boolean;
  }>({
    message: "",
    variant: "info",
    visible: false,
  });
  const { customerFilter, descriptionFilter, operatorFilter } = useAppSelector((state) => state.filters.qc);

  const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "info") => {
    setToast({ message, variant, visible: true });
    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  }, []);

  const closeReportWithConfirm = async () => {
    if (!reportCloseCandidate) {
      setIsCloseConfirmOpen(false);
      return;
    }

    try {
      const updated = await setQcReportClosedByGroupId(reportCloseCandidate.groupId, true);
      setJobs((prev) => {
        const keep = prev.filter((j) => String(j.groupId) !== reportCloseCandidate.groupId);
        return [...keep, ...updated];
      });
      showToast("Inspection report closed and removed from QC queue.", "success");
    } catch (error) {
      console.error("Failed to close QC report item", error);
      showToast("Failed to close QC report.", "error");
    } finally {
      setIsCloseConfirmOpen(false);
      setReportCloseCandidate(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error("Failed to fetch QC jobs", error);
        showToast("Failed to load QC queue.", "error");
      }
    };
    fetchJobs();
  }, [showToast]);

  const tableData = useMemo<QcRow[]>(() => {
    const groups = new Map<string, JobEntry[]>();
    jobs.forEach((job) => {
      const key = String(job.groupId ?? job.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(job);
    });

    return Array.from(groups.entries())
      .filter(
        ([, entries]) =>
          isGroupFullySentToQa(entries) &&
          !entries.every((item) => Boolean((item as any).qcReportClosed))
      )
      .map(([groupId, entries]) => {
        const parent = entries[0];
        return {
          groupId,
          parent,
          entries,
          totalHrs: entries.reduce((sum, item) => sum + Number(item.totalHrs || 0), 0),
          totalAmount: entries.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
        };
      })
      .sort((a, b) => parseDateValue(b.parent.createdAt) - parseDateValue(a.parent.createdAt));
  }, [jobs]);

  const filteredTableData = useMemo(() => {
    return tableData.filter((row) => {
      const customerMatch = customerFilter
        ? String(row.parent.customer || "").toLowerCase().includes(customerFilter.toLowerCase())
        : true;
      const descriptionMatch = descriptionFilter
        ? String(row.parent.description || "").toLowerCase().includes(descriptionFilter.toLowerCase())
        : true;
      const rowOperator = String(row.parent.assignedTo || "")
        .split(",")
        .map((name) => name.trim())
        .find((name) => name && name !== "Unassigned");
      const operatorMatch = operatorFilter
        ? String(rowOperator || "").toLowerCase() === operatorFilter.toLowerCase()
        : true;
      return customerMatch && descriptionMatch && operatorMatch;
    });
  }, [tableData, customerFilter, descriptionFilter, operatorFilter]);

  const qcOperatorOptions = useMemo(() => {
    const names = new Set<string>();
    tableData.forEach((row) => {
      String(row.parent.assignedTo || "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name && name !== "Unassigned")
        .forEach((name) => names.add(name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tableData]);

  const columns = useMemo(
    () => [
      { key: "customer", label: "Customer", render: (row: QcRow) => row.parent.customer || "-" },
      {
        key: "description",
        label: "Description",
        render: (row: QcRow) => {
          const full = row.parent.description || "-";
          return <MarqueeCopyText text={full} />;
        },
      },
      {
        key: "jobRef",
        label: "Job ref",
        headerClassName: "qc-job-ref-col",
        className: "qc-job-ref-cell",
        render: (row: QcRow) => {
          const value = String(row.parent.refNumber || "").trim();
          return value ? `#${value}` : "-";
        },
      },
      {
        key: "qty",
        label: "Qty",
        headerClassName: "qc-qty-col",
        className: "qc-qty-cell",
        render: (row: QcRow) => row.entries.reduce((sum, item) => sum + Number(item.qty || 0), 0).toString(),
      },
      {
        key: "operator",
        label: "Operator",
        render: (row: QcRow) => {
          const raw = String(row.parent.assignedTo || "").trim();
          if (!raw) return "-";
          const owner = raw
            .split(",")
            .map((name) => name.trim())
            .find((name) => name && name !== "Unassigned");
          return owner || "-";
        },
      },
      {
        key: "createdAt",
        label: "Created At",
        render: (row: QcRow) => {
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
        key: "decision",
        label: "Decision",
        headerClassName: "qc-decision-col",
        className: "qc-decision-cell",
        render: (row: QcRow) => (
          <div className="qc-decision-actions">
            <button
              type="button"
              className="qc-approve-btn"
              onClick={async () => {
                try {
                  const updated = await updateQcDecisionByGroupId(row.groupId, "APPROVED");
                  setJobs((prev) => {
                    const keep = prev.filter((j) => String(j.groupId) !== row.groupId);
                    return [...keep, ...updated];
                  });
                  showToast("QC decision updated: Approved.", "success");
                } catch (error) {
                  console.error("Failed to approve QC decision", error);
                  showToast("Failed to update QC decision.", "error");
                }
              }}
            >
              Approve
            </button>
            <button
              type="button"
              className="qc-reject-btn"
              onClick={async () => {
                try {
                  const updated = await updateQcDecisionByGroupId(row.groupId, "REJECTED");
                  setJobs((prev) => {
                    const keep = prev.filter((j) => String(j.groupId) !== row.groupId);
                    return [...keep, ...updated];
                  });
                  showToast("QC decision updated: Rejected.", "success");
                } catch (error) {
                  console.error("Failed to reject QC decision", error);
                  showToast("Failed to update QC decision.", "error");
                }
              }}
            >
              Reject
            </button>
          </div>
        ),
      },
      {
        key: "inspectionReport",
        label: "Inspection Report",
        headerClassName: "qc-inspection-col",
        className: "qc-inspection-cell",
        render: (row: QcRow) => (
          <div className="qc-inspection-report-actions">
            <button
              type="button"
              className="qc-inspection-report-btn"
              onClick={() => navigate(`/qc/inspection-report?groupId=${row.groupId}`)}
            >
              Open
            </button>
            <button
              type="button"
              className="qc-inspection-report-download-btn"
              onClick={async () => {
                const quantityTotal = row.entries.reduce(
                  (sum, item) => sum + Number(item.qty || 0),
                  0
                );
                const seededRows = row.entries.slice(0, 17).map((entry) => ({
                  actualDimension: String(entry.cut ?? ""),
                  tolerance: "",
                  measuringDimension: "",
                  deviation: "",
                  instruments: {
                    hm: false,
                    sg: false,
                    pg: false,
                    vc: false,
                    dm: false,
                  },
                }));
                const decision =
                  row.parent.qcDecision === "APPROVED"
                    ? "ACCEPTED"
                    : row.parent.qcDecision === "REJECTED"
                      ? "REJECTED"
                      : "PENDING";

                const payload: InspectionReportPayload = {
                  groupId: row.groupId,
                  customerId: String(row.parent.customer || ""),
                  date: formatDateForTemplate(new Date()),
                  drawingName: String(row.parent.description || ""),
                  drawingNo: String((row.parent as any).programRefFile || row.parent.refNumber || ""),
                  quantity: quantityTotal > 0 ? String(quantityTotal) : "",
                  decision,
                  rows: seededRows.length > 0 ? seededRows : [],
                  remarks: "",
                  workPieceDamage: "",
                  rightAngleProblem: "",
                  materialProblem: "",
                  inspectedBy: "",
                  approvedBy: "",
                };

                try {
                  const blob = await generateInspectionReport(payload);
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.href = url;
                  link.download = `inspection-report-${row.groupId}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Failed to download inspection report", error);
                  showToast("Failed to download inspection report.", "error");
                }
              }}
            >
              Download
            </button>
            <button
              type="button"
              className="qc-inspection-report-close-btn"
              aria-label="Close inspection report item"
              title="Close and remove from QC queue"
              onClick={() => {
                setReportCloseCandidate(row);
                setIsCloseConfirmOpen(true);
              }}
            >
              <CloseIcon sx={{ fontSize: "0.9rem" }} />
            </button>
          </div>
        ),
      },
    ],
    [navigate, showToast]
  );

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/qc" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="QC" />
        <div className="roleboard-body qc-table-panel">
          <h3>QC Queue</h3>
          <div className="qc-filters">
            <input
              type="text"
              value={customerFilter || descriptionFilter}
              onChange={(e) => {
                const value = e.target.value;
                dispatch(setQcCustomerFilter(value));
                dispatch(setQcDescriptionFilter(value));
              }}
              placeholder="Search customer or description..."
              className="qc-filter-input"
            />
            <select
              className="qc-filter-select"
              value={operatorFilter}
              onChange={(e) => dispatch(setQcOperatorFilter(e.target.value))}
            >
              <option value="">All Operators</option>
              {qcOperatorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <DataTable
            columns={columns as any}
            data={filteredTableData as any}
            getRowKey={(row: QcRow) => row.groupId}
            getRowClassName={(row: QcRow) => {
              return getParentRowClassName(row.parent, row.entries, false);
            }}
            emptyMessage="No rows dispatched to QC yet."
            className="jobs-table-wrapper"
          />
        </div>
      </div>
      {isCloseConfirmOpen && reportCloseCandidate && (
        <ConfirmDeleteModal
          title="Confirm Close Report"
          message="Are you sure you want to close this inspection report?"
          details={[
            { label: "Job Ref", value: `#${reportCloseCandidate.parent.refNumber || reportCloseCandidate.groupId}` },
            { label: "Customer", value: reportCloseCandidate.parent.customer || "-" },
          ]}
          confirmButtonText="Close Report"
          onConfirm={closeReportWithConfirm}
          onCancel={() => {
            setIsCloseConfirmOpen(false);
            setReportCloseCandidate(null);
          }}
        />
      )}
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default QC;
