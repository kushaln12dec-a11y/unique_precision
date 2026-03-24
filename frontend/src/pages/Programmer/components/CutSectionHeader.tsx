import React from "react";
import FlagIcon from "@mui/icons-material/Flag";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DustbinIcon } from "../../../utils/icons";
import type { CutForm } from "../programmerUtils";

type Props = {
  cut: CutForm;
  index: number;
  isSaved: boolean;
  isFirstCut: boolean;
  openPriorityDropdown: number | null;
  onCutChange: <K extends keyof CutForm>(field: K) => (value: CutForm[K]) => void;
  onPriorityDropdownToggle: () => void;
  onRemoveCut: () => void;
  onToggle: () => void;
  isCollapsed: boolean;
};

export const CutSectionHeader: React.FC<Props> = ({
  cut,
  index,
  isSaved,
  isFirstCut,
  openPriorityDropdown,
  onCutChange,
  onPriorityDropdownToggle,
  onRemoveCut,
  onToggle,
  isCollapsed,
}) => {
  return (
    <div className="cut-section-header">
      <span>Setting {index + 1}</span>
      <div className="cut-section-header-right">
        <label className="header-checkbox">
          <input type="checkbox" checked={cut.critical} onChange={(e) => onCutChange("critical")(e.target.checked)} />
          Complex
        </label>
        <label className="header-checkbox">
          <input type="checkbox" checked={cut.pipFinish} onChange={(e) => onCutChange("pipFinish")(e.target.checked)} />
          PIP Finish
        </label>
        <div className="priority-dropdown compact">
          <button type="button" className={`priority-trigger priority-${cut.priority.toLowerCase()}`} onClick={onPriorityDropdownToggle} aria-label="Priority">
            <div className="priority-flag-wrapper">
              <FlagIcon className={`priority-flag priority-flag-${cut.priority.toLowerCase()}`} sx={{ fontSize: "1rem" }} />
              <span className="priority-text">{cut.priority}</span>
            </div>
            <ExpandMoreIcon className={`priority-caret ${openPriorityDropdown === index ? "open" : ""}`} sx={{ fontSize: "0.9rem" }} />
          </button>
          {openPriorityDropdown === index && (
            <div className="priority-menu">
              {(["High", "Medium", "Low"] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className={`priority-option ${cut.priority === priority ? "selected" : ""}`}
                  onClick={() => {
                    onCutChange("priority")(priority);
                    onPriorityDropdownToggle();
                  }}
                >
                  <FlagIcon className={`priority-flag priority-flag-${priority.toLowerCase()}`} sx={{ fontSize: "1rem" }} />
                  <span>{priority}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className={`cut-save-status ${isSaved ? "cut-save-status-saved" : "cut-save-status-pending"}`}>{isSaved ? "Saved" : "Not saved"}</span>
        {!isFirstCut && (
          <button type="button" className="cut-remove" onClick={onRemoveCut} aria-label={`Delete Cut ${index + 1}`}>
            <DustbinIcon fontSize="small" />
          </button>
        )}
        <button type="button" className="cut-toggle-button" onClick={onToggle} disabled={isFirstCut} aria-label={isCollapsed ? "Expand cut" : "Collapse cut"}>
          {isCollapsed ? "+" : "-"}
        </button>
      </div>
    </div>
  );
};

export default CutSectionHeader;
