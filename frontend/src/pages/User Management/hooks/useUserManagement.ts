import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, createUser, updateUser, deleteUser, getNextEmpId } from "../../../services/userApi";
import type { User, CreateUserData, UpdateUserData } from "../../../types/user";
import { isValidIndianPhone, sanitizePhoneInput } from "../utils/tableUtils";
import { formatEmployeeId } from "../../../utils/employeeId";
import { normalizeIndianPhone } from "../../../utils/phone";

/**
 * Hook for user management data and operations
 */
export const useUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "+91 ",
    empId: "Auto Generated",
    role: "OPERATOR",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

    if (name === "firstName" || name === "lastName") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "+91 ",
      empId: "Auto Generated",
      role: "OPERATOR",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);

    try {
      if (!isValidIndianPhone(formData.phone)) {
        throw new Error("Phone number must be in +91 format with 10 digits");
      }

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
      await fetchUsers();
    } catch (error: any) {
      setError(error.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      firstName: user.firstName,
      lastName: user.lastName,
      phone: normalizeIndianPhone(user.phone),
      empId: formatEmployeeId(user.empId),
      role: user.role,
    });
    setShowForm(true);
    setError("");
  };

  const handleNewUser = () => {
    setEditingUser(null);
    resetForm();
    setShowForm(true);
    setError("");
    void (async () => {
      try {
        const nextEmpId = await getNextEmpId();
        if (nextEmpId) {
          setFormData((prev) => ({ ...prev, empId: formatEmployeeId(nextEmpId) }));
        }
      } catch {
        setFormData((prev) => ({ ...prev, empId: "Auto Generated" }));
      }
    })();
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
    if (!userToDelete || deleting) return;
    setDeleting(true);

    try {
      await deleteUser(userToDelete._id);
      setShowDeleteModal(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
      setShowDeleteModal(false);
      setUserToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  return {
    users,
    setUsers,
    loading,
    error,
    setError,
    showForm,
    setShowForm,
    editingUser,
    formData,
    showPassword,
    setShowPassword,
    saving,
    showDeleteModal,
    userToDelete,
    deleting,
    handleInputChange,
    handleSubmit,
    handleEdit,
    handleNewUser,
    handleCancel,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    fetchUsers,
  };
};
