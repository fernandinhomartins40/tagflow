import { Route, Routes, Navigate } from "react-router-dom";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminCustomers } from "./pages/admin/AdminCustomers";
import { AdminPdv } from "./pages/admin/AdminPdv";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminProducts } from "./pages/admin/AdminProducts";
import { AdminServices } from "./pages/admin/AdminServices";
import { AdminLocations } from "./pages/admin/AdminLocations";
import { AdminBookings } from "./pages/admin/AdminBookings";
import { AdminReports } from "./pages/admin/AdminReports";
import { AdminBranches } from "./pages/admin/AdminBranches";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { PublicBalance } from "./pages/public/PublicBalance";
import { PublicHistory } from "./pages/public/PublicHistory";
import { AppShell } from "./components/AppShell";
import { useAuthStore } from "./store/auth";

export default function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <AppShell>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/" element={token ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/customers" element={token ? <AdminCustomers /> : <Navigate to="/login" replace />} />
        <Route path="/admin/pdv" element={token ? <AdminPdv /> : <Navigate to="/login" replace />} />
        <Route path="/admin/products" element={token ? <AdminProducts /> : <Navigate to="/login" replace />} />
        <Route path="/admin/services" element={token ? <AdminServices /> : <Navigate to="/login" replace />} />
        <Route path="/admin/locations" element={token ? <AdminLocations /> : <Navigate to="/login" replace />} />
        <Route path="/admin/bookings" element={token ? <AdminBookings /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports" element={token ? <AdminReports /> : <Navigate to="/login" replace />} />
        <Route path="/admin/branches" element={token ? <AdminBranches /> : <Navigate to="/login" replace />} />
        <Route path="/admin/users" element={token ? <AdminUsers /> : <Navigate to="/login" replace />} />
        <Route path="/public/balance" element={<PublicBalance />} />
        <Route path="/public/history" element={<PublicHistory />} />
      </Routes>
    </AppShell>
  );
}
