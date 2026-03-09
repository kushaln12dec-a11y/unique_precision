import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import { getJobs, updateQcDecisionByGroupId } from "../../services/jobApi";
import {
  generateInspectionReport,
  type InspectionReportPayload,
} from "../../services/inspectionReportApi";
import type { JobEntry } from "../../types/job";
import { formatDisplayDateTime, parseDateValue } from "../../utils/date";
import { isGroupFullySentToQa } from "../Operator/utils/qaProgress";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setQcCustomerFilter,
  setQcDescriptionFilter,
} from "../../store/slices/filtersSlice";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "./QC.css";

type QcRow = {
  groupId: number;
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
  const { customerFilter, descriptionFilter } = useAppSelector((state) => state.filters.qc);

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
      }
    };
    fetchJobs();
  }, []);

  const tableData = useMemo<QcRow[]>(() => {
    const groups = new Map<number, JobEntry[]>();
    jobs.forEach((job) => {
      const key = job.groupId ?? Number(job.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(job);
    });

    return Array.from(groups.entries())
      .filter(([, entries]) => isGroupFullySentToQa(entries))
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
      return customerMatch && descriptionMatch;
    });
  }, [tableData, customerFilter, descriptionFilter]);

  const columns = useMemo(
    () => [
      { key: "customer", label: "Customer", render: (row: QcRow) => row.parent.customer || "-" },
      { key: "description", label: "Description", render: (row: QcRow) => row.parent.description || "-" },
      {
        key: "jobRef",
        label: "Job ref",
        render: (row: QcRow) => {
          const value = String(row.parent.refNumber || "").trim();
          return value ? `#${value}` : "-";
        },
      },
      { key: "qty", label: "Qty", render: (row: QcRow) => row.entries.reduce((sum, item) => sum + Number(item.qty || 0), 0).toString() },
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
        render: (row: QcRow) => formatDisplayDateTime(row.parent.createdAt),
      },
      {
        key: "decision",
        label: "Decision",
        render: (row: QcRow) => (
          <div className="qc-decision-actions">
            <button
              type="button"
              className="qc-approve-btn"
              onClick={async () => {
                const updated = await updateQcDecisionByGroupId(row.groupId, "APPROVED");
                setJobs((prev) => {
                  const keep = prev.filter((j) => j.groupId !== row.groupId);
                  return [...keep, ...updated];
                });
              }}
            >
              Approve
            </button>
            <button
              type="button"
              className="qc-reject-btn"
              onClick={async () => {
                const updated = await updateQcDecisionByGroupId(row.groupId, "REJECTED");
                setJobs((prev) => {
                  const keep = prev.filter((j) => j.groupId !== row.groupId);
                  return [...keep, ...updated];
                });
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
                }
              }}
            >
              Download
            </button>
          </div>
        ),
      },
    ],
    [navigate]
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
          </div>
          <DataTable
            columns={columns as any}
            data={filteredTableData as any}
            getRowKey={(row: QcRow) => row.groupId}
            getRowClassName={(row: QcRow) => {
              return getParentRowClassName(row.parent, row.entries, false);
            }}
            emptyMessage="No rows dispatched to QA yet."
            className="jobs-table-wrapper"
          />
        </div>
      </div>
    </div>
  );
};

export default QC;

