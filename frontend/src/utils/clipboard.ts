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
