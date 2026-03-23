import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";
import { createPortal } from "react-dom";
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
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
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

  const updateMenuPosition = () => {
    const trigger = containerRef.current?.querySelector(".multi-select-trigger") as HTMLButtonElement | null;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const viewportMargin = 8;
    const desiredWidth = Math.max(triggerRect.width, 1);
    const finalWidth = Math.min(desiredWidth, viewportWidth - viewportMargin * 2);
    const menuMaxHeight = Math.min(220, Math.max(120, viewportHeight - viewportMargin * 2));
    const estimatedMenuHeight = Math.min((normalizedAvailableOperators.length + 2) * 38 + 12, menuMaxHeight);
    const spaceBelow = viewportHeight - triggerRect.bottom - viewportMargin;
    const showAbove = spaceBelow < estimatedMenuHeight && triggerRect.top > estimatedMenuHeight;

    let left = triggerRect.left;
    if (left + finalWidth > viewportWidth - viewportMargin) {
      left = viewportWidth - finalWidth - viewportMargin;
    }
    if (left < viewportMargin) {
      left = viewportMargin;
    }

    setMenuStyle({
      position: "fixed",
      left: `${left}px`,
      width: `${finalWidth}px`,
      maxHeight: `${menuMaxHeight}px`,
      zIndex: 2147483000,
      overflowY: "auto",
      overflowX: "hidden",
      ...(showAbove
        ? { bottom: `${viewportHeight - triggerRect.top + 4}px`, top: "auto" }
        : { top: `${triggerRect.bottom + 4}px`, bottom: "auto" }),
    });
  };

  useEffect(() => {
    const handleOutsideDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      if (isOpen) updateMenuPosition();
    };

    if (isOpen) {
      updateMenuPosition();
      document.addEventListener("mousedown", handleOutsideDown);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, normalizedAvailableOperators.length]);

  useEffect(() => {
    const handleOtherDropdownOpened = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== dropdownId) {
        setIsOpen(false);
      }
    };

    window.addEventListener("app-multi-select-operators-opened", handleOtherDropdownOpened);
    return () => window.removeEventListener("app-multi-select-operators-opened", handleOtherDropdownOpened);
  }, [dropdownId]);

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

  const markUnassigned = () => {
    if (disabled) return;
    onChange([]);
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

  const handleWrapperBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (!nextFocused) return;
    const insideTrigger = containerRef.current?.contains(nextFocused);
    const insideMenu = menuRef.current?.contains(nextFocused);
    if (!insideTrigger && !insideMenu) {
      setIsOpen(false);
    }
  };

  const renderDisplayText = (text: string, className: string) => (
    <span className={className}>
      <span className="multi-select-display-track">{text}</span>
    </span>
  );

  const menu =
    isOpen && !disabled
      ? createPortal(
          <div
            className="multi-select-dropdown"
            style={menuStyle}
            ref={menuRef}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {normalizedAvailableOperators.length === 0 && !assignToSelfName ? (
              <div className="dropdown-empty">No operators available</div>
            ) : (
              <>
                <div className="dropdown-option" onClick={markUnassigned}>
                  <input type="checkbox" checked={normalizedSelectedOperators.length === 0} readOnly />
                  <span>Unassign</span>
                </div>
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
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span>{operator.name}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={containerRef}
        className={`multi-select-operators ${className} ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""} ${compact ? "compact" : ""}`}
        onBlur={handleWrapperBlur}
      >
        <button
          type="button"
          className="multi-select-trigger"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (disabled) return;
            const nextOpen = !isOpen;
            if (nextOpen) {
              window.dispatchEvent(
                new CustomEvent("app-multi-select-operators-opened", { detail: dropdownId })
              );
            }
            setIsOpen(nextOpen);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Tab") {
              setIsOpen(false);
              return;
            }

            if ((event.key === "Enter" || event.key === " ") && !disabled) {
              event.preventDefault();
              const nextOpen = !isOpen;
              if (nextOpen) {
                window.dispatchEvent(
                  new CustomEvent("app-multi-select-operators-opened", { detail: dropdownId })
                );
              }
              setIsOpen(nextOpen);
            }
          }}
          title={normalizedSelectedOperators.length > 0 ? normalizedSelectedOperators.join(", ") : placeholder}
          aria-expanded={isOpen}
          disabled={disabled}
        >
          {normalizedSelectedOperators.length > 0 ? (
            compact ? (
              renderDisplayText(getCompactDisplay(), "compact-display")
            ) : normalizedSelectedOperators.length > 1 ? (
              renderDisplayText(getCompactDisplay(), "compact-display")
            ) : (
              renderDisplayText(normalizedSelectedOperators[0], "selected-text")
            )
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          {!disabled && <span className="dropdown-icon">v</span>}
        </button>
      </div>
      {menu}
    </>
  );
};
