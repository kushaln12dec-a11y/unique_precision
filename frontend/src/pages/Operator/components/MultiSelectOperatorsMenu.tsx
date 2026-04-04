import { createPortal } from "react-dom";
import type { CSSProperties, RefObject } from "react";

type MultiSelectOperatorsMenuProps = {
  isOpen: boolean;
  disabled: boolean;
  menuStyle: CSSProperties;
  menuRef: RefObject<HTMLDivElement | null>;
  assignToSelfName?: string;
  showUnassign: boolean;
  selfToggleOnly: boolean;
  normalizedSelectedOperators: string[];
  normalizedAvailableOperators: Array<{ id: string | number; name: string }>;
  onMarkUnassigned: () => void;
  onAssignToSelf: () => void;
  onToggleOperator: (operatorName: string) => void;
};

const MultiSelectOperatorsMenu = ({
  isOpen,
  disabled,
  menuStyle,
  menuRef,
  assignToSelfName,
  showUnassign,
  selfToggleOnly,
  normalizedSelectedOperators,
  normalizedAvailableOperators,
  onMarkUnassigned,
  onAssignToSelf,
  onToggleOperator,
}: MultiSelectOperatorsMenuProps) => {
  const normalizeName = (value: unknown) => String(value || "").trim().toLowerCase();
  if (!isOpen || disabled) return null;

  return createPortal(
    <div
      className="multi-select-dropdown"
      style={menuStyle}
      ref={menuRef}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {normalizedAvailableOperators.length === 0 && !assignToSelfName ? (
        <div className="dropdown-empty">No operators available</div>
      ) : (
        <>
          {showUnassign && (
            <div className="dropdown-option" onClick={onMarkUnassigned}>
              <input type="checkbox" checked={normalizedSelectedOperators.length === 0} readOnly />
              <span>Unassign</span>
            </div>
          )}
          {assignToSelfName && (
            <div className="dropdown-option" onClick={onAssignToSelf}>
              <input
                type="checkbox"
                checked={normalizedSelectedOperators.some((selectedName) => normalizeName(selectedName) === normalizeName(assignToSelfName))}
                readOnly
              />
              <span>
                {normalizedSelectedOperators.some((selectedName) => normalizeName(selectedName) === normalizeName(assignToSelfName))
                  ? `Remove Me (${assignToSelfName})`
                  : `Add Me (${assignToSelfName})`}
              </span>
            </div>
          )}
          {normalizedAvailableOperators.map((operator) => {
            const isSelected = normalizedSelectedOperators.some(
              (selectedName) => normalizeName(selectedName) === normalizeName(operator.name)
            );
            const isDisabled = selfToggleOnly;
            return (
              <div
                key={operator.id}
                className={`dropdown-option ${isSelected ? "selected" : ""} ${isDisabled ? "readonly" : ""}`.trim()}
                onClick={() => {
                  if (!isDisabled) onToggleOperator(operator.name);
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => {
                    if (!isDisabled) onToggleOperator(operator.name);
                  }}
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
  );
};

export default MultiSelectOperatorsMenu;
