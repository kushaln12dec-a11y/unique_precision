import type { EmployeeLog } from "../types/employeeLog";
import type { JobEntry } from "../types/job";
import { formatMachineLabel } from "../utils/jobFormatting";
import { buildOperatorCompletionAlerts } from "../pages/Operator/utils/completionAlerts";

export type HeaderNotificationItem = {
  id: string;
  kind: "completion" | "assignment";
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
