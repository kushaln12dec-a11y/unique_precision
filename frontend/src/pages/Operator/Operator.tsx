import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getUsers } from "../../services/userApi";
import type { User } from "../../types/user";
import { getUserRoleFromToken } from "../../utils/auth";
import { formatDateValue, parseDateValue } from "../../utils/date";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";

type JobEntry = {
  id: number;
  customer: string;
  rate: string;
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
  totalHrs: number;
  totalAmount: number;
  createdAt: string;
  createdBy: string;
  assignedTo: string;
};

const STORAGE_KEY = "programmerJobs";

const Operator = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [operatorUsers, setOperatorUsers] = useState<User[]>([]);

  const userRole = getUserRoleFromToken();
  const canAssign = userRole === "ADMIN" || userRole === "OPERATOR";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

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

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const users = await getUsers();
        setOperatorUsers(users.filter((user) => user.role === "OPERATOR"));
      } catch (error) {
        console.error("Failed to fetch operators", error);
      }
    };
    if (canAssign) {
      fetchOperators();
    }
  }, [canAssign]);

  const sortedJobs = useMemo(() => {
    if (!sortField) return jobs;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...jobs].sort((a, b) => {
      const getValue = (job: JobEntry) => {
        if (sortField === "createdAt") return parseDateValue(job.createdAt);
        if (sortField === "createdBy") return job.createdBy.toLowerCase();
        if (typeof job[sortField] === "string") {
          return job[sortField].toString().toLowerCase();
        }
        return job[sortField];
      };
      const valueA = getValue(a);
      const valueB = getValue(b);
      if (valueA < valueB) return -1 * direction;
      if (valueA > valueB) return 1 * direction;
      return 0;
    });
  }, [jobs, sortField, sortDirection]);

  const totalEntries = sortedJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / jobsPerPage));
  const indexOfFirstJob = (currentPage - 1) * jobsPerPage;
  const indexOfLastJob = Math.min(indexOfFirstJob + jobsPerPage, totalEntries);
  const currentJobs = sortedJobs.slice(indexOfFirstJob, indexOfLastJob);

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
        <span className={`sort-arrow up ${isActive && isAsc ? "active" : ""}`}>
          ▴
        </span>
        <span className={`sort-arrow down ${isActive && !isAsc ? "active" : ""}`}>
          ▾
        </span>
      </span>
    );
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setJobsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleAssignChange = (jobId: number, value: string) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, assignedTo: value } : job))
    );
  };

  const handleSelectJob = (jobId: number) => {
    setSelectedJobIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(jobId)) {
        updated.delete(jobId);
      } else {
        updated.add(jobId);
      }
      return updated;
    });
  };

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator" />

          <div className="programmer-panel">
            <div className="panel-header">
              <h2>Jobs</h2>
            </div>
            <div className="jobs-table-wrapper">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th aria-label="Select" />
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
                    <th>Assigned To</th>
                    <th>Total Hrs/Piece</th>
                    <th>Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.length === 0 && (
                    <tr>
                      <td colSpan={13} className="empty-state-row">
                        No jobs added yet. Use “New Job” to add an entry.
                      </td>
                    </tr>
                  )}
                  {currentJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedJobIds.has(job.id)}
                          onChange={() => handleSelectJob(job.id)}
                          aria-label={`Select job ${job.customer || job.id}`}
                        />
                      </td>
                      <td>{job.customer || "—"}</td>
                      <td>₹{Number(job.rate || 0).toFixed(2)}</td>
                      <td>{Number(job.cut || 0).toFixed(2)}</td>
                      <td>{Number(job.thickness || 0).toFixed(2)}</td>
                      <td>{job.passLevel}</td>
                      <td>{job.setting}</td>
                      <td>{Number(job.qty || 0).toString()}</td>
                      <td>{formatDateValue(job.createdAt)}</td>
                      <td>{job.createdBy}</td>
                      <td>
                        {canAssign ? (
                          <select
                            value={job.assignedTo || "Unassigned"}
                            onChange={(event) =>
                              handleAssignChange(job.id, event.target.value)
                            }
                          >
                            <option value="Unassigned">Unassigned</option>
                            {operatorUsers.map((user) => (
                              <option
                                key={user._id}
                                value={`${user.firstName} ${user.lastName}`}
                              >
                                {user.firstName} {user.lastName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{job.assignedTo || "Unassigned"}</span>
                        )}
                      </td>
                      <td>{job.totalHrs ? job.totalHrs.toFixed(3) : "—"}</td>
                      <td>{job.totalAmount ? `₹${job.totalAmount.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sortedJobs.length > 0 && (
                <div className="pagination">
                  <div className="pagination-left">
                    <span className="show-label">Show</span>
                    <select
                      className="entries-selector"
                      value={jobsPerPage}
                      onChange={handleEntriesChange}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                    </select>
                  </div>

                  <div className="pagination-center">
                    <button
                      className="pagination-arrow"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNumber) => (
                        <button
                          key={pageNumber}
                          className={`pagination-page ${
                            currentPage === pageNumber ? "active" : ""
                          }`}
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      )
                    )}

                    <button
                      className="pagination-arrow"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      ›
                    </button>
                  </div>

                  <div className="pagination-right">
                    Showing {totalEntries === 0 ? 0 : indexOfFirstJob + 1} -{" "}
                    {indexOfLastJob} of {totalEntries} entries
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default Operator;
