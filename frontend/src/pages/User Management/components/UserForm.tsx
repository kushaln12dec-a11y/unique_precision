import React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import type { User, CreateUserData, UserRole } from "../../../types/user";

type UserFormProps = {
  editingUser: User | null;
  formData: CreateUserData;
  showPassword: boolean;
  roles: UserRole[];
  error: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onTogglePassword: () => void;
};

export const UserForm: React.FC<UserFormProps> = ({
  editingUser,
  formData,
  showPassword,
  roles,
  error,
  onInputChange,
  onSubmit,
  onCancel,
  onTogglePassword,
}) => {
  return (
    <div className="user-form-container">
      <h2>{editingUser ? "Edit User" : "Create New User"}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={onSubmit} className="user-form">
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onInputChange}
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
              onChange={onInputChange}
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
              onChange={onInputChange}
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
              onChange={onInputChange}
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
              onChange={onInputChange}
              placeholder="Enter employee ID"
              required
            />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={onInputChange}
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
                onChange={onInputChange}
                placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                required={!editingUser}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={onTogglePassword}
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
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
