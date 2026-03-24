import { getUserIdFromToken, getUserRoleFromToken } from "../../../utils/auth";

export const getOperatorTaskTimerStorageKey = () => {
  const role = (getUserRoleFromToken() || "UNKNOWN").toUpperCase();
  const userId = getUserIdFromToken() || "ANON";
  return `operator_task_switch_timer_v2_${role}_${userId}`;
};

export const getDefaultTimerState = () => ({
  running: false,
  startedAt: null as number | null,
  reason: "",
  otherReason: "",
  remark: "",
  panelOpen: false,
});

export const readPersistedTimerState = (storageKey: string) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return getDefaultTimerState();
    const parsed = JSON.parse(raw) as {
      running?: boolean;
      startedAt?: number | null;
      reason?: string;
      otherReason?: string;
      remark?: string;
      panelOpen?: boolean;
    };
    const startedAt = typeof parsed.startedAt === "number" ? parsed.startedAt : parsed.startedAt ? Number(parsed.startedAt) : null;
    const running = Boolean(parsed.running && startedAt);
    return {
      running,
      startedAt,
      reason: String(parsed.reason || ""),
      otherReason: String(parsed.otherReason || ""),
      remark: String(parsed.remark || ""),
      panelOpen: Boolean(parsed.panelOpen || running),
    };
  } catch {
    return getDefaultTimerState();
  }
};

export const formatTaskTimer = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};
