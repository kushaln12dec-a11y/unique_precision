const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const normalizedBaseUrl = String(rawBaseUrl).replace(/\/+$/, "");

export const apiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${normalizedBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};
