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

export const getUserDisplayNameFromToken = (): string | null => {
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
    
    // Prioritize fullName from token, then construct from firstName/lastName, then fallback
    const displayName = 
      decoded.fullName ||
      (decoded.firstName && decoded.lastName ? `${decoded.firstName} ${decoded.lastName}`.trim() : null) ||
      (decoded.firstName || decoded.lastName ? `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim() : null) ||
      decoded.name ||
      decoded.username ||
      (decoded.email ? "User" : null);
    
    return displayName;
  } catch {
    return null;
  }
};
