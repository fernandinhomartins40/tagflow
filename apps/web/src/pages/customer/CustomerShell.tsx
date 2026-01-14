import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { customerApiFetch } from "../../services/customerApi";
import { useCustomerAuthStore } from "../../store/customerAuth";

export function CustomerShell() {
  const status = useCustomerAuthStore((state) => state.status);
  const customer = useCustomerAuthStore((state) => state.customer);
  const setAuth = useCustomerAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== "unknown") return;
    customerApiFetch<{ customer: { id: string; name: string; cpf: string; phone: string } }>("/api/customer/auth/me")
      .then((data) => setAuth("authenticated", data.customer))
      .catch(() => setAuth("unauthenticated"));
  }, [status, setAuth]);

  const handleLogout = async () => {
    await customerApiFetch("/api/customer/auth/logout", { method: "POST" }).catch(() => null);
    setAuth("unauthenticated");
    navigate("/cliente/login", { replace: true });
  };

  if (status === "unknown") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/cliente/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#120f0d] dark:text-neutral-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-[#2a2420] dark:bg-[#1b1613]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-neutral-400">Tagflow</p>
            <p className="text-sm font-semibold">{customer?.name ?? "Cliente"}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
