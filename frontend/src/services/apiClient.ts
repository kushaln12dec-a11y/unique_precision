const rawBaseUrl = import.meta.env.VITE_API_URL;
const normalizedBaseUrl = rawBaseUrl ? String(rawBaseUrl).replace(/\/+$/, "") : "";

export const apiUrl = (path: string): string => {
  if (!normalizedBaseUrl) {
    throw new Error("VITE_API_URL is not set. Configure it in your frontend environment variables.");
  }
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${normalizedBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

console.log("API URL:", normalizedBaseUrl);