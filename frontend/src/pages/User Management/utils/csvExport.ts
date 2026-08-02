import type { User } from "../../../types/user";
import { formatEmployeeId } from "../../../utils/employeeId";
import { formatDisplayDateTime } from "../../../utils/date";

/**
 * Export users to CSV
 */
export const exportUsersToCSV = (users: User[]): void => {
  const escapeCsvCell = (value: unknown) => {
    const str = String(value ?? "").replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = ["Emp ID", "Full Name", "First Name", "Last Name", "Email", "Phone", "Role", "Created At"];
  const rows = users.map((user) => [
    formatEmployeeId(user.empId) || "",
    `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    user.firstName || "",
    user.lastName || "",
    user.email || "",
    user.phone || "",
    user.role || "",
    formatDisplayDateTime(user.createdAt),
  ]);

  const csvContent = "\uFEFF" + [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `users_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
