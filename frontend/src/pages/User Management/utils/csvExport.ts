import type { User } from "../../../types/user";

/**
 * Export users to CSV
 */
export const exportUsersToCSV = (users: User[]): void => {
  const headers = ["Name", "Email", "Phone", "Emp ID", "Role"];
  const rows = users.map((user) => [
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.phone || "",
    user.empId || "",
    user.role,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

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
