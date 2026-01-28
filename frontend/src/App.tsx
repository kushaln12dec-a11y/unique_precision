import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login page/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Programmer from "./pages/Programmer/Programmer";
import Operator from "./pages/Operator/Operator";
import OperatorViewPage from "./pages/Operator/OperatorViewPage.tsx";
import QC from "./pages/QC/QC";
import Inventory from "./pages/Inventory/Inventory";
import UserManagement from "./pages/User Management/UserManagement";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
