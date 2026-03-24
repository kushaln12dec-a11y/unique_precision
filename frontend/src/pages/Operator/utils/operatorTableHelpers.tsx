import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import type { JobEntry } from "../../../types/job";
import { estimatedHoursFromAmount, formatEstimatedTime, MACHINE_OPTIONS, toMachineIndex } from "../../../utils/jobFormatting";
import type { OperatorDisplayRow } from "../hooks/useOperatorTable";

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
    const normalizedName = String(name || "").trim().toLowerCase();
    if (!normalizedName || normalizedName === "unassigned" || normalizedName === "unassign") return;
    const mappedName = operatorNameLookup.get(name.toLowerCase()) || name;
    const key = mappedName.toLowerCase();
    if (unique.has(key)) return;
    unique.add(key);
    normalized.push(mappedName);
  });
  return normalized;
};

export const getGroupExpectedHours = (entries: JobEntry[]): number =>
  estimatedHoursFromAmount(entries.reduce((sum, entry) => sum + Number(entry.totalHrs || 0) * Number(entry.rate || 0), 0));

export const getLatestActiveCaptureStartedAt = (entries: JobEntry[]): string | null => {
  let latestStart: string | null = null;
  entries.forEach((entry) => {
    const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
    captures.forEach((capture) => {
      if (!capture?.startTime || capture?.endTime) return;
      const startedAt = new Date(capture.startTime);
      if (Number.isNaN(startedAt.getTime())) return;
      if (!latestStart || startedAt.getTime() > new Date(latestStart).getTime()) latestStart = capture.startTime;
    });
  });
  return latestStart;
};

export const formatOperatorDurationMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(1, Math.ceil(minutes));
  return safeMinutes === 1 ? "1 min" : `${safeMinutes} mins`;
};

export const renderOperatorCustomerCell = (
  row: OperatorDisplayRow,
  toggleGroup: (groupId: string) => void
) => {
  const isChild = row.kind === "child";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.2rem", width: "100%" }}>
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
      <span>{row.entry.customer || "-"}</span>
    </div>
  );
};

export const renderEstimatedTime = (row: OperatorDisplayRow) => {
  const sourceEntries = row.kind === "parent" ? row.tableRow.entries : [row.entry];
  const expectedHours = getGroupExpectedHours(sourceEntries);
  const activeStartedAt = getLatestActiveCaptureStartedAt(sourceEntries);
  if (activeStartedAt && expectedHours > 0) {
    const elapsedHours = Math.max(0, Date.now() - new Date(activeStartedAt).getTime()) / 3600000;
    if (elapsedHours > expectedHours) {
      return (
        <span className="operator-overtime-value" title={`Expected ${formatEstimatedTime(expectedHours)}`}>
          Overtime {formatOperatorDurationMinutes((elapsedHours - expectedHours) * 60)}
        </span>
      );
    }
  }
  return formatEstimatedTime(expectedHours);
};
