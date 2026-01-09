import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { AdminSuperAdmin } from "../pages/admin/AdminSuperAdmin";
import { useAuthStore } from "../store/auth";
import { useTenantStore } from "../store/tenant";
import { getApiBaseUrl } from "../services/config";

export function SuperAdminShell() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const tenantId = useTenantStore((state) => state.tenantId);
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  if (!user) {
    return <Navigate to="/superadmin/login" replace />;
  }

  if (user.role !== "super_admin") {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Acesso restrito ao super admin.
      </div>
    );
  }

  const handleLogout = async () => {
    await fetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { "X-Tenant-Id": tenantId },
      credentials: "include"
    }).catch(() => null);
    setAuth("unauthenticated");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/logo-tagflow.png" alt="Tagflow" className="h-10 w-auto" />
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Super admin</span>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <AdminSuperAdmin />
        </div>
      </main>
    </div>
  );
}
