import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/button";

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminLogin() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("admin@tagflow.local");
  const [password, setPassword] = useState("admin123");

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
    },
    onSuccess: (data) => {
      setAuth("authenticated", data.user);
      navigate("/admin/pdv", { replace: true });
    }
  });

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/admin/pdv", { replace: true });
    }
  }, [status, navigate]);

  if (status === "authenticated") {
    return <Navigate to="/admin/pdv" replace />;
  }

  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-10 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-orange-500/25 blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-rose-500/20 blur-[140px]" />
      </div>
      <div className="w-full max-w-md space-y-5 rounded-[28px] border border-white/10 bg-[#120f0d] p-6 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
        <header className="space-y-2 text-center">
          <img src="/logo-tagflow.png" alt="Tagflow" className="mx-auto h-14 w-auto" />
          <p className="text-xs uppercase tracking-[0.3em] text-orange-200">Acesso</p>
          <h2 className="text-2xl font-semibold">Entrar no painel</h2>
          <p className="text-sm text-orange-100/70">Use seu email e senha.</p>
        </header>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-orange-200/80">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-orange-100/40 focus:border-orange-400/60 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-orange-200/80">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-orange-100/40 focus:border-orange-400/60 focus:outline-none"
            />
          </div>
          <Button className="w-full bg-orange-500 text-slate-950 hover:bg-orange-400" onClick={() => loginMutation.mutate()}>
            {loginMutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
          {loginMutation.isError ? <p className="text-sm text-rose-300">Falha no login</p> : null}
          <p className="text-center text-xs text-orange-100/60">
            Precisa de ajuda? <a className="text-orange-200 hover:text-orange-100" href="mailto:contato@tagflow.app">Fale com a equipe</a>
          </p>
        </div>
      </div>
    </section>
  );
}
