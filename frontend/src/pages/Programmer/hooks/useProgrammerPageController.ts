import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, type NavigateFunction } from "react-router-dom";
import { countActiveFilters } from "../../../utils/filterUtils";
import { fetchAllPaginatedItems } from "../../../utils/paginationUtils";
import { getUsers } from "../../../services/userApi";
import { getEmployeeLogsPage } from "../../../services/employeeLogsApi";
import { getMasterConfig } from "../../../services/masterConfigApi";
import { getJobsByGroupId, getProgrammerJobsPage } from "../../../services/jobApi";
import type { FilterValues } from "../../../components/FilterModal";
import type { MasterConfig } from "../../../types/masterConfig";
import type { EmployeeLog } from "../../../types/employeeLog";
import type { User } from "../../../types/user";
import type { JobEntry } from "../../../types/job";
import { SEARCH_FETCH_PAGE_SIZE } from "./useProgrammerLogs";
import type { TableRow } from "../utils/jobDataTransform";

type UseProgrammerPageControllerParams = {
  filters: FilterValues;
  customerFilter: string;
  descriptionFilter: string;
  createdByFilter: string;
  criticalFilter: boolean;
  loadingJobs: boolean;
  cutsLength: number;
  editGroupError: string | null;
  editingGroupId: string | null;
  routeEditGroupId: string | null;
  handleNewJobState: () => void;
  handleCancelState: () => void;
  setToast: React.Dispatch<
    React.SetStateAction<{
      message: string;
      variant: "success" | "error" | "info";
      visible: boolean;
    }>
  >;
  setSavingJob: React.Dispatch<React.SetStateAction<boolean>>;
};

export const useProgrammerPageController = ({
  filters,
  customerFilter,
  descriptionFilter,
  createdByFilter,
  criticalFilter,
  loadingJobs,
  cutsLength,
  editGroupError,
  editingGroupId,
  routeEditGroupId,
  handleNewJobState,
  handleCancelState,
  setToast,
  setSavingJob,
}: UseProgrammerPageControllerParams) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ groupId: string; customer: string } | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showJobViewModal, setShowJobViewModal] = useState(false);
  const [viewingJob, setViewingJob] = useState<TableRow | null>(null);
  const [selectedChildRows, setSelectedChildRows] = useState<Set<string | number>>(new Set());
  const [programmerGridJobs, setProgrammerGridJobs] = useState<JobEntry[]>([]);
  const [programmerGridRefreshKey, setProgrammerGridRefreshKey] = useState(0);
  const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);
  const [activeTab, setActiveTab] = useState<"jobs" | "logs">("jobs");
  const [logSearch, setLogSearch] = useState("");
  const [logStatus, setLogStatus] = useState<"" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("");
  const [logUserId, setLogUserId] = useState("");
  const previousProgrammerFormRouteRef = useRef(false);
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const isNewJobRoute = location.pathname.startsWith("/programmer/newjob");
  const isEditRoute = location.pathname.startsWith("/programmer/edit/");
  const isCloneRoute = location.pathname.startsWith("/programmer/clone/");

  const isProgrammerListRoute = /^\/programmer\/?$/.test(location.pathname);
  const isProgrammerFormRoute = isNewJobRoute || isEditRoute || isCloneRoute;
  const isEditFormReady = isEditRoute && Boolean(routeEditGroupId) && editingGroupId === routeEditGroupId && cutsLength > 0;
  const shouldRenderJobForm = isNewJobRoute || isCloneRoute || (isEditRoute && isEditFormReady);
  const shouldRenderEditLoadingState = isEditRoute && !isEditFormReady && !editGroupError;
  const shouldRenderEditErrorState = isEditRoute && !loadingJobs && !isEditFormReady && Boolean(editGroupError);

  const handleChildRowSelect = useCallback((rowKey: string | number, selected: boolean) => {
    setSelectedChildRows((prev) => {
      const next = new Set(prev);
      if (selected) next.add(rowKey);
      else next.delete(rowKey);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleDeleteClick = useCallback((groupId: string, customer: string) => {
    setJobToDelete({ groupId, customer });
    setShowDeleteModal(true);
  }, []);

  const handleViewEntry = useCallback(async (entry: JobEntry) => {
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
  }, []);

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

  const handleCloneJob = useCallback((groupId: string, navigate: NavigateFunction) => {
    handleNewJobState();
    navigate(`/programmer/clone/${groupId}`);
  }, [handleNewJobState]);

  const handleNewJob = useCallback((navigate: NavigateFunction) => {
    handleNewJobState();
    navigate("/programmer/newjob");
  }, [handleNewJobState]);

  const handleCancel = useCallback((navigate: NavigateFunction) => {
    handleCancelState();
    navigate("/programmer", { replace: true, state: { refreshedAt: Date.now() } });
  }, [handleCancelState]);

  const jobsFetchPage = useCallback(async (offset: number, limit: number) => {
    const page = await getProgrammerJobsPage(
      filters,
      customerFilter,
      createdByFilter,
      criticalFilter ? true : undefined,
      descriptionFilter,
      { offset, limit }
    );
    return { items: page.items, hasMore: page.hasMore };
  }, [createdByFilter, criticalFilter, customerFilter, descriptionFilter, filters, filtersKey]);

  const logsFetchPage = useCallback(async (offset: number, limit: number) => {
    if (logSearch || logUserId) {
      const allLogs = await fetchAllPaginatedItems<EmployeeLog>(
        async (pageOffset, pageLimit) => {
          const page = await getEmployeeLogsPage({
            role: "PROGRAMMER",
            status: logStatus || undefined,
            offset: pageOffset,
            limit: pageLimit,
          });
          return { items: page.items, hasMore: page.hasMore };
        },
        SEARCH_FETCH_PAGE_SIZE
      );
      return { items: allLogs, hasMore: false };
    }

    const page = await getEmployeeLogsPage({
      role: "PROGRAMMER",
      status: logStatus || undefined,
      offset,
      limit,
    });
    return { items: page.items, hasMore: page.hasMore };
  }, [logSearch, logStatus, logUserId]);

  useEffect(() => {
    void getMasterConfig()
      .then(setMasterConfig)
      .catch((error) => console.error("Failed to fetch master config", error));
  }, []);

  useEffect(() => {
    void getUsers(["ADMIN", "PROGRAMMER"])
      .then(setUsers)
      .catch((error) => console.error("Failed to fetch users", error));
  }, []);

  useEffect(() => {
    if (isProgrammerFormRoute) setActiveTab("jobs");
  }, [isProgrammerFormRoute]);

  useEffect(() => {
    if (previousProgrammerFormRouteRef.current && !isProgrammerFormRoute) {
      setSavingJob(false);
      setProgrammerGridJobs([]);
      setExpandedGroups(new Set());
      setSelectedJobIds(new Set());
      setSelectedChildRows(new Set());
      setProgrammerGridRefreshKey((prev) => prev + 1);
    }
    previousProgrammerFormRouteRef.current = isProgrammerFormRoute;
  }, [isProgrammerFormRoute, setSavingJob]);

  return {
    users,
    showDeleteModal,
    setShowDeleteModal,
    jobToDelete,
    setJobToDelete,
    selectedJobIds,
    setSelectedJobIds,
    showJobViewModal,
    setShowJobViewModal,
    viewingJob,
    setViewingJob,
    selectedChildRows,
    expandedGroups,
    programmerGridJobs,
    setProgrammerGridJobs,
    programmerGridRefreshKey,
    masterConfig,
    activeTab,
    setActiveTab,
    logSearch,
    setLogSearch,
    logStatus,
    setLogStatus,
    logUserId,
    setLogUserId,
    activeFilterCount,
    isProgrammerListRoute,
    isProgrammerFormRoute,
    shouldRenderJobForm,
    shouldRenderEditLoadingState,
    shouldRenderEditErrorState,
    handleChildRowSelect,
    toggleGroup,
    handleDeleteClick,
    handleViewEntry,
    handleViewGroup,
    handleCloneJob,
    handleNewJob,
    handleCancel,
    jobsFetchPage,
    logsFetchPage,
  };
};
