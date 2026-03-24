import { parseDateValue } from "../../../utils/date";

const toSortableNumber = (value: unknown): number | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sortGroupEntriesParentFirst = <T extends {
  id?: string | number;
  setting?: string | number;
  createdAt?: string;
}>(entries: T[]): T[] => {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const createdAtA = parseDateValue(String(left.entry.createdAt || ""));
      const createdAtB = parseDateValue(String(right.entry.createdAt || ""));
      const hasCreatedAtA = createdAtA > 0;
      const hasCreatedAtB = createdAtB > 0;

      if (hasCreatedAtA && hasCreatedAtB && createdAtA !== createdAtB) {
        return createdAtA - createdAtB;
      }
      if (hasCreatedAtA && !hasCreatedAtB) return -1;
      if (!hasCreatedAtA && hasCreatedAtB) return 1;

      const settingA = toSortableNumber(left.entry.setting);
      const settingB = toSortableNumber(right.entry.setting);
      if (!hasCreatedAtA && !hasCreatedAtB && settingA !== null && settingB !== null && settingA !== settingB) {
        return settingA - settingB;
      }
      if (!hasCreatedAtA && !hasCreatedAtB && settingA !== null && settingB === null) return -1;
      if (!hasCreatedAtA && !hasCreatedAtB && settingA === null && settingB !== null) return 1;

      return left.index - right.index;
    })
    .map(({ entry }) => entry);
};
