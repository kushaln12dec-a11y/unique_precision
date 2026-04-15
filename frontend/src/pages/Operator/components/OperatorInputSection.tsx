import React, { useEffect, useState } from "react";
import type { CutInputData } from "../types/cutInput";
import type { QuantityProgressStatus } from "../utils/qaProgress";
import type { OperatorInputField } from "../types/inputFields";
import OperatorInputRangeControls from "./OperatorInputRangeControls";
import OperatorQaSelectionStrip from "./OperatorQaSelectionStrip";
import OperatorQuantityCard from "./OperatorQuantityCard";
import "../OperatorViewPage.css";

type OperatorInputSectionProps = {
  cutData: CutInputData;
  cutId: number | string;
  quantity: number;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  canEditAssignments: boolean;
  canOperateInputs: boolean;
  isAdmin: boolean;
  onInputChange: (cutId: number | string, quantityIndex: number, field: OperatorInputField, value: string | string[]) => void;
  onApplyToAllQuantities: (cutId: number | string, sourceQuantityIndex: number, totalQuantity: number) => void;
  onApplyToCountQuantities: (cutId: number | string, sourceQuantityIndex: number, totalQuantity: number, quantityCount: number) => void;
  onSaveQuantity?: (cutId: number | string, quantityIndex: number) => void;
  onSaveRange?: (cutId: number | string, sourceQuantityIndex: number, fromQty: number, toQty: number) => void;
  qaStatuses?: Record<number, QuantityProgressStatus>;
  onSendToQa?: (cutId: number | string, quantityNumbers: number[]) => void;
  savedQuantities?: Set<number>;
  savedRanges?: Set<string>;
  validationErrors?: Record<string, Record<string, string>>;
  onShowToast?: (message: string, variant?: "success" | "error" | "info") => void;
  onRequestResetTimer?: (cutId: number | string, quantityIndex: number) => void;
  onRequestShiftOver?: (cutId: number | string, quantityIndex: number) => void;
  onRequestResume?: (cutId: number | string, quantityIndex: number) => void;
  onRequestEndTimeCapture?: (cutId: number | string, quantityIndex: number) => void;
  onStartTimeCaptured?: (cutId: number | string, quantityIndex: number) => void;
  requiredHoursPerQuantity?: number;
};

const createFallbackQuantity = () => ({
  startTime: "",
  startTimeEpochMs: null,
  endTime: "",
  endTimeEpochMs: null,
  machineHrs: "",
  machineNumber: "",
  opsName: [],
  idleTime: "",
  idleTimeDuration: "",
  lastImage: null,
  lastImageFile: null,
  isPaused: false,
  pauseStartTime: null,
  totalPauseTime: 0,
  pausedElapsedTime: 0,
  pauseSessions: [],
  currentPauseReason: "",
});

export const OperatorInputSection: React.FC<OperatorInputSectionProps> = ({
  cutData,
  cutId,
  quantity,
  operatorUsers,
  machineOptions,
  canEditAssignments,
  canOperateInputs,
  isAdmin,
  onInputChange,
  onApplyToAllQuantities: _onApplyToAllQuantities,
  onApplyToCountQuantities: _onApplyToCountQuantities,
  onSaveQuantity,
  onSaveRange,
  qaStatuses = {},
  onSendToQa,
  savedRanges = new Set(),
  validationErrors = {},
  onShowToast,
  onRequestResetTimer,
  onRequestShiftOver,
  onRequestResume,
  onRequestEndTimeCapture,
  onStartTimeCaptured,
  requiredHoursPerQuantity = 0,
}) => {
  const [captureMode, setCaptureMode] = useState<"PER_QUANTITY" | "RANGE">("PER_QUANTITY");
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("2");
  const [isRangeApproved, setIsRangeApproved] = useState(false);
  const [selectedQaQuantities, setSelectedQaQuantities] = useState<Set<number>>(new Set());

  const quantities = cutData.quantities || [];
  const displayQuantities = Array.from({ length: Math.max(quantity, quantities.length) }, (_, i) => quantities[i] || createFallbackQuantity());
  const totalQuantity = Math.max(1, quantity);
  const parsedFrom = Number.parseInt(rangeFrom || "", 10);
  const parsedTo = Number.parseInt(rangeTo || "", 10);
  const isRangeValid = Number.isInteger(parsedFrom) && Number.isInteger(parsedTo) && parsedFrom >= 1 && parsedFrom <= totalQuantity && parsedTo >= 2 && parsedTo <= totalQuantity && parsedFrom <= parsedTo;
  const rangeStartQty = isRangeValid ? parsedFrom : 1;
  const rangeEndQty = isRangeValid ? parsedTo : rangeStartQty;
  const activeRangeSourceIndex = rangeStartQty - 1;
  const isRangeMode = captureMode === "RANGE";
  const allQuantityNumbers = Array.from({ length: totalQuantity }, (_, i) => i + 1);
  const getStatus = (qty: number): QuantityProgressStatus => qaStatuses[qty] || "EMPTY";

  useEffect(() => {
    setRangeFrom("1");
    setRangeTo(String(Math.min(2, totalQuantity)));
    setIsRangeApproved(false);
    setSelectedQaQuantities(new Set());
  }, [totalQuantity]);

  useEffect(() => {
    setIsRangeApproved(false);
  }, [rangeFrom, rangeTo, captureMode]);

  useEffect(() => {
    setSelectedQaQuantities((prev) => {
      const next = new Set<number>();
      prev.forEach((qty) => {
        if (getStatus(qty) !== "SENT_TO_QA") next.add(qty);
      });
      return next;
    });
  }, [qaStatuses]);

  const selectableQuantityNumbers = allQuantityNumbers.filter((qty) => getStatus(qty) !== "SENT_TO_QA");
  const qaCounts = allQuantityNumbers.reduce(
    (acc, qty) => {
      const status = getStatus(qty);
      if (status === "SENT_TO_QA") acc.sent += 1;
      else if (status === "RUNNING") acc.running += 1;
      else if (status === "READY_FOR_QA") acc.hold += 1;
      else if (status === "SAVED") acc.logged += 1;
      else acc.empty += 1;
      return acc;
    },
    { running: 0, hold: 0, logged: 0, sent: 0, empty: 0 }
  );
  const sendEligible = Array.from(selectedQaQuantities).filter((qty) => {
    const status = getStatus(qty);
    return status === "SAVED" || status === "READY_FOR_QA";
  });

  return (
    <div className="operator-cut-inputs-section" data-cut-id={cutId}>
      <div className="operator-inputs-title-row">
        <h5 className="operator-inputs-title">Input Values</h5>
        <div className="qa-stage-legend qa-title-legend">
          <span className="qa-legend-title">Stage Legend:</span>
          <span className="qa-legend-item empty">NOT STARTED = values not entered yet</span>
          <span className="qa-legend-item running">RUNNING = machine is cutting now</span>
          <span className="qa-legend-item ready">HOLD = captured and waiting</span>
          <span className="qa-legend-item saved">LOGGED = input captured</span>
          <span className="qa-legend-item sent">QC = moved to QC queue</span>
        </div>
      </div>

      {quantity > 1 && (
        <OperatorInputRangeControls
          totalQuantity={totalQuantity}
          captureMode={captureMode}
          setCaptureMode={setCaptureMode}
          rangeFrom={rangeFrom}
          setRangeFrom={setRangeFrom}
          rangeTo={rangeTo}
          setRangeTo={setRangeTo}
          isRangeValid={isRangeValid}
          rangeStartQty={rangeStartQty}
          rangeEndQty={rangeEndQty}
          isRangeApproved={isRangeApproved}
          setIsRangeApproved={setIsRangeApproved}
          qaCounts={qaCounts}
          onShowToast={onShowToast}
        />
      )}

      <OperatorQaSelectionStrip
        allQuantityNumbers={allQuantityNumbers}
        getStatus={getStatus}
        selectableQuantityNumbers={selectableQuantityNumbers}
        selectedQaQuantities={selectedQaQuantities}
        setSelectedQaQuantities={setSelectedQaQuantities}
        sendEligible={sendEligible}
        onSendToQa={onSendToQa}
        cutId={cutId}
      />

      {displayQuantities.map((qtyData, qtyIndex) => {
        if (isRangeMode && qtyIndex !== activeRangeSourceIndex) return null;
        return (
          <OperatorQuantityCard
            key={qtyIndex}
            qtyData={qtyData}
            qtyIndex={qtyIndex}
            cutId={cutId}
            isRangeMode={isRangeMode}
            isRangeValid={isRangeValid}
            rangeStartQty={rangeStartQty}
            rangeEndQty={rangeEndQty}
            isRangeApproved={isRangeApproved}
            getStatus={getStatus}
            operatorUsers={operatorUsers}
            machineOptions={machineOptions}
            canEditAssignments={canEditAssignments}
            canOperateInputs={canOperateInputs}
            onInputChange={onInputChange}
            onShowToast={onShowToast}
            onStartTimeCaptured={onStartTimeCaptured}
            validationErrors={validationErrors[qtyIndex] || {}}
            requiredHoursPerQuantity={requiredHoursPerQuantity}
            onRequestResetTimer={onRequestResetTimer}
            onRequestShiftOver={onRequestShiftOver}
            onRequestResume={onRequestResume}
            onRequestEndTimeCapture={onRequestEndTimeCapture}
            onSaveQuantity={onSaveQuantity}
            onSaveRange={onSaveRange}
            savedRanges={savedRanges}
            canReset={isAdmin}
          />
        );
      })}
    </div>
  );
};

export default OperatorInputSection;
