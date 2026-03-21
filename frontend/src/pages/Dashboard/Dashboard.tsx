import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { getEmployeeLogs } from "../../services/employeeLogsApi";
import { getJobs } from "../../services/jobApi";
import { getUsers } from "../../services/userApi";
import type { EmployeeLog } from "../../types/employeeLog";
import type { JobEntry } from "../../types/job";
import type { User } from "../../types/user";
import {
  getUserDisplayNameFromToken,
  getUserIdFromToken,
  getUserRoleFromToken,
} from "../../utils/auth";
import { formatMachineLabel, getDisplayName, getInitials, toMachineIndex } from "../../utils/jobFormatting";
import "../RoleBoard.css";
import "./Dashboard.css";

const REFRESH_INTERVAL_MS = 30000;
const OPERATOR_DAILY_TARGET = 6;
const OPERATOR_MONTHLY_TARGET = 120;
const OPERATOR_YEARLY_TARGET = 1200;

type DashboardTone = "cyan" | "orange" | "blue" | "green" | "violet" | "rose";

type GroupSummary = {
  groupId: string;
  parent: JobEntry;
  entries: JobEntry[];
  createdDate: Date | null;
  customer: string;
  description: string;
  amount: number;
  expectedHours: number;
  machine: string;
  hasInput: boolean;
  qcDispatched: boolean;
  qcDecision: "PENDING" | "APPROVED" | "REJECTED";
  overtimeMinutes: number;
};

type MetricCardProps = {
  title: string;
  value: number;
  subtitle: string;
  tone: DashboardTone;
  icon: ReactNode;
  onClick?: () => void;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

type PanelProps = {
  title: string;
  subtitle: string;
  tone?: DashboardTone;
  delay?: number;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  ctaLabel?: string;
};

type DashboardProps = {
  mode?: "shared" | "operator";
};

const toValidDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (date: Date | null, reference: Date) =>
  Boolean(
    date &&
      date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth() &&
      date.getDate() === reference.getDate()
  );

const isSameMonth = (date: Date | null, reference: Date) =>
  Boolean(date && date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth());

const isSameYear = (date: Date | null, reference: Date) =>
  Boolean(date && date.getFullYear() === reference.getFullYear());

const getDayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);

const getGroupAmount = (entries: JobEntry[]) =>
  entries.reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0);

const getGroupExpectedHours = (entries: JobEntry[]) => {
  const wedmAmount = entries.reduce(
    (sum, entry) => sum + Number(entry.totalHrs || 0) * Number(entry.rate || 0),
    0
  );
  return wedmAmount / 625 / 24;
};

const getLatestActiveStart = (entries: JobEntry[]) => {
  let latestStart: string | null = null;
  entries.forEach((entry) => {
    const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
    captures.forEach((capture) => {
      if (!capture?.startTime || capture?.endTime) return;
      const parsed = toValidDate(capture.startTime);
      if (!parsed) return;
      if (!latestStart || parsed.getTime() > new Date(latestStart).getTime()) {
        latestStart = capture.startTime;
      }
    });
  });
  return latestStart;
};

const getOvertimeMinutes = (entries: JobEntry[], now: Date) => {
  const expectedHours = getGroupExpectedHours(entries);
  const latestActiveStart = getLatestActiveStart(entries);
  if (!latestActiveStart || expectedHours <= 0) return 0;
  const elapsedHours = Math.max(0, now.getTime() - new Date(latestActiveStart).getTime()) / 3600000;
  return elapsedHours > expectedHours ? Math.ceil((elapsedHours - expectedHours) * 60) : 0;
};

const getMachineForEntries = (entries: JobEntry[]) => {
  const directMachine = entries.find((entry) => String(entry.machineNumber || "").trim())?.machineNumber || "";
  if (directMachine) return formatMachineLabel(directMachine);

  for (const entry of entries) {
    const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
    const latestCapture = [...captures].reverse().find((capture) => String(capture.machineNumber || "").trim());
    if (latestCapture?.machineNumber) {
      return formatMachineLabel(latestCapture.machineNumber);
    }
  }

  return "-";
};

const hasAnyInputCapture = (entries: JobEntry[]) =>
  entries.some((entry) => Array.isArray(entry.operatorCaptures) && entry.operatorCaptures.length > 0);

const hasAnyQcDispatch = (entries: JobEntry[]) =>
  entries.some((entry) =>
    Object.values(entry.quantityQaStates || {}).some((status) => String(status).toUpperCase() === "SENT_TO_QA")
  );

const getRelativeTimeLabel = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) return "Now";
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
};

const formatCounterValue = (
  value: number,
  {
    prefix = "",
    suffix = "",
    decimals = 0,
  }: { prefix?: string; suffix?: string; decimals?: number }
) => `${prefix}${value.toFixed(decimals)}${suffix}`;

const useAnimatedNumber = (value: number) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const delta = value - startValue;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / 700);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + delta * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      previousValueRef.current = value;
      window.cancelAnimationFrame(frame);
    };
  }, [value]);

  return displayValue;
};

const AnimatedMetricValue = ({
  value,
  prefix,
  suffix,
  decimals,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) => {
  const animatedValue = useAnimatedNumber(value);
  return <>{formatCounterValue(animatedValue, { prefix, suffix, decimals })}</>;
};

const MetricCard = ({
  title,
  value,
  subtitle,
  tone,
  icon,
  onClick,
  delay = 0,
  prefix,
  suffix,
  decimals = 0,
}: MetricCardProps) => {
  const style = { "--delay": `${delay}s` } as CSSProperties;

  return (
    <button
      type="button"
      className={`dashboard-metric-card dashboard-tone-${tone} dashboard-anim`}
      style={style}
      onClick={onClick}
    >
      <div className="dashboard-metric-top">
        <span className="dashboard-metric-icon">{icon}</span>
        <ArrowOutwardRoundedIcon className="dashboard-metric-arrow" />
      </div>
      <span className="dashboard-metric-title">{title}</span>
      <strong className="dashboard-metric-value">
        <AnimatedMetricValue value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </strong>
      <span className="dashboard-metric-subtitle">{subtitle}</span>
    </button>
  );
};

const DashboardPanel = ({
  title,
  subtitle,
  tone = "blue",
  delay = 0,
  onClick,
  children,
  className = "",
  ctaLabel = "Open",
}: PanelProps) => {
  const style = { "--delay": `${delay}s` } as CSSProperties;

  return (
    <section
      className={`dashboard-panel dashboard-tone-${tone} dashboard-anim ${className}`.trim()}
      style={style}
    >
      <div className="dashboard-panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {onClick && (
          <button type="button" className="dashboard-panel-cta" onClick={onClick}>
            {ctaLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
};

const DashboardSkeleton = () => (
  <div className="dashboard-skeleton-grid">
    <div className="dashboard-skeleton dashboard-skeleton-hero" />
    <div className="dashboard-skeleton dashboard-skeleton-side" />
    <div className="dashboard-skeleton dashboard-skeleton-card" />
    <div className="dashboard-skeleton dashboard-skeleton-card" />
    <div className="dashboard-skeleton dashboard-skeleton-card" />
    <div className="dashboard-skeleton dashboard-skeleton-card" />
    <div className="dashboard-skeleton dashboard-skeleton-panel" />
    <div className="dashboard-skeleton dashboard-skeleton-panel" />
    <div className="dashboard-skeleton dashboard-skeleton-panel" />
  </div>
);

const Dashboard = ({ mode = "shared" }: DashboardProps) => {
  const navigate = useNavigate();
  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const currentUserId = String(getUserIdFromToken() || "");
  const currentUserName = getUserDisplayNameFromToken() || "TEAM MEMBER";
  const isOperatorView = mode === "operator";
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [logs, setLogs] = useState<EmployeeLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    let isMounted = true;

    const loadDashboard = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      try {
        const [fetchedJobs, fetchedLogs, fetchedUsers] = await Promise.all([
          getJobs(),
          getEmployeeLogs(),
          getUsers(),
        ]);

        if (!isMounted) return;

        startTransition(() => {
          setJobs(fetchedJobs);
          setLogs(fetchedLogs);
          setUsers(fetchedUsers);
          setLastUpdated(new Date());
          setError("");
        });
      } catch (fetchError) {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard data");
      } finally {
        if (!isMounted) return;
        setLoading(false);
        setRefreshing(false);
      }
    };

    void loadDashboard(true);
    const intervalId = window.setInterval(() => {
      void loadDashboard(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [navigate]);

  const deferredJobs = useDeferredValue(jobs);
  const deferredLogs = useDeferredValue(logs);
  const deferredUsers = useDeferredValue(users);
  const now = useMemo(() => new Date(), [lastUpdated]);

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    deferredUsers.forEach((user) => {
      map.set(String(user._id), user);
    });
    return map;
  }, [deferredUsers]);

  const groupedJobs = useMemo(() => {
    const map = new Map<string, JobEntry[]>();
    deferredJobs.forEach((job) => {
      const groupId = String(job.groupId || job.id || "");
      if (!groupId) return;
      const existing = map.get(groupId) || [];
      existing.push(job);
      map.set(groupId, existing);
    });
    return map;
  }, [deferredJobs]);

  const groupSummaries = useMemo<GroupSummary[]>(() => {
    return Array.from(groupedJobs.entries())
      .map(([groupId, entries]) => {
        const parent = entries[0];
        return {
          groupId,
          parent,
          entries,
          createdDate: toValidDate(parent.createdAt),
          customer: String(parent.customer || "-"),
          description: String(parent.description || "-"),
          amount: getGroupAmount(entries),
          expectedHours: getGroupExpectedHours(entries),
          machine: getMachineForEntries(entries),
          hasInput: hasAnyInputCapture(entries),
          qcDispatched: hasAnyQcDispatch(entries),
          qcDecision: (parent.qcDecision || "PENDING") as "PENDING" | "APPROVED" | "REJECTED",
          overtimeMinutes: getOvertimeMinutes(entries, now),
        };
      })
      .sort((left, right) => (right.createdDate?.getTime() || 0) - (left.createdDate?.getTime() || 0));
  }, [groupedJobs, now]);

  const groupSummariesById = useMemo(() => {
    const map = new Map<string, GroupSummary>();
    groupSummaries.forEach((group) => map.set(group.groupId, group));
    return map;
  }, [groupSummaries]);

  const jobsCreatedToday = useMemo(
    () => groupSummaries.filter((group) => isSameDay(group.createdDate, now)).length,
    [groupSummaries, now]
  );

  const bookedTodayAmount = useMemo(
    () =>
      groupSummaries
        .filter((group) => isSameDay(group.createdDate, now))
        .reduce((sum, group) => sum + group.amount, 0),
    [groupSummaries, now]
  );

  const inputCapturedCount = useMemo(
    () => groupSummaries.filter((group) => group.hasInput).length,
    [groupSummaries]
  );

  const qcPendingCount = useMemo(
    () => groupSummaries.filter((group) => group.qcDispatched && group.qcDecision === "PENDING").length,
    [groupSummaries]
  );

  const qcApprovedCount = useMemo(
    () => groupSummaries.filter((group) => group.qcDecision === "APPROVED").length,
    [groupSummaries]
  );

  const qcRejectedCount = useMemo(
    () => groupSummaries.filter((group) => group.qcDecision === "REJECTED").length,
    [groupSummaries]
  );

  const overtimeGroups = useMemo(
    () => groupSummaries.filter((group) => group.overtimeMinutes > 0),
    [groupSummaries]
  );

  const liveOperatorSessions = useMemo(() => {
    return deferredLogs
      .filter(
        (log) =>
          String(log.role || "").toUpperCase() === "OPERATOR" &&
          String(log.status || "").toUpperCase() === "IN_PROGRESS" &&
          String(log.jobGroupId || "").trim()
      )
      .map((log) => {
        const linkedUser = usersById.get(String(log.userId));
        const group = groupSummariesById.get(String(log.jobGroupId || ""));
        const displayName = linkedUser
          ? getDisplayName(linkedUser.firstName, linkedUser.lastName, linkedUser.email, String(linkedUser._id))
          : String(log.userName || log.userEmail || "Operator").trim() || "Operator";
        const machineFromMeta = String((log.metadata as Record<string, any> | undefined)?.machineNumber || "").trim();
        return {
          id: log._id,
          groupId: String(log.jobGroupId || ""),
          operatorName: displayName,
          operatorInitials: getInitials(displayName),
          customer: group?.customer || String(log.jobCustomer || "-"),
          description: group?.description || String(log.jobDescription || log.workSummary || "-"),
          machine: machineFromMeta ? formatMachineLabel(machineFromMeta) : group?.machine || "-",
          startedAt: log.startedAt,
          inputState: group?.hasInput ? "Input saved" : "Input pending",
          overtimeMinutes: group?.overtimeMinutes || 0,
        };
      })
      .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
  }, [deferredLogs, groupSummariesById, usersById]);

  const activeMachineCount = useMemo(
    () =>
      new Set(liveOperatorSessions.map((session) => toMachineIndex(session.machine)).filter(Boolean)).size,
    [liveOperatorSessions]
  );

  const weeklyCreatedSeries = useMemo(() => {
    const values: number[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const bucketDate = new Date(now);
      bucketDate.setHours(0, 0, 0, 0);
      bucketDate.setDate(now.getDate() - offset);
      values.push(groupSummaries.filter((group) => isSameDay(group.createdDate, bucketDate)).length);
    }
    return values;
  }, [groupSummaries, now]);

  const weeklyLabels = useMemo(() => {
    const labels: string[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const bucketDate = new Date(now);
      bucketDate.setHours(0, 0, 0, 0);
      bucketDate.setDate(now.getDate() - offset);
      labels.push(getDayLabel(bucketDate));
    }
    return labels;
  }, [now]);

  const topCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    groupSummaries.forEach((group) => {
      counts.set(group.customer, (counts.get(group.customer) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([customer, count]) => ({ customer, count }));
  }, [groupSummaries]);

  const machineLoad = useMemo(() => {
    const counts = new Map<string, number>();
    liveOperatorSessions.forEach((session) => {
      if (!session.machine || session.machine === "-") return;
      counts.set(session.machine, (counts.get(session.machine) || 0) + 1);
    });
    const rows = Array.from(counts.entries()).map(([machine, count]) => ({ machine, count }));
    return rows.length > 0 ? rows.sort((left, right) => right.count - left.count) : [{ machine: "M1", count: 0 }];
  }, [liveOperatorSessions]);

  const operatorLogs = useMemo(
    () =>
      deferredLogs.filter(
        (log) =>
          String(log.role || "").toUpperCase() === "OPERATOR" &&
          String(log.userId || "") === currentUserId &&
          String(log.jobGroupId || "").trim()
      ),
    [currentUserId, deferredLogs]
  );

  const countDistinctOperatorGroups = (predicate: (log: EmployeeLog, completedDate: Date | null) => boolean) => {
    const groups = new Set<string>();
    operatorLogs.forEach((log) => {
      const completedDate = toValidDate(log.endedAt || log.startedAt);
      if (predicate(log, completedDate)) {
        groups.add(String(log.jobGroupId || ""));
      }
    });
    return groups.size;
  };

  const operatorCompletedToday = countDistinctOperatorGroups(
    (log, completedDate) => String(log.status || "").toUpperCase() === "COMPLETED" && isSameDay(completedDate, now)
  );
  const operatorCompletedMonth = countDistinctOperatorGroups(
    (log, completedDate) => String(log.status || "").toUpperCase() === "COMPLETED" && isSameMonth(completedDate, now)
  );
  const operatorCompletedYear = countDistinctOperatorGroups(
    (log, completedDate) => String(log.status || "").toUpperCase() === "COMPLETED" && isSameYear(completedDate, now)
  );

  const operatorLiveSessions = useMemo(
    () => liveOperatorSessions.filter((session) => operatorLogs.some((log) => log._id === session.id)),
    [liveOperatorSessions, operatorLogs]
  );

  const operatorInputToday = useMemo(() => {
    const groups = new Set<string>();
    operatorLogs.forEach((log) => {
      if (isSameDay(toValidDate(log.startedAt), now)) {
        groups.add(String(log.jobGroupId || ""));
      }
    });
    return groups.size;
  }, [now, operatorLogs]);

  const operatorHoursToday = useMemo(() => {
    const totalSeconds = operatorLogs.reduce((sum, log) => {
      if (!isSameDay(toValidDate(log.endedAt || log.startedAt), now)) return sum;
      return sum + Number(log.durationSeconds || 0);
    }, 0);
    return totalSeconds / 3600;
  }, [now, operatorLogs]);

  const operatorOvertimeCount = useMemo(
    () =>
      operatorLiveSessions.filter((session) => {
        const group = groupSummariesById.get(session.groupId);
        return (group?.overtimeMinutes || 0) > 0;
      }).length,
    [groupSummariesById, operatorLiveSessions]
  );

  const operatorOnTimeToday = Math.max(0, operatorCompletedToday - operatorOvertimeCount);
  const operatorTargetPercent = Math.min(100, Math.round((operatorCompletedToday / OPERATOR_DAILY_TARGET) * 100));

  const operatorPerformanceSeries = useMemo(() => {
    const values: number[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const bucketDate = new Date(now);
      bucketDate.setHours(0, 0, 0, 0);
      bucketDate.setDate(now.getDate() - offset);
      values.push(
        countDistinctOperatorGroups(
          (log, completedDate) =>
            String(log.status || "").toUpperCase() === "COMPLETED" && isSameDay(completedDate, bucketDate)
        )
      );
    }
    return values;
  }, [now, operatorLogs]);

  const recentActivity = useMemo(() => {
    return deferredLogs
      .slice()
      .sort(
        (left, right) =>
          new Date(right.updatedAt || right.endedAt || right.startedAt).getTime() -
          new Date(left.updatedAt || left.endedAt || left.startedAt).getTime()
      )
      .slice(0, 5)
      .map((log) => {
        const linkedUser = usersById.get(String(log.userId || ""));
        const displayName = linkedUser
          ? getDisplayName(linkedUser.firstName, linkedUser.lastName, linkedUser.email, String(linkedUser._id))
          : String(log.userName || log.userEmail || "Team").trim() || "Team";
        return {
          id: log._id,
          title: String(log.workSummary || log.jobDescription || log.workItemTitle || "Activity recorded"),
          subtitle: `${displayName} • ${String(log.role || "").toUpperCase() || "APP"} • ${getRelativeTimeLabel(
            log.updatedAt || log.endedAt || log.startedAt
          )}`,
        };
      });
  }, [deferredLogs, usersById]);

  const adminMetricCards = useMemo(() => {
    const cards = [
      {
        title: "Jobs Created Today",
        value: jobsCreatedToday,
        subtitle: "Fresh groups added by Programmer today.",
        tone: "cyan" as DashboardTone,
        icon: <CodeOutlinedIcon />,
        path: "/programmer",
      },
      {
        title: "Live Machines",
        value: activeMachineCount,
        subtitle: "Machines currently tied to running operator logs.",
        tone: "orange" as DashboardTone,
        icon: <PrecisionManufacturingOutlinedIcon />,
        path: "/operator",
      },
      {
        title: "QC Queue",
        value: qcPendingCount,
        subtitle: "Groups waiting for a QC decision.",
        tone: "violet" as DashboardTone,
        icon: <VerifiedOutlinedIcon />,
        path: "/qc",
      },
      {
        title: "Input Captured",
        value: inputCapturedCount,
        subtitle: "Groups where operator inputs have been saved.",
        tone: "green" as DashboardTone,
        icon: <AssignmentTurnedInOutlinedIcon />,
        path: "/operator",
      },
    ];

    if (isAdmin) {
      cards.push({
        title: "Booked Today",
        value: bookedTodayAmount,
        subtitle: "Admin-only amount visibility for today’s new jobs.",
        tone: "blue" as DashboardTone,
        icon: <ReceiptLongOutlinedIcon />,
        path: "/programmer",
      });
    }

    return cards;
  }, [activeMachineCount, bookedTodayAmount, inputCapturedCount, isAdmin, jobsCreatedToday, qcPendingCount]);

  return (
    <div className="roleboard-container dashboard-roleboard">
      <Sidebar currentPath={isOperatorView ? "/operator-dashboard" : "/dashboard"} onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content dashboard-roleboard-content">
        <Header title={isOperatorView ? "Operator Dashboard" : "Dashboard"} />
        <div className="dashboard-stage">
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {isOperatorView ? (
                <>
                  <div className="dashboard-metric-grid">
                    <MetricCard
                      title="Active Jobs"
                      value={operatorLiveSessions.length}
                      subtitle="Jobs you are currently running."
                      tone="orange"
                      icon={<BuildCircleOutlinedIcon />}
                      delay={0.05}
                      onClick={() => navigate("/operator")}
                    />
                    <MetricCard
                      title="Inputs Filled Today"
                      value={operatorInputToday}
                      subtitle="Distinct jobs where you entered production input today."
                      tone="cyan"
                      icon={<AssignmentTurnedInOutlinedIcon />}
                      delay={0.1}
                      onClick={() => navigate("/operator")}
                    />
                    <MetricCard
                      title="Completed Today"
                      value={operatorCompletedToday}
                      subtitle={`Target tracker against ${OPERATOR_DAILY_TARGET} jobs.`}
                      tone="green"
                      icon={<CheckCircleOutlineRoundedIcon />}
                      delay={0.15}
                      onClick={() => navigate("/job-logs")}
                    />
                    <MetricCard
                      title="Overtime Running"
                      value={operatorOvertimeCount}
                      subtitle="Live jobs running past expected time."
                      tone="rose"
                      icon={<ScheduleOutlinedIcon />}
                      delay={0.2}
                      onClick={() => navigate("/operator")}
                    />
                    <MetricCard
                      title="Hours Logged Today"
                      value={operatorHoursToday}
                      subtitle="Time captured from your production logs."
                      tone="violet"
                      icon={<InsightsOutlinedIcon />}
                      delay={0.25}
                      decimals={1}
                      suffix=" hrs"
                      onClick={() => navigate("/job-logs")}
                    />
                  </div>

                  <div className="dashboard-panel-grid dashboard-panel-grid-operator">
                    <DashboardPanel
                      title="My Live Queue"
                      subtitle="Running jobs, machines, and whether your input is already saved."
                      tone="blue"
                      className="dashboard-panel-span-2"
                      delay={0.28}
                      onClick={() => navigate("/operator")}
                    >
                      <div className="dashboard-feed-list">
                        {(operatorLiveSessions.length > 0 ? operatorLiveSessions : liveOperatorSessions)
                          .slice(0, 4)
                          .map((session) => (
                            <button
                              key={session.id}
                              type="button"
                              className="dashboard-feed-row"
                              onClick={() => navigate("/operator")}
                            >
                              <span className="dashboard-feed-avatar">{session.operatorInitials}</span>
                              <div className="dashboard-feed-copy">
                                <strong>{session.customer}</strong>
                                <span>{session.description}</span>
                              </div>
                              <div className="dashboard-feed-meta">
                                <span>{session.machine}</span>
                                <small>{session.inputState}</small>
                                {session.overtimeMinutes > 0 ? (
                                  <small className="dashboard-feed-alert">
                                    Overtime {session.overtimeMinutes} mins
                                  </small>
                                ) : (
                                  <small>{getRelativeTimeLabel(session.startedAt)}</small>
                                )}
                              </div>
                            </button>
                          ))}
                        {operatorLiveSessions.length === 0 && (
                          <div className="dashboard-empty-state">
                            No live operator session is running right now. Start a job on the Operator screen to see it here.
                          </div>
                        )}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel
                      title="Target Progress"
                      subtitle="Daily, monthly, and yearly output against the default operator targets."
                      tone="green"
                      delay={0.32}
                    >
                      <div className="dashboard-target-stack">
                        {[
                          { label: "Today", value: operatorCompletedToday, target: OPERATOR_DAILY_TARGET },
                          { label: "Month", value: operatorCompletedMonth, target: OPERATOR_MONTHLY_TARGET },
                          { label: "Year", value: operatorCompletedYear, target: OPERATOR_YEARLY_TARGET },
                        ].map((item) => {
                          const percentage = Math.min(100, Math.round((item.value / item.target) * 100));
                          return (
                            <div key={item.label} className="dashboard-progress-row">
                              <div className="dashboard-progress-head">
                                <span>{item.label}</span>
                                <strong>
                                  {item.value} / {item.target}
                                </strong>
                              </div>
                              <div className="dashboard-progress-bar">
                                <div className="dashboard-progress-fill" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel
                      title="Performance Pulse"
                      subtitle={`Daily target hit ${operatorTargetPercent}% • On time ${operatorOnTimeToday} • Overtime ${operatorOvertimeCount}`}
                      tone="violet"
                      className="dashboard-panel-span-3"
                      delay={0.36}
                    >
                      <div className="dashboard-bars">
                        {operatorPerformanceSeries.map((value, index) => {
                          const max = Math.max(...operatorPerformanceSeries, 1);
                          const height = Math.max(16, (value / max) * 100);
                          return (
                            <div key={`${weeklyLabels[index]}-${value}`} className="dashboard-bar-column">
                              <div className="dashboard-bar-outer">
                                <div className="dashboard-bar-fill" style={{ height: `${height}%` }} />
                              </div>
                              <strong>{value}</strong>
                              <span>{weeklyLabels[index]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </DashboardPanel>
                  </div>
                </>
              ) : (
                <>
                  <div className="dashboard-metric-grid">
                    {adminMetricCards.map((card, index) => (
                      <MetricCard
                        key={card.title}
                        title={card.title}
                        value={card.value}
                        subtitle={card.subtitle}
                        tone={card.tone}
                        icon={card.icon}
                        delay={0.05 * (index + 1)}
                        prefix={card.title === "Booked Today" ? "Rs. " : undefined}
                        onClick={() => navigate(card.path)}
                      />
                    ))}
                  </div>

                  <div className="dashboard-panel-grid dashboard-panel-grid-admin">
                    <DashboardPanel
                      title="Shop Floor Pulse"
                      subtitle="Who is running, on which machine, and whether operator input is already captured."
                      tone="blue"
                      className="dashboard-panel-span-2"
                      delay={0.28}
                      onClick={() => navigate("/operator")}
                    >
                      <div className="dashboard-feed-list">
                        {liveOperatorSessions.slice(0, 4).map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            className="dashboard-feed-row"
                            onClick={() => navigate("/operator")}
                          >
                            <span className="dashboard-feed-avatar">{session.operatorInitials}</span>
                            <div className="dashboard-feed-copy">
                              <strong>{session.operatorName}</strong>
                              <span>
                                {session.customer} • {session.description}
                              </span>
                            </div>
                            <div className="dashboard-feed-meta">
                              <span>{session.machine}</span>
                              <small>{session.inputState}</small>
                              {session.overtimeMinutes > 0 ? (
                                <small className="dashboard-feed-alert">
                                  Overtime {session.overtimeMinutes} mins
                                </small>
                              ) : (
                                <small>{getRelativeTimeLabel(session.startedAt)}</small>
                              )}
                            </div>
                          </button>
                        ))}
                        {liveOperatorSessions.length === 0 && (
                          <div className="dashboard-empty-state">
                            No operator is running a live job right now. This panel populates automatically once production starts.
                          </div>
                        )}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel
                      title="Pipeline Mix"
                      subtitle="Live stage distribution across creation, input capture, QC, approvals, rejections, and overruns."
                      tone="violet"
                      delay={0.32}
                    >
                      <div className="dashboard-target-stack">
                        {[
                          { label: "Created Today", value: jobsCreatedToday },
                          { label: "Input Captured", value: inputCapturedCount },
                          { label: "QC Pending", value: qcPendingCount },
                          { label: "Approved", value: qcApprovedCount },
                          { label: "Rejected", value: qcRejectedCount },
                          { label: "Overtime", value: overtimeGroups.length },
                        ].map((item) => {
                          const max = Math.max(
                            jobsCreatedToday,
                            inputCapturedCount,
                            qcPendingCount,
                            qcApprovedCount,
                            qcRejectedCount,
                            overtimeGroups.length,
                            1
                          );
                          return (
                            <div key={item.label} className="dashboard-progress-row">
                              <div className="dashboard-progress-head">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                              </div>
                              <div className="dashboard-progress-bar">
                                <div className="dashboard-progress-fill" style={{ width: `${(item.value / max) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel title="Machine Focus" subtitle="Active machine usage based on current operator sessions." tone="orange" delay={0.36}>
                      <div className="dashboard-machine-grid">
                        {machineLoad.slice(0, 4).map((item) => (
                          <button
                            key={item.machine}
                            type="button"
                            className="dashboard-machine-tile"
                            onClick={() => navigate("/operator")}
                          >
                            <span>{item.machine}</span>
                            <strong>{item.count}</strong>
                            <small>{item.count === 1 ? "operator" : "operators"} live</small>
                          </button>
                        ))}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel title="Top Customers" subtitle="Most active customer groups in the current job dataset." tone="green" delay={0.4}>
                      <div className="dashboard-list-card">
                        {topCustomers.slice(0, 4).map((item) => (
                          <button
                            key={item.customer}
                            type="button"
                            className="dashboard-list-row"
                            onClick={() => navigate("/programmer")}
                          >
                            <span>{item.customer}</span>
                            <strong>{item.count} jobs</strong>
                          </button>
                        ))}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel
                      title="Live Activity"
                      subtitle="Recent job, operator, and QC updates streaming into the system."
                      tone="blue"
                      delay={0.48}
                      onClick={() => navigate("/job-logs")}
                    >
                      <div className="dashboard-list-card">
                        {recentActivity.slice(0, 4).map((activity) => (
                          <button
                            key={activity.id}
                            type="button"
                            className="dashboard-activity-row"
                            onClick={() => navigate("/job-logs")}
                          >
                            <span className="dashboard-activity-dot" />
                            <div>
                              <strong>{activity.title}</strong>
                              <small>{activity.subtitle}</small>
                            </div>
                          </button>
                        ))}
                      </div>
                    </DashboardPanel>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
