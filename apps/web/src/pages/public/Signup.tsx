import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { useTenantStore } from "../../store/tenant";

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: string;
  stripePriceId?: string | null;
}

interface SignupResponse {
  companyId: string;
  user: { id: string; name: string; email: string; role: string };
}

export function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenantId = useTenantStore((state) => state.setTenantId);

  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => apiFetch<{ plans: Plan[] }>("/api/public/plans")
  });

  const selectedPlanId = params.get("planId");
  const defaultPlan = useMemo(() => {
    const plans = plansQuery.data?.plans ?? [];
    if (selectedPlanId) {
      return plans.find((plan) => plan.id === selectedPlanId) ?? null;
    }
    return plans.find((plan) => plan.name.toLowerCase() === "free") ?? plans[0] ?? null;
  }, [plansQuery.data?.plans, selectedPlanId]);

  const [planId, setPlanId] = useState<string | null>(selectedPlanId ?? null);

  useEffect(() => {
    if (!planId && defaultPlan?.id) {
      setPlanId(defaultPlan.id);
    }
  }, [planId, defaultPlan?.id]);

  const signupMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (selectedPlan && selectedPrice > 0 && !selectedPlan.stripePriceId) {
        throw new Error("Plano pago indisponivel no momento.");
      }
      return apiFetch<SignupResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ companyName, cnpj, name, email, password })
      });
    },
    onSuccess: async (data) => {
      setTenantId(data.companyId);
      setAuth("authenticated", data.user);
      const targetPlan = (plansQuery.data?.plans ?? []).find((plan) => plan.id === planId) ?? defaultPlan;
      const price = Number(targetPlan?.priceMonthly ?? "0");
      if (targetPlan && price > 0 && targetPlan.stripePriceId) {
        const checkout = await apiFetch<{ url: string }>("/api/billing/checkout", {
          method: "POST",
          body: JSON.stringify({ planId: targetPlan.id })
        });
        window.location.href = checkout.url;
        return;
      }
      navigate("/admin/pdv", { replace: true });
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });

  const selectedPlan = (plansQuery.data?.plans ?? []).find((plan) => plan.id === planId) ?? defaultPlan;
  const selectedPrice = Number(selectedPlan?.priceMonthly ?? "0");
  const submitLabel = selectedPrice > 0 ? "Criar conta e assinar" : "Criar conta free";

  return (
    <section className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-10 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-amber-400/20 blur-[140px]" />
      </div>
      <div className="w-full max-w-4xl space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Cadastro</p>
          <h2 className="text-2xl font-semibold">Crie sua conta Tagflow</h2>
          <p className="text-sm text-slate-500">Comece no plano free e escolha o upgrade quando quiser.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Nome do estabelecimento"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={cnpj}
              onChange={(event) => setCnpj(event.target.value)}
              placeholder="CNPJ"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            <Button
              className="w-full bg-orange-500 text-white hover:bg-orange-400"
              onClick={() => signupMutation.mutate()}
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? "Criando..." : submitLabel}
            </Button>
            <p className="text-xs text-slate-500">
              Ja tem conta? <Link className="text-orange-600 hover:text-orange-500" to="/login">Entrar</Link>
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold">Escolha seu plano</p>
            <div className="grid gap-2">
              {(plansQuery.data?.plans ?? []).map((plan) => {
                const price = Number(plan.priceMonthly || "0");
                const selected = (planId ?? defaultPlan?.id) === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selected ? "border-orange-300 bg-white" : "border-slate-200 bg-white/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{plan.name}</span>
                      <span>{price > 0 ? `R$ ${price.toFixed(2)}` : "R$ 0"}</span>
                    </div>
                    <p className="text-xs text-slate-500">{plan.description ?? "Plano flexivel."}</p>
                    {price > 0 && !plan.stripePriceId ? (
                      <p className="text-xs text-amber-600">Checkout indisponivel no momento.</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Para planos pagos, voce sera direcionado ao checkout do Stripe apos o cadastro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
