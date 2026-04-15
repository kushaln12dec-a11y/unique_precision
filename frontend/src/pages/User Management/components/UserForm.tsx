import React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/Check";
import type { User, CreateUserData, UserRole } from "../../../types/user";
import { copyTextWithFallback } from "../../../utils/clipboard";

type UserFormProps = {
  editingUser: User | null;
  formData: CreateUserData;
  showPassword: boolean;
  saving: boolean;
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
  saving,
  roles,
  error,
  onInputChange,
  onSubmit,
  onCancel,
  onTogglePassword,
}) => {
  const [copiedField, setCopiedField] = React.useState<"empId" | "password" | null>(null);
  const canCopyEmpId = /^EMP\d+$/i.test(String(formData.empId || "").trim());
  const canCopyPassword = String(formData.password || "").trim().length > 0;

  const handleCopyField = async (field: "empId" | "password", value: string) => {
    const didCopy = await copyTextWithFallback(value);
    if (!didCopy) return;
    setCopiedField(field);
    window.setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current));
    }, 1200);
  };

  return (
    <div className="user-form-container">
      <h2>{editingUser ? "Edit User" : "Create New User"}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={onSubmit} className="user-form" noValidate>
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onInputChange}
              disabled={saving}
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
              disabled={saving}
              placeholder="Enter last name"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Email Address (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={onInputChange}
              disabled={saving}
              placeholder="example@email.com (optional)"
            />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={onInputChange}
              disabled={saving}
              placeholder="+91 9876543210"
              maxLength={14}
              required
              inputMode="numeric"
              aria-invalid={error.toLowerCase().includes("phone") ? true : undefined}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Employee ID *</label>
            <div className="input-action-wrapper">
              <input
                type="text"
                name="empId"
                value={formData.empId}
                onChange={onInputChange}
                disabled={saving}
                placeholder="EMP0001"
                required
              />
              <button
                type="button"
                className="input-copy-btn"
                disabled={saving || !canCopyEmpId}
                onClick={() => handleCopyField("empId", String(formData.empId || ""))}
                title={copiedField === "empId" ? "Copied" : "Copy Employee ID"}
                aria-label={copiedField === "empId" ? "Employee ID copied" : "Copy Employee ID"}
              >
                {copiedField === "empId" ? <CheckIcon /> : <ContentCopyOutlinedIcon />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={onInputChange}
              disabled={saving}
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
            <label>Password {editingUser ? "*" : "*"}</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={onInputChange}
                disabled={saving}
                placeholder={editingUser ? "Enter password" : "Enter password"}
                required
              />
              <div className="password-actions">
                <button
                  type="button"
                  className="password-toggle"
                  onClick={onTogglePassword}
                  disabled={saving}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </button>
                <button
                  type="button"
                  className="input-copy-btn"
                  disabled={saving || !canCopyPassword}
                  onClick={() => handleCopyField("password", String(formData.password || ""))}
                  title={copiedField === "password" ? "Copied" : "Copy Password"}
                  aria-label={copiedField === "password" ? "Password copied" : "Copy Password"}
                >
                  {copiedField === "password" ? <CheckIcon /> : <ContentCopyOutlinedIcon />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : editingUser ? "Update User" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
};
