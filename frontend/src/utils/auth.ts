import { formatEmployeeId } from "./employeeId";

const getEmailLocalPart = (email: unknown): string | null => {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) return null;
  const localPart = normalizedEmail.split("@")[0]?.trim();
  return localPart || null;
};

const padBase64 = (value: string): string => {
  const remainder = value.length % 4;
  if (remainder === 0) return value;
  return value + "=".repeat(4 - remainder);
};

export const getDecodedTokenPayload = (): Record<string, any> | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = padBase64(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const isTokenExpired = (payload?: Record<string, any> | null): boolean => {
  const decoded = payload === undefined ? getDecodedTokenPayload() : payload;
  if (!decoded || typeof decoded.exp !== "number") return false;
  return decoded.exp * 1000 <= Date.now();
};

export const clearAuthSession = (): void => {
  localStorage.removeItem("token");
};

export const getUserRoleFromToken = (): string | null => {
  const decoded = getDecodedTokenPayload();
  return decoded?.role || null;
};

export const getUserDisplayNameFromToken = (): string | null => {
  const decoded = getDecodedTokenPayload();
  if (!decoded) return null;

  const displayName =
    decoded.fullName ||
    (decoded.firstName && decoded.lastName ? `${decoded.firstName} ${decoded.lastName}`.trim() : null) ||
    (decoded.firstName || decoded.lastName ? `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim() : null) ||
    decoded.name ||
    decoded.username ||
    getEmailLocalPart(decoded.email) ||
    formatEmployeeId(decoded.empId);

  return displayName ? String(displayName).toUpperCase() : null;
};

export const getUserEmpIdFromToken = (): string | null => {
  const decoded = getDecodedTokenPayload();
  if (!decoded) return null;
  const formatted = formatEmployeeId(decoded.empId);
  return formatted || null;
};

export const getUserIdFromToken = (): string | null => {
  const decoded = getDecodedTokenPayload();
  return decoded?.userId || null;
};

export const getUserDesignationFromToken = (): string | null => {
  const decoded = getDecodedTokenPayload();
  if (!decoded) return null;

  const explicitDesignation = String(decoded.designation || "").trim();
  if (explicitDesignation) return explicitDesignation;

  const role = String(decoded.role || "").toUpperCase();
  if (role === "ADMIN") return "Admin";
  if (role === "ACCOUNTANT") return "Accountant";
  if (role === "PROGRAMMER") return "Programmer";
  if (role === "OPERATOR") return "OPS";
  if (role === "QC") return "QC";
  return null;
};
