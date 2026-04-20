import SEDMModal from "./SEDMModal";
import type { CutForm } from "../programmerUtils";
import type { CustomerRate } from "../../../types/masterConfig";

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
  isAdmin: boolean;
  customerConfigs: CustomerRate[];
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
  isAdmin,
  customerConfigs,
}: SEDMModalWrapperProps) => {
  if (sedmModalIndex === null || !cuts[sedmModalIndex]) {
    return null;
  }

  const currentCut = cuts[sedmModalIndex];
  const customerConfig =
    customerConfigs.find(
      (item) => String(item.customer || "").trim().toUpperCase() === String(currentCut.customer || "").trim().toUpperCase()
    ) || null;

  return (
    <SEDMModal
      isOpen={true}
      onClose={onClose}
      cut={currentCut}
      onLengthChange={onLengthChange}
      onLengthTypeChange={onLengthTypeChange}
      onHolesChange={onHolesChange}
      onThicknessChange={onThicknessChange}
      onSedmEntriesJsonChange={onSedmEntriesJsonChange}
      electrodeOptions={electrodeOptions}
      thOptions={thOptions}
      isAdmin={isAdmin}
      customerConfig={customerConfig}
      onApply={() => {}}
    />
  );
};

export default SEDMModalWrapper;
