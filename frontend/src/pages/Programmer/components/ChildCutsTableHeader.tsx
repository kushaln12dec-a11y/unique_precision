import type { JobEntry } from "../../../types/job";

type ChildCutsTableHeaderProps = {
  entries: JobEntry[];
  showCheckboxes: boolean;
  showSetNumberColumn: boolean;
  selectedInThisTableCount: number;
  onToggleAll: (selected: boolean) => void;
  isOperator: boolean;
  isAdmin: boolean;
};

const ChildCutsTableHeader = ({
  entries,
  showCheckboxes,
  showSetNumberColumn,
  selectedInThisTableCount,
  onToggleAll,
  isOperator,
  isAdmin,
}: ChildCutsTableHeaderProps) => (
  <thead>
    <tr className="child-table-header">
      {showCheckboxes ? (
        <th className="checkbox-header-cell" style={{ width: "40px" }}>
          <input
            type="checkbox"
            checked={selectedInThisTableCount > 0 && selectedInThisTableCount === entries.length && entries.length > 0}
            onChange={(e) => onToggleAll(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      ) : (
        <th className="child-table-spacer checkbox-spacer"></th>
      )}
      {showSetNumberColumn && <th className="setting-number-col" aria-label="serial number"></th>}
      <th className="customer-col"><span className="th-content">Customer</span></th>
      <th className="program-ref-file-col"><span className="th-content">Program Ref<br />File Name</span></th>
      <th className="description-col"><span className="th-content">Desc</span></th>
      <th className="cut-col"><span className="th-content">Cut (MM)</span></th>
      <th className="th-col"><span className="th-content">TH (MM)</span></th>
      <th className="pass-col"><span className="th-content">Pass</span></th>
      <th className="setting-col"><span className="th-content">Set</span></th>
      <th className="qty-col"><span className="th-content">Qty</span></th>
      <th className="sedm-col">SEDM</th>
      {isOperator && <th className="assigned-col">Operator</th>}
      {isOperator && <th className="mach-col">Mach #</th>}
      {!isOperator && <th className="total-hrs-col"><span className="th-content">Cut Length<br />Hrs</span></th>}
      <th className="estimated-time-col"><span className="th-content">Estimated<br />Time</span></th>
      {isAdmin && <th className="total-amount-col"><span className="th-content">Amount</span></th>}
      {isOperator && <th className="status-col">Status</th>}
      <th className="act-col">Action</th>
    </tr>
  </thead>
);

export default ChildCutsTableHeader;
