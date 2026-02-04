import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CutForm } from "./programmerUtils";
import SEDMModalWrapper from "./components/SEDMModalWrapper";
import { CutSection } from "./components/CutSection";
import { JobFormHeader } from "./components/JobFormHeader";
import { JobFormActions } from "./components/JobFormActions";
import { useJobFormState } from "./hooks/useJobFormState";
import { useJobFormHandlers } from "./hooks/useJobFormHandlers";
import { useJobFormValidation } from "./hooks/useJobFormValidation";
import "./components/CustomerAutocomplete.css";

type CutTotals = {
  totalHrs: number;
  totalAmount: number;
};

type ProgrammerJobFormProps = {
  cuts: CutForm[];
  setCuts: Dispatch<SetStateAction<CutForm[]>>;
  onSave: () => void;
  onCancel: () => void;
  totals: CutTotals[];
  isAdmin: boolean;
  refNumber?: string;
};

const ProgrammerJobForm = ({
  cuts,
  setCuts,
  onSave,
  onCancel,
  totals,
  isAdmin,
  refNumber = "",
}: ProgrammerJobFormProps) => {
  const [sedmModalIndex, setSedmModalIndex] = useState<number | null>(null);

  const {
    collapsedCuts,
    savedCuts,
    setSavedCuts,
    cutValidationErrors,
    setCutValidationErrors,
    openPriorityDropdown,
    setOpenPriorityDropdown,
    toggleCut,
    addCut,
    removeCut,
    handleClearCut,
    handleClearAll,
  } = useJobFormState(cuts, setCuts);

  const {
    handleCutChange: handleCutChangeBase,
    handleCutImageChange,
    handleRemoveImage,
    handleSedmChange: createSedmChangeHandler,
  } = useJobFormHandlers(cuts, setCuts, setSavedCuts, setSedmModalIndex);

  // Create a properly typed wrapper for handleCutChange
  const handleCutChange = <K extends keyof CutForm>(index: number) => {
    return (field: K) => {
      return (value: CutForm[K]) => {
        handleCutChangeBase(index, field)(value);
      };
    };
  };

  const handleSedmChange = (index: number, value: CutForm["sedm"]) => {
    createSedmChangeHandler(index, value, sedmModalIndex);
  };

  const { handleSaveCut, allCutsSaved } = useJobFormValidation(
    cuts,
    savedCuts,
    setSavedCuts,
    setCutValidationErrors
  );

  const closeSedmModal = () => {
    setSedmModalIndex(null);
  };

  const grandTotals = useMemo(() => {
    return totals.reduce(
      (acc, current) => ({
        totalHrs: acc.totalHrs + current.totalHrs,
        totalAmount: acc.totalAmount + current.totalAmount,
      }),
      { totalHrs: 0, totalAmount: 0 }
    );
  }, [totals]);

  return (
    <div className="job-form-card">
      <div className="job-form-grid">
        <JobFormHeader refNumber={refNumber} onAddCut={addCut} />

        {cuts.map((cut, index) => {
          const isCollapsed = index === 0 ? false : collapsedCuts.has(index);
          const cutTotals = totals[index] ?? { totalHrs: 0, totalAmount: 0 };
          const isSaved = savedCuts.has(index);
          const fieldErrors = cutValidationErrors[index] ?? {};

          return (
            <CutSection
              key={`cut-${index}`}
              cut={cut}
              index={index}
              cutTotals={cutTotals}
              isCollapsed={isCollapsed}
              isSaved={isSaved}
              fieldErrors={fieldErrors}
              isFirstCut={index === 0}
              openPriorityDropdown={openPriorityDropdown}
              onToggle={() => toggleCut(index)}
              onCutChange={handleCutChange(index)}
              onImageChange={(files) => handleCutImageChange(index, files)}
              onRemoveImage={(imageIndex) => handleRemoveImage(index, imageIndex)}
              onSedmChange={(value) => handleSedmChange(index, value)}
              onSaveCut={() => handleSaveCut(index, cut)}
              onClearCut={() => handleClearCut(index)}
              onRemoveCut={() => removeCut(index)}
              onPriorityDropdownToggle={() => setOpenPriorityDropdown(openPriorityDropdown === index ? null : index)}
              onSedmModalOpen={() => setSedmModalIndex(index)}
              isAdmin={isAdmin}
            />
          );
        })}
      </div>

      <JobFormActions
        grandTotals={grandTotals}
        allCutsSaved={allCutsSaved}
        isAdmin={isAdmin}
        onClearAll={handleClearAll}
        onSave={onSave}
        onCancel={onCancel}
      />

      <SEDMModalWrapper
        sedmModalIndex={sedmModalIndex}
        cuts={cuts}
        onClose={closeSedmModal}
        onLengthChange={(value) =>
          handleCutChange(sedmModalIndex!)("sedmLengthValue")(value)
        }
        onLengthTypeChange={(value: "min" | "per") =>
          handleCutChange(sedmModalIndex!)("sedmLengthType")(value)
        }
        onHolesChange={(value) =>
          handleCutChange(sedmModalIndex!)("sedmHoles")(value)
        }
        onThicknessChange={(value) =>
          handleCutChange(sedmModalIndex!)("thickness")(value)
        }
        onSedmEntriesJsonChange={(value) =>
          handleCutChange(sedmModalIndex!)("sedmEntriesJson")(value)
        }
      />
    </div>
  );
};

export default ProgrammerJobForm;
