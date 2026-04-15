import type { EmployeeLog } from "../types/employeeLog";
import type { JobEntry } from "../types/job";
import { formatMachineLabel } from "../utils/jobFormatting";
import { buildOperatorCompletionAlerts } from "../pages/Operator/utils/completionAlerts";

export type HeaderNotificationItem = {
  id: string;
  kind: "completion" | "assignment" | "activity";
  severity: "info" | "warning" | "danger";
  title: string;
  subtitle: string;
  statusLabel: string;
  fields: Array<{ label: string; value: string; wide?: boolean }>;
  navigatePath?: string;
  actionLabel: string;
  createdAtLabel?: string;
};

const normalizeName = (value: unknown) => String(value || "").trim().toUpperCase();

export const buildCompletionNotificationItems = (
  activeOperatorRuns: EmployeeLog[],
  operatorGridJobs: JobEntry[],
): HeaderNotificationItem[] =>
  buildOperatorCompletionAlerts(activeOperatorRuns, operatorGridJobs).map((alert) => ({
    id: `completion:${alert.alertId}`,
    kind: "completion",
    severity: alert.severity,
    title: alert.jobRef || alert.customer || "Completion alert",
    subtitle: formatMachineLabel(alert.machineNumber) || alert.machineNumber || "-",
    statusLabel: alert.statusLabel,
    navigatePath: `/operator/viewpage?groupId=${encodeURIComponent(alert.groupId)}`,
    actionLabel: "Open Job",
    fields: [
      { label: "Remaining", value: alert.remainingLabel },
      { label: "Est. Time", value: alert.estimatedTime },
      { label: "Qty", value: alert.quantityLabel },
      { label: "Operator", value: alert.operatorName || "-" },
      { label: "Description", value: alert.description || "-", wide: true },
    ],
  }));

export const buildAssignmentNotificationItems = ({
  logs,
  currentUserName,
}: {
  logs: EmployeeLog[];
  currentUserName: string;
}): HeaderNotificationItem[] =>
  logs
    .filter((log) => normalizeName(log.metadata?.targetUserName) === normalizeName(currentUserName))
    .map((log) => {
      const metadata = (log.metadata || {}) as Record<string, any>;
      const eventType = String(metadata.eventType || "").toUpperCase();
      const actorName = String(metadata.actorName || log.userName || "System").trim().toUpperCase();
      const quantityLabel = String(metadata.quantityLabel || log.settingLabel || "selected quantity").trim();
      const refNumber = String(log.refNumber || "").trim();
      const groupId = String(metadata.groupId || log.jobGroupId || "").trim();
      const isAdded = eventType === "ADDED";

      return {
        id: `assignment:${String(log._id || log.createdAt || `${refNumber}:${quantityLabel}`)}`,
        kind: "assignment",
        severity: "info",
        title: isAdded ? "Assignment added" : "Assignment removed",
        subtitle: refNumber ? `#${refNumber}` : String(log.jobDescription || "Operator update"),
        statusLabel: isAdded ? "Assigned" : "Removed",
        navigatePath: groupId ? `/operator/viewpage?groupId=${encodeURIComponent(groupId)}` : undefined,
        actionLabel: groupId ? "Open Job" : "View Details",
        createdAtLabel: String(log.createdAt || log.updatedAt || log.endedAt || log.startedAt || ""),
        fields: [
          { label: "Updated By", value: actorName || "-" },
          { label: "Customer", value: String(log.jobCustomer || "-") },
          { label: "Quantity", value: quantityLabel || "-" },
          { label: "Description", value: String(log.jobDescription || "-"), wide: true },
        ],
      } satisfies HeaderNotificationItem;
    })
    .sort((left, right) => new Date(right.createdAtLabel || 0).getTime() - new Date(left.createdAtLabel || 0).getTime());

export const buildPersonalActivityNotificationItems = ({
  logs,
  currentUserName,
}: {
  logs: EmployeeLog[];
  currentUserName: string;
}): HeaderNotificationItem[] =>
  logs
    .filter((log) => normalizeName(log.userName) === normalizeName(currentUserName))
    .filter((log) => String(log.jobId || "").trim() && String(log.status || "").trim().toUpperCase() !== "IN_PROGRESS")
    .map((log) => {
      const metadata = (log.metadata || {}) as Record<string, any>;
      const groupId = String(log.jobGroupId || metadata.groupId || "").trim();
      const idleReason = String(metadata.idleTime || "").trim();
      const workedSeconds = Math.max(
        0,
        Number(metadata.workedSeconds || log.durationSeconds || 0)
      );
      const workedLabel =
        workedSeconds >= 3600
          ? `${Math.floor(workedSeconds / 3600)}h ${Math.floor((workedSeconds % 3600) / 60)}m`
          : workedSeconds >= 60
            ? `${Math.floor(workedSeconds / 60)}m ${workedSeconds % 60}s`
            : `${workedSeconds}s`;
      const revenue = Number(metadata.revenue || log.revenue || 0);
      const quantityNumbers = Array.isArray(metadata.quantityNumbers)
        ? metadata.quantityNumbers.map((qty) => `Q${qty}`).join(", ")
        : log.quantityFrom
          ? `Q${log.quantityFrom}${log.quantityTo && log.quantityTo !== log.quantityFrom ? `-${log.quantityTo}` : ""}`
          : "-";
      const status = String(log.status || "").toUpperCase();
      const isHold = status === "REJECTED";

      return {
        id: `activity:${String(log._id || log.createdAt || log.startedAt || Math.random())}`,
        kind: "activity",
        severity: isHold ? "warning" : "info",
        title: isHold ? "Job put on hold" : "Quantity logged",
        subtitle: log.refNumber ? `#${log.refNumber}` : String(log.jobDescription || "Operator update"),
        statusLabel: isHold ? "Hold" : "Logged",
        navigatePath: groupId ? `/operator/viewpage?groupId=${encodeURIComponent(groupId)}` : undefined,
        actionLabel: groupId ? "Open Job" : "View Details",
        createdAtLabel: String(log.createdAt || log.updatedAt || log.endedAt || log.startedAt || ""),
        fields: [
          { label: "Machine", value: formatMachineLabel(String(metadata.machineNumber || "")) || String(metadata.machineNumber || "-") },
          { label: "Quantity", value: quantityNumbers || "-" },
          { label: "Worked", value: workedLabel },
          { label: "Revenue", value: Number.isFinite(revenue) && revenue > 0 ? `Rs. ${revenue.toFixed(2)}` : "-" },
          { label: isHold ? "Reason" : "Description", value: isHold ? idleReason || "Hold" : String(log.jobDescription || "-"), wide: true },
        ],
      } satisfies HeaderNotificationItem;
    })
    .sort((left, right) => new Date(right.createdAtLabel || 0).getTime() - new Date(left.createdAtLabel || 0).getTime());
