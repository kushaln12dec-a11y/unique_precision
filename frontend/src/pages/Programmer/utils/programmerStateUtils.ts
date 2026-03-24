import type { JobEntry } from "../../../types/job";
import { normalizeThicknessInput, type CutForm } from "../programmerUtils";

const getProgramRefValue = (job: JobEntry) =>
  String((job as any).programRefFile ?? (job as any).programRefFileName ?? "").trim();

const getEditableCutSignature = (job: JobEntry) =>
  JSON.stringify({
    customer: String(job.customer ?? "").trim(),
    rate: String(job.rate ?? "").trim(),
    cut: String(job.cut ?? "").trim(),
    thickness: normalizeThicknessInput(String(job.thickness ?? "")),
    passLevel: String(job.passLevel ?? "").trim(),
    setting: String(job.setting ?? "").trim(),
    qty: String(job.qty ?? "").trim(),
    sedm: String(job.sedm ?? "").trim(),
    sedmSelectionType: String(job.sedmSelectionType ?? "range").trim(),
    sedmRangeKey: String(job.sedmRangeKey ?? "").trim(),
    sedmStandardValue: String(job.sedmStandardValue ?? "").trim(),
    sedmLengthType: String(job.sedmLengthType ?? "min").trim(),
    sedmOver20Length: String(job.sedmOver20Length ?? "").trim(),
    sedmLengthValue: String(job.sedmLengthValue ?? "").trim(),
    sedmHoles: String(job.sedmHoles ?? "").trim(),
    sedmEntriesJson: String((job as any).sedmEntriesJson ?? "").trim(),
    operationRowsJson: String((job as any).operationRowsJson ?? "").trim(),
    material: String((job as any).material ?? "").trim(),
    priority: String(job.priority ?? "").trim(),
    description: String(job.description ?? "").trim(),
    programRefFile: getProgramRefValue(job),
    critical: Boolean(job.critical),
    pipFinish: Boolean(job.pipFinish),
  });

export const removeParentMirrorEntries = (groupCuts: JobEntry[]): JobEntry[] => {
  if (groupCuts.length <= 1) return groupCuts;
  const parentSignature = getEditableCutSignature(groupCuts[0]);
  return groupCuts.filter((job, index) => index === 0 || getEditableCutSignature(job) !== parentSignature);
};

export const toEditableCutForm = (job: JobEntry, isClone: boolean): CutForm => ({
  customer: String(job.customer ?? ""),
  rate: String(job.rate ?? ""),
  cut: String(job.cut ?? ""),
  thickness: normalizeThicknessInput(String(job.thickness ?? "")),
  passLevel: String(job.passLevel ?? ""),
  setting: String(job.setting ?? ""),
  qty: String(job.qty ?? ""),
  sedm: job.sedm,
  sedmSelectionType: job.sedmSelectionType ?? "range",
  sedmRangeKey: job.sedmRangeKey ?? "0.3-0.4",
  sedmStandardValue: job.sedmStandardValue ?? "",
  sedmLengthType: job.sedmLengthType ?? "min",
  sedmOver20Length: job.sedmOver20Length ?? "",
  sedmLengthValue:
    job.sedmLengthValue ??
    (job.sedmSelectionType === "range" ? job.sedmRangeKey ?? "" : job.sedmStandardValue ?? ""),
  sedmHoles: job.sedmHoles ?? "1",
  sedmEntriesJson: (job as any).sedmEntriesJson ?? "",
  operationRowsJson: (job as any).operationRowsJson ?? "",
  material: (job as any).material ?? "",
  priority: job.priority,
  description: job.description,
  programRefFile: getProgramRefValue(job),
  cutImage: Array.isArray(job.cutImage) ? job.cutImage : job.cutImage ? [job.cutImage as unknown as string] : [],
  critical: Boolean(job.critical),
  pipFinish: Boolean(job.pipFinish),
  refNumber: isClone ? "" : ((job as any).refNumber || ""),
  manualTotalHrs: "",
});
