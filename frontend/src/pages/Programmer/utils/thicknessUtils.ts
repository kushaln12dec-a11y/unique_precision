export const normalizeThicknessInput = (rawValue: string, previousValue = ""): string => {
  const cleaned = String(rawValue || "")
    .replace(/[^\d./\s]/g, "")
    .replace(/\s+/g, " ");
  const trimmed = cleaned.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return previousValue;

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex === -1) return trimmed;

  const left = trimmed.slice(0, slashIndex).trim();
  const right = trimmed.slice(slashIndex + 1).replace(/\//g, "").trim();
  if (!left) return previousValue;
  return right ? `${left} / ${right}` : `${left} /`;
};

export const parseThicknessValue = (value: unknown): number => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  if (raw.includes("/")) {
    const [leftRaw = "", rightRaw = ""] = raw.split("/", 2);
    const leftToken = leftRaw.trim();
    const rightToken = rightRaw.trim();
    const left = Number(leftToken);
    const right = Number(rightToken);
    const hasLeft = leftToken !== "" && Number.isFinite(left);
    const hasRight = rightToken !== "" && Number.isFinite(right);
    if (hasLeft && hasRight) return (left + right) / 2;
    if (hasLeft && !hasRight) return left;
    return 0;
  }

  const direct = Number(raw);
  return Number.isFinite(direct) ? direct : 0;
};

export const parseSedmThicknessValues = (value: unknown): number[] => {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  if (raw.includes("/")) {
    const [leftRaw = "", rightRaw = ""] = raw.split("/", 2);
    const leftToken = leftRaw.trim();
    const rightToken = rightRaw.trim();
    const left = Number(leftToken);
    const right = Number(rightToken);
    const hasLeft = leftToken !== "" && Number.isFinite(left);
    const hasRight = rightToken !== "" && Number.isFinite(right);
    if (hasLeft && hasRight) return [left, right];
    if (hasLeft && !hasRight) return [left];
    return [];
  }

  const direct = Number(raw);
  return Number.isFinite(direct) ? [direct] : [];
};

export const getEffectiveThickness = (thickness: unknown): number => {
  return Math.max(20, parseThicknessValue(thickness));
};

export const getThicknessDisplayValue = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  return normalizeThicknessInput(raw, raw) || raw;
};
