export const copyTextWithFallback = async (text: string): Promise<boolean> => {
  const safeText = String(text ?? "");
  if (!safeText) return false;

  try {
    await navigator.clipboard.writeText(safeText);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = safeText;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "[role='button']",
  "[role='link']",
  "[data-no-cell-copy='true']",
].join(", ");

export const isInteractiveCopyTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
};

export const getCopyableCellText = (target: EventTarget | null, container: HTMLElement | null): string => {
  if (!(container instanceof HTMLElement)) return "";
  if (!(target instanceof HTMLElement)) return "";
  if (isInteractiveCopyTarget(target)) return "";

  const selection = window.getSelection?.();
  if (selection && String(selection).trim()) return "";

  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(INTERACTIVE_SELECTOR).forEach((node) => node.remove());
  return String(clone.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
};
