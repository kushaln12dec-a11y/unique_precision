import type { JobEntry } from "../../../types/job";
import { formatHoursToHHMM } from "../../../utils/date";

type ChildCutsTableProps = {
  entries: JobEntry[];
};

const ChildCutsTable: React.FC<ChildCutsTableProps> = ({ entries }) => {
  const getRowClassName = (entry: JobEntry): string => {
    const classes = ["child-row"];
    if (entry.critical) {
      classes.push("child-critical-row");
    } else if (entry.priority) {
      classes.push(`child-priority-row child-priority-${entry.priority.toLowerCase()}`);
    }
    return classes.join(" ");
  };

  return (
    <table className="child-jobs-table">
      <thead>
        <tr className="child-table-header">
          <th>Cut #</th>
          <th>Customer</th>
          <th>Rate (₹/hr)</th>
          <th>Cut (mm)</th>
          <th>Thickness (mm)</th>
          <th>Pass</th>
          <th>Setting</th>
          <th>Qty</th>
          <th>SEDM</th>
          <th>Complex</th>
          <th>PIP Finish</th>
          <th>Total Hrs/Piece</th>
          <th>Total Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={entry.id} className={getRowClassName(entry)}>
            <td>{index + 1}</td>
            <td>{entry.customer || "—"}</td>
            <td>₹{Number(entry.rate || 0).toFixed(2)}</td>
            <td>{Number(entry.cut || 0).toFixed(2)}</td>
            <td>{Number(entry.thickness || 0).toFixed(2)}</td>
            <td>{entry.passLevel}</td>
            <td>{entry.setting}</td>
            <td>{Number(entry.qty || 0).toString()}</td>
            <td>{entry.sedm}</td>
            <td>{entry.critical ? "Yes" : "No"}</td>
            <td>{entry.pipFinish ? "Yes" : "No"}</td>
            <td>
              {entry.totalHrs ? formatHoursToHHMM(entry.totalHrs) : "—"}
            </td>
            <td>
              {entry.totalAmount ? `₹${entry.totalAmount.toFixed(2)}` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ChildCutsTable;
