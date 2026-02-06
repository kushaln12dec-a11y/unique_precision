import type { CutForm } from "../programmerUtils";

/**
 * Hook for job form input handlers
 */
export const useJobFormHandlers = (
  _cuts: CutForm[],
  setCuts: React.Dispatch<React.SetStateAction<CutForm[]>>,
  setSavedCuts: React.Dispatch<React.SetStateAction<Set<number>>>,
  setSedmModalIndex: React.Dispatch<React.SetStateAction<number | null>>
) => {
  const handleCutChange =
    <K extends keyof CutForm>(index: number, field: K) =>
    (value: CutForm[K]) => {
      setCuts((prev) =>
        prev.map((cut, idx) => (idx === index ? { ...cut, [field]: value } : cut))
      );
      setSavedCuts((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    };

  const handleCutImageChange = async (index: number, files: File[]) => {
    if (files.length === 0) {
      return;
    }
    
    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            resolve("");
          }
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readers);
    const validImages = results.filter((result) => result !== "");
    
    if (validImages.length === 0) return;
    
    // Append to existing images
    setCuts((prev) => {
      const currentCut = prev[index];
      if (!currentCut) return prev;
      
      // Handle backward compatibility: convert string to array if needed
      const currentImages = Array.isArray(currentCut.cutImage) 
        ? currentCut.cutImage 
        : (currentCut.cutImage ? [currentCut.cutImage] : []);
      
      return prev.map((cut, idx) => 
        idx === index 
          ? { ...cut, cutImage: [...currentImages, ...validImages] }
          : cut
      );
    });
    
    setSavedCuts((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleRemoveImage = (index: number, imageIndex: number) => {
    setCuts((prev) => {
      const currentCut = prev[index];
      if (!currentCut) return prev;
      
      // Handle backward compatibility: convert string to array if needed
      const currentImages = Array.isArray(currentCut.cutImage) 
        ? currentCut.cutImage 
        : (currentCut.cutImage ? [currentCut.cutImage] : []);
      
      const updatedImages = currentImages.filter((_, idx) => idx !== imageIndex);
      return prev.map((cut, idx) => 
        idx === index 
          ? { ...cut, cutImage: updatedImages }
          : cut
      );
    });
    
    setSavedCuts((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleSedmChange = (index: number, value: CutForm["sedm"], currentModalIndex: number | null) => {
    handleCutChange(index, "sedm")(value);
    if (value === "Yes") {
      setSedmModalIndex(index);
    } else if (currentModalIndex === index) {
      setSedmModalIndex(null);
    }
  };

  return {
    handleCutChange,
    handleCutImageChange,
    handleRemoveImage,
    handleSedmChange,
  };
};
