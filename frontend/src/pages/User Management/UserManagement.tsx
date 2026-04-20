import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable from "../../components/DataTable";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import AppLoader from "../../components/AppLoader";
import { UserForm } from "./components/UserForm";
import { UserTableControls } from "./components/UserTableControls";
import { useUserManagement } from "./hooks/useUserManagement";
import { useUserTable } from "./hooks/useUserTable.tsx";
import { filterUsers, sortUsers } from "./utils/tableUtils";
import { exportUsersToCSV } from "./utils/csvExport";
import type { User, UserRole } from "../../types/user";
import "./UserManagement.css";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

const UserManagement = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleFilter, setRoleFilter] = useState("");

  const {
    users,
    loading,
    error,
    showForm,
    editingUser,
    formData,
    showPassword,
    setShowPassword,
    saving,
    showDeleteModal,
    userToDelete,
    deleting,
    canManageUsers,
    handleInputChange,
    handleSubmit,
    handleEdit,
    handleNewUser,
    handleCancel,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
  } = useUserManagement();

  const roles: UserRole[] = ["ADMIN", "ACCOUNTANT", "PROGRAMMER", "OPERATOR", "QC"];

  const filteredUsers = useMemo(
    () => filterUsers(users, searchQuery, roleFilter),
    [users, searchQuery, roleFilter]
  );

  const sortedUsers = useMemo(
    () => sortUsers(filteredUsers, sortField, sortDirection),
    [filteredUsers, sortField, sortDirection]
  );

  const columns = useUserTable(handleEdit, handleDeleteClick, canManageUsers);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDownloadCSV = () => {
    exportUsersToCSV(sortedUsers);
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setCurrentPage(1);
  };

  const handleNavigation = (path: string) => {
    if (path === "/users") {
      handleCancel();
      return;
    }
    navigate(path);
  };

  const getDeleteModalDetails = (user: User) => [
    { label: "Name", value: `${user.firstName} ${user.lastName}` },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
  ];

  const userManagementBreadcrumbs = useMemo(() => {
    const base = [
      { label: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { label: "User Management", path: "/users", icon: PeopleIcon },
    ];

    if (!showForm) {
      return [
        ...base,
        { label: "User List", path: "/users", icon: PeopleIcon },
      ];
    }

    return [
      ...base,
      editingUser
        ? { label: "Edit User", path: "/users", icon: EditIcon }
        : { label: "Add User", path: "/users", icon: AddCircleOutlineIcon },
    ];
  }, [editingUser, showForm]);

  const headerTitle = showForm
    ? editingUser
      ? "Edit User"
      : "Add User"
    : "User Management";

  return (
    <div className="user-management-container">
      <Sidebar currentPath="/users" onNavigate={handleNavigation} />

      <div className="user-management-content">
        <Header title={headerTitle} breadcrumbsOverride={userManagementBreadcrumbs} onNavigate={handleNavigation} />

        {showForm && (
          <UserForm
            editingUser={editingUser}
            formData={formData}
            showPassword={showPassword}
            saving={saving}
            roles={roles}
            error={error}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
        )}

        {!showForm && (loading ? (
          <AppLoader message="Loading users..." />
        ) : (
          <div className="users-table-container">
            <UserTableControls
              searchQuery={searchQuery}
              roleFilter={roleFilter}
              roles={roles}
              canManageUsers={canManageUsers}
              onSearchChange={handleSearchChange}
              onRoleFilterChange={handleRoleFilterChange}
              onDownloadCSV={handleDownloadCSV}
              onNewUser={handleNewUser}
              onClearAll={handleClearAllFilters}
            />

            <DataTable
              columns={columns}
              data={sortedUsers}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={(field) => handleSort(field as keyof User)}
              emptyMessage={
                searchQuery ? 'No users match your search' : 'No users found'
              }
              getRowKey={(user) => user._id}
              className="left-align"
              pagination={{
                currentPage,
                entriesPerPage: usersPerPage,
                totalEntries: sortedUsers.length,
                onPageChange: handlePageChange,
                onEntriesPerPageChange: (entries) => {
                  setUsersPerPage(entries);
                  setCurrentPage(1);
                },
                entriesPerPageOptions: [5, 10, 15, 25, 50],
              }}
            />
          </div>
        ))}

        {canManageUsers && showDeleteModal && userToDelete && (
          <ConfirmDeleteModal
            title="Confirm Delete"
            message="Are you sure you want to delete this user?"
            details={getDeleteModalDetails(userToDelete)}
            confirmButtonText="Delete User"
            isProcessing={deleting}
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;
