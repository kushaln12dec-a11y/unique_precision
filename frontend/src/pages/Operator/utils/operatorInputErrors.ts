export const clearOperatorCutValidationErrors = (
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>,
  cutId: number | string
) => {
  setValidationErrors((prevErrors) => new Map([...prevErrors].filter(([key]) => key !== cutId)));
};

export const setOperatorPauseReasonError = (
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>,
  cutId: number | string,
  quantityIndex: number
) => {
  setValidationErrors((prev) => {
    const newErrors = new Map(prev);
    const cutErrors = newErrors.get(cutId) || {};
    const qtyErrors = cutErrors[quantityIndex] || {};
    qtyErrors.pauseReason = "Please enter an idle reason before resuming";
    cutErrors[quantityIndex] = qtyErrors;
    newErrors.set(cutId, cutErrors);
    return newErrors;
  });
};

export const clearOperatorPauseReasonError = (
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>,
  cutId: number | string,
  quantityIndex: number
) => {
  setValidationErrors((prev) => {
    const newErrors = new Map(prev);
    const cutErrors = newErrors.get(cutId) || {};
    const qtyErrors = { ...cutErrors[quantityIndex] };
    delete qtyErrors.pauseReason;
    cutErrors[quantityIndex] = qtyErrors;
    newErrors.set(cutId, cutErrors);
    return newErrors;
  });
};

export const setOperatorFieldError = (
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>,
  cutId: number | string,
  quantityIndex: number,
  field: string,
  message: string
) => {
  setValidationErrors((prev) => {
    const newErrors = new Map(prev);
    const cutErrors = newErrors.get(cutId) || {};
    const qtyErrors = cutErrors[quantityIndex] || {};
    qtyErrors[field] = message;
    cutErrors[quantityIndex] = qtyErrors;
    newErrors.set(cutId, cutErrors);
    return newErrors;
  });
};

export const clearOperatorFieldError = (
  validationErrors: Map<number | string, Record<string, Record<string, string>>>,
  setValidationErrors: React.Dispatch<React.SetStateAction<Map<number | string, Record<string, Record<string, string>>>>>,
  cutId: number | string,
  quantityIndex: number,
  field: string
) => {
  if (!validationErrors.has(cutId)) return;
  const cutErrors = validationErrors.get(cutId)!;
  if (!cutErrors || !cutErrors[String(quantityIndex)]?.[field]) return;
  setValidationErrors((prev) => {
    const newErrors = new Map(prev);
    const qtyErrors = { ...cutErrors[String(quantityIndex)] };
    delete qtyErrors[field];
    const updatedCutErrors: Record<string, Record<string, string>> = {
      ...cutErrors,
      [String(quantityIndex)]: qtyErrors,
    };
    if (Object.keys(qtyErrors).length === 0) {
      const { [String(quantityIndex)]: _, ...rest } = updatedCutErrors;
      if (Object.keys(rest).length === 0) newErrors.delete(cutId);
      else newErrors.set(cutId, rest);
    } else {
      newErrors.set(cutId, updatedCutErrors);
    }
    return newErrors;
  });
};
