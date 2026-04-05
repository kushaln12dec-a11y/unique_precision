import { useState, type MouseEvent } from "react";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { copyTextWithFallback } from "../utils/clipboard";

type MarqueeCopyTextProps = {
  text: string;
  className?: string;
  showCopyButton?: boolean;
};

const MarqueeCopyText = ({ text, className = "", showCopyButton = true }: MarqueeCopyTextProps) => {
  const [copied, setCopied] = useState(false);
  const safeText = String(text || "-");

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const didCopy = await copyTextWithFallback(safeText);
    if (didCopy) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className={`description-marquee ${className}`.trim()} title={safeText}>
      <span className="marquee-animated">{safeText}</span>
      <span className="marquee-static">{safeText}</span>
      {showCopyButton ? (
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
      ) : null}
    </div>
  );
};

export default MarqueeCopyText;
