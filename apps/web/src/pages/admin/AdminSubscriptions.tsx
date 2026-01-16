import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: string;
  currency: string;
  stripePriceId?: string | null;
  features?: string | null;
  tools?: string | null;
  limits?: string | null;
}

interface BillingResponse {
  company: { id: string; name: string; plan: string } | null;
  subscription: { planId?: string | null; status?: string | null } | null;
  plans: Plan[];
}

export function AdminSubscriptions() {
  const plansQuery = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => apiFetch<BillingResponse>("/api/billing/plans")
  });

  const plans = plansQuery.data?.plans ?? [];
  const currentPlanId = plansQuery.data?.subscription?.planId ?? null;
  const [selectedPlanId] = useState<string>("");

  const selectedPlan = useMemo(() => {
    if (!plans.length) return null;
    if (selectedPlanId) {
      return plans.find((plan) => plan.id === selectedPlanId) ?? null;
    }
    if (currentPlanId) {
      return plans.find((plan) => plan.id === currentPlanId) ?? null;
    }
    const fallback = plans.find((plan) => plan.name.toLowerCase() === "free");
    return fallback ?? plans[0] ?? null;
  }, [plans, selectedPlanId, currentPlanId]);

  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiFetch<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId })
      });
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    }
  });
  const changeMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiFetch<{ ok: boolean }>("/api/billing/change", {
        method: "POST",
        body: JSON.stringify({ planId })
      });
    },
    onSuccess: () => {
      plansQuery.refetch();
    }
  });

  const companyPlan = plansQuery.data?.company?.plan ?? "Free";

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Planos e Assinaturas</h2>
        <p className="mt-1 text-slate-600">Escolha o plano ideal para o seu negócio</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Seu Plano Atual</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{companyPlan}</p>
            {plansQuery.data?.subscription?.status ? (
              <p className="mt-1 text-sm text-slate-500">
                Status: <span className="font-medium capitalize">{plansQuery.data.subscription.status}</span>
              </p>
            ) : null}
          </div>
          {companyPlan === "Free" ? (
            <div className="rounded-lg bg-orange-100 px-4 py-2 text-center">
              <p className="text-xs font-semibold text-orange-700">Faça upgrade</p>
              <p className="text-xs text-orange-600">Desbloqueie mais recursos</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(plansQuery.data?.plans ?? []).map((plan) => {
          const isCurrent = currentPlanId === plan.id || plan.name === companyPlan;
          const price = Number(plan.priceMonthly || "0");
          const hasStripe = Boolean(plan.stripePriceId);
          const disabled = isCurrent || (!hasStripe && price > 0);
          const isPrime = plan.name === "Prime";
          const features = parsePlanList(plan.features);
          const tools = parsePlanList(plan.tools);
          const limits = parsePlanList(plan.limits);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all ${
                isPrime
                  ? "border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg"
                  : isCurrent
                    ? "border-orange-300 bg-white shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {isPrime ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                  POPULAR
                </div>
              ) : null}

              {isCurrent ? (
                <div className="absolute -top-3 right-4 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                  ATIVO
                </div>
              ) : null}

              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {price > 0 ? `R$ ${price.toFixed(0)}` : "Grátis"}
                  </span>
                  {price > 0 ? <span className="text-slate-500">/mês</span> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              </div>

              <div className="mb-6 space-y-4">
                {features.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Recursos</p>
                    <ul className="space-y-2">
                      {features.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {tools.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Ferramentas</p>
                    <ul className="space-y-2">
                      {tools.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {limits.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Limites</p>
                    <ul className="space-y-2">
                      {limits.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <Button
                className={`mt-auto w-full ${isPrime ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600" : ""}`}
                variant={isCurrent ? "outline" : "default"}
                disabled={disabled || checkoutMutation.isPending}
                onClick={() => {
                  if (price === 0) {
                    changeMutation.mutate(plan.id);
                    return;
                  }
                  checkoutMutation.mutate(plan.id);
                }}
              >
                {isCurrent
                  ? "✓ Plano Atual"
                  : price === 0
                    ? "Trocar para Free"
                    : hasStripe
                      ? `Assinar ${plan.name}`
                      : "Indisponível"}
              </Button>

              {!isCurrent && price > 0 && !hasStripe ? (
                <p className="mt-2 text-center text-xs text-amber-600">Checkout não configurado</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {companyPlan === "Free" ? (
        <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-6 text-center">
          <h3 className="text-lg font-bold text-slate-900">Pronto para crescer?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Faça upgrade para desbloquear recursos avançados, mais limites e suporte prioritário.
          </p>
        </div>
      ) : null}
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
  return features.length ? features.slice(0, 6) : [];
}
