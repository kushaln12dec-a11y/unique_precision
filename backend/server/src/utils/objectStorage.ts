export const isDataUrl = (value: unknown): value is string => {
  return typeof value === "string" && value.startsWith("data:");
};

export const uploadDataUrl = async (dataUrl: string, keyPrefix: string): Promise<string> => {
  return dataUrl;
};

export const resolveStoredFile = async (
  value: unknown,
  keyPrefix: string
): Promise<string | null> => {
  if (value === null || value === undefined || value === "") return null;
  if (isDataUrl(value)) {
    // Temporary/local mode may store data URLs in the DB when R2 is unavailable.
    // Keep data URLs only when ALLOW_DATA_URL_STORAGE=true or NODE_ENV !== production.
    // Always reject data URLs in production.
    if (process.env.NODE_ENV === "production") {
      console.warn(`Rejecting data URL storage for prefix "${keyPrefix}" in production.`);
      return null;
    }
    return uploadDataUrl(value, keyPrefix);
  }
  return String(value);
};
