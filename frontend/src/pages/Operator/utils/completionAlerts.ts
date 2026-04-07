import type { EmployeeLog } from "../../../types/employeeLog";
import type { JobEntry } from "../../../types/job";
import { estimatedDurationSecondsFromHours, formatEstimatedTime } from "../../../utils/jobFormatting";
import type { OperatorCompletionAlert } from "../types";

export const COMPLETION_ALERT_THRESHOLD_SECONDS = 5 * 60;

const formatAlertDuration = (seconds: number) => {
  const safeSeconds = Math.max(1, Math.round(seconds));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  return formatEstimatedTime(safeSeconds / 3600);
};

export const buildOperatorCompletionAlerts = (
  activeOperatorRuns: EmployeeLog[],
  operatorGridJobs: JobEntry[],
): OperatorCompletionAlert[] => {
  const now = Date.now();

  return activeOperatorRuns
    .flatMap((log): OperatorCompletionAlert[] => {
      const entry = operatorGridJobs.find((job) => String(job.id) === String(log.jobId));
      if (!entry) return [];

      const metadata = (log.metadata || {}) as Record<string, any>;
      const quantityFrom = Math.max(1, Number(log.quantityFrom || 1));
      const quantityTo = Math.max(quantityFrom, Number(log.quantityTo || quantityFrom));
      const quantityCount = Math.max(1, quantityTo - quantityFrom + 1);
      const perQuantityHours = Number(entry.totalHrs || 0) / Math.max(1, Number(entry.qty || 1));
      const estimatedSeconds =
        Number(metadata.estimatedSeconds || 0) > 0
          ? Number(metadata.estimatedSeconds || 0)
          : estimatedDurationSecondsFromHours(perQuantityHours * quantityCount);
      if (estimatedSeconds <= 0) return [];

      const startedAtMs = new Date(String(log.startedAt || "")).getTime();
      if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return [];

      const remainingSeconds = Math.round((startedAtMs + (estimatedSeconds * 1000) - now) / 1000);
      if (remainingSeconds > COMPLETION_ALERT_THRESHOLD_SECONDS) return [];

      const isOverdue = remainingSeconds <= 0;
      const machineNumber = String(metadata.machineNumber || entry.machineNumber || "Machine Pending");
      const durationLabel = formatAlertDuration(Math.abs(remainingSeconds || 0));

      return [{
        alertId: `${String(log.jobId || "")}__${quantityFrom}__${quantityTo}`,
        groupId: String(entry.groupId),
        cutId: String(entry.id),
        machineNumber,
        jobRef: String(entry.refNumber || ""),
        customer: String(entry.customer || ""),
        description: entry.description || "",
        quantityLabel: quantityFrom === quantityTo ? `QTY ${quantityFrom}` : `QTY ${quantityFrom}-${quantityTo}`,
        operatorName: String(log.userName || entry.assignedTo || "").trim(),
        estimatedTime: formatEstimatedTime(perQuantityHours * quantityCount),
        remainingLabel: isOverdue ? `${durationLabel} overdue` : `${durationLabel} left`,
        statusLabel: isOverdue ? "Overdue" : `Due In ${durationLabel}`,
        severity: isOverdue ? "danger" : "warning",
      }];
    })
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === "danger" ? -1 : 1;
      return left.jobRef.localeCompare(right.jobRef);
    });
};
