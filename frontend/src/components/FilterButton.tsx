import React from "react";
import TuneIcon from "@mui/icons-material/Tune";
import "./FilterButton.css";

type FilterButtonProps = {
  onClick: () => void;
  activeFilterCount?: number;
};

const FilterButton: React.FC<FilterButtonProps> = ({ onClick, activeFilterCount = 0 }) => {
  return (
    <button
      type="button"
      className={`filter-button ${activeFilterCount > 0 ? "active" : ""}`}
      onClick={onClick}
      aria-label="Filter jobs"
    >
      <TuneIcon className="filter-icon" />
      Filter
      {activeFilterCount > 0 && (
        <span className="filter-badge">{activeFilterCount}</span>
      )}
    </button>
  );
};

export default FilterButton;
