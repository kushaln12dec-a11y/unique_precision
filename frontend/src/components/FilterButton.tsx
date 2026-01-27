import React from "react";
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
      <span className="filter-icon">🔍</span>
      Filter
      {activeFilterCount > 0 && (
        <span className="filter-badge">{activeFilterCount}</span>
      )}
    </button>
  );
};

export default FilterButton;
