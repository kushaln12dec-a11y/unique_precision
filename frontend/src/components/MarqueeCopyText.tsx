import { useState, type MouseEvent } from "react";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/Check";

type MarqueeCopyTextProps = {
  text: string;
  className?: string;
};

const MarqueeCopyText = ({ text, className = "" }: MarqueeCopyTextProps) => {
  const [copied, setCopied] = useState(false);
  const safeText = String(text || "-");

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(safeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for environments where Clipboard API is restricted.
      const textarea = document.createElement("textarea");
      textarea.value = safeText;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  return (
    <div className={`description-marquee ${className}`.trim()} title={safeText}>
      <span className="marquee-animated">{safeText}</span>
      <span className="marquee-static">{safeText}</span>
      <button
        type="button"
        className={`marquee-copy-btn ${copied ? "copied" : ""}`.trim()}
        onClick={handleCopy}
        aria-label="Copy cell text"
        title={copied ? "Copied" : "Copy text"}
      >
        {copied ? (
          <CheckIcon sx={{ fontSize: "0.78rem" }} />
        ) : (
          <ContentCopyOutlinedIcon sx={{ fontSize: "0.74rem" }} />
        )}
      </button>
    </div>
  );
};

export default MarqueeCopyText;
