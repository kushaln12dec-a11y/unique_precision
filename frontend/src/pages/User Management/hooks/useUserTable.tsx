import { useMemo } from "react";
import type { User } from "../../../types/user";
import type { Column } from "../../../components/DataTable";

/**
 * Hook for user table columns configuration
 */
export const useUserTable = (
  handleEdit: (user: User) => void,
  handleDeleteClick: (user: User) => void
): Column<User>[] => {
  const getDisplayName = (user: User) => {
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (fullName) return fullName.toUpperCase();
    const emailName = String(user.email || "").split("@")[0]?.trim();
    return (emailName || "USER").toUpperCase();
  };

  return useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        sortKey: "firstName",
        render: (user) => getDisplayName(user),
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        sortKey: "email",
        render: (user) => user.email,
      },
      {
        key: "phone",
        label: "Phone",
        sortable: true,
        sortKey: "phone",
        render: (user) => user.phone || "-",
      },
      {
        key: "empId",
        label: "Emp ID",
        sortable: true,
        sortKey: "empId",
        render: (user) => user.empId || "-",
      },
      {
        key: "role",
        label: "Role",
        sortable: true,
        sortKey: "role",
        render: (user) => (
          <span className={`role-badge role-${user.role.toLowerCase()}`}>
            {user.role}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (user) => (
          <div className="action-buttons">
            <button
              className="btn-edit"
              onClick={() => handleEdit(user)}
            >
              Edit
            </button>
            <button
              className="btn-delete"
              onClick={() => handleDeleteClick(user)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [handleEdit, handleDeleteClick]
  );
};
