import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import type { JobEntry } from "../../../types/job";
import {
  estimatedHoursFromAmount,
  formatEstimatedTime,
  MACHINE_OPTIONS,
  toMachineIndex,
} from "../../../utils/jobFormatting";
import type { OperatorDisplayRow } from "../hooks/useOperatorTable";
import type { EmployeeLog } from "../../../types/employeeLog";

export const getOperatorMachineDropdownOptions = (machineOptions: string[]) => {
  const normalized = machineOptions.map((value) => toMachineIndex(value)).filter(Boolean);
  return normalized.length > 0 ? normalized : [...MACHINE_OPTIONS];
};

export const getOperatorMachineNumber = (job: JobEntry): string => {
  const direct = String((job as any).machineNumber || "").trim();
  if (direct) return toMachineIndex(direct);
  const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
  const latest = captures[captures.length - 1];
  return toMachineIndex(String(latest?.machineNumber || "").trim());
};

export const hasOperatorJobStarted = (entry: JobEntry, activeRunsByJobId?: Map<string, EmployeeLog>): boolean => {
  if (activeRunsByJobId?.has(String(entry.id))) return true;
  if (Array.isArray(entry.operatorCaptures) && entry.operatorCaptures.length > 0) return true;
  if (String((entry as any).startTime || "").trim()) return true;
  return false;
};

type ActiveCaptureSummary = {
  entry: JobEntry;
  startTime: string;
  machineNumber: string;
  operatorName: string;
  quantityLabel: string;
};

const formatCaptureQuantityLabel = (capture: any) => {
  const fromQty = Math.max(1, Number(capture?.fromQty || 1));
  const toQty = Math.max(fromQty, Number(capture?.toQty || fromQty));
  return fromQty === toQty ? `Qty ${fromQty}` : `Qty ${fromQty}-${toQty}`;
};

const normalizeOperatorLabel = (value: unknown) => String(value || "").trim().toUpperCase();

export const getLatestActiveCaptureSummary = (entries: JobEntry[]): ActiveCaptureSummary | null => {
  let latestCapture: ActiveCaptureSummary | null = null;

  entries.forEach((entry) => {
    const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
    captures.forEach((capture) => {
      if (!capture?.startTime || capture?.endTime) return;
      const startedAt = new Date(capture.startTime);
      if (Number.isNaN(startedAt.getTime())) return;

      if (!latestCapture || startedAt.getTime() > new Date(latestCapture.startTime).getTime()) {
        latestCapture = {
          entry,
          startTime: capture.startTime,
          machineNumber: toMachineIndex(String(capture.machineNumber || "").trim()),
          operatorName: normalizeOperatorLabel(capture.opsName),
          quantityLabel: formatCaptureQuantityLabel(capture),
        };
      }
    });
  });

  return latestCapture;
};

export const getOperatorHistoryNames = (entry: JobEntry): string[] => {
  const seen = new Set<string>();
  const history: string[] = [];
  const pushValues = (rawValue: unknown) => {
    String(rawValue || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
      .forEach((value) => {
        const key = value.toLowerCase();
        if (seen.has(key) || key === "unassign" || key === "unassigned") return;
        seen.add(key);
        history.push(normalizeOperatorLabel(value));
      });
  };

  const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
  captures.forEach((capture) => pushValues(capture?.opsName));
  pushValues(entry.assignedTo);
  return history;
};

export const getActiveOperatorLogSummary = (
  entry: JobEntry,
  activeRunsByJobId: Map<string, EmployeeLog>
): ActiveCaptureSummary | null => {
  const activeLog = activeRunsByJobId.get(String(entry.id));
  if (!activeLog) return null;
  const metadata = (activeLog.metadata || {}) as Record<string, any>;
  const quantityFrom = Math.max(1, Number(activeLog.quantityFrom || 1));
  const quantityTo = Math.max(quantityFrom, Number(activeLog.quantityTo || quantityFrom));
  return {
    entry,
    startTime: String(activeLog.startedAt || ""),
    machineNumber: toMachineIndex(String(metadata.machineNumber || entry.machineNumber || "").trim()),
    operatorName: normalizeOperatorLabel(activeLog.userName || entry.assignedTo || ""),
    quantityLabel: quantityFrom === quantityTo ? `Qty ${quantityFrom}` : `Qty ${quantityFrom}-${quantityTo}`,
  };
};

export const renderOperatorLiveRunCell = (row: OperatorDisplayRow) => {
  const sourceEntries = row.kind === "parent" ? row.tableRow.entries : [row.entry];
  const activeCapture = getLatestActiveCaptureSummary(sourceEntries);
  const assignedMachine = getOperatorMachineNumber(row.entry);

  if (activeCapture) {
    return (
      <div className="operator-live-run-cell" title={`${activeCapture.quantityLabel}${activeCapture.operatorName ? ` | ${activeCapture.operatorName}` : ""}`}>
        <span className="operator-live-run-primary">
          Running on {activeCapture.machineNumber || "Machine Pending"}
        </span>
        <span className="operator-live-run-meta">{activeCapture.quantityLabel}</span>
      </div>
    );
  }

  if (assignedMachine) {
    return (
      <div className="operator-live-run-cell" title={`Ready on ${assignedMachine}`}>
        <span className="operator-live-run-primary">Ready on {assignedMachine}</span>
        <span className="operator-live-run-meta">Awaiting machine start</span>
      </div>
    );
  }

  return (
    <div className="operator-live-run-cell" title="Machine not assigned">
      <span className="operator-live-run-primary">Machine pending</span>
      <span className="operator-live-run-meta">Assign machine to start cut</span>
    </div>
  );
};

export const formatOperatorRunningAlert = (entries: JobEntry[]) => {
  const activeCapture = getLatestActiveCaptureSummary(entries);
  if (!activeCapture) return null;
  return {
    machineNumber: activeCapture.machineNumber || "Machine Pending",
    jobRef: activeCapture.entry.refNumber || "",
    description: activeCapture.entry.description || "",
    quantityLabel: activeCapture.quantityLabel,
    operatorName: activeCapture.operatorName,
  };
};

export const normalizeAssignedOperators = (
  value: unknown,
  operatorNameLookup: Map<string, string>
): string[] => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

  const unique = new Set<string>();
  const normalized: string[] = [];
  source.forEach((name) => {
    const primaryName = normalizeOperatorLabel(name);
    const normalizedName = String(primaryName || "").trim().toLowerCase();
    if (!normalizedName || normalizedName === "unassigned" || normalizedName === "unassign") return;
    const mappedName = operatorNameLookup.get(normalizedName);
    if (!mappedName) return;
    const key = mappedName.toLowerCase();
    if (unique.has(key)) return;
    unique.add(key);
    normalized.push(mappedName);
  });
  return normalized;
};

export const getGroupExpectedHours = (entries: JobEntry[]): number =>
  estimatedHoursFromAmount(entries.reduce((sum, entry) => sum + Number(entry.totalHrs || 0) * Number(entry.rate || 0), 0));

export const renderOperatorCustomerCell = (
  row: OperatorDisplayRow,
  toggleGroup: (groupId: string) => void,
  activeRunsByJobId?: Map<string, EmployeeLog>
) => {
  const isChild = row.kind === "child";
  const sourceEntries = row.kind === "parent" ? row.tableRow.entries : [row.entry];
  const activeCapture = sourceEntries
    .map((entry) => getActiveOperatorLogSummary(entry, activeRunsByJobId || new Map()))
    .find(Boolean) || getLatestActiveCaptureSummary(sourceEntries);
  return (
    <div className="operator-customer-cell">
      {!isChild && row.hasChildren && (
        <button
          type="button"
          className="accordion-toggle-button operator-accordion-toggle"
          onClick={(event) => {
            event.stopPropagation();
            toggleGroup(row.groupId);
          }}
          aria-label={row.isExpanded ? "Collapse settings" : "Expand settings"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#1a1a2e",
            minWidth: "1rem",
            width: "1rem",
            transition: "transform 0.2s ease",
            transform: row.isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <ArrowForwardIosSharpIcon sx={{ fontSize: "0.7rem" }} />
        </button>
      )}
      {isChild && <span className="inline-row-branch">|-</span>}
      {!isChild && !row.hasChildren && <span style={{ width: "1rem" }} />}
      {activeCapture ? <span className="operator-running-dot operator-running-dot-inline" aria-hidden="true" /> : null}
      <span>{row.entry.customer || "-"}</span>
    </div>
  );
};

export const renderEstimatedTime = (row: OperatorDisplayRow) => {
  const sourceEntries = row.kind === "parent" ? row.tableRow.entries : [row.entry];
  const expectedHours = getGroupExpectedHours(sourceEntries);
  return formatEstimatedTime(expectedHours);
};

export const renderEstimatedTimeWithLogs = (
  row: OperatorDisplayRow,
  _activeRunsByJobId: Map<string, EmployeeLog>
) => {
  return renderEstimatedTime(row);
};
