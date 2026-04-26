import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getUserRoleFromToken } from "../../utils/auth";
import "../../utils/tokenDebug";
import ProgrammerPageOverlays from "./components/ProgrammerPageOverlays";
import ProgrammerJobsSection from "./components/ProgrammerJobsSection";
import ProgrammerLogsSection from "./components/ProgrammerLogsSection";
import ProgrammerFormSection from "./components/ProgrammerFormSection";
import ProgrammerTabs from "./components/ProgrammerTabs";
import { calculateTotals } from "./programmerUtils";
import type { JobEntry } from "../../types/job";
import { useJobHandlers } from "./hooks/useJobHandlers";
import { useTableColumns } from "./hooks/useTableColumns";
import { useProgrammerState } from "./hooks/useProgrammerState";
import { exportJobsToCSV } from "./utils/csvExport";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useProgrammerGrid } from "./hooks/useProgrammerGrid";
import { useProgrammerLogs } from "./hooks/useProgrammerLogs";
import { useProgrammerPageController } from "./hooks/useProgrammerPageController";
import { useProgrammerReduxDispatchers } from "./hooks/useProgrammerReduxDispatchers";
import { useProgrammerNavigation } from "./hooks/useProgrammerNavigation";
import { useJobSync, type JobSyncEvent } from "../../hooks/useJobSync";
import { getUserDisplayNameFromToken } from "../../utils/auth";

const Programmer = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [sortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });
  const [savingJob, setSavingJob] = useState(false);
  const [pendingJobSync, setPendingJobSync] = useState<JobSyncEvent | null>(null);

  const {
    filters,
    showFilterModal,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    criticalFilter,
  } = useAppSelector((state) => state.filters.programmer);

  const isAdmin = getUserRoleFromToken() === "ADMIN";

  const {
    currentPathname,
    jobs,
    loadingJobs,
    loadingEditGroup,
    setJobs,
    cuts,
    setCuts,
    editingGroupId,
    refNumber,
    editGroupError,
    refreshJobs,
    handleNewJob: handleNewJobState,
    handleCancel: handleCancelState,
  } = useProgrammerState(filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter);

  const {
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
    refreshProgrammerGrid,
    jobsFetchPage,
    logsFetchPage,
  } = useProgrammerPageController({
    currentPathname,
    filters,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    criticalFilter,
    loadingJobs,
    cutsLength: cuts.length,
    editGroupError,
    editingGroupId,
    handleNewJobState,
    handleCancelState,
    setToast,
  });

  const currentUserDisplayName = (getUserDisplayNameFromToken() || "").trim().toUpperCase();

  const refreshFromSyncBanner = useCallback(() => {
    void refreshJobs();
    refreshProgrammerGrid();
    setPendingJobSync(null);
  }, [refreshJobs, refreshProgrammerGrid]);

  useJobSync((event) => {
    if (event.updatedBy && event.updatedBy === currentUserDisplayName) {
      return;
    }
    setPendingJobSync(event);
  }, isProgrammerListRoute && activeTab === "jobs");

  const totals = useMemo(
    () =>
      cuts.map((cut) =>
        calculateTotals(cut, {
          settingHoursPerSetting: masterConfig?.settingHoursPerSetting,
          thicknessRateUpto100: masterConfig?.thicknessRateUpto100,
          thicknessRateAbove100: masterConfig?.thicknessRateAbove100,
          complexExtraHours: masterConfig?.complexExtraHours,
          pipExtraHours: masterConfig?.pipExtraHours,
          customerConfigs: masterConfig?.customers,
        })
      ),
    [cuts, masterConfig]
  );

  const { handleSaveJob, handleDeleteJob, handleMassDelete, handleEditJob, cancelSave } = useJobHandlers({
    cuts,
    editingGroupId,
    refNumber,
    jobs,
    setJobs,
    setToast,
    setSavingJob,
    handleCancelState,
    totals,
  });

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    try {
      await handleDeleteJob(jobToDelete.groupId);
      setProgrammerGridJobs((prev) => prev.filter((job) => String(job.groupId) !== jobToDelete.groupId));
      setShowDeleteModal(false);
      setJobToDelete(null);
    } catch {
      // toast handled upstream
    }
  };

  const handleMassDeleteClick = async () => {
    if (selectedJobIds.size === 0) return;
    await handleMassDelete(selectedJobIds);
    setProgrammerGridJobs((prev) => prev.filter((job) => !selectedJobIds.has(String(job.groupId))));
    setSelectedJobIds(new Set());
  };

  const columns = useTableColumns({
    isAdmin,
    handleViewGroup,
    handleViewEntry,
    handleEditJob,
    handleCloneJob: (groupId) => handleCloneJob(groupId, navigate),
    handleDeleteClick,
    toggleGroup,
  });

  const {
    filteredProgrammerTableData,
    programmerGridRows,
    programmerJobColumnDefs,
  } = useProgrammerGrid({
    programmerGridJobs,
    sortField,
    sortDirection,
    expandedGroups,
    toggleGroup,
    isAdmin,
    selectedChildRows,
    onChildRowSelect: handleChildRowSelect,
    handleEditJob,
    handleDeleteClick,
    handleViewEntry,
    selectedJobIds,
    setSelectedJobIds,
    customerFilter,
    descriptionFilter,
    columns,
  });

  const {
    filterProgrammerLogs,
    handleExportProgrammerLogsCsv,
    programmerLogColumnDefs,
    programmerUsers,
  } = useProgrammerLogs({ users, logSearch, logStatus, logUserId, setToast });

  const handleDownloadCSV = () => exportJobsToCSV(filteredProgrammerTableData, isAdmin);
  const dispatchers = useProgrammerReduxDispatchers(dispatch, filters);
  const { handleProgrammerNavigate, navigateToProgrammerList } = useProgrammerNavigation({
    isProgrammerFormRoute,
    navigate,
    handleCancelState,
    setSavingJob,
    cancelSave,
  });

  return (
    <div className="programmer-container">
      <Sidebar currentPath="/programmer" onNavigate={handleProgrammerNavigate} />
      <div className={`programmer-content ${isProgrammerFormRoute ? "programmer-content-scrollable" : ""}`}>
        <Header title="Programmer" onNavigate={handleProgrammerNavigate} />
        <div
          key={currentPathname}
          className={`programmer-panel ${isProgrammerFormRoute ? "programmer-panel-scrollable" : ""}`}
        >
          {isProgrammerListRoute && <ProgrammerTabs activeTab={activeTab} setActiveTab={setActiveTab} />}

          <ProgrammerFormSection
            shouldRenderJobForm={shouldRenderJobForm}
            loadingEditGroup={loadingEditGroup}
            cuts={cuts}
            setCuts={setCuts}
            handleSaveJob={handleSaveJob}
            handleCancel={() => handleCancel(navigate)}
            totals={totals}
            isAdmin={isAdmin}
            savingJob={savingJob}
            refNumber={refNumber}
            masterConfig={masterConfig}
            editingGroupId={editingGroupId}
            shouldRenderEditLoadingState={shouldRenderEditLoadingState}
            shouldRenderEditErrorState={shouldRenderEditErrorState}
            editGroupError={editGroupError}
            onBack={navigateToProgrammerList}
          />

          {isProgrammerListRoute && activeTab === "jobs" && (
            <ProgrammerJobsSection
              savingJob={savingJob}
              programmerGridJobs={programmerGridJobs}
              filters={filters}
              customerFilter={customerFilter}
              createdByFilter={createdByFilter}
              criticalFilter={criticalFilter}
              showFilterModal={showFilterModal}
              activeFilterCount={activeFilterCount}
              users={users}
              dispatchers={dispatchers}
              handleDownloadCSV={handleDownloadCSV}
              handleNewJob={() => handleNewJob(navigate)}
              fetchPage={jobsFetchPage}
              rows={programmerGridRows}
              columnDefs={programmerJobColumnDefs}
              setProgrammerGridJobs={setProgrammerGridJobs}
              expandedGroups={expandedGroups}
              programmerGridRefreshKey={programmerGridRefreshKey}
              syncBannerMessage={
                pendingJobSync
                  ? `${pendingJobSync.updatedBy || "Another user"} updated the jobs list.`
                  : null
              }
              onRefreshFromSync={refreshFromSyncBanner}
            />
          )}

          {isProgrammerListRoute && activeTab === "logs" && (
            <ProgrammerLogsSection
              logSearch={logSearch}
              setLogSearch={setLogSearch}
              logStatus={logStatus}
              setLogStatus={setLogStatus}
              logUserId={logUserId}
              setLogUserId={setLogUserId}
              programmerUsers={programmerUsers}
              handleExportProgrammerLogsCsv={handleExportProgrammerLogsCsv}
              programmerLogColumnDefs={programmerLogColumnDefs}
              filterProgrammerLogs={filterProgrammerLogs}
              fetchPage={logsFetchPage}
            />
          )}
        </div>
      </div>

      <ProgrammerPageOverlays
        toast={toast}
        setToast={setToast}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        jobToDelete={jobToDelete}
        setJobToDelete={setJobToDelete}
        handleDeleteConfirm={handleDeleteConfirm}
        showJobViewModal={showJobViewModal}
        viewingJob={viewingJob}
        setShowJobViewModal={setShowJobViewModal}
        setViewingJob={setViewingJob}
        getUserRole={getUserRoleFromToken}
        showMassDelete={isProgrammerListRoute && activeTab === "jobs"}
        selectedCount={selectedJobIds.size}
        onMassDelete={handleMassDeleteClick}
        onClearSelection={() => setSelectedJobIds(new Set())}
      />
    </div>
  );
};

export default Programmer;
