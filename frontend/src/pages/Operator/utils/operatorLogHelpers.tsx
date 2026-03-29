import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";

export const OPERATOR_LOG_SEARCH_FETCH_PAGE_SIZE = 100;

const OPERATOR_LOG_COLUMN_WIDTHS: Record<string, number> = {
  userName: 88,
  machineNumber: 62,
  workItemTitle: 98,
  jobDescription: 132,
  workSummary: 126,
  startedAt: 94,
  endedAt: 94,
  shift: 62,
  durationSeconds: 74,
  estimatedSeconds: 74,
  overtimeSeconds: 74,
  idleTime: 72,
  remark: 72,
  revenue: 80,
  status: 96,
};

export const getOperatorLogColumnWidth = (columnKey: string) => OPERATOR_LOG_COLUMN_WIDTHS[columnKey] ?? 84;

export const formatOperatorLogStatus = (status?: string) => {
  const raw = String(status || "-").toUpperCase();
  if (raw === "IN_PROGRESS") return "In Progress";
  if (raw === "REJECTED") return "Rejected";
  if (raw === "COMPLETED") return "Completed";
  return raw
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
};

export const formatOperatorWorkItem = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  return raw.replace(/^Job\s*#?\s*/i, "").trim() || "-";
};

export const formatOperatorDuration = (seconds?: number): string => {
  const total = Math.max(0, Number(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const getOperatorShiftLabel = (startedAt?: string): string => {
  if (!startedAt) return "-";
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return "-";
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? "Day" : "Night";
};

export const renderOperatorShiftBadge = (startedAt?: string) => {
  const shift = getOperatorShiftLabel(startedAt);
  if (shift === "Day") return <span className="shift-icon-badge day" title="Day Shift"><WbSunnyOutlinedIcon sx={{ fontSize: "1rem" }} /></span>;
  if (shift === "Night") return <span className="shift-icon-badge night" title="Night Shift"><DarkModeOutlinedIcon sx={{ fontSize: "1rem" }} /></span>;
  return "-";
};
