import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getUserDisplayNameFromToken, getUserRoleFromToken } from "../../utils/auth";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import { calculateTotals, DEFAULT_CUT, type CutForm } from "./programmerUtils";
import "./Programmer.css";

type JobEntry = CutForm & {
  id: number;
  totalHrs: number;
  totalAmount: number;
  createdAt: string;
  createdBy: string;
  assignedTo: string;
};

const STORAGE_KEY = "programmerJobs";

const formatDateTime = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const Programmer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [cuts, setCuts] = useState<CutForm[]>([DEFAULT_CUT]);
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
    navigate("/programmer/newjob");
  };

  const handleCancel = () => {
    if (isNewJobRoute) {
      navigate("/programmer");
    }
    setShowForm(false);
    setCuts([DEFAULT_CUT]);
  };

  const handleSaveJob = () => {
    const createdBy = getUserDisplayNameFromToken() || "User";
    const createdAt = formatDateTime(new Date());
    const entries: JobEntry[] = cuts.map((cut, index) => {
      const cutTotals = totals[index] ?? calculateTotals(cut);
      return {
        ...cut,
        id: Date.now() + index,
        totalHrs: cutTotals.totalHrs,
        totalAmount: cutTotals.totalAmount,
        createdAt,
        createdBy,
        assignedTo: "Unassigned",
      };
    });

    setJobs((prev) => [...entries, ...prev]);
    handleCancel();
  };

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
                    <th>Customer</th>
                    <th>Rate</th>
                    <th>Cut (mm)</th>
                    <th>Thickness (mm)</th>
                    <th>Pass</th>
                    <th>Setting</th>
                    <th>Qty</th>
                    <th>Created At</th>
                    <th>Created By</th>
                    <th>Assigned To</th>
                    <th>Total Hrs/Piece</th>
                    <th>Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={12} className="empty-state-row">
                        No jobs added yet. Use “New Job” to add an entry.
                      </td>
                    </tr>
                  )}
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.customer || "—"}</td>
                      <td>₹{Number(job.rate || 0).toFixed(2)}</td>
                      <td>{Number(job.cut || 0).toFixed(2)}</td>
                      <td>{Number(job.thickness || 0).toFixed(2)}</td>
                      <td>{job.passLevel}</td>
                      <td>{job.setting}</td>
                      <td>{Number(job.qty || 0).toString()}</td>
                      <td>{job.createdAt}</td>
                      <td>{job.createdBy}</td>
                      <td>{job.assignedTo || "Unassigned"}</td>
                      <td>{job.totalHrs ? job.totalHrs.toFixed(3) : "—"}</td>
                      <td>{job.totalAmount ? `₹${job.totalAmount.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
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
