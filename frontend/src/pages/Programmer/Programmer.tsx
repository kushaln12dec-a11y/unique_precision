import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const Programmer = () => {
  const navigate = useNavigate();
  const params = useParams<{ groupId?: string }>();
  const dispatch = useAppDispatch();

  const [sortField] = useState<keyof JobEntry | null>(null);
  const [sortDirection] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });
  const [savingJob, setSavingJob] = useState(false);

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
    jobs,
    loadingJobs,
    loadingEditGroup,
    setJobs,
    setShowForm,
    cuts,
    setCuts,
    editingGroupId,
    setEditingGroupId,
    refNumber,
    editGroupError,
    isNewJobRoute,
    isEditRoute,
    isCloneRoute,
    handleNewJob: handleNewJobState,
    handleCancel: handleCancelState,
  } = useProgrammerState(filters, customerFilter, descriptionFilter, createdByFilter, criticalFilter);

  const routeEditGroupId = params.groupId ? String(params.groupId) : null;

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
    jobsFetchPage,
    logsFetchPage,
  } = useProgrammerPageController({
    filters,
    customerFilter,
    descriptionFilter,
    createdByFilter,
    criticalFilter,
    isNewJobRoute,
    isEditRoute,
    isCloneRoute,
    loadingJobs,
    cutsLength: cuts.length,
    editGroupError,
    editingGroupId,
    routeEditGroupId,
    setShowForm,
    handleNewJobState,
    handleCancelState,
    setToast,
    savingJob,
    setSavingJob,
  });

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
    setSavingJob,
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
    hasJobSearch,
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
    hasLogSearch,
    programmerUsers,
  } = useProgrammerLogs({ users, logSearch, logStatus, logUserId, setToast });

  const handleDownloadCSV = () => exportJobsToCSV(filteredProgrammerTableData, isAdmin);
  const dispatchers = useProgrammerReduxDispatchers(dispatch, filters);

  return (
    <div className="programmer-container">
      <Sidebar currentPath="/programmer" onNavigate={(path) => navigate(path)} />
      <div className={`programmer-content ${isProgrammerFormRoute ? "programmer-content-scrollable" : ""}`}>
        <Header title="Programmer" />
        <div className={`programmer-panel ${isProgrammerFormRoute ? "programmer-panel-scrollable" : ""}`}>
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
            onBack={() => navigate("/programmer", { replace: true })}
          />

          {isProgrammerListRoute && activeTab === "jobs" && (
            <ProgrammerJobsSection
              savingJob={savingJob}
              loadingJobs={loadingJobs}
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
              hasJobSearch={hasJobSearch}
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
              hasLogSearch={hasLogSearch}
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
