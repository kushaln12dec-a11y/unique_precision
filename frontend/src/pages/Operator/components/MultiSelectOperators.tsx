import { useState, useRef, useEffect, useMemo } from "react";
import "./MultiSelectOperators.css";

type MultiSelectOperatorsProps = {
  selectedOperators: string[];
  availableOperators: Array<{ id: string | number; name: string }>;
  onChange: (operators: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  assignToSelfName?: string;
};

export const MultiSelectOperators: React.FC<MultiSelectOperatorsProps> = ({
  selectedOperators,
  availableOperators,
  onChange,
  placeholder = "Select operators...",
  disabled = false,
  className = "",
  compact = false,
  assignToSelfName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedSelfName = (assignToSelfName || "").trim().toLowerCase();

  const normalizedSelectedOperators = useMemo(() => {
    return [...new Set(selectedOperators.filter(Boolean))];
  }, [selectedOperators]);

  const normalizedAvailableOperators = useMemo(() => {
    const seen = new Set<string>();
    return availableOperators.filter((operator) => {
      const normalizedName = String(operator.name || "").trim();
      if (!normalizedName) return false;
      const key = normalizedName.toLowerCase();
      if (seen.has(key)) return false;
      if (normalizedSelfName && key === normalizedSelfName) return false;
      seen.add(key);
      return true;
    });
  }, [availableOperators, normalizedSelfName]);

  useEffect(() => {
    if (
      normalizedSelectedOperators.length !== selectedOperators.length ||
      normalizedSelectedOperators.some((op, idx) => op !== selectedOperators[idx])
    ) {
      onChange(normalizedSelectedOperators);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSelectedOperators.join(",")]);

  const positionDropdown = () => {
    if (!containerRef.current) return;
    const trigger = containerRef.current.querySelector(".multi-select-trigger") as HTMLElement | null;
    const dropdown = containerRef.current.querySelector(".multi-select-dropdown") as HTMLElement | null;
    if (!trigger || !dropdown) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const viewportMargin = 8;

    const desiredWidth = Math.max(triggerRect.width, 1);
    const maxAllowedWidth = Math.max(desiredWidth, viewportWidth - viewportMargin * 2);
    const finalWidth = Math.min(desiredWidth, maxAllowedWidth);
    const maxHeight = Math.min(220, Math.max(120, viewportHeight - viewportMargin * 2));

    dropdown.style.position = "fixed";
    dropdown.style.width = `${finalWidth}px`;
    dropdown.style.maxWidth = `${maxAllowedWidth}px`;
    dropdown.style.maxHeight = `${maxHeight}px`;

    const dropdownHeight = Math.min(dropdown.scrollHeight || maxHeight, maxHeight);
    const spaceBelow = viewportHeight - triggerRect.bottom - viewportMargin;
    const spaceAbove = triggerRect.top - viewportMargin;

    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      dropdown.classList.add("dropdown-above");
    } else {
      dropdown.classList.remove("dropdown-above");
    }

    let left = triggerRect.left;
    if (left + finalWidth > viewportWidth - viewportMargin) {
      left = viewportWidth - finalWidth - viewportMargin;
    }
    if (left < viewportMargin) {
      left = viewportMargin;
    }

    dropdown.style.left = `${left}px`;
    if (dropdown.classList.contains("dropdown-above")) {
      dropdown.style.bottom = `${viewportHeight - triggerRect.top + 4}px`;
      dropdown.style.top = "auto";
    } else {
      dropdown.style.top = `${triggerRect.bottom + 4}px`;
      dropdown.style.bottom = "auto";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      const handleViewportChange = () => positionDropdown();
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
      positionDropdown();

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", handleViewportChange);
        window.removeEventListener("scroll", handleViewportChange, true);
      };
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleOperator = (operatorName: string) => {
    if (disabled) return;

    const newSelection = normalizedSelectedOperators.includes(operatorName)
      ? normalizedSelectedOperators.filter((name) => name !== operatorName)
      : [...normalizedSelectedOperators, operatorName];

    onChange(newSelection);
  };

  const assignToSelf = () => {
    if (disabled || !assignToSelfName) return;
    onChange([assignToSelfName]);
    setIsOpen(false);
  };

  const getCompactDisplay = () => {
    if (normalizedSelectedOperators.length === 0) return placeholder;
    if (normalizedSelectedOperators.length === 1) return normalizedSelectedOperators[0];
    if (compact && normalizedSelectedOperators.length > 1) {
      return `${normalizedSelectedOperators[0]} +${normalizedSelectedOperators.length - 1}`;
    }
    return normalizedSelectedOperators.join(", ");
  };

  return (
    <div
      ref={containerRef}
      className={`multi-select-operators ${className} ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""} ${compact ? "compact" : ""}`}
    >
      <div
        className="multi-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={normalizedSelectedOperators.length > 0 ? normalizedSelectedOperators.join(", ") : placeholder}
      >
        {normalizedSelectedOperators.length > 0 ? (
          compact ? (
            <span className="compact-display">{getCompactDisplay()}</span>
          ) : normalizedSelectedOperators.length > 1 ? (
            <span className="compact-display">{getCompactDisplay()}</span>
          ) : (
            <span className="selected-text">{normalizedSelectedOperators[0]}</span>
          )
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        {!disabled && <span className="dropdown-icon">v</span>}
      </div>

      {isOpen && !disabled && (
        <div className="multi-select-dropdown">
          {normalizedAvailableOperators.length === 0 && !assignToSelfName ? (
            <div className="dropdown-empty">No operators available</div>
          ) : (
            <>
              {assignToSelfName && (
                <div className="dropdown-option" onClick={assignToSelf}>
                  <input
                    type="checkbox"
                    checked={
                      normalizedSelectedOperators.length === 1 &&
                      normalizedSelectedOperators[0] === assignToSelfName
                    }
                    readOnly
                  />
                  <span>Assign To Me ({assignToSelfName})</span>
                </div>
              )}
              {normalizedAvailableOperators.map((operator) => {
                const isSelected = normalizedSelectedOperators.includes(operator.name);
                return (
                  <div
                    key={operator.id}
                    className={`dropdown-option ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleOperator(operator.name)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOperator(operator.name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>{operator.name}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
