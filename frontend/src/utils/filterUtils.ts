import type { FilterValues } from "../components/FilterModal";

export function applyFilters<T extends Record<string, any>>(
  data: T[],
  filters: FilterValues
): T[] {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  return data.filter((item) => {
    return Object.keys(filters).every((key) => {
      const filterValue = filters[key];
      const itemValue = item[key];

      // Handle range filters (min/max objects)
      if (typeof filterValue === "object" && !Array.isArray(filterValue)) {
        const { min, max } = filterValue;
        const numValue = Number(itemValue);

        if (min !== undefined && max !== undefined) {
          return numValue >= Number(min) && numValue <= Number(max);
        }
        if (min !== undefined) {
          return numValue >= Number(min);
        }
        if (max !== undefined) {
          return numValue <= Number(max);
        }
        return true;
      }

      // Handle date range filters
      if (key.includes("Date") || key.includes("date") || key === "createdAt") {
        if (typeof filterValue === "object" && !Array.isArray(filterValue)) {
          const { min, max } = filterValue;
          const itemDate = new Date(itemValue).getTime();

          if (min !== undefined && max !== undefined) {
            return (
              itemDate >= new Date(min).getTime() &&
              itemDate <= new Date(max).getTime()
            );
          }
          if (min !== undefined) {
            return itemDate >= new Date(min).getTime();
          }
          if (max !== undefined) {
            return itemDate <= new Date(max).getTime();
          }
        } else if (filterValue) {
          const itemDate = new Date(itemValue).toDateString();
          const filterDate = new Date(filterValue).toDateString();
          return itemDate === filterDate;
        }
        return true;
      }

      // Handle text filters (case-insensitive partial match)
      if (typeof filterValue === "string") {
        return String(itemValue)
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      }

      // Handle number filters (exact match)
      if (typeof filterValue === "number") {
        return Number(itemValue) === filterValue;
      }

      // Handle boolean filters
      if (typeof filterValue === "boolean") {
        return Boolean(itemValue) === filterValue;
      }

      // Default: exact match
      return itemValue === filterValue;
    });
  });
}

export function countActiveFilters(filters: FilterValues): number {
  if (!filters || Object.keys(filters).length === 0) {
    return 0;
  }

  return Object.keys(filters).filter((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === "") {
      return false;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return value.min !== undefined || value.max !== undefined;
    }
    return true;
  }).length;
}
