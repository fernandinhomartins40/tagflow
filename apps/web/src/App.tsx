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
import { AdminTabs } from "./pages/admin/AdminTabs";
import { AdminIdentifiers } from "./pages/admin/AdminIdentifiers";
import { AdminCash } from "./pages/admin/AdminCash";
import { PublicBalance } from "./pages/public/PublicBalance";
import { PublicHistory } from "./pages/public/PublicHistory";
import { AppShell } from "./components/AppShell";
import { useAuthStore } from "./store/auth";
import { MarketingLanding } from "./pages/MarketingLanding";

export default function App() {
  const status = useAuthStore((state) => state.status);

  return (
    <Routes>
      <Route path="/" element={<MarketingLanding />} />
      <Route element={<AppShell />}>
        <Route
          path="/login"
          element={status === "authenticated" ? <Navigate to="/admin/pdv" replace /> : status === "unknown" ? <AuthLoading /> : <AdminLogin />}
        />
        <Route path="/app" element={<RequireAuth status={status}><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/customers" element={<RequireAuth status={status}><AdminCustomers /></RequireAuth>} />
        <Route path="/admin/pdv" element={<RequireAuth status={status}><AdminPdv /></RequireAuth>} />
        <Route path="/admin/products" element={<RequireAuth status={status}><AdminProducts /></RequireAuth>} />
        <Route path="/admin/services" element={<RequireAuth status={status}><AdminServices /></RequireAuth>} />
        <Route path="/admin/locations" element={<RequireAuth status={status}><AdminLocations /></RequireAuth>} />
        <Route path="/admin/bookings" element={<RequireAuth status={status}><AdminBookings /></RequireAuth>} />
        <Route path="/admin/reports" element={<RequireAuth status={status}><AdminReports /></RequireAuth>} />
        <Route path="/admin/branches" element={<RequireAuth status={status}><AdminBranches /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth status={status}><AdminUsers /></RequireAuth>} />
        <Route path="/admin/tabs" element={<RequireAuth status={status}><AdminTabs /></RequireAuth>} />
        <Route path="/admin/identifiers" element={<RequireAuth status={status}><AdminIdentifiers /></RequireAuth>} />
        <Route path="/admin/cash" element={<RequireAuth status={status}><AdminCash /></RequireAuth>} />
        <Route path="/public/balance" element={<PublicBalance />} />
        <Route path="/public/history" element={<PublicHistory />} />
      </Route>
    </Routes>
  );
}

function RequireAuth({ status, children }: { status: "unknown" | "authenticated" | "unauthenticated"; children: JSX.Element }) {
  if (status === "unknown") {
    return <AuthLoading />;
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AuthLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      Carregando...
    </div>
  );
}
