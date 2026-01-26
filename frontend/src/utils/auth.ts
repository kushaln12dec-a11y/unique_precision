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
    return (
      decoded.fullName ||
      decoded.name ||
      decoded.username ||
      (decoded.email ? "User" : null)
    );
  } catch {
    return null;
  }
};
