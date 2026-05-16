import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { formatJobRefDisplay } from "../../../utils/jobFormatting";

export const OPERATOR_LOG_SEARCH_FETCH_PAGE_SIZE = 100;

const OPERATOR_LOG_COLUMN_WIDTHS: Record<string, number> = {
  userName: 64,
  machineNumber: 52,
  workItemTitle: 88,
  jobDescription: 90,
  workSummary: 90,
  startedAt: 88,
  endedAt: 88,
  shift: 58,
  durationSeconds: 74,
  estimatedSeconds: 80,
  overtimeSeconds: 74,
  quantityNumbers: 70,
  idleTime: 68,
  remark: 68,
  revenue: 100,
  status: 90,
};

export const getOperatorLogColumnWidth = (columnKey: string) => OPERATOR_LOG_COLUMN_WIDTHS[columnKey] ?? 84;

export const formatOperatorLogStatus = (status?: string) => {
  const raw = String(status || "-").toUpperCase();
  if (raw === "IN_PROGRESS") return "RUNNING";
  if (raw === "REJECTED") return "HOLD";
  if (raw === "COMPLETED") return "LOGGED";
  return raw
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
};

export const formatOperatorWorkItem = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const withoutPrefix = raw.replace(/^Job\s*#?\s*/i, "").trim();
  if (!withoutPrefix) return "-";
  return formatJobRefDisplay(withoutPrefix) || "-";
};

export const formatOperatorDuration = (seconds?: number | string): string => {
  // Handle various input types and edge cases
  let total = 0;
  
  if (typeof seconds === 'string') {
    // Handle scientific notation and very large numbers
    const cleanValue = seconds.trim().replace(/[,+_]/g, '');
    const parsed = parseFloat(cleanValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return "0s";
    }
    total = parsed;
  } else if (typeof seconds === 'number') {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0s";
    }
    total = seconds;
  } else {
    return "0s";
  }

  // Handle extremely large values (might be database precision issues)
  if (total > 999999999999) {
    // If it's an absurdly large number, it's likely a data issue
    return "Invalid";
  }

  // Cap at reasonable maximum for display
  if (total > 999999999) {
    return "999999+ hrs";
  }

  // Convert to integer seconds if we have fractional seconds
  total = Math.round(total);

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  
  if (h > 0) {
    if (h >= 24) {
      const days = Math.floor(h / 24);
      const remainingHours = h % 24;
      return days > 0 ? `${days}d ${remainingHours}h ${m}m` : `${remainingHours}h ${m}m`;
    }
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const getOperatorShiftLabel = (startedAt?: string): string => {
  if (!startedAt) return "-";
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return "-";
  const hour = date.getHours();
  return hour >= 8 && hour < 20 ? "Morning" : "Night";
};

export const renderOperatorShiftBadge = (startedAt?: string) => {
  const shift = getOperatorShiftLabel(startedAt);
  if (shift === "Morning") return <span className="shift-icon-badge day" title="Morning Shift"><WbSunnyOutlinedIcon sx={{ fontSize: "1rem" }} /></span>;
  if (shift === "Night") return <span className="shift-icon-badge night" title="Night Shift"><DarkModeOutlinedIcon sx={{ fontSize: "1rem" }} /></span>;
  return "-";
};
