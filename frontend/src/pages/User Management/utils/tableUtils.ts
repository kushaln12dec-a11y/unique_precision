import type { User } from "../../../types/user";

export type SortDirection = "asc" | "desc";

export const sanitizePhoneInput = (value: string) => {
  return value.replace(/\D/g, "").slice(0, 10);
};

export const filterUsers = (
  users: User[],
  searchQuery: string,
  roleFilter: string
) => {
  const query = searchQuery.trim().toLowerCase();

  return users.filter((user) => {
    const firstName = String(user.firstName || "").toLowerCase();
    const lastName = String(user.lastName || "").toLowerCase();
    const email = String(user.email || "").toLowerCase();
    const phone = String(user.phone || "").toLowerCase();
    const empId = String(user.empId || "").toLowerCase();
    const role = String(user.role || "").toLowerCase();

    if (query) {
      const matchesSearch =
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        empId.includes(query) ||
        role.includes(query);

      if (!matchesSearch) {
        return false;
      }
    }

    if (roleFilter && user.role !== roleFilter) {
      return false;
    }

    return true;
  });
};

export const sortUsers = (
  users: User[],
  field: keyof User | null,
  direction: SortDirection
) => {
  if (!field) return users;

  return [...users].sort((a, b) => {
    const aValue = a[field] ?? "";
    const bValue = b[field] ?? "";

    const comparison =
      aValue < bValue ? -1 : aValue > bValue ? 1 : 0;

    return direction === "asc" ? comparison : -comparison;
  });
};

export interface PaginatedResult {
  currentUsers: User[];
  totalPages: number;
  indexOfFirstUser: number;
  indexOfLastUser: number;
  totalEntries: number;
}

export const paginateUsers = (
  users: User[],
  currentPage: number,
  usersPerPage: number
): PaginatedResult => {
  const safePerPage = Math.max(1, usersPerPage);
  const totalPages = Math.max(1, Math.ceil(users.length / safePerPage));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfFirstUser = (page - 1) * safePerPage;
  const indexOfLastUser = Math.min(indexOfFirstUser + safePerPage, users.length);

  return {
    currentUsers: users.slice(indexOfFirstUser, indexOfLastUser),
    totalPages,
    indexOfFirstUser,
    indexOfLastUser,
    totalEntries: users.length,
  };
};
