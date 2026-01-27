import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import DataTable, { type Column } from "../../components/DataTable";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import { formatDateValue } from "../../utils/date";
import "./OperatorViewPage.css";

type JobView = {
  id: number;
  customer: string;
  rate: string;
  cut: string;
  thickness: string;
  passLevel: string;
  setting: string;
  qty: string;
  createdAt: string;
  createdBy: string;
  assignedTo: string;
  totalHrs: number;
  totalAmount: number;
};

const OperatorViewPage = () => {
  const navigate = useNavigate();
  const hardcodedJobs: JobView[] = [
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

  const columns: Column<JobView>[] = [
    {
      key: "customer",
      label: "Customer",
      sortable: false,
      render: (job) => job.customer,
    },
    {
      key: "rate",
      label: "Rate",
      sortable: false,
      render: (job) => `₹${Number(job.rate).toFixed(2)}`,
    },
    {
      key: "cut",
      label: "Cut (mm)",
      sortable: false,
      render: (job) => Number(job.cut).toFixed(2),
    },
    {
      key: "thickness",
      label: "Thickness (mm)",
      sortable: false,
      render: (job) => Number(job.thickness).toFixed(2),
    },
    {
      key: "passLevel",
      label: "Pass",
      sortable: false,
      render: (job) => job.passLevel,
    },
    {
      key: "setting",
      label: "Setting",
      sortable: false,
      render: (job) => job.setting,
    },
    {
      key: "qty",
      label: "Qty",
      sortable: false,
      render: (job) => job.qty,
    },
    {
      key: "createdAt",
      label: "Created At",
      sortable: false,
      render: (job) => formatDateValue(job.createdAt),
    },
    {
      key: "createdBy",
      label: "Created By",
      sortable: false,
      render: (job) => job.createdBy,
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      sortable: false,
      render: (job) => job.assignedTo,
    },
    {
      key: "totalHrs",
      label: "Total Hrs/Piece",
      sortable: false,
      render: (job) => job.totalHrs.toFixed(3),
    },
    {
      key: "totalAmount",
      label: "Total Amount (₹)",
      sortable: false,
      render: (job) => `₹${job.totalAmount.toFixed(2)}`,
    },
  ];

  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator View" />
        <div className="programmer-panel operator-viewpage-panel">
          <DataTable
            columns={columns}
            data={hardcodedJobs}
            emptyMessage="No jobs assigned"
            getRowKey={(job) => job.id}
            className="jobs-table-wrapper"
          />

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
