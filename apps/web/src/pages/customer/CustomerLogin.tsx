import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { customerApiFetch } from "../../services/customerApi";
import { useCustomerAuthStore } from "../../store/customerAuth";

interface LoginResponse {
  customer: {
    id: string;
    name: string;
    cpf: string;
    phone: string;
  };
}

export function CustomerLogin() {
  const navigate = useNavigate();
  const status = useCustomerAuthStore((state) => state.status);
  const setAuth = useCustomerAuthStore((state) => state.setAuth);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/cliente" replace />;
  }

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await customerApiFetch<LoginResponse>("/api/customer/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone: onlyDigits(phone), password })
      });
      setAuth("authenticated", response.customer);
      navigate("/cliente", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
      setAuth("unauthenticated");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:border-[#2a2420] dark:bg-[#120f0d] dark:text-neutral-100 sm:p-8">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-neutral-400">Cliente</p>
          <h2 className="text-2xl font-semibold">Acesse seu painel</h2>
          <p className="text-sm text-slate-500 dark:text-neutral-300">Use seu celular e a senha.</p>
        </header>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Celular</label>
            <input
              value={phone}
              onChange={(event) => setPhone(maskPhone(event.target.value))}
              placeholder="(11) 99999-0000"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400/60 focus:outline-none dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400/60 focus:outline-none dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-100"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
              Primeira senha: as 3 primeiras letras do seu nome.
            </p>
          </div>
          <Button className="w-full bg-orange-500 text-slate-950 hover:bg-orange-400" onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          {error ? <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
