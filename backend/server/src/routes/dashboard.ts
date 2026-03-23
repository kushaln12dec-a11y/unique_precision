import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

type DashboardView = "ADMIN" | "OPERATOR" | "PROGRAMMER" | "QC";
type DateRangePreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "YTD" | "CUSTOM";

type DashboardJobRecord = {
  id: string;
  groupId: bigint;
  customer: string | null;
  totalAmount: any;
  totalHrs: any;
  qty: number | null;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: string;
  assignedTo: string | null;
  machineNumber: string | null;
  qcDecision: string;
  qcReportClosed: boolean;
  priority: string | null;
  critical: boolean;
  refNumber: string | null;
  description: string | null;
  setting: string | null;
  updatedBy: string | null;
  qaStates: Array<{ quantityNumber: number; status: string }>;
};

type DashboardLogRecord = {
  id: string;
  role: string;
  activityType: string;
  status: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  jobId: string | null;
  jobGroupId: bigint | null;
  refNumber: string | null;
  settingLabel: string | null;
  quantityCount: number | null;
  jobCustomer: string | null;
  jobDescription: string | null;
  workItemTitle: string | null;
  workSummary: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  metadata: any;
};

type DashboardUserRecord = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  role: string;
};

type GroupedJob = {
  groupId: string;
  refNumber: string;
  customer: string;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: string;
  assignedTo: string;
  machineNumbers: string[];
  totalAmount: number;
  totalHrs: number;
  qty: number;
  settingsCount: number;
  description: string;
  priority: string;
  critical: boolean;
  qcDecision: "PENDING" | "APPROVED" | "REJECTED";
  qcReportClosed: boolean;
  updatedBy: string;
  sentToQaCount: number;
  readyForQaCount: number;
  savedCount: number;
};

router.use(authMiddleware);

const DECISION_STATUSES = new Set(["APPROVED", "REJECTED", "PENDING"]);

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfWeek = (value: Date) => {
  const next = startOfDay(value);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
};

const startOfMonth = (value: Date) => {
  const next = startOfDay(value);
  next.setDate(1);
  return next;
};

const startOfYear = (value: Date) => {
  const next = startOfDay(value);
  next.setMonth(0, 1);
  return next;
};

const addMonths = (value: Date, months: number) => {
  const next = new Date(value);
  next.setMonth(next.getMonth() + months);
  return next;
};

const parseDateParam = (value: unknown, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const getDateRange = (presetRaw: unknown, startRaw: unknown, endRaw: unknown) => {
  const now = new Date();
  const preset = String(presetRaw || "THIS_MONTH").toUpperCase() as DateRangePreset;

  if (preset === "TODAY") {
    return { preset, start: startOfDay(now), end: endOfDay(now), label: "Today" };
  }
  if (preset === "THIS_WEEK") {
    return { preset, start: startOfWeek(now), end: endOfDay(now), label: "This Week" };
  }
  if (preset === "YTD") {
    return { preset, start: startOfYear(now), end: endOfDay(now), label: "Year To Date" };
  }
  if (preset === "CUSTOM") {
    const start = startOfDay(parseDateParam(startRaw, startOfMonth(now)));
    const end = endOfDay(parseDateParam(endRaw, now));
    return { preset, start, end, label: "Custom" };
  }

  return { preset: "THIS_MONTH" as const, start: startOfMonth(now), end: endOfDay(now), label: "This Month" };
};

const getMonthBuckets = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const cursor = startOfMonth(addMonths(now, index - (count - 1)));
    return {
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleString("en-US", { month: "short" }),
      start: cursor,
      end: endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)),
    };
  });
};

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

const splitNames = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const getEmailLocalPart = (email: string) => email.split("@")[0]?.trim() || "";

const getUserDisplayName = (user?: DashboardUserRecord | null) => {
  if (!user) return "";
  const first = String(user.firstName || "").trim();
  const last = String(user.lastName || "").trim();
  const joined = `${first} ${last}`.trim();
  return joined || getEmailLocalPart(user.email) || user.email;
};

const resolveReqUserName = (reqUser: any) => {
  const fullName = String(reqUser?.fullName || "").trim();
  if (fullName) return fullName;
  const firstName = String(reqUser?.firstName || "").trim();
  const lastName = String(reqUser?.lastName || "").trim();
  const joined = `${firstName} ${lastName}`.trim();
  if (joined) return joined;
  return getEmailLocalPart(String(reqUser?.email || ""));
};

const buildNameVariants = (...values: Array<unknown>) => {
  const variants = new Set<string>();
  values.forEach((value) => {
    const raw = String(value || "").trim();
    if (!raw) return;
    variants.add(normalizeText(raw));
    if (raw.includes("@")) {
      variants.add(normalizeText(getEmailLocalPart(raw)));
    }
  });
  return variants;
};

const fieldMatchesVariants = (value: unknown, variants: Set<string>) => {
  if (!variants.size) return true;
  const parts = splitNames(value);
  if (!parts.length) {
    return variants.has(normalizeText(value));
  }
  return parts.some((part) => variants.has(normalizeText(part)));
};

const createMetricDelta = (current: number, previous: number) => {
  if (previous <= 0 && current <= 0) return 0;
  if (previous <= 0) return 100;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const sumBy = <T,>(items: T[], mapper: (item: T) => number) =>
  items.reduce((total, item) => total + mapper(item), 0);

const groupJobs = (jobs: DashboardJobRecord[]): GroupedJob[] => {
  const groups = new Map<string, GroupedJob>();

  jobs.forEach((job) => {
    const groupId = String(job.groupId);
    const existing = groups.get(groupId);
    const machineNumbers = uniqueStrings(splitNames(job.machineNumber || ""));
    const sentToQaCount = job.qaStates.filter((state) => state.status === "SENT_TO_QA").length;
    const readyForQaCount = job.qaStates.filter((state) => state.status === "READY_FOR_QA").length;
    const savedCount = job.qaStates.filter((state) => state.status === "SAVED").length;

    if (!existing) {
      groups.set(groupId, {
        groupId,
        refNumber: String(job.refNumber || ""),
        customer: String(job.customer || ""),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        createdBy: String(job.createdBy || ""),
        assignedTo: uniqueStrings(splitNames(job.assignedTo || "")).join(", "),
        machineNumbers,
        totalAmount: toNumber(job.totalAmount),
        totalHrs: toNumber(job.totalHrs),
        qty: Number(job.qty || 0),
        settingsCount: 1,
        description: String(job.description || ""),
        priority: String(job.priority || "Medium"),
        critical: Boolean(job.critical),
        qcDecision: DECISION_STATUSES.has(String(job.qcDecision || "").toUpperCase())
          ? (String(job.qcDecision).toUpperCase() as GroupedJob["qcDecision"])
          : "PENDING",
        qcReportClosed: Boolean(job.qcReportClosed),
        updatedBy: String(job.updatedBy || ""),
        sentToQaCount,
        readyForQaCount,
        savedCount,
      });
      return;
    }

    existing.totalAmount += toNumber(job.totalAmount);
    existing.totalHrs += toNumber(job.totalHrs);
    existing.qty += Number(job.qty || 0);
    existing.settingsCount += 1;
    existing.machineNumbers = uniqueStrings([...existing.machineNumbers, ...machineNumbers]);
    existing.assignedTo = uniqueStrings([...splitNames(existing.assignedTo), ...splitNames(job.assignedTo || "")]).join(", ");
    existing.description = uniqueStrings([existing.description, String(job.description || "")]).join(" | ");
    existing.critical = existing.critical || Boolean(job.critical);
    existing.qcReportClosed = existing.qcReportClosed && Boolean(job.qcReportClosed);
    existing.updatedAt =
      !existing.updatedAt || (job.updatedAt && job.updatedAt > existing.updatedAt) ? job.updatedAt : existing.updatedAt;
    if (existing.qcDecision !== "REJECTED") {
      if (String(job.qcDecision || "").toUpperCase() === "REJECTED") existing.qcDecision = "REJECTED";
      else if (existing.qcDecision !== "APPROVED" && String(job.qcDecision || "").toUpperCase() === "APPROVED") {
        existing.qcDecision = "APPROVED";
      }
    }
    if (job.updatedBy) existing.updatedBy = job.updatedBy;
    existing.sentToQaCount += sentToQaCount;
    existing.readyForQaCount += readyForQaCount;
    existing.savedCount += savedCount;
  });

  return Array.from(groups.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

const getGroupStatus = (job: GroupedJob) => {
  if (job.qcDecision === "REJECTED") return "REJECTED";
  if (job.qcDecision === "APPROVED") return "COMPLETED";
  if (job.sentToQaCount > 0) return "SENT_TO_QC";
  if (job.assignedTo && !/^unassign(?:ed)?$/i.test(job.assignedTo)) return "IN_PROGRESS";
  return "PENDING_ASSIGNMENT";
};

const aggregateByKey = <T,>(items: T[], keySelector: (item: T) => string, valueSelector: (item: T) => number) => {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = keySelector(item).trim() || "Unassigned";
    map.set(key, (map.get(key) || 0) + valueSelector(item));
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
};

const getCurrentUserContext = (reqUser: any, users: DashboardUserRecord[]) => {
  const currentUser = users.find((user) => String(user.id) === String(reqUser?.userId));
  const name = getUserDisplayName(currentUser) || resolveReqUserName(reqUser);
  return {
    user: currentUser,
    name,
    variants: buildNameVariants(name, currentUser?.email, reqUser?.email, reqUser?.fullName),
  };
};

const getLogMachineNumber = (log: DashboardLogRecord) => {
  return String(log?.metadata?.machineNumber || "").trim();
};

const getLogDecision = (log: DashboardLogRecord) => String(log?.metadata?.decision || "").trim().toUpperCase();

const createActivityFeed = (logs: DashboardLogRecord[]) =>
  logs
    .slice()
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 10)
    .map((log) => {
      let kind = "ACTIVITY";
      let action = log.workSummary || log.workItemTitle || "Activity logged";

      if (log.role === "PROGRAMMER") {
        kind = "JOB_CREATED";
        action = log.status === "REJECTED" ? "Draft discarded" : "Job created";
      } else if (log.role === "OPERATOR" && log.status === "IN_PROGRESS") {
        kind = "OPERATOR_STARTED";
        action = "Operator started job";
      } else if (log.role === "OPERATOR") {
        kind = "JOB_COMPLETED";
        action = "Operator logged production";
      } else if (log.role === "QC") {
        kind = getLogDecision(log) === "REJECTED" ? "QC_REJECTED" : "QC_APPROVED";
        action = getLogDecision(log) === "REJECTED" ? "QC rejected job" : "QC approved job";
      }

      return {
        id: log.id,
        kind,
        actor: String(log.userName || getEmailLocalPart(String(log.userEmail || "")) || "Unknown"),
        action,
        title: String(log.refNumber || log.workItemTitle || "Activity"),
        subtitle: String(log.jobCustomer || log.jobDescription || log.workSummary || ""),
        occurredAt: log.startedAt.toISOString(),
      };
    });

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

router.get("/summary", async (req, res) => {
  try {
    const reqUser = req.user as any;
    const reqRole = String(reqUser?.role || "").toUpperCase() as DashboardView;
    const requestedView = String(req.query.view || reqRole || "ADMIN").toUpperCase() as DashboardView;
    const activeView =
      reqRole === "ADMIN"
        ? requestedView
        : reqRole === "PROGRAMMER" || reqRole === "OPERATOR" || reqRole === "QC"
          ? reqRole
          : "ADMIN";

    const customerFilter = String(req.query.customer || "").trim();
    const machineFilter = String(req.query.machine || "").trim();
    const operatorFilter = String(req.query.operator || "").trim();
    const programmerFilter = String(req.query.programmer || "").trim();
    const dateRange = getDateRange(req.query.range, req.query.startDate, req.query.endDate);
    const historyStart = startOfDay(
      new Date(
        Math.min(
          dateRange.start.getTime(),
          startOfMonth(addMonths(new Date(), -2)).getTime(),
          startOfYear(new Date()).getTime()
        )
      )
    );

    const [users, jobs, logs] = await prisma.$transaction([
      prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
        },
      }),
      prisma.job.findMany({
        where: {
          OR: [
            { createdAt: { gte: historyStart } },
            { updatedAt: { gte: historyStart } },
            { qcDecision: "PENDING" },
            { qcReportClosed: false },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          groupId: true,
          customer: true,
          totalAmount: true,
          totalHrs: true,
          qty: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          assignedTo: true,
          machineNumber: true,
          qcDecision: true,
          qcReportClosed: true,
          priority: true,
          critical: true,
          refNumber: true,
          description: true,
          setting: true,
          updatedBy: true,
          qaStates: {
            select: {
              quantityNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.employeeLog.findMany({
        where: {
          startedAt: { gte: historyStart },
        },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          role: true,
          activityType: true,
          status: true,
          userId: true,
          userName: true,
          userEmail: true,
          jobId: true,
          jobGroupId: true,
          refNumber: true,
          settingLabel: true,
          quantityCount: true,
          jobCustomer: true,
          jobDescription: true,
          workItemTitle: true,
          workSummary: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
          metadata: true,
        },
      }),
    ]);

    const currentUser = getCurrentUserContext(reqUser, users as DashboardUserRecord[]);
    const groupedJobs = groupJobs(jobs as DashboardJobRecord[]);
    const filteredJobs = groupedJobs.filter((job) => {
      if (customerFilter && !normalizeText(job.customer).includes(normalizeText(customerFilter))) return false;
      if (machineFilter && !job.machineNumbers.some((machine) => normalizeText(machine).includes(normalizeText(machineFilter)))) return false;
      if (operatorFilter && !fieldMatchesVariants(job.assignedTo, buildNameVariants(operatorFilter))) return false;
      if (programmerFilter && !fieldMatchesVariants(job.createdBy, buildNameVariants(programmerFilter))) return false;
      return true;
    });

    const filteredLogs = (logs as DashboardLogRecord[]).filter((log) => {
      if (customerFilter && !normalizeText(log.jobCustomer).includes(normalizeText(customerFilter))) return false;
      if (machineFilter && !normalizeText(getLogMachineNumber(log)).includes(normalizeText(machineFilter))) return false;
      if (operatorFilter && log.role === "OPERATOR" && !fieldMatchesVariants(log.userName || log.userEmail || "", buildNameVariants(operatorFilter))) return false;
      if (programmerFilter && log.role === "PROGRAMMER" && !fieldMatchesVariants(log.userName || log.userEmail || "", buildNameVariants(programmerFilter))) return false;
      return true;
    });

    const isWithinSelectedRange = (date: Date | null | undefined) =>
      Boolean(date && date.getTime() >= dateRange.start.getTime() && date.getTime() <= dateRange.end.getTime());

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const yearStart = startOfYear(new Date());
    const previousWindowDuration = Math.max(24 * 60 * 60 * 1000, dateRange.end.getTime() - dateRange.start.getTime());
    const previousRangeStart = new Date(dateRange.start.getTime() - previousWindowDuration);
    const previousRangeEnd = new Date(dateRange.start.getTime() - 1);

    const jobsInWindow = filteredJobs.filter((job) => isWithinSelectedRange(job.createdAt));
    const jobsToday = filteredJobs.filter((job) => job.createdAt >= todayStart && job.createdAt <= todayEnd);
    const jobsThisMonth = filteredJobs.filter((job) => job.createdAt >= monthStart);
    const jobsYtd = filteredJobs.filter((job) => job.createdAt >= yearStart);
    const previousJobsWindow = filteredJobs.filter(
      (job) => job.createdAt >= previousRangeStart && job.createdAt <= previousRangeEnd
    );
    const qcResolvedInWindow = filteredJobs.filter(
      (job) => job.qcDecision !== "PENDING" && isWithinSelectedRange(job.updatedAt || job.createdAt)
    );
    const queueJobs = filteredJobs.filter((job) => job.sentToQaCount > 0 && !job.qcReportClosed && job.qcDecision === "PENDING");
    const monthlyBuckets = getMonthBuckets(3);
    const adminTrend = monthlyBuckets.map((bucket) => {
      const monthJobs = filteredJobs.filter((job) => job.createdAt >= bucket.start && job.createdAt <= bucket.end);
      const monthCompleted = filteredJobs.filter(
        (job) => job.qcDecision === "APPROVED" && (job.updatedAt || job.createdAt) >= bucket.start && (job.updatedAt || job.createdAt) <= bucket.end
      );
      return {
        label: bucket.label,
        revenue: round(sumBy(monthJobs, (job) => job.totalAmount), 2),
        jobsCompleted: monthCompleted.length,
        jobsCreated: monthJobs.length,
        approvals: monthCompleted.length,
        rejections: filteredJobs.filter(
          (job) => job.qcDecision === "REJECTED" && (job.updatedAt || job.createdAt) >= bucket.start && (job.updatedAt || job.createdAt) <= bucket.end
        ).length,
      };
    });

    const operatorLogsToday = filteredLogs.filter(
      (log) => log.role === "OPERATOR" && log.startedAt >= todayStart && log.startedAt <= todayEnd
    );
    let currentOperatorLogs = operatorLogsToday.filter((log) =>
      fieldMatchesVariants(log.userName || log.userEmail || "", currentUser.variants)
    );
    let currentProgrammerJobs = filteredJobs.filter((job) => fieldMatchesVariants(job.createdBy, currentUser.variants));
    let currentOperatorJobs = filteredJobs.filter((job) => fieldMatchesVariants(job.assignedTo, currentUser.variants));
    let currentQcJobs = filteredJobs.filter((job) => fieldMatchesVariants(job.updatedBy, currentUser.variants));

    const topOperator = aggregateByKey(
      filteredJobs.filter((job) => job.assignedTo && !/^unassign(?:ed)?$/i.test(job.assignedTo)),
      (job) => splitNames(job.assignedTo)[0] || "Unassigned",
      (job) => job.totalAmount
    )[0];
    const topProgrammer = aggregateByKey(
      filteredJobs.filter((job) => job.createdBy),
      (job) => job.createdBy,
      () => 1
    )[0];
    const topQc = aggregateByKey(
      filteredJobs.filter((job) => job.updatedBy && job.qcDecision !== "PENDING"),
      (job) => job.updatedBy,
      (job) => (job.qcDecision === "APPROVED" ? 1 : 0.35)
    )[0];

    const operatorFocusName =
      reqRole === "ADMIN" && activeView === "OPERATOR"
        ? operatorFilter || topOperator?.name || currentUser.name
        : currentUser.name;
    const operatorFocusVariants = buildNameVariants(operatorFocusName);
    const programmerFocusName =
      reqRole === "ADMIN" && activeView === "PROGRAMMER"
        ? programmerFilter || topProgrammer?.name || currentUser.name
        : currentUser.name;
    const programmerFocusVariants = buildNameVariants(programmerFocusName);
    const qcFocusName =
      reqRole === "ADMIN" && activeView === "QC"
        ? topQc?.name || currentUser.name
        : currentUser.name;
    const qcFocusVariants = buildNameVariants(qcFocusName);

    currentOperatorLogs = operatorLogsToday.filter((log) =>
      fieldMatchesVariants(log.userName || log.userEmail || "", operatorFocusVariants)
    );
    currentOperatorJobs = filteredJobs.filter((job) => fieldMatchesVariants(job.assignedTo, operatorFocusVariants));
    currentProgrammerJobs = filteredJobs.filter((job) => fieldMatchesVariants(job.createdBy, programmerFocusVariants));
    currentQcJobs = filteredJobs.filter((job) => fieldMatchesVariants(job.updatedBy, qcFocusVariants));

    const adminMetrics = {
      totalRevenue: {
        today: round(sumBy(jobsToday, (job) => job.totalAmount), 2),
        month: round(sumBy(jobsThisMonth, (job) => job.totalAmount), 2),
        ytd: round(sumBy(jobsYtd, (job) => job.totalAmount), 2),
      },
      totalJobsCreatedThisMonth: jobsThisMonth.length,
      jobsCompleted: filteredJobs.filter((job) => job.qcDecision === "APPROVED").length,
      jobsInProgress: filteredJobs.filter((job) => ["IN_PROGRESS", "SENT_TO_QC"].includes(getGroupStatus(job))).length,
      qcPassRate:
        qcResolvedInWindow.length > 0
          ? round((qcResolvedInWindow.filter((job) => job.qcDecision === "APPROVED").length / qcResolvedInWindow.length) * 100, 1)
          : 0,
      totalMachineHoursToday: round(sumBy(operatorLogsToday, (log) => (log.durationSeconds || 0) / 3600), 2),
      operatorUtilizationRate: (() => {
        const activeOperators = uniqueStrings(
          operatorLogsToday
            .map((log) => String(log.userName || getEmailLocalPart(String(log.userEmail || ""))))
            .filter(Boolean)
        );
        if (!activeOperators.length) return 0;
        const totalHours = sumBy(operatorLogsToday, (log) => (log.durationSeconds || 0) / 3600);
        return round((totalHours / (activeOperators.length * 8)) * 100, 1);
      })(),
      comparisonDelta: round(
        createMetricDelta(sumBy(jobsInWindow, (job) => job.totalAmount), sumBy(previousJobsWindow, (job) => job.totalAmount)),
        1
      ),
    };

    const admin = {
      metrics: adminMetrics,
      topPerformers: {
        operator: topOperator
          ? {
              name: topOperator.name,
              image: "",
              metricValue: round(topOperator.value, 2),
              metricLabel: "Revenue generated",
              trend: "up",
            }
          : null,
        programmer: topProgrammer
          ? {
              name: topProgrammer.name,
              image: "",
              metricValue: topProgrammer.value,
              metricLabel: "Jobs created",
              trend: "up",
            }
          : null,
        qc: topQc
          ? {
              name: topQc.name,
              image: "",
              metricValue: round(topQc.value * 100, 0),
              metricLabel: "Approval score",
              trend: "up",
            }
          : null,
      },
      revenueBreakdown: {
        byCustomer: aggregateByKey(filteredJobs, (job) => job.customer || "Unknown", (job) => job.totalAmount).slice(0, 6),
        byMachineType: aggregateByKey(
          filteredJobs.flatMap((job) => (job.machineNumbers.length ? job.machineNumbers : ["Unassigned"]).map((machine) => ({ machine, amount: job.totalAmount }))),
          (item) => item.machine,
          (item) => item.amount
        ).slice(0, 6),
        byOperator: aggregateByKey(
          filteredJobs.flatMap((job) => (splitNames(job.assignedTo).length ? splitNames(job.assignedTo) : ["Unassigned"]).map((operator) => ({ operator, amount: job.totalAmount }))),
          (item) => item.operator,
          (item) => item.amount
        ).slice(0, 6),
      },
      activityFeed: createActivityFeed(filteredLogs),
      monthlyTrend: adminTrend,
    };

    const activeCurrentLog = currentOperatorLogs
      .filter((log) => log.status === "IN_PROGRESS")
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
    const currentOperatorGroupId = activeCurrentLog?.jobGroupId ? String(activeCurrentLog.jobGroupId) : "";
    const currentOperatorJob = currentOperatorGroupId
      ? filteredJobs.find((job) => job.groupId === currentOperatorGroupId)
      : null;
    const operatorRevenueToday = (() => {
      const completedGroupIds = new Set(
        currentOperatorLogs
          .filter((log) => log.status === "COMPLETED" && log.jobGroupId)
          .map((log) => String(log.jobGroupId))
      );
      return round(
        sumBy(filteredJobs.filter((job) => completedGroupIds.has(job.groupId)), (job) => job.totalAmount),
        2
      );
    })();
    const operatorHoursToday = round(sumBy(currentOperatorLogs, (log) => (log.durationSeconds || 0) / 3600), 2);
    const operatorJobsCompletedToday = new Set(
      currentOperatorLogs
        .filter((log) => log.status === "COMPLETED" && log.jobGroupId)
        .map((log) => String(log.jobGroupId))
    ).size;
    const operatorTarget = Math.max(10000, round(sumBy(currentOperatorJobs.slice(0, 5), (job) => job.totalAmount), 2) || 10000);
    const operatorSeries = Array.from({ length: 8 }).map((_, index) => {
      const bucketStart = new Date(todayStart.getTime() + index * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 59 * 60 * 1000);
      const bucketLogs = currentOperatorLogs.filter((log) => log.startedAt >= bucketStart && log.startedAt <= bucketEnd);
      const bucketGroupIds = new Set(bucketLogs.map((log) => (log.jobGroupId ? String(log.jobGroupId) : "")));
      return {
        label: bucketStart.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
        hours: round(sumBy(bucketLogs, (log) => (log.durationSeconds || 0) / 3600), 2),
        revenue: round(sumBy(filteredJobs.filter((job) => bucketGroupIds.has(job.groupId)), (job) => job.totalAmount), 2),
      };
    });

    const operator = {
      profile: {
        name: operatorFocusName || "Operator",
        badge: reqRole === "ADMIN" ? "Admin View" : "Operator",
        todayRevenue: operatorRevenueToday,
        machineHoursToday: operatorHoursToday,
        jobsCompletedToday: operatorJobsCompletedToday,
        currentMachine: currentOperatorJob?.machineNumbers[0] || getLogMachineNumber(activeCurrentLog || ({} as DashboardLogRecord)) || "Idle",
        targetRevenue: operatorTarget,
        completionPercent: operatorTarget > 0 ? round((operatorRevenueToday / operatorTarget) * 100, 1) : 0,
        motivationalMessage:
          operatorRevenueToday >= operatorTarget
            ? "Target crushed. Keep the spindle hot."
            : operatorRevenueToday >= operatorTarget * 0.7
              ? "Strong pace today. A few more settings will close the gap."
              : "Momentum is building. Focus on the next completed setting.",
      },
      currentJob: currentOperatorJob
        ? {
            refNumber: currentOperatorJob.refNumber,
            customer: currentOperatorJob.customer,
            machineNumber: currentOperatorJob.machineNumbers[0] || "Unassigned",
            startedAt: activeCurrentLog?.startedAt.toISOString() || currentOperatorJob.createdAt.toISOString(),
            estimatedCompletionAt: new Date(
              (activeCurrentLog?.startedAt || new Date()).getTime() + Math.max(0.5, currentOperatorJob.totalHrs || 1) * 60 * 60 * 1000
            ).toISOString(),
            realTimeHoursSeed: round(
              ((new Date().getTime() - (activeCurrentLog?.startedAt.getTime() || new Date().getTime())) / (1000 * 60 * 60)),
              2
            ),
            groupId: currentOperatorJob.groupId,
          }
        : null,
      schedule: currentOperatorJobs.slice(0, 6).map((job) => ({
        id: job.groupId,
        refNumber: job.refNumber,
        customer: job.customer,
        machineNumber: job.machineNumbers[0] || "Unassigned",
        cutDetails: job.description || `${job.settingsCount} setting(s)`,
        estimatedHours: round(job.totalHrs, 2),
        status: getGroupStatus(job),
      })),
      productionSeries: operatorSeries,
      machineStatus: aggregateByKey(
        currentOperatorJobs.flatMap((job) => (job.machineNumbers.length ? job.machineNumbers : ["Unassigned"]).map((machine) => ({ machine, hours: job.totalHrs }))),
        (item) => item.machine,
        (item) => item.hours
      )
        .slice(0, 4)
        .map((item, index) => ({
          machineNumber: item.name,
          status: index === 0 && currentOperatorJob ? "RUNNING" : item.value > 0 ? "IDLE" : "MAINTENANCE",
          uptimePercent: round(Math.min(100, (item.value / 8) * 100), 1),
        })),
      qcStatus: currentOperatorJobs
        .filter((job) => job.sentToQaCount > 0 || job.qcDecision !== "PENDING")
        .slice(0, 6)
        .map((job) => ({
          id: job.groupId,
          refNumber: job.refNumber,
          customer: job.customer,
          status: job.qcDecision,
          rejectionReason: job.qcDecision === "REJECTED" ? "QC marked this job for rework." : "",
        })),
    };

    const programmerCompleted = currentProgrammerJobs.filter((job) => job.qcDecision === "APPROVED").length;
    const programmerRejected = currentProgrammerJobs.filter((job) => job.qcDecision === "REJECTED").length;
    const programmerResolved = currentProgrammerJobs.filter((job) => job.qcDecision !== "PENDING").length;
    const teamResolved = filteredJobs.filter((job) => job.qcDecision !== "PENDING");
    const programmerQuality = programmerResolved > 0 ? (programmerCompleted / programmerResolved) * 100 : 0;
    const teamQuality =
      teamResolved.length > 0
        ? (filteredJobs.filter((job) => job.qcDecision === "APPROVED").length / teamResolved.length) * 100
        : 0;

    const programmer = {
      summary: {
        jobsCreatedToday: currentProgrammerJobs.filter((job) => job.createdAt >= todayStart).length,
        jobsCreatedThisMonth: currentProgrammerJobs.filter((job) => job.createdAt >= monthStart).length,
        jobsCurrentlyActive: currentProgrammerJobs.filter((job) => ["IN_PROGRESS", "SENT_TO_QC"].includes(getGroupStatus(job))).length,
        jobsCompleted: programmerCompleted,
        jobsWithIssues: programmerRejected,
      },
      recentJobs: currentProgrammerJobs.slice(0, 8).map((job) => ({
        id: job.groupId,
        refNumber: job.refNumber,
        customer: job.customer,
        status: getGroupStatus(job),
        createdAt: job.createdAt.toISOString(),
        totalAmount: round(job.totalAmount, 2),
      })),
      qualityScore: {
        score: round(programmerQuality, 1),
        teamAverage: round(teamQuality, 1),
        trend: programmerQuality >= teamQuality ? "up" : "down",
      },
      statusBreakdown: [
        { name: "Pending Assignment", value: currentProgrammerJobs.filter((job) => getGroupStatus(job) === "PENDING_ASSIGNMENT").length },
        { name: "In Progress", value: currentProgrammerJobs.filter((job) => getGroupStatus(job) === "IN_PROGRESS").length },
        { name: "Completed", value: programmerCompleted },
        { name: "Rejected", value: programmerRejected },
      ],
      customerBreakdown: aggregateByKey(currentProgrammerJobs, (job) => job.customer || "Unknown", () => 1).slice(0, 6),
      qcFeedback: currentProgrammerJobs
        .filter((job) => job.qcDecision === "REJECTED")
        .slice(0, 6)
        .map((job) => ({
          id: job.groupId,
          refNumber: job.refNumber,
          customer: job.customer,
          feedback: job.updatedBy ? `Rejected by ${job.updatedBy}` : "Rejected by QC",
          reason: "No rejection reason recorded yet.",
        })),
      revenueImpact: {
        totalRevenue: round(sumBy(currentProgrammerJobs, (job) => job.totalAmount), 2),
        averageJobValue: currentProgrammerJobs.length > 0 ? round(sumBy(currentProgrammerJobs, (job) => job.totalAmount) / currentProgrammerJobs.length, 2) : 0,
      },
    };

    const pendingQcItems = queueJobs.flatMap((job) =>
      Array.from({ length: Math.max(1, job.sentToQaCount || 0) }).map((_, index) => ({
        id: `${job.groupId}-${index}`,
        refNumber: job.refNumber,
        operator: splitNames(job.assignedTo)[0] || "Unassigned",
        programmer: job.createdBy || "Unknown",
        issueType: job.priority || "Standard",
        status: "PENDING_REVIEW",
        timeInQueueHours: round(((new Date().getTime() - (job.updatedAt || job.createdAt).getTime()) / (1000 * 60 * 60)), 1),
      }))
    );
    const qcResolvedThisMonth = filteredJobs.filter(
      (job) => job.qcDecision !== "PENDING" && (job.updatedAt || job.createdAt) >= monthStart
    );
    const currentQcReviewed = currentQcJobs.filter((job) => job.qcDecision !== "PENDING");
    const currentQcApprovals = currentQcReviewed.filter((job) => job.qcDecision === "APPROVED").length;

    const qc = {
      queueMetrics: {
        jobsPendingQc: pendingQcItems.length,
        jobsInspectedThisMonth: qcResolvedThisMonth.length,
        approvalRate:
          qcResolvedThisMonth.length > 0
            ? round((qcResolvedThisMonth.filter((job) => job.qcDecision === "APPROVED").length / qcResolvedThisMonth.length) * 100, 1)
            : 0,
        rejectionRate:
          qcResolvedThisMonth.length > 0
            ? round((qcResolvedThisMonth.filter((job) => job.qcDecision === "REJECTED").length / qcResolvedThisMonth.length) * 100, 1)
            : 0,
      },
      inspectionSummary: {
        approvedToday: filteredJobs.filter((job) => job.qcDecision === "APPROVED" && (job.updatedAt || job.createdAt) >= todayStart).length,
        rejectedToday: filteredJobs.filter((job) => job.qcDecision === "REJECTED" && (job.updatedAt || job.createdAt) >= todayStart).length,
        pendingReview: pendingQcItems.length,
      },
      rejectionReasons: [
        {
          name: "No reason recorded",
          value: filteredJobs.filter((job) => job.qcDecision === "REJECTED").length,
          example: filteredJobs.find((job) => job.qcDecision === "REJECTED")?.description || "QC rejection recorded without explicit reason",
        },
      ],
      inspectorPerformance: {
        inspectorName: qcFocusName || "QC Inspector",
        inspectionRate: round(sumBy(currentQcReviewed, () => 1) / Math.max(1, currentQcReviewed.length), 2),
        approvalRate: currentQcReviewed.length > 0 ? round((currentQcApprovals / currentQcReviewed.length) * 100, 1) : 0,
        comparisonToTeam: currentQcReviewed.length > 0 && qcResolvedThisMonth.length > 0
          ? round(((currentQcApprovals / currentQcReviewed.length) - (qcResolvedThisMonth.filter((job) => job.qcDecision === "APPROVED").length / Math.max(1, qcResolvedThisMonth.length))) * 100, 1)
          : 0,
      },
      jobsRequiringReview: pendingQcItems.slice(0, 8),
      monthlyTrends: adminTrend.map((item) => ({
        label: item.label,
        approvalRate: item.approvals + item.rejections > 0 ? round((item.approvals / (item.approvals + item.rejections)) * 100, 1) : 0,
        rejectionRate: item.approvals + item.rejections > 0 ? round((item.rejections / (item.approvals + item.rejections)) * 100, 1) : 0,
        inspectionVolume: item.approvals + item.rejections,
      })),
      criticalJobs: filteredJobs
        .filter((job) => job.critical || job.qcDecision === "REJECTED" || ((job.updatedAt || job.createdAt).getTime() < Date.now() - 48 * 60 * 60 * 1000 && job.sentToQaCount > 0))
        .slice(0, 6)
        .map((job) => ({
          id: job.groupId,
          refNumber: job.refNumber,
          customer: job.customer,
          priority: job.priority,
          status: job.qcDecision,
          timeInQueueHours: round(((Date.now() - (job.updatedAt || job.createdAt).getTime()) / (1000 * 60 * 60)), 1),
        })),
    };

    res.json({
      meta: {
        generatedAt: new Date().toISOString(),
        activeView,
        allowedViews: reqRole === "ADMIN" ? ["ADMIN", "OPERATOR", "PROGRAMMER", "QC"] : [activeView],
        dateRange: {
          preset: dateRange.preset,
          label: dateRange.label,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        },
        filters: {
          customer: customerFilter,
          machine: machineFilter,
          operator: operatorFilter,
          programmer: programmerFilter,
        },
        filterOptions: {
          customers: uniqueStrings(filteredJobs.map((job) => job.customer).filter(Boolean)),
          machines: uniqueStrings(filteredJobs.flatMap((job) => job.machineNumbers)),
          operators: uniqueStrings(filteredJobs.flatMap((job) => splitNames(job.assignedTo))),
          programmers: uniqueStrings(filteredJobs.map((job) => job.createdBy).filter(Boolean)),
        },
      },
      admin,
      operator,
      programmer,
      qc,
    });
  } catch (error: any) {
    console.error("Error building dashboard summary:", error);
    res.status(500).json({ message: "Error building dashboard summary" });
  }
});

export default router;
