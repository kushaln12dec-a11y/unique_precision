const toSearchableText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((item) => toSearchableText(item)).filter(Boolean).join(" ");
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => toSearchableText(item))
      .filter(Boolean)
      .join(" ");
  }
  return String(value);
};

export const normalizeSearchQuery = (query: string): string => {
  return query.trim().toLowerCase();
};

export const matchesSearchQuery = (values: unknown[], query: string): boolean => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;

  return values.some((value) =>
    toSearchableText(value).toLowerCase().includes(normalizedQuery)
  );
};
