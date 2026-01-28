import type { User, CreateUserData, UpdateUserData } from "../types/user";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getUsers = async (roles?: string[]): Promise<User[]> => {
  let url = "/api/users";
  
  // Add roles query parameter if provided
  if (roles && roles.length > 0) {
    const rolesParam = roles.join(",");
    url += `?roles=${encodeURIComponent(rolesParam)}`;
  }
  
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  return res.json();
};

export const getUserById = async (id: string): Promise<User> => {
  const res = await fetch(`/api/users/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  return res.json();
};

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create user");
  }

  return res.json();
};

export const updateUser = async (id: string, userData: UpdateUserData): Promise<User> => {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update user");
  }

  return res.json();
};

export const deleteUser = async (id: string): Promise<void> => {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete user");
  }
};
