import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLoader from "./components/AppLoader";
import ProtectedRoute from "./components/ProtectedRoute";

const Login = lazy(() => import("./pages/Login page/Login"));
const SharedDashboard = lazy(() => import("./pages/Dashboard/SharedDashboard"));
const OperatorDashboard = lazy(() => import("./pages/OperatorDashboard/OperatorDashboard"));
const Programmer = lazy(() => import("./pages/Programmer/Programmer"));
const Operator = lazy(() => import("./pages/Operator/Operator"));
const OperatorViewPage = lazy(() => import("./pages/Operator/OperatorViewPage.tsx"));
const QC = lazy(() => import("./pages/QC/QC"));
const InspectionReportPage = lazy(() => import("./pages/QC/InspectionReportPage"));
const Inventory = lazy(() => import("./pages/Inventory/Inventory"));
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
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer"
        element={
          <ProtectedRoute>
            <Programmer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/newjob"
        element={
          <ProtectedRoute>
            <Programmer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/clone/:groupId"
        element={
          <ProtectedRoute>
            <Programmer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/programmer/edit/:groupId"
        element={
          <ProtectedRoute>
            <Programmer />
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
