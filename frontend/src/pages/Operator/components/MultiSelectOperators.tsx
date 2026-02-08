import { useState, useRef, useEffect, useMemo } from "react";
import "./MultiSelectOperators.css";

type MultiSelectOperatorsProps = {
  selectedOperators: string[];
  availableOperators: Array<{ id: string | number; name: string }>;
  onChange: (operators: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean; // Show compact format like "user+1..." in table cells
};

export const MultiSelectOperators: React.FC<MultiSelectOperatorsProps> = ({
  selectedOperators,
  availableOperators,
  onChange,
  placeholder = "Select operators...",
  disabled = false,
  className = "",
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Normalize selectedOperators to remove duplicates
  const normalizedSelectedOperators = useMemo(() => {
    return [...new Set(selectedOperators.filter(Boolean))];
  }, [selectedOperators]);
  
  // If normalized array differs from props, update parent
  useEffect(() => {
    if (normalizedSelectedOperators.length !== selectedOperators.length || 
        normalizedSelectedOperators.some((op, idx) => op !== selectedOperators[idx])) {
      onChange(normalizedSelectedOperators);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSelectedOperators.join(",")]); // Only run when normalized list changes

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen && containerRef.current) {
      document.addEventListener("mousedown", handleClickOutside);
      
      // Position dropdown to ensure it's fully visible
      const trigger = containerRef.current.querySelector('.multi-select-trigger') as HTMLElement;
      const dropdown = containerRef.current.querySelector('.multi-select-dropdown') as HTMLElement;
      
      if (trigger && dropdown) {
        const triggerRect = trigger.getBoundingClientRect();
        const dropdownHeight = dropdown.offsetHeight || 200; // fallback to max-height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        
        // If not enough space below but enough space above, show dropdown above
        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          dropdown.classList.add('dropdown-above');
        } else {
          dropdown.classList.remove('dropdown-above');
        }
        
        // Use fixed positioning relative to viewport to avoid clipping
        const rect = trigger.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.left = `${rect.left}px`;
        if (dropdown.classList.contains('dropdown-above')) {
          dropdown.style.bottom = `${viewportHeight - rect.top}px`;
          dropdown.style.top = 'auto';
        } else {
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.bottom = 'auto';
        }
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleOperator = (operatorName: string) => {
    if (disabled) return;
    
    // Use normalized operators and toggle
    const newSelection = normalizedSelectedOperators.includes(operatorName)
      ? normalizedSelectedOperators.filter((name) => name !== operatorName)
      : [...normalizedSelectedOperators, operatorName];
    
    onChange(newSelection);
  };

  // Compact display format: "user+1..." when multiple operators
  const getCompactDisplay = () => {
    if (normalizedSelectedOperators.length === 0) return placeholder;
    if (normalizedSelectedOperators.length === 1) return normalizedSelectedOperators[0];
    if (compact && normalizedSelectedOperators.length > 1) {
      return `${normalizedSelectedOperators[0]}+${normalizedSelectedOperators.length - 1}`;
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
            <span className="compact-display">
              {getCompactDisplay()}
            </span>
          ) : normalizedSelectedOperators.length > 1 ? (
            <span className="compact-display">
              {getCompactDisplay()}
            </span>
          ) : (
            <span className="selected-text">
              {normalizedSelectedOperators[0]}
            </span>
          )
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        {!disabled && <span className="dropdown-icon">▼</span>}
      </div>

      {isOpen && !disabled && (
        <div className="multi-select-dropdown">
          {availableOperators.length === 0 ? (
            <div className="dropdown-empty">No operators available</div>
          ) : (
            availableOperators.map((operator) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
};
