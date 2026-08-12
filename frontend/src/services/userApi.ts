import type { User, CreateUserData, UpdateUserData } from "../types/user";
import { apiFetch } from "../utils/apiClient";
import { apiUrl } from "./apiClient";
import { formatEmployeeId } from "../utils/employeeId";

const AUTO_GENERATED_EMP_EMAIL_REGEX = /^emp\d{4}(?:\+\d+)?@uniqueprecision\.local$/i;

const getDisplayEmail = (email: unknown): string => {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  return AUTO_GENERATED_EMP_EMAIL_REGEX.test(normalizedEmail) ? "" : normalizedEmail;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const normalizeUser = (user: any): User => ({
  _id: String(user?._id ?? user?.id ?? ""),
  email: getDisplayEmail(user?.email),
  firstName: String(user?.firstName ?? ""),
  lastName: String(user?.lastName ?? ""),
  phone: String(user?.phone ?? ""),
  empId: formatEmployeeId(user?.empId),
  image: user?.image ? String(user.image) : "",
  role: user?.role ?? "OPERATOR",
  createdAt: user?.createdAt ? String(user.createdAt) : undefined,
  updatedAt: user?.updatedAt ? String(user.updatedAt) : undefined,
});

export const getUsers = async (roles?: string[]): Promise<User[]> => {
  let url = "/api/users";

  if (roles && roles.length > 0) {
    const rolesParam = roles.join(",");
    url += `?roles=${encodeURIComponent(rolesParam)}`;
  }

  const res = await apiFetch(apiUrl(url), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeUser) : [];
};

export const getUserById = async (id: string): Promise<User> => {
  const res = await apiFetch(apiUrl(`/api/users/${id}`), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return normalizeUser(await res.json());
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const res = await apiFetch(apiUrl("/api/users"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create user");
  }

  return normalizeUser(await res.json());
};

export const getNextEmpId = async (): Promise<string> => {
  const res = await apiFetch(apiUrl("/api/users/next-emp-id"), {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch next employee ID");
  }

  const data = await res.json();
  return formatEmployeeId(data?.empId);
};

export const updateUser = async (id: string, userData: UpdateUserData): Promise<User> => {
  const res = await apiFetch(apiUrl(`/api/users/${id}`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update user");
  }

  return normalizeUser(await res.json());
};

export const deleteUser = async (id: string): Promise<void> => {
  const res = await apiFetch(apiUrl(`/api/users/${id}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete user");
  }
};
