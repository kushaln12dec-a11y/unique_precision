import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import { getUsers, createUser, updateUser, deleteUser } from "../../services/userApi";
import type { User, CreateUserData, UpdateUserData, UserRole } from "../../types/user";
import "./UserManagement.css";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import {
  filterUsers,
  sanitizePhoneInput,
  sortUsers,
} from "./utils/tableUtils";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    empId: "",
    role: "OPERATOR",
  });
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [roleFilter, setRoleFilter] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error: any) {
      setError(error.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      setFormData((prev) => ({
        ...prev,
        phone: sanitizePhoneInput(value),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (editingUser) {
        const updateData: UpdateUserData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateUser(editingUser._id, updateData);
      } else {
        await createUser(formData);
      }

      setShowForm(false);
      setEditingUser(null);
      resetForm();
      setCurrentPage(1);
      fetchUsers();
    } catch (error: any) {
      setError(error.message || "Failed to save user");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      empId: user.empId,
      role: user.role,
    });
    setShowForm(true);
    setError("");
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      empId: "",
      role: "OPERATOR",
    });
  };

  const handleNewUser = () => {
    setEditingUser(null);
    resetForm();
    setShowForm(true);
    setError("");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    resetForm();
    setError("");
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete._id);
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const roles: UserRole[] = ["ADMIN", "PROGRAMMER", "OPERATOR", "QC"];

  const filteredUsers = useMemo(
    () => filterUsers(users, searchQuery, roleFilter),
    [users, searchQuery, roleFilter]
  );

  const sortedUsers = useMemo(
    () => sortUsers(filteredUsers, sortField, sortDirection),
    [filteredUsers, sortField, sortDirection]
  );

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

  const columns: Column<User>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        sortKey: "firstName",
        render: (user) => `${user.firstName} ${user.lastName}`,
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
        render: (user) => user.phone,
      },
      {
        key: "empId",
        label: "Emp ID",
        sortable: true,
        sortKey: "empId",
        render: (user) => user.empId,
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
    []
  );

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="user-management-container">
      <Sidebar currentPath="/users" onNavigate={handleNavigation} />

      <div className="user-management-content">
        <Header title="User Management" />

        {error && <div className="error-message">{error}</div>}

        {showForm && (
          <div className="user-form-container">
            <h2>{editingUser ? "Edit User" : "Create New User"}</h2>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    title="Please enter phone number"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID *</label>
                  <input
                    type="text"
                    name="empId"
                    value={formData.empId}
                    onChange={handleInputChange}
                    placeholder="Enter employee ID"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password {editingUser ? "(leave blank to keep current)" : "*"}</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingUser ? "Update User" : "Create User"}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {!showForm && (loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <div className="users-table-container">
            <div className="table-header-controls">
              <div className="table-controls">
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
                <div className="role-filter-container">
                  <select
                    value={roleFilter}
                    onChange={handleRoleFilterChange}
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
              <button className="btn-add-user" onClick={handleNewUser}>
                + Add New User
              </button>
            </div>

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

        {showDeleteModal && userToDelete && (
          <ConfirmDeleteModal
            user={userToDelete}
            onCancel={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagement;
