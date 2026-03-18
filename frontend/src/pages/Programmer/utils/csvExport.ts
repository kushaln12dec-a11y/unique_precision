import { formatDisplayDateTime } from "../../../utils/date";
import type { JobEntry } from "../../../types/job";

export type TableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

export const exportJobsToCSV = (tableData: TableRow[], isAdmin: boolean): void => {
  const headers = [
    "Customer",
    "Rate",
    "Description",
    "Cut (mm)",
    "TH (MM)",
    "Pass",
    "Setting",
    "Qty",
    "Cut Length Hrs",
    ...(isAdmin ? ["Total Amount (Rs.)"] : []),
    "Created By",
    "Created At",
    "Priority",
    "Complex",
  ];

  const rows = tableData.map((row) => [
    row.parent.customer || "",
    `Rs. ${Number(row.parent.rate || 0).toFixed(2)}`,
    Number(row.parent.cut || 0).toFixed(2),
    row.parent.description || "",
    String(row.parent.thickness || ""),
    row.parent.passLevel || "",
    row.parent.setting || "",
    Number(row.parent.qty || 0).toString(),
    row.groupTotalHrs ? `${row.groupTotalHrs.toFixed(2)}hrs` : "",
    ...(isAdmin ? [row.groupTotalAmount ? `Rs. ${row.groupTotalAmount.toFixed(2)}` : ""] : []),
    row.parent.createdBy || "",
    formatCreatedAt(row.parent.createdAt),
    row.parent.priority || "",
    row.parent.critical ? "Yes" : "No",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `programmer_jobs_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatCreatedAt = (createdAt: string): string => {
  return formatDisplayDateTime(createdAt);
};

