import type { JobEntry } from "../../../types/job";
import { formatDisplayDateTime } from "../../../utils/date";
import { estimatedTimeFromAmount, formatMachineLabel, toMachineIndex } from "../../../utils/jobFormatting";
import { getThicknessDisplayValue } from "../../Programmer/programmerUtils";

type TableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

const escapeCsvCell = (value: unknown) => {
  const str = String(value ?? "").replace(/"/g, '""');
  return `"${str}"`;
};

export const exportOperatorJobsToCSV = (tableData: TableRow[], isAdmin: boolean): void => {
  const headers = [
    "Job Ref",
    "Customer",
    "Program Ref File Name",
    "Description",
    "Remark",
    "Rate (Rs.)",
    "Cut (mm)",
    "TH (MM)",
    "Pass",
    "Setting",
    "Qty",
    "SEDM",
    "Assigned To",
    "Machine #",
    "Material",
    "PIP Finish",
    "Cut Length Hrs",
    "Estimated Time",
    ...(isAdmin ? ["Total Amount (Rs.)"] : []),
    "Status",
    "Priority",
    "Complex",
    "Created By",
    "Created At",
  ];

  const rows = tableData.flatMap((row) =>
    row.entries.map((entry) => [
      entry.refNumber || "",
      entry.customer || "",
      (entry as any).programRefFile || (entry as any).programRefFileName || "",
      entry.description || "",
      (entry as any).remark || "",
      Number(entry.rate || 0).toFixed(2),
      Number(entry.cut || 0).toFixed(2),
      getThicknessDisplayValue(entry.thickness),
      entry.passLevel || "",
      entry.setting || "",
      Number(entry.qty || 0).toString(),
      entry.sedm || "",
      entry.assignedTo || "",
      formatMachineLabel(toMachineIndex(String(entry.machineNumber || "").trim()) || "-"),
      entry.material || "",
      entry.pipFinish ? "Yes" : "No",
      Number(entry.totalHrs || 0).toFixed(2),
      estimatedTimeFromAmount(Number(entry.totalHrs || 0) * Number(entry.rate || 0)),
      ...(isAdmin ? [entry.totalAmount !== undefined && entry.totalAmount !== null ? Number(entry.totalAmount).toFixed(2) : "0.00"] : []),
      (entry as any).status || "NOT_STARTED",
      entry.priority || "",
      entry.critical ? "Yes" : "No",
      entry.createdBy || "",
      formatDisplayDateTime(entry.createdAt),
    ])
  );

  // UTF-8 BOM (\uFEFF) ensures proper rendering in Excel and Google Sheets
  const csvContent = "\uFEFF" + [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `operator_jobs_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
