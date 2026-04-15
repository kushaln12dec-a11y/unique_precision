export type UserRole = "ADMIN" | "ACCOUNTANT" | "PROGRAMMER" | "OPERATOR" | "QC";

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  empId: string;
  image?: string;
  role: UserRole;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  empId?: string;
  image?: string;
  role: UserRole;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  empId?: string;
  image?: string;
  role?: UserRole;
}
