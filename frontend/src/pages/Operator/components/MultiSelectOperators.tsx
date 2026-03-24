import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent } from "react";
import MultiSelectOperatorsMenu from "./MultiSelectOperatorsMenu";
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

export const MultiSelectOperators = ({
  selectedOperators,
  availableOperators,
  onChange,
  placeholder = "Select operators...",
  disabled = false,
  className = "",
  compact = false,
  assignToSelfName,
}: MultiSelectOperatorsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const normalizedSelfName = (assignToSelfName || "").trim().toLowerCase();

  const normalizedSelectedOperators = useMemo(() => [...new Set(selectedOperators.filter(Boolean))], [selectedOperators]);
  const normalizedAvailableOperators = useMemo(() => {
    const seen = new Set<string>();
    return availableOperators.filter((operator) => {
      const normalizedName = String(operator.name || "").trim();
      if (!normalizedName) return false;
      const key = normalizedName.toLowerCase();
      if (seen.has(key) || (normalizedSelfName && key === normalizedSelfName)) return false;
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
  }, [normalizedSelectedOperators, onChange, selectedOperators]);

  useEffect(() => {
    const handleOutsideDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    const handleOtherDropdownOpened = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== dropdownId) setIsOpen(false);
    };
    const handleViewportChange = () => isOpen && updateMenuPosition();

    if (isOpen) {
      updateMenuPosition();
      document.addEventListener("mousedown", handleOutsideDown);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
    }
    window.addEventListener("app-multi-select-operators-opened", handleOtherDropdownOpened);

    return () => {
      document.removeEventListener("mousedown", handleOutsideDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("app-multi-select-operators-opened", handleOtherDropdownOpened);
    };
  }, [dropdownId, isOpen, normalizedAvailableOperators.length]);

  const updateMenuPosition = () => {
    const trigger = containerRef.current?.querySelector(".multi-select-trigger") as HTMLButtonElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportMargin = 8;
    const finalWidth = Math.min(Math.max(rect.width, 1), window.innerWidth - viewportMargin * 2);
    const menuMaxHeight = Math.min(220, Math.max(120, window.innerHeight - viewportMargin * 2));
    const estimatedHeight = Math.min((normalizedAvailableOperators.length + 2) * 38 + 12, menuMaxHeight);
    const showAbove = window.innerHeight - rect.bottom - viewportMargin < estimatedHeight && rect.top > estimatedHeight;
    const left = Math.min(
      Math.max(rect.left, viewportMargin),
      window.innerWidth - finalWidth - viewportMargin
    );

    setMenuStyle({
      position: "fixed",
      left: `${left}px`,
      width: `${finalWidth}px`,
      maxHeight: `${menuMaxHeight}px`,
      zIndex: 2147483000,
      overflowY: "auto",
      overflowX: "hidden",
      ...(showAbove ? { bottom: `${window.innerHeight - rect.top + 4}px`, top: "auto" } : { top: `${rect.bottom + 4}px`, bottom: "auto" }),
    });
  };

  const toggleOperator = (operatorName: string) => {
    if (disabled) return;
    onChange(
      normalizedSelectedOperators.includes(operatorName)
        ? normalizedSelectedOperators.filter((name) => name !== operatorName)
        : [...normalizedSelectedOperators, operatorName]
    );
  };

  const renderDisplayText = (text: string, displayClassName: string) => (
    <span className={displayClassName}>
      <span className="multi-select-display-track">{text}</span>
    </span>
  );

  const compactDisplay = normalizedSelectedOperators.length > 0 ? normalizedSelectedOperators.join(", ") : placeholder;

  return (
    <>
      <div
        ref={containerRef}
        className={`multi-select-operators ${className} ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""} ${compact ? "compact" : ""}`}
        onBlur={(event: FocusEvent<HTMLDivElement>) => {
          const nextFocused = event.relatedTarget as Node | null;
          if (nextFocused && !containerRef.current?.contains(nextFocused) && !menuRef.current?.contains(nextFocused)) {
            setIsOpen(false);
          }
        }}
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
            if (nextOpen) window.dispatchEvent(new CustomEvent("app-multi-select-operators-opened", { detail: dropdownId }));
            setIsOpen(nextOpen);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Tab") return setIsOpen(false);
            if ((event.key === "Enter" || event.key === " ") && !disabled) {
              event.preventDefault();
              const nextOpen = !isOpen;
              if (nextOpen) window.dispatchEvent(new CustomEvent("app-multi-select-operators-opened", { detail: dropdownId }));
              setIsOpen(nextOpen);
            }
          }}
          title={normalizedSelectedOperators.length > 0 ? normalizedSelectedOperators.join(", ") : placeholder}
          aria-expanded={isOpen}
          disabled={disabled}
        >
          {normalizedSelectedOperators.length > 0
            ? compact || normalizedSelectedOperators.length > 1
              ? renderDisplayText(compactDisplay, "compact-display")
              : renderDisplayText(normalizedSelectedOperators[0], "selected-text")
            : <span className="placeholder">{placeholder}</span>}
          {!disabled && <span className="dropdown-icon">v</span>}
        </button>
      </div>
      <MultiSelectOperatorsMenu
        isOpen={isOpen}
        disabled={disabled}
        menuStyle={menuStyle}
        menuRef={menuRef}
        assignToSelfName={assignToSelfName}
        normalizedSelectedOperators={normalizedSelectedOperators}
        normalizedAvailableOperators={normalizedAvailableOperators}
        onMarkUnassigned={() => {
          if (!disabled) onChange([]);
          setIsOpen(false);
        }}
        onAssignToSelf={() => {
          if (!disabled && assignToSelfName) onChange([assignToSelfName]);
          setIsOpen(false);
        }}
        onToggleOperator={toggleOperator}
      />
    </>
  );
};
