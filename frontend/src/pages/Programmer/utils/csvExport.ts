import { formatDisplayDateTime } from "../../../utils/date";
import type { JobEntry } from "../../../types/job";
import { getThicknessDisplayValue } from "../programmerUtils";
import { estimatedTimeFromAmount } from "../../../utils/jobFormatting";

export type TableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

const escapeCsvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const downloadCsv = (headers: string[], rows: unknown[][], fileName: string) => {
  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportJobsToCSV = (tableData: TableRow[], isAdmin: boolean): void => {
  const headers = [
    "Job Ref",
    "Customer",
    "Program Ref File Name",
    "Description",
    "Remark",
    "Rate",
    "Cut (mm)",
    "TH (MM)",
    "Pass",
    "Setting",
    "Qty",
    "SEDM",
    "Material",
    "Priority",
    "Complex",
    "PIP Finish",
    "Cut Length Hrs",
    "Estimated Time",
    ...(isAdmin ? ["Total Amount (Rs.)"] : []),
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
      `Rs. ${Number(entry.rate || 0).toFixed(2)}`,
      Number(entry.cut || 0).toFixed(2),
      getThicknessDisplayValue(entry.thickness),
      entry.passLevel || "",
      entry.setting || "",
      Number(entry.qty || 0).toString(),
      entry.sedm || "",
      entry.material || "",
      entry.priority || "",
      entry.critical ? "Yes" : "No",
      entry.pipFinish ? "Yes" : "No",
      Number(entry.totalHrs || 0).toFixed(2),
      estimatedTimeFromAmount(Number(entry.totalHrs || 0) * Number(entry.rate || 0)),
      ...(isAdmin ? [entry.totalAmount ? `Rs. ${entry.totalAmount.toFixed(2)}` : ""] : []),
      entry.createdBy || "",
      formatDisplayDateTime(entry.createdAt),
    ])
  );

  downloadCsv(headers, rows, `programmer_jobs_${new Date().toISOString().split("T")[0]}.csv`);
};
