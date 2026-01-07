import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { Button } from "../../components/ui/button";

interface LoginResponse {
  token: string;
  refreshToken: string;
}

export function AdminLogin() {
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
      setAuth(data.token, data.refreshToken);
    }
  });

  return (
    <section className="mx-auto max-w-md space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Acesso administrativo</h2>
        <p className="text-sm text-slate-600">Entre para gerenciar sua operacao.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
        <label className="text-xs uppercase tracking-[0.2em] text-brand-400">Email</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <label className="mt-4 block text-xs uppercase tracking-[0.2em] text-brand-400">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <Button className="mt-4 w-full" onClick={() => loginMutation.mutate()}>
          {loginMutation.isPending ? "Entrando..." : "Entrar"}
        </Button>
        {loginMutation.isError ? (
          <p className="mt-2 text-sm text-red-500">Falha no login</p>
        ) : null}
      </div>
    </section>
  );
}
