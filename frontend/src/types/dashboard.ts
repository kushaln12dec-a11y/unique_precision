export type DashboardRoleView = "ADMIN" | "OPERATOR" | "PROGRAMMER" | "QC";
export type DashboardDateRangePreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "YTD" | "CUSTOM";
export type DashboardTrendDirection = "up" | "down";

export type DashboardOption = {
  name: string;
  value: number;
};

export type DashboardActivityItem = {
  id: string;
  kind: string;
  actor: string;
  action: string;
  title: string;
  subtitle: string;
  occurredAt: string;
};

export type DashboardTopPerformer = {
  name: string;
  image: string;
  metricValue: number;
  metricLabel: string;
  trend: DashboardTrendDirection;
};

export type DashboardAdminMetrics = {
  totalRevenue: {
    today: number;
    month: number;
    ytd: number;
  };
  totalJobsCreatedThisMonth: number;
  jobsCompleted: number;
  jobsInProgress: number;
  qcPassRate: number;
  totalMachineHoursToday: number;
  operatorUtilizationRate: number;
  comparisonDelta: number;
};

export type DashboardAdminData = {
  metrics: DashboardAdminMetrics;
  topPerformers: {
    operator: DashboardTopPerformer | null;
    programmer: DashboardTopPerformer | null;
    qc: DashboardTopPerformer | null;
  };
  revenueBreakdown: {
    byCustomer: DashboardOption[];
    byMachineType: DashboardOption[];
    byOperator: DashboardOption[];
  };
  activityFeed: DashboardActivityItem[];
  monthlyTrend: Array<{
    label: string;
    revenue: number;
    jobsCompleted: number;
    jobsCreated: number;
    approvals: number;
    rejections: number;
  }>;
};

export type DashboardOperatorData = {
  profile: {
    name: string;
    badge: string;
    todayRevenue: number;
    machineHoursToday: number;
    jobsCompletedToday: number;
    currentMachine: string;
    targetRevenue: number;
    completionPercent: number;
    motivationalMessage: string;
  };
  currentJob: null | {
    refNumber: string;
    customer: string;
    machineNumber: string;
    startedAt: string;
    estimatedCompletionAt: string;
    realTimeHoursSeed: number;
    groupId: string;
  };
  schedule: Array<{
    id: string;
    refNumber: string;
    customer: string;
    machineNumber: string;
    cutDetails: string;
    estimatedHours: number;
    status: string;
  }>;
  productionSeries: Array<{
    label: string;
    hours: number;
    revenue: number;
  }>;
  machineStatus: Array<{
    machineNumber: string;
    status: string;
    uptimePercent: number;
  }>;
  qcStatus: Array<{
    id: string;
    refNumber: string;
    customer: string;
    status: string;
    rejectionReason: string;
  }>;
};

export type DashboardProgrammerData = {
  summary: {
    jobsCreatedToday: number;
    jobsCreatedThisMonth: number;
    jobsCurrentlyActive: number;
    jobsCompleted: number;
    jobsWithIssues: number;
  };
  recentJobs: Array<{
    id: string;
    refNumber: string;
    customer: string;
    status: string;
    createdAt: string;
    totalAmount: number;
  }>;
  qualityScore: {
    score: number;
    teamAverage: number;
    trend: DashboardTrendDirection;
  };
  statusBreakdown: DashboardOption[];
  customerBreakdown: DashboardOption[];
  qcFeedback: Array<{
    id: string;
    refNumber: string;
    customer: string;
    feedback: string;
    reason: string;
  }>;
  revenueImpact: {
    totalRevenue: number;
    averageJobValue: number;
  };
};

export type DashboardQcData = {
  queueMetrics: {
    jobsPendingQc: number;
    jobsInspectedThisMonth: number;
    approvalRate: number;
    rejectionRate: number;
  };
  inspectionSummary: {
    approvedToday: number;
    rejectedToday: number;
    pendingReview: number;
  };
  rejectionReasons: Array<{
    name: string;
    value: number;
    example: string;
  }>;
  inspectorPerformance: {
    inspectorName: string;
    inspectionRate: number;
    approvalRate: number;
    comparisonToTeam: number;
  };
  jobsRequiringReview: Array<{
    id: string;
    refNumber: string;
    operator: string;
    programmer: string;
    issueType: string;
    status: string;
    timeInQueueHours: number;
  }>;
  monthlyTrends: Array<{
    label: string;
    approvalRate: number;
    rejectionRate: number;
    inspectionVolume: number;
  }>;
  criticalJobs: Array<{
    id: string;
    refNumber: string;
    customer: string;
    priority: string;
    status: string;
    timeInQueueHours: number;
  }>;
};

export type DashboardSummaryResponse = {
  meta: {
    generatedAt: string;
    activeView: DashboardRoleView;
    allowedViews: DashboardRoleView[];
    dateRange: {
      preset: DashboardDateRangePreset;
      label: string;
      startDate: string;
      endDate: string;
    };
    filters: {
      customer: string;
      machine: string;
      operator: string;
      programmer: string;
    };
    filterOptions: {
      customers: string[];
      machines: string[];
      operators: string[];
      programmers: string[];
    };
  };
  admin: DashboardAdminData;
  operator: DashboardOperatorData;
  programmer: DashboardProgrammerData;
  qc: DashboardQcData;
};
