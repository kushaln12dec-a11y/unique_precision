import type { DamageField, YesNo } from "../inspectionReportUtils";

const DamageRow = ({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: DamageField;
  value: YesNo;
  onChange: (field: DamageField, value: YesNo) => void;
}) => (
  <div className="qc-report-damage-row">
    <span>{label}</span>
    <label>
      <input type="radio" checked={value === "YES"} onChange={() => onChange(field, "YES")} />
      Yes
    </label>
    <label>
      <input type="radio" checked={value === "NO"} onChange={() => onChange(field, "NO")} />
      No
    </label>
    <button type="button" className="qc-report-clear-toggle" onClick={() => onChange(field, "")}>
      Clear
    </button>
  </div>
);

const InspectionReportDamageChecks = ({
  workPieceDamage,
  rightAngleProblem,
  materialProblem,
  onChange,
}: {
  workPieceDamage: YesNo;
  rightAngleProblem: YesNo;
  materialProblem: YesNo;
  onChange: (field: DamageField, value: YesNo) => void;
}) => (
  <div className="qc-report-damage">
    <h4>Damage Checks</h4>
    <DamageRow label="Work Piece Damage" field="workPieceDamage" value={workPieceDamage} onChange={onChange} />
    <DamageRow label="Any Right Angle Problem" field="rightAngleProblem" value={rightAngleProblem} onChange={onChange} />
    <DamageRow label="Any Material Problem" field="materialProblem" value={materialProblem} onChange={onChange} />
  </div>
);

export default InspectionReportDamageChecks;
