type SortIconProps = {
  field: string;
  sortField: string | null;
  sortDirection: "asc" | "desc";
};

const SortIcon: React.FC<SortIconProps> = ({
  field,
  sortField,
  sortDirection,
}) => {
  const isActive = sortField === field;
  const isAsc = sortDirection === "asc";
  return (
    <span className="sort-icon">
      <span className={`sort-arrow up ${isActive && isAsc ? "active" : ""}`}>
        ▴
      </span>
      <span className={`sort-arrow down ${isActive && !isAsc ? "active" : ""}`}>
        ▾
      </span>
    </span>
  );
};

export default SortIcon;
