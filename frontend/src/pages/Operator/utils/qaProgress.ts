import type { JobEntry, QuantityQaStatus } from "../../../types/job";

export type QuantityProgressStatus = QuantityQaStatus | "EMPTY" | "RUNNING";

export type QaProgressCounts = {
  running: number;
  saved: number;
  ready: number;
  sent: number;
  empty: number;
};

export const QA_STAGE_LABELS = {
  RUNNING: "RUNNING",
  SAVED: "LOGGED",
  READY_FOR_QA: "HOLD",
  SENT_TO_QA: "QC",
  EMPTY: "NOT STARTED",
} as const;

export const getQaStageLabel = (status: QuantityProgressStatus): string => {
  return QA_STAGE_LABELS[status];
};

const getCoveredQuantities = (job: JobEntry, totalQty: number): Set<number> => {
  const covered = new Set<number>();
  const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
  captures.forEach((entry) => {
    const from = Math.max(1, Number(entry.fromQty || 1));
    const to = Math.min(totalQty, Math.max(from, Number(entry.toQty || from)));
    for (let qty = from; qty <= to; qty += 1) {
      covered.add(qty);
    }
  });
  return covered;
};

const getRunningQuantities = (job: JobEntry, totalQty: number): Set<number> => {
  const running = new Set<number>();
  const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
  captures.forEach((entry) => {
    if (!entry?.startTime || entry?.endTime) return;
    const from = Math.max(1, Number(entry.fromQty || 1));
    const to = Math.min(totalQty, Math.max(from, Number(entry.toQty || from)));
    for (let qty = from; qty <= to; qty += 1) {
      running.add(qty);
    }
  });
  return running;
};

export const getQuantityProgressStatuses = (
  job: JobEntry,
  totalQty: number
): QuantityProgressStatus[] => {
  const boundedTotalQty = Math.max(1, totalQty);
  const rawStates: any = job.quantityQaStates || {};
  const qaStates: Record<string, QuantityQaStatus> =
    rawStates instanceof Map
      ? Object.fromEntries(rawStates.entries())
      : rawStates;
  const covered = getCoveredQuantities(job, boundedTotalQty);
  const running = getRunningQuantities(job, boundedTotalQty);
  const statuses: QuantityProgressStatus[] = [];

  for (let qty = 1; qty <= boundedTotalQty; qty += 1) {
    const state = qaStates[String(qty)] as QuantityQaStatus | undefined;
    if (state === "SENT_TO_QA" || state === "READY_FOR_QA" || state === "SAVED") {
      statuses.push(state);
      continue;
    }
    if (running.has(qty)) {
      statuses.push("RUNNING");
      continue;
    }
    statuses.push(covered.has(qty) ? "SAVED" : "EMPTY");
  }

  return statuses;
};

export const getQaProgressCounts = (job: JobEntry, totalQty: number): QaProgressCounts => {
  const statuses = getQuantityProgressStatuses(job, totalQty);
  return statuses.reduce<QaProgressCounts>(
    (acc, status) => {
      if (status === "RUNNING") acc.running += 1;
      else if (status === "SAVED") acc.saved += 1;
      else if (status === "READY_FOR_QA") acc.ready += 1;
      else if (status === "SENT_TO_QA") acc.sent += 1;
      else acc.empty += 1;
      return acc;
    },
    { running: 0, saved: 0, ready: 0, sent: 0, empty: 0 }
  );
};

export const isDispatchableQaStatus = (status: QuantityProgressStatus): boolean =>
  status === "SAVED" || status === "READY_FOR_QA";

export const getDispatchableQuantityNumbers = (job: JobEntry): number[] => {
  const qty = Math.max(1, Number(job.qty || 1));
  return getQuantityProgressStatuses(job, qty)
    .map((status, index) => (isDispatchableQaStatus(status) ? index + 1 : null))
    .filter((value): value is number => value !== null);
};

export const isJobFullySentToQa = (job: JobEntry): boolean => {
  const qty = Math.max(1, Number(job.qty || 1));
  const counts = getQaProgressCounts(job, qty);
  return counts.sent === qty && counts.saved === 0 && counts.ready === 0 && counts.running === 0 && counts.empty === 0;
};

export const getGroupQaProgressCounts = (entries: JobEntry[]): QaProgressCounts => {
  return entries.reduce<QaProgressCounts>(
    (acc, entry) => {
      const qty = Math.max(1, Number(entry.qty || 1));
      const counts = getQaProgressCounts(entry, qty);
      acc.running += counts.running;
      acc.saved += counts.saved;
      acc.ready += counts.ready;
      acc.sent += counts.sent;
      acc.empty += counts.empty;
      return acc;
    },
    { running: 0, saved: 0, ready: 0, sent: 0, empty: 0 }
  );
};

export const isGroupFullySentToQa = (entries: JobEntry[]): boolean => {
  return entries.length > 0 && entries.every((entry) => isJobFullySentToQa(entry));
};

export const getQaStatusBadges = (counts: QaProgressCounts) => [
  { className: "empty", label: `NOT STARTED ${counts.empty}` },
  { className: "running", label: `RUNNING ${counts.running}` },
  { className: "ready", label: `HOLD ${counts.ready}` },
  { className: "saved", label: `LOGGED ${counts.saved}` },
  { className: "sent", label: `QC ${counts.sent}` },
];

export const getDominantQaStageClass = (counts: QaProgressCounts) => {
  if (counts.running > 0) return "operator-stage-row-running";
  if (counts.ready > 0) return "operator-stage-row-hold";
  if (counts.saved > 0) return "operator-stage-row-logged";
  if (counts.sent > 0) return "operator-stage-row-qc";
  return "operator-stage-row-not-started";
};
