import { Link, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { useAuthStore } from "../store/auth";
import { useTenantStore } from "../store/tenant";
import { getApiBaseUrl } from "../services/config";
import { useTheme } from "../hooks/useTheme";

const adminSections = [
  {
    title: "Operacao",
    items: [
      { label: "Dashboard", to: "/app" },
      { label: "Vendas (PDV)", to: "/admin/pdv" },
      { label: "Comandas", to: "/admin/tabs" },
      { label: "Caixa", to: "/admin/cash" },
      { label: "Reservas", to: "/admin/bookings" },
      { label: "Relatorios", to: "/admin/reports" }
    ]
  },
  {
    title: "Cadastros",
    items: [
      { label: "Clientes", to: "/admin/customers" },
      { label: "Identificadores", to: "/admin/identifiers" },
      { label: "Produtos", to: "/admin/products" },
      { label: "Servicos", to: "/admin/services" },
      { label: "Locais", to: "/admin/locations" }
    ]
  },
  {
    title: "Administracao",
    items: [
      { label: "Filiais", to: "/admin/branches" },
      { label: "Usuarios", to: "/admin/users" },
      { label: "Assinaturas", to: "/admin/subscriptions" }
    ]
  }
];

const mobileNav = [
  { label: "Inicio", to: "/app", icon: HomeIcon },
  { label: "Clientes", to: "/admin/customers", icon: UsersIcon },
  { label: "Vendas", to: "/admin/pdv", icon: CashIcon, primary: true },
  { label: "Comandas", to: "/admin/tabs", icon: CalendarIcon },
  { label: "Mais", action: "more", icon: GridIcon }
];

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-orange-400 dark:text-orange-300" : "text-slate-500 dark:text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function UsersIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-orange-400 dark:text-orange-300" : "text-slate-500 dark:text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M16 19.5v-1.2a3.3 3.3 0 0 0-3.3-3.3H7.3A3.3 3.3 0 0 0 4 18.3v1.2" />
      <circle cx="10" cy="7.5" r="3.2" />
      <path d="M20 19.5v-1a2.7 2.7 0 0 0-2.1-2.6" />
      <path d="M16.8 4.7a2.8 2.8 0 1 1 0 5.6" />
    </svg>
  );
}

function CashIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${active ? "text-white" : "text-white"}`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M7 9.5h0M17 14.5h0" />
    </svg>
  );
}

function CalendarIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-orange-400 dark:text-orange-300" : "text-slate-500 dark:text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.8v3M16 3.8v3M3.5 10h17" />
    </svg>
  );
}

function GridIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-orange-400 dark:text-orange-300" : "text-slate-500 dark:text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.3" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.3" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.3" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.3" />
    </svg>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, setAuth } = useAuthStore();
  const setTenantId = useTenantStore((state) => state.setTenantId);
  const tenantId = useTenantStore((state) => state.tenantId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthenticated = status === "authenticated";
  const { theme } = useTheme();

  const activePath = location.pathname;

  const apiBaseUrl = getApiBaseUrl();
  const logoSrc = theme === "dark" ? "/logo-tagflow.png" : "/logo-tagflow-black.png";

  useEffect(() => {
    if (status !== "unknown") return;
    let active = true;
    const headers = tenantId ? { "X-Tenant-Id": tenantId } : undefined;
    fetch(`${apiBaseUrl}/api/auth/me`, {
      headers,
      credentials: "include"
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.user) {
          if (data.user.companyId) {
            setTenantId(data.user.companyId);
          }
          setAuth("authenticated", data.user);
        } else {
          setAuth("unauthenticated");
        }
      })
      .catch(() => {
        if (active) setAuth("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, [status, tenantId, setAuth, apiBaseUrl, setTenantId]);

  useEffect(() => {
    if (isAuthenticated && location.pathname === "/login") {
      navigate("/admin/pdv", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const handleLogout = async () => {
    const headers = tenantId ? { "X-Tenant-Id": tenantId } : undefined;
    await fetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      headers,
      credentials: "include"
    }).catch(() => null);
    setAuth("unauthenticated");
    navigate("/login", { replace: true });
  };

  if (isAuthenticated && location.pathname === "/login") {
    return <Navigate to="/admin/pdv" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#120f0d] dark:text-neutral-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-[#2a2420] dark:bg-[#1b1613]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Tagflow" className="h-10 w-auto" />
            <span className="hidden text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 md:inline">Painel</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggleButton />
            {isAuthenticated ? (
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            ) : (
              <Button asChild variant={activePath === "/login" ? "default" : "outline"}>
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {isAuthenticated ? (
          <aside className="hidden max-h-[calc(100vh-140px)] w-64 flex-shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2a2420] dark:bg-[#1b1613] md:flex md:flex-col md:gap-6">
            {adminSections.map((section) => (
              <div key={section.title}>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{section.title}</p>
                <div className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                        activePath === item.to
                          ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.label}
                      <span className="text-xs text-slate-400 dark:text-slate-500">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        ) : null}

        <main className="min-h-[70vh] flex-1 rounded-2xl border border-slate-200 bg-white p-4 pb-28 shadow-sm dark:border-[#2a2420] dark:bg-[#1b1613] sm:p-6 sm:pb-6">
          <Outlet />
        </main>
      </div>

      {isAuthenticated ? (
        <nav className="fixed bottom-3 left-1/2 z-30 w-[92%] -translate-x-1/2 rounded-[24px] border border-slate-200 bg-white/95 px-4 py-2 shadow-lg backdrop-blur dark:border-[#2a2420] dark:bg-[#1b1613]/95 md:hidden">
          <div className="grid grid-cols-5 items-center gap-2">
            {mobileNav.map((item) => {
              const isActive = item.to ? activePath === item.to : false;
              const Icon = item.icon;
              if (item.action === "more") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="flex flex-col items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                  >
                    <Icon active={sidebarOpen} />
                    <span>Mais</span>
                  </button>
                );
              }

              if (item.primary) {
                return (
                  <Link key={item.label} to={item.to} className="flex flex-col items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 shadow-lg">
                      <Icon active />
                    </span>
                    <span className="text-slate-600 dark:text-slate-200">Vendas</span>
                  </Link>
                );
              }

              return (
                <Link key={item.label} to={item.to} className="flex flex-col items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Icon active={isActive} />
                  <span className={isActive ? "text-orange-600 dark:text-orange-300" : undefined}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {isAuthenticated ? (
        <div className={`${sidebarOpen ? "pointer-events-auto" : "pointer-events-none"} fixed inset-0 z-40 md:hidden`}>
          <div
            className={`absolute inset-0 bg-black/40 transition ${sidebarOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className={`absolute right-0 top-0 h-full w-72 overflow-y-auto bg-white p-5 shadow-2xl transition dark:bg-[#1b1613] ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between">
              <img src={logoSrc} alt="Tagflow" className="h-8 w-auto" />
              <button className="text-sm text-slate-500 dark:text-slate-400" onClick={() => setSidebarOpen(false)}>
                Fechar
              </button>
            </div>
            <div className="mt-6 space-y-6">
              {adminSections.map((section) => (
                <div key={section.title}>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{section.title}</p>
                  <div className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                          activePath === item.to
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
                            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        {item.label}
                        <span className="text-xs text-slate-400 dark:text-slate-500">›</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
