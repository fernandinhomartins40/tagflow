import { Navigate, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { AdminSuperAdmin } from "../pages/admin/AdminSuperAdmin";
import { useAuthStore } from "../store/auth";
import { useTenantStore } from "../store/tenant";
import { getApiBaseUrl } from "../services/config";
import { useTheme } from "../hooks/useTheme";

export function SuperAdminShell() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const tenantId = useTenantStore((state) => state.tenantId);
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === "dark" ? "/logo-tagflow.png" : "/logo-tagflow-black.png";

  if (!user) {
    return <Navigate to="/superadmin/login" replace />;
  }

  if (user.role !== "super_admin") {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Tagflow" className="h-10 w-auto" />
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Super admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-9 w-9 rounded-full p-0 text-slate-800 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
              onClick={toggleTheme}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? (
                <Sun size={20} stroke="#fde68a" strokeWidth={2} />
              ) : (
                <Moon size={20} stroke="#f97316" strokeWidth={2} />
              )}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <AdminSuperAdmin />
        </div>
      </main>
    </div>
  );
}
