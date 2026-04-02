import type { JobEntry, QuantityQaStatus } from "../../types/job";
import { getDisplayDateTimeParts, parseDateValue } from "../../utils/date";
import { formatJobRefDisplay } from "../../utils/jobFormatting";

export type QcRow = {
  qcItemId: string;
  quantityLabel: string;
  reportScopeLabel: string;
  quantityFrom: number;
  quantityTo: number;
  quantityCount: number;
  groupId: string;
  jobId: string;
  quantityNumber: number;
  parent: JobEntry;
  entry: JobEntry;
  entries: JobEntry[];
};

export const formatDateForTemplate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
};

export const getQuantityQaStates = (entry: JobEntry): Record<string, QuantityQaStatus> => {
  const rawStates: any = entry.quantityQaStates || {};
  return rawStates instanceof Map ? Object.fromEntries(rawStates.entries()) : rawStates;
};

export const getPrimaryOperatorName = (value: unknown): string =>
  String(value || "")
    .split(",")
    .map((name) => name.trim())
    .find((name) => name && name !== "Unassigned" && name !== "Unassign") || "-";

export const getDrawingNo = (entry: JobEntry) => String((entry as any).programRefFile || entry.refNumber || "").trim();

export const getQcRowSearchValues = (row: QcRow) => {
  const createdAtParts = getDisplayDateTimeParts(row.entry.createdAt || row.parent.createdAt);
  const decision = String(row.parent.qcDecision || row.entry.qcDecision || "PENDING").toLowerCase().replace(/_/g, " ");

  return [
    row.entry.customer || row.parent.customer || "-",
    row.entry.description || row.parent.description || "-",
    formatJobRefDisplay(String(row.entry.refNumber || row.parent.refNumber || "").trim()),
    row.quantityLabel,
    row.reportScopeLabel,
    getPrimaryOperatorName(row.entry.assignedTo || row.parent.assignedTo),
    createdAtParts.date,
    createdAtParts.time,
    `${createdAtParts.date} ${createdAtParts.time}`.trim(),
    decision,
  ];
};

export const buildQcRows = (qcGridJobs: JobEntry[]) => {
  const groups = new Map<string, JobEntry[]>();

  qcGridJobs.forEach((job) => {
    const key = String(job.groupId ?? job.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(job);
  });

  return Array.from(groups.entries())
    .flatMap(([groupId, entries]) => {
      if (entries.length === 0 || entries.every((item) => Boolean((item as any).qcReportClosed))) return [];
      const parent = entries[0];

      return entries.flatMap((entry) => {
        const qaStates = getQuantityQaStates(entry);
        const totalQty = Math.max(1, Number(entry.qty || 1));
        const sentQuantities = Array.from({ length: totalQty }, (_, index) => index + 1).filter(
          (quantityNumber) => qaStates[String(quantityNumber)] === "SENT_TO_QA"
        );

        const quantityRanges = sentQuantities.reduce<Array<{ from: number; to: number }>>((acc, qty) => {
          const lastRange = acc[acc.length - 1];
          if (!lastRange || qty > lastRange.to + 1) {
            acc.push({ from: qty, to: qty });
          } else {
            lastRange.to = qty;
          }
          return acc;
        }, []);

        return quantityRanges.map((range) => {
          const quantityCount = range.to - range.from + 1;
          const label =
            quantityCount <= 1
              ? `Quantity ${range.from}`
              : `Quantities ${range.from}-${range.to}`;
          const reportScopeLabel =
            quantityCount <= 1
              ? "Single quantity report"
              : `Consolidated report (${quantityCount} quantities)`;

          return {
            qcItemId: `${String(entry.id)}:${range.from}-${range.to}`,
            quantityLabel: label,
            reportScopeLabel,
            quantityFrom: range.from,
            quantityTo: range.to,
            quantityCount,
            groupId,
            jobId: String(entry.id),
            quantityNumber: range.from,
            parent,
            entry,
            entries,
          };
        });
      });
    })
    .sort((a, b) => parseDateValue(b.entry.createdAt || b.parent.createdAt) - parseDateValue(a.entry.createdAt || a.parent.createdAt));
};
