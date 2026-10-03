const rawBaseUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, "") : "";

export const apiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return rawBaseUrl ? `${rawBaseUrl}${cleanPath}` : cleanPath;
};
