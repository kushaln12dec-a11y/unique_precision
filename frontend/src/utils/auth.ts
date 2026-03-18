const getEmailLocalPart = (email: unknown): string | null => {
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) return null;
  const localPart = normalizedEmail.split("@")[0]?.trim();
  return localPart || null;
};

export const getUserRoleFromToken = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    return decoded.role || null;
  } catch {
    return null;
  }
};

const getDecodedTokenPayload = (): Record<string, any> | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const getUserDisplayNameFromToken = (): string | null => {
  const decoded = getDecodedTokenPayload();
  if (!decoded) return null;

  const displayName =
    decoded.fullName ||
    (decoded.firstName && decoded.lastName ? `${decoded.firstName} ${decoded.lastName}`.trim() : null) ||
    (decoded.firstName || decoded.lastName ? `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim() : null) ||
    decoded.empId ||
    decoded.name ||
    decoded.username ||
    getEmailLocalPart(decoded.email);

  return displayName ? String(displayName).toUpperCase() : null;
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
  if (role === "PROGRAMMER") return "Programmer";
  if (role === "OPERATOR") return "Operator";
  if (role === "QC") return "QC";
  return null;
};
