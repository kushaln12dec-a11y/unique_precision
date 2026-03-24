import type { CutInputData } from "../types/cutInput";
import { ensureCutInputState } from "./operatorInputState";

export const applyOperatorCutImage = (
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>,
  cutId: number | string,
  image: string | null,
  file: File | null
) => {
  setCutInputs((prev) => {
    const newMap = new Map(prev);
    const current = newMap.get(cutId);
    if (!current && image === null && file === null) return newMap;
    const { cut, quantities } = ensureCutInputState(current, 1);
    const updatedQuantities = [...quantities];
    updatedQuantities[0] = { ...updatedQuantities[0], lastImage: image, lastImageFile: file };
    newMap.set(cutId, { ...cut, quantities: updatedQuantities });
    return newMap;
  });
};

export const readOperatorImageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
