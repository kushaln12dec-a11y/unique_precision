import React from "react";

type FormInputProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  required: _required,
  children,
  className = "",
  style,
}) => {
  return (
    <div className={`input-pair ${className}`} style={style}>
      <label>{label}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
};

type InputPairProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export const InputPair: React.FC<InputPairProps> = FormInput;
