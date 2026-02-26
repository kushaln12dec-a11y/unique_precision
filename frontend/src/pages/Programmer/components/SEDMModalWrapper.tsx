import SEDMModal from "./SEDMModal";
import type { CutForm } from "../programmerUtils";

type SEDMModalWrapperProps = {
  sedmModalIndex: number | null;
  cuts: CutForm[];
  onClose: () => void;
  onLengthChange: (value: string) => void;
  onLengthTypeChange: (value: "min" | "per") => void;
  onHolesChange: (value: string) => void;
  onThicknessChange: (value: string) => void;
  onSedmEntriesJsonChange: (value: string) => void;
  electrodeOptions: string[];
  thOptions: Array<{ value: string; label: string }>;
};

const SEDMModalWrapper = ({
  sedmModalIndex,
  cuts,
  onClose,
  onLengthChange,
  onLengthTypeChange,
  onHolesChange,
  onThicknessChange,
  onSedmEntriesJsonChange,
  electrodeOptions,
  thOptions,
}: SEDMModalWrapperProps) => {
  if (sedmModalIndex === null || !cuts[sedmModalIndex]) {
    return null;
  }

  return (
    <SEDMModal
      isOpen={true}
      onClose={onClose}
      cut={cuts[sedmModalIndex]}
      onLengthChange={onLengthChange}
      onLengthTypeChange={onLengthTypeChange}
      onHolesChange={onHolesChange}
      onThicknessChange={onThicknessChange}
      onSedmEntriesJsonChange={onSedmEntriesJsonChange}
      electrodeOptions={electrodeOptions}
      thOptions={thOptions}
      onApply={() => {}}
    />
  );
};

export default SEDMModalWrapper;
