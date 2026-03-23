import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login page/Login";
import SharedDashboard from "./pages/Dashboard/SharedDashboard";
import OperatorDashboard from "./pages/OperatorDashboard/OperatorDashboard";
import Programmer from "./pages/Programmer/Programmer";
import Operator from "./pages/Operator/Operator";
import OperatorViewPage from "./pages/Operator/OperatorViewPage.tsx";
import QC from "./pages/QC/QC";
import InspectionReportPage from "./pages/QC/InspectionReportPage";
import Inventory from "./pages/Inventory/Inventory";
import UserManagement from "./pages/User Management/UserManagement";
import EmployeeLogs from "./pages/EmployeeLogs/EmployeeLogs";
import AdminConsole from "./pages/AdminConsole/AdminConsole";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={`${location.pathname}${location.search}`}>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <SharedDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operator-dashboard"
        element={
          <ProtectedRoute>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer"
        element={
          <ProtectedRoute>
            <Programmer key="programmer-list" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/newjob"
        element={
          <ProtectedRoute>
            <Programmer key="programmer-newjob" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/clone/:groupId"
        element={
          <ProtectedRoute>
            <Programmer key="programmer-clone" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/edit/:groupId"
        element={
          <ProtectedRoute>
            <Programmer key="programmer-edit" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operator"
        element={
          <ProtectedRoute>
            <Operator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operator/viewpage"
        element={
          <ProtectedRoute>
            <OperatorViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qc"
        element={
          <ProtectedRoute>
            <QC />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qc/inspection-report"
        element={
          <ProtectedRoute>
            <InspectionReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-logs"
        element={
          <ProtectedRoute>
            <EmployeeLogs />
          </ProtectedRoute>
        }
      />
      <Route path="/employee-logs" element={<Navigate to="/job-logs" replace />} />
      <Route
        path="/admin-console"
        element={
          <ProtectedRoute>
            <AdminConsole />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
