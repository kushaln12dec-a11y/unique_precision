import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import Toast from "../../components/Toast";
import DownloadIcon from "@mui/icons-material/Download";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../utils/tokenDebug";
import { getUsers } from "../../services/userApi";
import { getEmployeeLogs, rejectProgrammerJobLog, startProgrammerJobLog } from "../../services/employeeLogsApi";
import { getMasterConfig } from "../../services/masterConfigApi";
import { getJobsByGroupId } from "../../services/jobApi";
import type { User } from "../../types/user";
import type { MasterConfig } from "../../types/masterConfig";
import type { EmployeeLog } from "../../types/employeeLog";
import ProgrammerJobForm from "./ProgrammerJobForm.tsx";
import JobDetailsModal from "./components/JobDetailsModal";
import { ProgrammerFilters } from "./components/ProgrammerFilters";
import { MassDeleteButton } from "./components/MassDeleteButton";
import { calculateTotals } from "./programmerUtils";
import { countActiveFilters } from "../../utils/filterUtils";
import type { JobEntry } from "../../types/job";
import type { FilterValues } from "../../components/FilterModal";
import { useJobHandlers } from "./hooks/useJobHandlers";
import { useJobData } from "./hooks/useJobData";
import { useTableColumns } from "./hooks/useTableColumns";
import { useProgrammerState } from "./hooks/useProgrammerState";
import { exportJobsToCSV } from "./utils/csvExport";
import type { TableRow } from "./utils/jobDataTransform";
import { getParentRowClassName } from "./utils/priorityUtils";
import { formatDisplayDateTime, getDisplayDateTimeParts } from "../../utils/date";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import MarqueeCopyText from "../../components/MarqueeCopyText";
import {
  setProgrammerCreatedByFilter,
  setProgrammerCriticalFilter,
  setProgrammerCustomerFilter,
  setProgrammerDescriptionFilter,
  setProgrammerFilters,
  setProgrammerShowFilterModal,
} from "../../store/slices/filtersSlice";
import { getDisplayName, getInitials, getLogUserDisplayName } from "../../utils/jobFormatting";

const Programmer = () => {
  const PROGRAMMER_ACTIVE_LOG_KEY = "programmer_active_job_log_id";
  const navigate = useNavigate();
  const params = useParams<{ groupId?: string }>();
  const dispatch = useAppDispatch();
  const [sortField, setSortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const {
    filters,
    showFilterModal,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    criticalFilter,
  } = useAppSelector((state) => state.filters.programmer);
  const [users, setUsers] = useState<User[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ groupId: string; customer: string } | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [selectedChildRows, setSelectedChildRows] = useState<Set<string | number>>(new Set());
  const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
  const [activeTab, setActiveTab] = useState<"jobs" | "logs">("jobs");
  const [programmerLogs, setProgrammerLogs] = useState<EmployeeLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("");
  const [logUserId, setLogUserId] = useState("");

  const isAdmin = getUserRoleFromToken() === "ADMIN";

  const handleChildRowSelect = (rowKey: string | number, selected: boolean) => {
    setSelectedChildRows((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(rowKey);
      } else {
        next.delete(rowKey);
      }
      return next;
    });
  };

  const {
    jobs,
    setJobs,
    showForm,
    setShowForm,
    cuts,
    setCuts,
    editingGroupId,
    setEditingGroupId,
    refNumber,
    isNewJobRoute,
    isEditRoute,
    handleNewJob: handleNewJobState,
    handleCancel: handleCancelState,
  } = useProgrammerState(filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter);

  const totals = useMemo(
    () =>
      cuts.map((cut) =>
        calculateTotals(cut, {
          settingHoursPerSetting: masterConfig?.settingHoursPerSetting,
          complexExtraHours: masterConfig?.complexExtraHours,
          pipExtraHours: masterConfig?.pipExtraHours,
        })
      ),
    [cuts, masterConfig]
  );

  const { handleSaveJob, handleDeleteJob, handleMassDelete, handleEditJob } = useJobHandlers({
    cuts,
    editingGroupId,
    refNumber,
    jobs,
    setJobs,
    setShowForm,
    setEditingGroupId,
    setCuts,
    setToast,
    totals,
  });

  const handleApplyFilters = (newFilters: FilterValues) => {
    dispatch(setProgrammerFilters(newFilters));
  };

  const handleClearFilters = () => {
    dispatch(setProgrammerFilters({}));
  };

  const handleRemoveFilter = (key: string, type: "inline" | "modal") => {
    if (type === "inline") {
      if (key === "customer") dispatch(setProgrammerCustomerFilter(""));
      else if (key === "description") dispatch(setProgrammerDescriptionFilter(""));
      else if (key === "createdBy") dispatch(setProgrammerCreatedByFilter(""));
      return;
    }

    const updated = { ...filters };
    delete updated[key];
    dispatch(setProgrammerFilters(updated));
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleDeleteClick = (groupId: string, customer: string) => {
    setJobToDelete({ groupId, customer });
    setShowDeleteModal(true);
  };

  const { tableData, expandableRows } = useJobData({
    jobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
    isAdmin,
    onViewJob: async (entry) => {
      try {
        const fullEntries = await getJobsByGroupId(String(entry.groupId));
        const targetEntry = fullEntries.find((job) => String(job.id) === String(entry.id)) || entry;
        setViewingJob({
          groupId: String(targetEntry.groupId),
          parent: targetEntry,
          entries: [targetEntry],
          groupTotalHrs: Number(targetEntry.totalHrs || 0),
          groupTotalAmount: Number(targetEntry.totalAmount || 0),
        });
        setShowJobViewModal(true);
      } catch (error) {
        console.error("Failed to fetch job details", error);
        setToast({ message: "Failed to load job details.", variant: "error", visible: true });
      }
    },
    onEdit: handleEditJob,
    onDelete: handleDeleteClick,
    showChildCheckboxes: true,
    selectedChildRows,
    onChildRowSelect: handleChildRowSelect,
  });

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      await handleDeleteJob(jobToDelete.groupId);
      setShowDeleteModal(false);
      setJobToDelete(null);
    } catch (error) {
    }
  };

  const handleViewGroup = useCallback(async (groupId: string) => {
    try {
      const fullEntries = await getJobsByGroupId(groupId);
      if (!fullEntries.length) return;
      setViewingJob({
        groupId,
        parent: fullEntries[0],
        entries: fullEntries,
        groupTotalHrs: fullEntries.reduce((sum, entry) => sum + (Number(entry.totalHrs || 0) || 0), 0),
        groupTotalAmount: fullEntries.reduce((sum, entry) => sum + (Number(entry.totalAmount || 0) || 0), 0),
      });
      setShowJobViewModal(true);
    } catch (error) {
      console.error("Failed to fetch job group details", error);
      setToast({ message: "Failed to load job details.", variant: "error", visible: true });
    }
  }, []);

  const columns = useTableColumns({
    expandableRows,
    isAdmin,
    handleViewJob: handleViewGroup,
    handleEditJob,
    handleDeleteClick,
  });

  useEffect(() => {
    const fetchMasterConfig = async () => {
      try {
        const cfg = await getMasterConfig();
        setMasterConfig(cfg);
      } catch (error) {
        console.error("Failed to fetch master config", error);
      }
    };
    fetchMasterConfig();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await getUsers(["ADMIN", "PROGRAMMER"]);
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    fetchUsers();
  }, []);

  const rejectActiveProgrammerDraftLog = useCallback(async () => {
    const activeLogId = localStorage.getItem(PROGRAMMER_ACTIVE_LOG_KEY);
    if (!activeLogId) return;
    try {
      await rejectProgrammerJobLog({ logId: activeLogId });
    } catch (error) {
      console.error("Failed to reject programmer draft log", error);
    } finally {
      localStorage.removeItem(PROGRAMMER_ACTIVE_LOG_KEY);
    }
  }, []);

  useEffect(() => {
    if (!(isNewJobRoute || isEditRoute)) return;
    const customerValue = String(cuts[0]?.customer || "").trim();
    if (!customerValue) return;
    const activeLogId = localStorage.getItem(PROGRAMMER_ACTIVE_LOG_KEY);
    if (activeLogId) return;

    const startLogOnCustomerInput = async () => {
      try {
        const startedLog = await startProgrammerJobLog({
          refNumber: String(refNumber || "").trim() || undefined,
        });
        if (startedLog?._id) {
          localStorage.setItem(PROGRAMMER_ACTIVE_LOG_KEY, startedLog._id);
        }
      } catch (error) {
        console.error("Failed to start programmer log on customer input", error);
      }
    };

    startLogOnCustomerInput();
  }, [cuts, isEditRoute, isNewJobRoute, refNumber]);

  useEffect(() => {
    if (!(isNewJobRoute || isEditRoute)) return;
    return () => {
      const activeLogId = localStorage.getItem(PROGRAMMER_ACTIVE_LOG_KEY);
      if (!activeLogId) return;
      void rejectProgrammerJobLog({ logId: activeLogId })
        .catch((error) => {
          console.error("Failed to reject programmer log on leave", error);
        })
        .finally(() => {
          localStorage.removeItem(PROGRAMMER_ACTIVE_LOG_KEY);
        });
    };
  }, [isNewJobRoute, isEditRoute]);

  useEffect(() => {
    if (isNewJobRoute || isEditRoute) {
      setActiveTab("jobs");
    }
  }, [isNewJobRoute, isEditRoute]);

  const handleNewJob = () => {
    handleNewJobState();
    navigate("/programmer/newjob");
  };

  const handleCancel = async () => {
    handleCancelState();
    await rejectActiveProgrammerDraftLog();
    if (isNewJobRoute || isEditRoute) {
      navigate("/programmer");
    }
    setShowForm(false);
  };

  const handleRowSelect = (rowKey: string | number, selected: boolean) => {
    const groupId = String(rowKey);

    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(groupId);
      } else {
        next.delete(groupId);
      }
      return next;
    });
  };

  const handleMassDeleteClick = async () => {
    if (selectedJobIds.size === 0) return;
    await handleMassDelete(selectedJobIds);
    setSelectedJobIds(new Set());
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setJobToDelete(null);
  };

  const handleSort = (field: keyof JobEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDownloadCSV = () => {
    exportJobsToCSV(tableData, isAdmin);
  };

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  useEffect(() => {
    if (activeTab !== "logs" || isNewJobRoute || isEditRoute) return;
    let mounted = true;

    const fetchProgrammerLogs = async () => {
      try {
        setLogsLoading(true);
        const logs = await getEmployeeLogs({
          role: "PROGRAMMER",
          status: logStatus || undefined,
          search: logSearch.trim() || undefined,
        });
        if (mounted) setProgrammerLogs(logs);
      } catch (error) {
        if (mounted) {
          setProgrammerLogs([]);
          setToast({ message: "Failed to fetch programmer logs.", variant: "error", visible: true });
        }
      } finally {
        if (mounted) setLogsLoading(false);
      }
    };

    fetchProgrammerLogs();
    return () => {
      mounted = false;
    };
  }, [activeTab, isNewJobRoute, isEditRoute, logSearch, logStatus]);

  const formatDuration = (seconds?: number): string => {
    const total = Math.max(0, Number(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getShiftLabel = (startedAt?: string): string => {
    if (!startedAt) return "-";
    const date = new Date(startedAt);
    if (Number.isNaN(date.getTime())) return "-";
    const hour = date.getHours();
    return hour >= 6 && hour < 18 ? "Day" : "Night";
  };

  const designationByUserId = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      const role = String(u.role || "").toUpperCase();
      if (role === "ADMIN") map.set(String(u._id), "Admin");
      else if (role === "PROGRAMMER") map.set(String(u._id), "Programmer");
    });
    return map;
  }, [users]);

  const filteredProgrammerLogs = useMemo(
    () => programmerLogs.filter((log) => (logUserId ? String(log.userId) === String(logUserId) : true)),
    [programmerLogs, logUserId]
  );

  const programmerLogColumns = useMemo<Column<EmployeeLog>[]>(
    () => [
      {
        key: "user",
        label: "User",
        sortable: false,
        className: "programmer-log-user-col",
        headerClassName: "programmer-log-user-col",
        render: (row) => {
          const designation = designationByUserId.get(String(row.userId)) || "Programmer";
          const name = getLogUserDisplayName(row.userName, row.userEmail, "Programmer");
          return (
            <div className="log-user-stack log-user-badge-stack">
              <span className="log-user-initial-badge" title={name.toUpperCase()}>
                {getInitials(name)}
              </span>
              <span>{designation}</span>
            </div>
          );
        },
      },
      {
        key: "jobNumber",
        label: "JOB #",
        sortable: false,
        render: (row) => {
          const ref = String(row.refNumber || "").trim().replace(/^#/, "");
          return ref ? `#${ref}` : "";
        },
      },
      {
        key: "summary",
        label: "Summary",
        sortable: false,
        className: "programmer-log-summary-col",
        headerClassName: "programmer-log-summary-col",
        render: (row) => {
          const full = String((row as any).workSummary || "-");
          return <MarqueeCopyText text={full} />;
        },
      },
      {
        key: "startedAt",
        label: "Started at",
        sortable: false,
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.startedAt);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
        },
      },
      {
        key: "endedAt",
        label: "Ended at",
        sortable: false,
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.endedAt || null);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
        },
      },
      {
        key: "shift",
        label: "Shift",
        sortable: false,
        render: (row) => {
          const shift = getShiftLabel(row.startedAt);
          if (shift === "Day") {
            return (
              <span className="shift-icon-badge day" title="Day Shift">
                <WbSunnyOutlinedIcon sx={{ fontSize: "1rem" }} />
              </span>
            );
          }
          if (shift === "Night") {
            return (
              <span className="shift-icon-badge night" title="Night Shift">
                <DarkModeOutlinedIcon sx={{ fontSize: "1rem" }} />
              </span>
            );
          }
          return "-";
        },
      },
      { key: "duration", label: "Duration", sortable: false, render: (row) => formatDuration(row.durationSeconds) },
      {
        key: "status",
        label: "Status",
        sortable: false,
        render: (row) => {
          const raw = String(row.status || "-").toUpperCase();
          const label =
            raw === "IN_PROGRESS"
              ? "In Progress"
              : raw === "REJECTED"
                ? "Stopped"
              : raw
                  .split("_")
                  .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                  .join(" ");
          const statusClass =
            raw === "IN_PROGRESS" ? "in-progress" : raw === "REJECTED" ? "stopped" : "completed";
          return <span className={`log-status-badge ${statusClass}`}>{label}</span>;
        },
      },
    ],
    [designationByUserId]
  );

  const handleExportProgrammerLogsCsv = () => {
    const headers = ["User", "JOB #", "Summary", "Started at", "Ended at", "Shift", "Duration", "Status"];
    const rows = filteredProgrammerLogs.map((row) => {
      const designation = designationByUserId.get(String(row.userId)) || "Programmer";
      const name = getLogUserDisplayName(row.userName, row.userEmail, "");
      const userValue = name ? `${name} (${designation})` : designation;
      const ref = String(row.refNumber || "").trim().replace(/^#/, "");
      return [
        userValue,
        ref ? `#${ref}` : "",
        String((row as any).workSummary || "-"),
        formatDisplayDateTime(row.startedAt),
        formatDisplayDateTime(row.endedAt || null),
        getShiftLabel(row.startedAt),
        formatDuration(row.durationSeconds),
        String(row.status || "").toUpperCase() === "REJECTED" ? "Stopped" : String(row.status || "-"),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `programmer_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const routeEditGroupId = params.groupId ? String(params.groupId) : null;
  const isEditFormReady =
    isEditRoute &&
    Boolean(routeEditGroupId) &&
    editingGroupId === routeEditGroupId &&
    cuts.length > 0;
  const shouldRenderJobForm = isNewJobRoute || (isEditRoute ? isEditFormReady : showForm);

  return (
    <div className="programmer-container">
      <Sidebar currentPath="/programmer" onNavigate={(path) => navigate(path)} />
      <div className={`programmer-content ${isNewJobRoute || isEditRoute ? "programmer-content-scrollable" : ""}`}>
        <Header title="Programmer" />
        <div className={`programmer-panel ${isNewJobRoute || isEditRoute ? "programmer-panel-scrollable" : ""}`}>
          {!isNewJobRoute && !isEditRoute && (
            <div className="programmer-subtabs">
              <button
                type="button"
                className={`programmer-subtab ${activeTab === "jobs" ? "active" : ""}`}
                onClick={() => setActiveTab("jobs")}
              >
                Jobs
              </button>
              <button
                type="button"
                className={`programmer-subtab ${activeTab === "logs" ? "active" : ""}`}
                onClick={() => setActiveTab("logs")}
              >
                Logs
              </button>
            </div>
          )}

          {shouldRenderJobForm && (
            <ProgrammerJobForm
              cuts={cuts}
              setCuts={setCuts}
              onSave={handleSaveJob}
              onCancel={handleCancel}
              totals={totals}
              isAdmin={isAdmin}
              refNumber={refNumber}
              masterConfig={masterConfig}
            />
          )}

          {!isNewJobRoute && !isEditRoute && activeTab === "jobs" && (
            <>
              <ProgrammerFilters
                filters={filters}
                jobSearchFilter={customerFilter}
                createdByFilter={createdByFilter}
                criticalFilter={criticalFilter}
                showFilterModal={showFilterModal}
                activeFilterCount={activeFilterCount}
                users={users}
                onShowFilterModal={(show) => dispatch(setProgrammerShowFilterModal(show))}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
                onRemoveFilter={handleRemoveFilter}
                onJobSearchFilterChange={(value) => {
                  dispatch(setProgrammerCustomerFilter(value));
                  dispatch(setProgrammerDescriptionFilter(value));
                }}
                onCreatedByFilterChange={(value) => dispatch(setProgrammerCreatedByFilter(value))}
                onCriticalFilterChange={(value) => dispatch(setProgrammerCriticalFilter(value))}
                onDownloadCSV={handleDownloadCSV}
                onNewJob={handleNewJob}
              />
              <DataTable
                columns={columns}
                data={tableData}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={(field) => handleSort(field as keyof JobEntry)}
                emptyMessage='No entries added yet. Use "New" to add an entry.'
                expandableRows={expandableRows}
                showAccordion={false}
                getRowKey={(row) => row.groupId}
                getRowClassName={(row) =>
                  getParentRowClassName(
                    row.parent,
                    row.entries,
                    expandedGroups.has(row.groupId)
                  )
                }
                className="jobs-table-wrapper"
                showCheckboxes={true}
                selectedRows={selectedJobIds}
                onRowSelect={handleRowSelect}
              />
            </>
          )}

          {!isNewJobRoute && !isEditRoute && activeTab === "logs" && (
            <>
              <div className="programmer-logs-filters">
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="filter-input programmer-logs-search"
                />
                <select
                  value={logStatus}
                  onChange={(e) => setLogStatus(e.target.value as "" | "IN_PROGRESS" | "COMPLETED" | "REJECTED")}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Stopped</option>
                </select>
                <select
                  value={logUserId}
                  onChange={(e) => setLogUserId(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Users</option>
                  {users
                    .filter((user) => user.role === "PROGRAMMER" || user.role === "ADMIN")
                    .map((user) => {
                      const displayName = getDisplayName(user.firstName, user.lastName, user.email);
                      return (
                        <option key={user._id} value={user._id}>
                          {displayName.toUpperCase()}
                        </option>
                      );
                    })}
                </select>
                <button className="btn-download-csv" onClick={handleExportProgrammerLogsCsv} title="Download Logs CSV">
                  <DownloadIcon sx={{ fontSize: "1rem" }} />
                  CSV
                </button>
              </div>
              <DataTable
                columns={programmerLogColumns}
                data={filteredProgrammerLogs}
                emptyMessage={logsLoading ? "Loading logs..." : "No programmer logs found."}
                getRowKey={(row) => row._id}
                className="jobs-table-wrapper left-align programmer-logs-table"
              />
            </>
          )}
        </div>
      </div>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, visible: false })}
      />
      {showDeleteModal && jobToDelete && (
        <ConfirmDeleteModal
          title="Confirm Delete"
          message="Are you sure you want to delete this job?"
          details={[
            { label: "Customer", value: jobToDelete.customer },
          ]}
          confirmButtonText="Delete Job"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {showJobViewModal && viewingJob && (
        <JobDetailsModal
          job={viewingJob}
          userRole={getUserRoleFromToken()}
          onClose={() => {
            setShowJobViewModal(false);
            setViewingJob(null);
          }}
        />
      )}

      {!isNewJobRoute && !isEditRoute && activeTab === "jobs" && (
        <MassDeleteButton
          selectedCount={selectedJobIds.size}
          onDelete={handleMassDeleteClick}
          onClear={() => setSelectedJobIds(new Set())}
        />
      )}
    </div>
  );
};

export default Programmer;
