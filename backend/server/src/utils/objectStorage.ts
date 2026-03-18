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
    // Temporary mode: keep image data directly in the DB instead of uploading to R2.
    return uploadDataUrl(value, keyPrefix);
  }
  return String(value);
};
