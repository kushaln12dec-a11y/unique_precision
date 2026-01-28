import React from "react";

type FormInputProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  required: _required,
  children,
  className = "",
}) => {
  return (
    <div className={`input-pair ${className}`}>
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
