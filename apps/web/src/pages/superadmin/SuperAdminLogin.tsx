import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../hooks/useTheme";

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("superadmin@tagflow.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === "dark" ? "/logo-tagflow.png" : "/logo-tagflow-black.png";

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
    },
    onSuccess: async (data) => {
      setError(null);
      setAuth("authenticated", data.user);
      if (data.user.role !== "super_admin") {
        await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        setAuth("unauthenticated");
        setError("Este usuario nao possui acesso ao super admin.");
        return;
      }
      navigate("/superadmin", { replace: true });
    },
    onError: () => {
      setError("Falha no login.");
    }
  });

  useEffect(() => {
    if (status === "authenticated" && user?.role === "super_admin") {
      navigate("/superadmin", { replace: true });
    }
  }, [status, user?.role, navigate]);

  if (status === "authenticated" && user?.role === "super_admin") {
    return <Navigate to="/superadmin" replace />;
  }

  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-10 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-slate-500/20 blur-[120px] dark:bg-slate-500/20" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-emerald-500/20 blur-[140px] dark:bg-emerald-500/20" />
      </div>
      <div className="w-full max-w-md space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0f1115] dark:text-slate-100 dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="space-y-2 text-center">
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="h-9 w-9 rounded-full p-0"
              onClick={toggleTheme}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <img src={logoSrc} alt="Tagflow" className="mx-auto h-14 w-auto" />
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Super admin</p>
          <h2 className="text-2xl font-semibold">Entrar no painel</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Use seu email e senha.</p>
        </header>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/60 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/60 focus:outline-none dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-400" onClick={() => loginMutation.mutate()}>
            {loginMutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
          {error ? <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
