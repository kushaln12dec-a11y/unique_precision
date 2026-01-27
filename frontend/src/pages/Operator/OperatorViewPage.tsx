import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import { formatDateValue } from "../../utils/date";
import "./OperatorViewPage.css";

const OperatorViewPage = () => {
  const navigate = useNavigate();
  const hardcodedJobs = [
    {
      id: 1,
      customer: "UPC002",
      rate: "1.00",
      cut: "1.00",
      thickness: "1.00",
      passLevel: "1",
      setting: "1",
      qty: "1",
      createdAt: "25 Jan 2026",
      createdBy: "User",
      assignedTo: "Operator 1",
      totalHrs: 0.501,
      totalAmount: 0.5,
    },
  ];

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator View" />
        <div className="programmer-panel operator-viewpage-panel">
          <div className="jobs-table-wrapper">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>
                    <span className="th-content">Customer</span>
                  </th>
                  <th>
                    <span className="th-content">Rate</span>
                  </th>
                  <th>
                    <span className="th-content">Cut (mm)</span>
                  </th>
                  <th>
                    <span className="th-content">Thickness (mm)</span>
                  </th>
                  <th>
                    <span className="th-content">Pass</span>
                  </th>
                  <th>
                    <span className="th-content">Setting</span>
                  </th>
                  <th>
                    <span className="th-content">Qty</span>
                  </th>
                  <th>
                    <span className="th-content">Created At</span>
                  </th>
                  <th>
                    <span className="th-content">Created By</span>
                  </th>
                  <th>
                    <span className="th-content">Assigned To</span>
                  </th>
                  <th>
                    <span className="th-content">Total Hrs/Piece</span>
                  </th>
                  <th>
                    <span className="th-content">Total Amount (₹)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hardcodedJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.customer}</td>
                    <td>₹{Number(job.rate).toFixed(2)}</td>
                    <td>{Number(job.cut).toFixed(2)}</td>
                    <td>{Number(job.thickness).toFixed(2)}</td>
                    <td>{job.passLevel}</td>
                    <td>{job.setting}</td>
                    <td>{job.qty}</td>
                    <td>{formatDateValue(job.createdAt)}</td>
                    <td>{job.createdBy}</td>
                    <td>{job.assignedTo}</td>
                    <td>{job.totalHrs.toFixed(3)}</td>
                    <td>₹{job.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="viewpage-fields">
            <div className="input-pair">
              <label>Start Time</label>
              <input type="text" />
            </div>
            <div className="input-pair">
              <label>End Time</label>
              <input type="text" />
            </div>
            <div className="input-pair">
              <label>Machine Hrs</label>
              <input type="text" />
            </div>
            <div className="input-pair">
              <label>Machine Number</label>
              <input type="text" />
            </div>
            <div className="input-pair">
              <label>Ops Name</label>
              <input type="text" />
            </div>
            <div className="input-pair">
              <label>Idle Time</label>
              <select defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option value="Power Break">Power Break</option>
                <option value="Machine Breakdown">Machine Breakdown</option>
                <option value="Vertical Dial">Vertical Dial</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Consumables Change">Consumables Change</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorViewPage;
