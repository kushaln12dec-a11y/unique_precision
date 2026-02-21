import type { JobEntry, QuantityQaStatus } from "../../../types/job";

export type QuantityProgressStatus = QuantityQaStatus | "EMPTY";

export type QaProgressCounts = {
  saved: number;
  ready: number;
  sent: number;
  empty: number;
};

export const QA_STAGE_LABELS = {
  SAVED: "Operation Logged",
  READY_FOR_QA: "Operation Logged",
  SENT_TO_QA: "QA Dispatched",
  EMPTY: "Pending Input",
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
  const statuses: QuantityProgressStatus[] = [];

  for (let qty = 1; qty <= boundedTotalQty; qty += 1) {
    const state = qaStates[String(qty)] as QuantityQaStatus | undefined;
    if (state === "SENT_TO_QA" || state === "READY_FOR_QA" || state === "SAVED") {
      statuses.push(state);
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
      if (status === "SAVED") acc.saved += 1;
      else if (status === "READY_FOR_QA") acc.ready += 1;
      else if (status === "SENT_TO_QA") acc.sent += 1;
      else acc.empty += 1;
      return acc;
    },
    { saved: 0, ready: 0, sent: 0, empty: 0 }
  );
};
