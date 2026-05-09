import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLoader from "./components/AppLoader";
import ProtectedRoute from "./components/ProtectedRoute";

const Login = lazy(() => import("./pages/Login page/Login"));
const SharedDashboard = lazy(() => import("./pages/Dashboard/SharedDashboard"));
const OperatorDashboardWrapper = lazy(() => import("./pages/OperatorDashboard/OperatorDashboard"));
const ProgrammerDashboard = lazy(() => import("./pages/Programmer/ProgrammerDashboardPage"));
const OperatorJobList = lazy(() => import("./pages/Operator/OperatorJobListPage"));
const OperatorJobDetail = lazy(() => import("./pages/Operator/OperatorJobDetailPage"));
const QualityControl = lazy(() => import("./pages/QC/QualityControlPage"));
const InspectionReportPage = lazy(() => import("./pages/QC/InspectionReportPage"));
const InventoryPage = lazy(() => import("./pages/Inventory/InventoryPage"));
const UserManagement = lazy(() => import("./pages/User Management/UserManagement"));
const EmployeeLogs = lazy(() => import("./pages/EmployeeLogs/EmployeeLogs"));
const AdminConsole = lazy(() => import("./pages/AdminConsole/AdminConsole"));

function AppRoutes() {
  return (
    <Suspense fallback={<AppLoader message="Loading page..." />}>
      <Routes>
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
            <OperatorDashboardWrapper />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/*"
        element={
          <ProtectedRoute>
            <ProgrammerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operator"
        element={
          <ProtectedRoute>
            <OperatorJobList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operator/viewpage"
        element={
          <ProtectedRoute>
            <OperatorJobDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qc"
        element={
          <ProtectedRoute>
            <QualityControl />
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
            <InventoryPage />
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
        path="/jobLogs"
        element={
          <ProtectedRoute>
            <EmployeeLogs />
          </ProtectedRoute>
        }
      />
      <Route path="/job-logs" element={<Navigate to="/jobLogs" replace />} />
      <Route path="/employee-logs" element={<Navigate to="/jobLogs" replace />} />
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
    </Suspense>
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
