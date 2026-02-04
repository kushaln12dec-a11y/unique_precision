import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM, parseDateValue } from "../../../utils/date";

type TableRow = {
  groupId: number;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

/**
 * Export operator jobs to CSV
 */
export const exportOperatorJobsToCSV = (tableData: TableRow[]): void => {
  const headers = ["Customer", "Rate", "Cut (mm)", "Description", "TH (MM)", "Pass", "Setting", "Qty", "Created At", "Created By", "Assigned To", "Total Hrs/Piece", "Total Amount (₹)", "Priority", "Complex"];
  const rows = tableData.map((row) => [
    row.parent.customer || "",
    `₹${Number(row.parent.rate || 0).toFixed(2)}`,
    Number(row.parent.cut || 0).toFixed(2),
    row.parent.description || "",
    Number(row.parent.thickness || 0).toFixed(2),
    row.parent.passLevel || "",
    row.parent.setting || "",
    Number(row.parent.qty || 0).toString(),
    (() => {
      const parsed = parseDateValue(row.parent.createdAt);
      if (!parsed) return "—";
      const date = new Date(parsed);
      const day = date.getDate().toString().padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    })(),
    row.parent.createdBy || "",
    row.parent.assignedTo || "",
    row.groupTotalHrs ? formatHoursToHHMM(row.groupTotalHrs) : "",
    row.groupTotalAmount ? `₹${row.groupTotalAmount.toFixed(2)}` : "",
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
