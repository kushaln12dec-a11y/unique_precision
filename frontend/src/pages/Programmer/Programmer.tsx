import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "./programmerUtils";
import { DustbinIcon, PencilIcon } from "../../utils/icons";
import { formatDateLabel, formatDateValue, parseDateValue } from "../../utils/date";
import "./Programmer.css";

type JobEntry = CutForm & {
  id: number;
  groupId: number;
  totalHrs: number;
  totalAmount: number;
  createdAt: string;
  createdBy: string;
  assignedTo: string;
};

const STORAGE_KEY = "programmerJobs";

const Programmer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cuts, setCuts] = useState<CutForm[]>([DEFAULT_CUT]);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  const isNewJobRoute = location.pathname === "/programmer/newjob";

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as JobEntry[];
        if (Array.isArray(parsed)) {
          setJobs(
            parsed.map((job) => ({
              ...job,
              assignedTo: job.assignedTo || "Unassigned",
              groupId: job.groupId ?? job.id,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to parse jobs from storage", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const totals = useMemo(
    () => cuts.map((cut) => calculateTotals(cut)),
    [cuts]
  );

  const handleNewJob = () => {
    setEditingGroupId(null);
    setCuts([DEFAULT_CUT]);
    navigate("/programmer/newjob");
  };

  const handleCancel = () => {
    if (isNewJobRoute) {
      navigate("/programmer");
    }
    setShowForm(false);
    setCuts([DEFAULT_CUT]);
    setEditingGroupId(null);
  };

  const handleSaveJob = () => {
    const createdBy = getUserDisplayNameFromToken() || "User";
    const createdAt = formatDateLabel(new Date());
    const groupId = Date.now();
    const entries: JobEntry[] = cuts.map((cut, index) => {
      const cutTotals = totals[index] ?? calculateTotals(cut);
      return {
        ...cut,
        id: groupId + index,
        groupId,
        totalHrs: cutTotals.totalHrs,
        totalAmount: cutTotals.totalAmount,
        createdAt,
        createdBy,
        assignedTo: "Unassigned",
      };
    });

    if (editingGroupId) {
      setJobs((prev) => {
        const existing = prev.find((job) => job.groupId === editingGroupId);
        if (!existing) return prev;
        const preserved = {
          createdAt: existing.createdAt,
          createdBy: existing.createdBy,
          assignedTo: existing.assignedTo,
        };
        const updatedEntries = cuts.map((cut, index) => {
          const cutTotals = totals[index] ?? calculateTotals(cut);
          return {
            ...cut,
            id: editingGroupId + index,
            groupId: editingGroupId,
            totalHrs: cutTotals.totalHrs,
            totalAmount: cutTotals.totalAmount,
            createdAt: preserved.createdAt,
            createdBy: preserved.createdBy,
            assignedTo: preserved.assignedTo,
          };
        });
        return [
          ...updatedEntries,
          ...prev.filter((job) => job.groupId !== editingGroupId),
        ];
      });
    } else {
      setJobs((prev) => [...entries, ...prev]);
    }
    handleCancel();
  };

  const handleEditJob = (groupId: number) => {
    const groupCuts = jobs
      .filter((job) => job.groupId === groupId)
      .sort((a, b) => a.id - b.id);
    if (groupCuts.length === 0) return;
    setEditingGroupId(groupId);
    setCuts(
      groupCuts.map((job) => ({
        customer: job.customer,
        rate: job.rate,
        cut: job.cut,
        thickness: job.thickness,
        passLevel: job.passLevel,
        setting: job.setting,
        qty: job.qty,
        sedm: job.sedm,
        sedmSelectionType: job.sedmSelectionType ?? "range",
        sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
        sedmStandardValue: job.sedmStandardValue ?? "",
        sedmLengthType: job.sedmLengthType ?? "min",
        sedmOver20Length: job.sedmOver20Length ?? "",
        sedmLengthValue:
          job.sedmLengthValue ??
          (job.sedmSelectionType === "range"
            ? job.sedmRangeKey ?? ""
            : job.sedmStandardValue ?? ""),
        priority: job.priority,
        description: job.description,
        cutImage: job.cutImage ?? null,
        critical: job.critical,
        pipFinish: job.pipFinish,
      }))
    );
    setShowForm(true);
    navigate("/programmer/newjob");
  };

  const handleDeleteJob = (groupId: number) => {
    setJobs((prev) => prev.filter((job) => job.groupId !== groupId));
  };

  const handleSort = (field: keyof JobEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: keyof JobEntry) => {
    const isActive = sortField === field;
    const isAsc = sortDirection === "asc";
    return (
      <span className="sort-icon">
        <span className={`sort-arrow up ${isActive && isAsc ? "active" : ""}`}>▴</span>
        <span className={`sort-arrow down ${isActive && !isAsc ? "active" : ""}`}>▾</span>
      </span>
    );
  };

  const groupedJobs = useMemo(() => {
    const groups = new Map<number, JobEntry[]>();
    jobs.forEach((job) => {
      const key = job.groupId ?? job.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(job);
    });
    return Array.from(groups.entries()).map(([groupId, entries]) => ({
      groupId,
      entries: entries.sort((a, b) => a.id - b.id),
    }));
  }, [jobs]);

  const sortedGroups = useMemo(() => {
    if (!sortField) return groupedJobs;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...groupedJobs].sort((a, b) => {
      const getValue = (group: { entries: JobEntry[] }) => {
        const first = group.entries[0];
        if (!first) return "";
        if (sortField === "createdAt") return parseDateValue(first.createdAt);
        if (sortField === "createdBy") return first.createdBy.toLowerCase();
        if (sortField === "totalHrs") {
          return group.entries.reduce((sum, entry) => sum + entry.totalHrs, 0);
        }
        if (sortField === "totalAmount") {
          return group.entries.reduce((sum, entry) => sum + entry.totalAmount, 0);
        }
        const rawValue = first[sortField];
        if (rawValue === null || rawValue === undefined) {
          return "";
        }
        if (typeof rawValue === "string") {
          return rawValue.toString().toLowerCase();
        }
        return rawValue;
      };
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [groupedJobs, sortField, sortDirection]);

  return (
    <div className="programmer-container">
      <Sidebar currentPath="/programmer" onNavigate={handleNavigation} />
      <div className="programmer-content">
        <Header title="Programmer Jobs" />
        <div className="programmer-panel">
          <div className="panel-header">
            <h2>Jobs</h2>
            {!isNewJobRoute && (
              <button className="btn-new-job" onClick={handleNewJob}>
                New Job
              </button>
            )}
          </div>

          {(isNewJobRoute || showForm) && (
            <ProgrammerJobForm
              cuts={cuts}
              setCuts={setCuts}
              onSave={handleSaveJob}
              onCancel={handleCancel}
              totals={totals}
              isAdmin={isAdmin}
            />
          )}

          {!isNewJobRoute && (
            <div className="jobs-table-wrapper">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("customer")} className="sortable">
                      <span className="th-content">
                        Customer
                        {renderSortIcon("customer")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("rate")} className="sortable">
                      <span className="th-content">
                        Rate
                        {renderSortIcon("rate")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("cut")} className="sortable">
                      <span className="th-content">
                        Cut (mm)
                        {renderSortIcon("cut")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("thickness")} className="sortable">
                      <span className="th-content">
                        Thickness (mm)
                        {renderSortIcon("thickness")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("passLevel")} className="sortable">
                      <span className="th-content">
                        Pass
                        {renderSortIcon("passLevel")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("setting")} className="sortable">
                      <span className="th-content">
                        Setting
                        {renderSortIcon("setting")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("qty")} className="sortable">
                      <span className="th-content">
                        Qty
                        {renderSortIcon("qty")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("createdAt")} className="sortable">
                      <span className="th-content">
                        Created At
                        {renderSortIcon("createdAt")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("createdBy")} className="sortable">
                      <span className="th-content">
                        Created By
                        {renderSortIcon("createdBy")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("totalHrs")} className="sortable">
                      <span className="th-content">
                        Total Hrs/Piece
                        {renderSortIcon("totalHrs")}
                      </span>
                    </th>
                    <th onClick={() => handleSort("totalAmount")} className="sortable">
                      <span className="th-content">
                        Total Amount (₹)
                        {renderSortIcon("totalAmount")}
                      </span>
                    </th>
                    <th className="action-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.length === 0 && (
                    <tr>
                      <td colSpan={12} className="empty-state-row">
                        No jobs added yet. Use “New Job” to add an entry.
                      </td>
                    </tr>
                  )}
                  {sortedGroups.map((group) =>
                    group.entries.map((job, index) => {
                      const isChild = index > 0;
                      return (
                        <tr key={job.id} className={isChild ? "child-row" : ""}>
                          <td>{isChild ? "" : job.customer || "—"}</td>
                          <td>₹{Number(job.rate || 0).toFixed(2)}</td>
                          <td>{Number(job.cut || 0).toFixed(2)}</td>
                          <td>{Number(job.thickness || 0).toFixed(2)}</td>
                          <td>{job.passLevel}</td>
                          <td>{job.setting}</td>
                          <td>{Number(job.qty || 0).toString()}</td>
                          <td>{isChild ? "" : formatDateValue(job.createdAt)}</td>
                          <td>{isChild ? "" : job.createdBy}</td>
                          <td>{job.totalHrs ? job.totalHrs.toFixed(3) : "—"}</td>
                          <td>
                            {job.totalAmount ? `₹${job.totalAmount.toFixed(2)}` : "—"}
                          </td>
                          <td className="action-cell">
                            {!isChild && (
                              <div className="action-buttons">
                                <button
                                  type="button"
                                  className="action-icon-button"
                                  onClick={() => handleEditJob(group.groupId)}
                                  aria-label={`Edit ${job.customer || "job"}`}
                                >
                                  <PencilIcon fontSize="small" />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-button danger"
                                  onClick={() => handleDeleteJob(group.groupId)}
                                  aria-label={`Delete ${job.customer || "job"}`}
                                >
                                  <DustbinIcon fontSize="small" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Programmer;
