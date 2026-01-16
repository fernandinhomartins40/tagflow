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
  features?: string | null;
  tools?: string | null;
  limits?: string | null;
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

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-orange-50/20 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Escolha seu plano</p>
              <p className="text-xs text-slate-500">Mude quando quiser</p>
            </div>
            <div className="grid gap-3">
              {(plansQuery.data?.plans ?? []).map((plan) => {
                const price = Number(plan.priceMonthly || "0");
                const selected = (planId ?? defaultPlan?.id) === plan.id;
                const isPrime = plan.name === "Prime";
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className={`group relative rounded-xl border-2 px-4 py-4 text-left transition-all ${
                      selected
                        ? isPrime
                          ? "border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg"
                          : "border-orange-300 bg-white shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    {isPrime && !selected ? (
                      <div className="absolute -top-2 right-3 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        POPULAR
                      </div>
                    ) : null}

                    {selected ? (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-slate-900">{plan.name}</span>
                          {price > 0 ? (
                            <span className="text-xs text-slate-500">/mês</span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">GRÁTIS</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{plan.description ?? "Plano flexível."}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">
                          {price > 0 ? `R$ ${price.toFixed(0)}` : "R$ 0"}
                        </p>
                      </div>
                    </div>

                    {buildPlanFeatures(plan).length ? (
                      <ul className="mt-3 space-y-1.5">
                        {buildPlanFeatures(plan).map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                            <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="flex-1">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {price > 0 && !plan.stripePriceId ? (
                      <p className="mt-2 text-xs text-amber-600">⚠️ Checkout indisponível no momento.</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-900">
                <strong>💳 Pagamento seguro:</strong> Para planos pagos, você será direcionado ao checkout seguro do Stripe após criar sua conta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function parsePlanList(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
    if (parsed && typeof parsed === "object") {
      return planLimitsToList(parsed as Record<string, unknown>);
    }
  } catch {
    // ignore
  }
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function planLimitsToList(limits: Record<string, unknown>): string[] {
  const items: string[] = [];
  if (typeof limits.maxBranches === "number") items.push(`${limits.maxBranches} filiais`);
  if (typeof limits.maxUsers === "number") items.push(`${limits.maxUsers} usuarios`);
  if (typeof limits.maxCustomers === "number") items.push(`${limits.maxCustomers} clientes`);
  if (typeof limits.maxBookingsPerMonth === "number") items.push(`${limits.maxBookingsPerMonth} reservas/mes`);
  return items;
}

function buildPlanFeatures(plan: { features?: string | null; tools?: string | null; limits?: string | null }) {
  const features = [...parsePlanList(plan.features), ...parsePlanList(plan.tools), ...parsePlanList(plan.limits)];
  return features.length ? features.slice(0, 4) : [];
}
