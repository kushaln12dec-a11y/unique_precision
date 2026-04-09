const QcFilters = ({
  searchValue,
  operatorFilter,
  operatorOptions,
  onSearchChange,
  onOperatorChange,
  onClearAll,
}: {
  searchValue: string;
  operatorFilter: string;
  operatorOptions: string[];
  onSearchChange: (value: string) => void;
  onOperatorChange: (value: string) => void;
  onClearAll: () => void;
}) => (
  <div className="qc-filters">
    <input type="text" value={searchValue} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search any column..." className="qc-filter-input" />
    <select className="qc-filter-select" value={operatorFilter} onChange={(e) => onOperatorChange(e.target.value)}>
      <option value="">All Operators</option>
      {operatorOptions.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
    {(searchValue || operatorFilter) ? (
      <button type="button" className="qc-clear-filters-btn" onClick={onClearAll}>
        Clear All
      </button>
    ) : null}
  </div>
);

export default QcFilters;
