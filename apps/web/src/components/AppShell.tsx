import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useTenantStore } from "../store/tenant";
import { useAuthStore } from "../store/auth";

const adminItems = [
  { label: "Dashboard", to: "/" },
  { label: "Clientes", to: "/admin/customers" },
  { label: "PDV", to: "/admin/pdv" },
  { label: "Produtos", to: "/admin/products" },
  { label: "Servicos", to: "/admin/services" },
  { label: "Locais", to: "/admin/locations" },
  { label: "Reservas", to: "/admin/bookings" },
  { label: "Relatorios", to: "/admin/reports" },
  { label: "Filiais", to: "/admin/branches" },
  { label: "Usuarios", to: "/admin/users" }
];

const publicItems = [
  { label: "Saldo", to: "/public/balance" },
  { label: "Historico", to: "/public/history" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const tenantId = useTenantStore((state) => state.tenantId);
  const { token, setAuth } = useAuthStore();

  const navItems = token ? adminItems : [];
  const bottomItems = token ? adminItems.slice(0, 4) : publicItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100">
      <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-500">Tagflow</p>
            <h1 className="text-lg font-semibold">Gestao Inteligente</h1>
            <p className="text-xs text-slate-500">Tenant: {tenantId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Button key={item.to} asChild variant={location.pathname === item.to ? "default" : "ghost"}>
                <Link to={item.to}>{item.label}</Link>
              </Button>
            ))}
            {token ? (
              <Button variant="outline" onClick={() => setAuth(null, null)}>
                Sair
              </Button>
            ) : (
              <Button asChild variant={location.pathname === "/login" ? "default" : "outline"}>
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-white/90 p-2 shadow-lg md:hidden">
        {bottomItems.map((item) => (
          <Button key={item.to} asChild size="sm" variant={location.pathname === item.to ? "default" : "ghost"}>
            <Link to={item.to}>{item.label}</Link>
          </Button>
        ))}
      </nav>
    </div>
  );
}
