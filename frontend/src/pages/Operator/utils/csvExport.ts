import type { JobEntry } from "../../../types/job";
import { formatDisplayDateTime } from "../../../utils/date";

type TableRow = {
  groupId: number;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

export const exportOperatorJobsToCSV = (tableData: TableRow[], isAdmin: boolean): void => {
  const headers = [
    "Customer",
    "Rate",
    "Cut (mm)",
    "Description",
    "TH (MM)",
    "Pass",
    "Setting",
    "Qty",
    "Created At",
    "Created By",
    "Assigned To",
    ...(isAdmin ? ["Total Amount (Rs.)"] : []),
    "Priority",
    "Complex",
  ];

  const rows = tableData.map((row) => [
    row.parent.customer || "",
    `Rs. ${Number(row.parent.rate || 0).toFixed(2)}`,
    Number(row.parent.cut || 0).toFixed(2),
    row.parent.description || "",
    Number(row.parent.thickness || 0).toFixed(2),
    row.parent.passLevel || "",
    row.parent.setting || "",
    Number(row.parent.qty || 0).toString(),
    formatDisplayDateTime(row.parent.createdAt),
    row.parent.createdBy || "",
    row.parent.assignedTo || "",
    ...(isAdmin ? [row.groupTotalAmount ? `Rs. ${row.groupTotalAmount.toFixed(2)}` : ""] : []),
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
  link.setAttribute("download", `operator_jobs_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
