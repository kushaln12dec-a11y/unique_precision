import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import { getJobs, updateQcDecisionByGroupId } from "../../services/jobApi";
import type { JobEntry } from "../../types/job";
import { formatDisplayDateTime, parseDateValue } from "../../utils/date";
import { isGroupFullySentToQa } from "../Operator/utils/qaProgress";
import { getParentRowClassName } from "../Programmer/utils/priorityUtils";
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

const QC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");

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
      const createdByMatch = createdByFilter
        ? String(row.parent.createdBy || "") === createdByFilter
        : true;
      return customerMatch && descriptionMatch && createdByMatch;
    });
  }, [tableData, customerFilter, descriptionFilter, createdByFilter]);

  const createdByOptions = useMemo(
    () => Array.from(new Set(tableData.map((row) => row.parent.createdBy).filter(Boolean))),
    [tableData]
  );

  const handlePrintReport = (row: QcRow) => {
    const quantity = row.entries.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const reportHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Inspection Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
          h1 { font-size: 22px; margin: 0 0 16px; }
          .grid { display: grid; grid-template-columns: 220px 1fr; row-gap: 10px; column-gap: 12px; }
          .label { font-weight: 700; }
          .value { border-bottom: 1px solid #999; min-height: 20px; }
          .spacer { height: 24px; }
        </style>
      </head>
      <body>
        <h1>Inspection Report</h1>
        <div class="grid">
          <div class="label">Customer ID</div><div class="value">${row.parent.customer || ""}</div>
          <div class="label">Drawing Name</div><div class="value">${row.parent.description || ""}</div>
          <div class="label">Drawing No</div><div class="value">${row.parent.refNumber || row.parent.programRefFile || ""}</div>
          <div class="label">Quantity</div><div class="value">${quantity}</div>
          <div class="label">Inspector</div><div class="value"></div>
          <div class="label">Date</div><div class="value"></div>
          <div class="label">Remarks</div><div class="value"></div>
        </div>
        <div class="spacer"></div>
      </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

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
        key: "print",
        label: "Print",
        render: (row: QcRow) => (
          <button type="button" className="qc-print-btn" onClick={() => handlePrintReport(row)}>
            Print
          </button>
        ),
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
    ],
    []
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
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              placeholder="Search customer..."
              className="qc-filter-input"
            />
            <input
              type="text"
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.target.value)}
              placeholder="Search description..."
              className="qc-filter-input"
            />
            <select
              value={createdByFilter}
              onChange={(e) => setCreatedByFilter(e.target.value)}
              className="qc-filter-select"
            >
              <option value="">All Users</option>
              {createdByOptions.map((name) => (
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
              const baseClass = getParentRowClassName(row.parent, row.entries, false);
              if (row.parent.qcDecision === "APPROVED") return `${baseClass} qc-approved-row`.trim();
              if (row.parent.qcDecision === "REJECTED") return `${baseClass} qc-rejected-row`.trim();
              return baseClass;
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

