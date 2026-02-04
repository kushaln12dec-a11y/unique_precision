import React from "react";
import DownloadIcon from "@mui/icons-material/Download";
import type { UserRole } from "../../../types/user";

type UserTableControlsProps = {
  searchQuery: string;
  roleFilter: string;
  roles: UserRole[];
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRoleFilterChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDownloadCSV: () => void;
  onNewUser: () => void;
};

export const UserTableControls: React.FC<UserTableControlsProps> = ({
  searchQuery,
  roleFilter,
  roles,
  onSearchChange,
  onRoleFilterChange,
  onDownloadCSV,
  onNewUser,
}) => {
  return (
    <div className="table-header-controls">
      <div className="table-controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search..."
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>
        <div className="role-filter-container">
          <select
            value={roleFilter}
            onChange={onRoleFilterChange}
            className="role-filter-select"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button
          className="btn-download-csv"
          onClick={onDownloadCSV}
          title="Download CSV"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            color: "#1e293b",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.3s ease",
            height: "38px",
            boxSizing: "border-box",
          }}
        >
          <DownloadIcon sx={{ fontSize: "1rem" }} />
          CSV
        </button>
        <button className="btn-add-user" onClick={onNewUser}>
          + Add New User
        </button>
      </div>
    </div>
  );
};
