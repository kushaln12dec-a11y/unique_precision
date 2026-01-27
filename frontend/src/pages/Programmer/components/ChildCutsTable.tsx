import type { JobEntry } from "../../../types/job";

type ChildCutsTableProps = {
  entries: JobEntry[];
};

const ChildCutsTable: React.FC<ChildCutsTableProps> = ({ entries }) => {
  return (
    <table className="child-jobs-table">
      <thead>
        <tr>
          <th>Cut #</th>
          <th>Customer</th>
          <th>Rate (₹/hr)</th>
          <th>Cut (mm)</th>
          <th>Thickness (mm)</th>
          <th>Pass</th>
          <th>Setting</th>
          <th>Qty</th>
          <th>SEDM</th>
          <th>Critical</th>
          <th>PIP Finish</th>
          <th>Total Hrs/Piece</th>
          <th>Total Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={entry.id}>
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
              {entry.totalHrs ? entry.totalHrs.toFixed(3) : "—"}
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
