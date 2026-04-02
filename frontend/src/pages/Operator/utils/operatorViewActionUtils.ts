import { getUsers } from "../../../services/userApi";
import { getDisplayName } from "../../../utils/jobFormatting";
import type { JobEntry } from "../../../types/job";
import { getQuantityProgressStatuses, type QuantityProgressStatus } from "./qaProgress";

type ToastState = { message: string; variant: "success" | "error" | "info"; visible: boolean };

export const showAndHideToast = (
  setter: React.Dispatch<React.SetStateAction<ToastState>>,
  message: string,
  variant: ToastState["variant"],
  delay = 2500
) => {
  setter({ message, variant, visible: true });
  window.setTimeout(() => setter((prev) => ({ ...prev, visible: false })), delay);
};

export const loadOperatorUsers = async () => {
  const userList = await getUsers();
  return userList
    .filter((user) => user.role === "OPERATOR" || user.role === "ADMIN")
    .map((user) => ({
      id: user._id,
      name: getDisplayName(user.firstName, user.lastName, user.email, String(user._id)).toUpperCase(),
    }));
};

export const seedQaStatusesByCut = (jobs: JobEntry[]) => {
  const next = new Map<number | string, Record<number, QuantityProgressStatus>>();
  jobs.forEach((job) => {
    const qty = Math.max(1, Number(job.qty || 1));
    const statuses = getQuantityProgressStatuses(job, qty);
    const mapped: Record<number, QuantityProgressStatus> = {};
    statuses.forEach((status, idx) => {
      if (status !== "EMPTY") mapped[idx + 1] = status;
    });
    next.set(job.id, mapped);
  });
  return next;
};

export const seedSavedQuantities = (jobs: JobEntry[]) => {
  const seeded = new Map<number | string, Set<number>>();
  jobs.forEach((job) => {
    const qty = Math.max(1, Number(job.qty || 1));
    const statuses = getQuantityProgressStatuses(job, qty);
    const saved = new Set<number>();
    statuses.forEach((status, idx) => {
      if (status !== "EMPTY") saved.add(idx);
    });
    if (saved.size > 0) seeded.set(job.id, saved);
  });
  return seeded;
};

export const readImageFileAsBase64 = async (file: File): Promise<string> => {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
