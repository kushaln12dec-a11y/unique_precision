import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FocusEvent } from "react";
import MultiSelectOperatorsMenu from "./MultiSelectOperatorsMenu";
import "./MultiSelectOperators.css";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toLowerCase();

type MultiSelectOperatorsProps = {
  selectedOperators: string[];
  availableOperators: Array<{ id: string | number; name: string }>;
  onChange: (operators: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  assignToSelfName?: string;
  showUnassign?: boolean;
  selfToggleOnly?: boolean;
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
  showUnassign = true,
  selfToggleOnly = false,
}: MultiSelectOperatorsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const normalizedSelfName = (assignToSelfName || "").trim().toLowerCase();

  const canonicalOperatorNames = useMemo(() => {
    const lookup = new Map<string, string>();
    availableOperators.forEach((operator) => {
      const normalizedName = String(operator.name || "").trim();
      const key = normalizeOperatorName(normalizedName);
      if (!normalizedName || !key || lookup.has(key)) return;
      lookup.set(key, normalizedName);
    });
    if (assignToSelfName && normalizedSelfName) {
      lookup.set(normalizedSelfName, assignToSelfName.trim());
    }
    return lookup;
  }, [availableOperators, assignToSelfName, normalizedSelfName]);

  const normalizedSelectedOperators = useMemo(() => {
    const unique = new Set<string>();
    const normalized: string[] = [];
    selectedOperators.forEach((operator) => {
      const value = String(operator || "").trim();
      const key = normalizeOperatorName(value);
      if (!value || !key || unique.has(key)) return;
      const mappedValue = canonicalOperatorNames.get(key);
      if (!mappedValue) return;
      unique.add(key);
      normalized.push(mappedValue);
    });
    return normalized;
  }, [canonicalOperatorNames, selectedOperators]);

  const normalizedAvailableOperators = useMemo(() => {
    if (selfToggleOnly) return [];
    const seen = new Set<string>();
    return availableOperators.filter((operator) => {
      const normalizedName = String(operator.name || "").trim();
      const key = normalizeOperatorName(normalizedName);
      if (!normalizedName || !key) return false;
      if (seen.has(key) || (normalizedSelfName && key === normalizedSelfName)) return false;
      seen.add(key);
      return true;
    });
  }, [availableOperators, normalizedSelfName, selfToggleOnly]);

  useEffect(() => {
    const incoming = [...new Set(selectedOperators.map((operator) => normalizeOperatorName(operator)).filter(Boolean))];
    const normalized = normalizedSelectedOperators.map((operator) => normalizeOperatorName(operator));
    const incomingSnapshot = incoming.join("|");
    const normalizedSnapshot = normalized.join("|");

    if (
      incomingSnapshot !== normalizedSnapshot ||
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
    const normalizedTarget = normalizeOperatorName(operatorName);
    const isSelfTarget = normalizedSelfName && normalizedTarget === normalizedSelfName;
    if (selfToggleOnly && !isSelfTarget) return;
    const isSelected = normalizedSelectedOperators.some((name) => normalizeOperatorName(name) === normalizedTarget);
    onChange(
      isSelected
        ? normalizedSelectedOperators.filter((name) => normalizeOperatorName(name) !== normalizedTarget)
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
        showUnassign={showUnassign}
        selfToggleOnly={selfToggleOnly}
        normalizedSelectedOperators={normalizedSelectedOperators}
        normalizedAvailableOperators={normalizedAvailableOperators}
        onMarkUnassigned={() => {
          if (!disabled) onChange([]);
          updateMenuPosition();
        }}
        onAssignToSelf={() => {
          if (!disabled && assignToSelfName) {
            const normalizedAssigned = normalizeOperatorName(assignToSelfName);
            const isSelected = normalizedSelectedOperators.some((name) => normalizeOperatorName(name) === normalizedAssigned);
            onChange(
              isSelected
                ? normalizedSelectedOperators.filter((name) => normalizeOperatorName(name) !== normalizedAssigned)
                : [...normalizedSelectedOperators, assignToSelfName]
            );
          }
          updateMenuPosition();
        }}
        onToggleOperator={toggleOperator}
      />
    </>
  );
};
