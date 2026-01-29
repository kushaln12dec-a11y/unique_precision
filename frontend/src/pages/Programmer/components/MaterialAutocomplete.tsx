import { useState, useRef, useEffect } from "react";

interface MaterialAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

const MATERIAL_OPTIONS = [
  "SS (Stainless Steel)",
  "Copper",
  "Brass",
  "Carbide",
];

const MaterialAutocomplete: React.FC<MaterialAutocompleteProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(MATERIAL_OPTIONS);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.trim() === "") {
      setFilteredOptions(MATERIAL_OPTIONS);
    } else {
      setFilteredOptions(
        MATERIAL_OPTIONS.filter((option) =>
          option.toLowerCase().includes(newValue.toLowerCase())
        )
      );
    }
    
    setIsOpen(true);
    onChange(newValue);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (inputValue.trim() === "") {
      setFilteredOptions(MATERIAL_OPTIONS);
    }
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter" && filteredOptions.length > 0 && isOpen) {
      e.preventDefault();
      handleOptionSelect(filteredOptions[0]);
    }
  };

  return (
    <div className="customer-autocomplete-wrapper" ref={wrapperRef}>
      <div className={`customer-autocomplete ${error ? "error" : ""} ${disabled ? "disabled" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          required={required}
          placeholder="Select or type material..."
          className="customer-autocomplete-input"
        />
        <span className="customer-autocomplete-arrow">▾</span>
      </div>
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="customer-autocomplete-dropdown">
          {filteredOptions.map((option) => (
            <div
              key={option}
              className={`customer-autocomplete-option ${
                option === value ? "selected" : ""
              }`}
              onClick={() => handleOptionSelect(option)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialAutocomplete;
