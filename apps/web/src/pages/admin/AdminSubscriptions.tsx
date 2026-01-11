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
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

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
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Assinaturas</h2>
        <p className="text-sm text-slate-600">Gerencie seu plano e faca upgrade quando quiser.</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Plano atual</p>
        <p className="text-lg font-semibold text-slate-900">{companyPlan}</p>
        {plansQuery.data?.subscription?.status ? (
          <p className="text-xs text-slate-500">Status: {plansQuery.data.subscription.status}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold">Trocar de plano</h3>
        <p className="text-sm text-slate-500">Selecione o plano desejado e continue no checkout.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <select
            value={selectedPlan?.id ?? ""}
            onChange={(event) => setSelectedPlanId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {(plansQuery.data?.plans ?? []).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} {Number(plan.priceMonthly || "0") > 0 ? `- R$ ${Number(plan.priceMonthly).toFixed(2)}` : "- R$ 0"}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              if (!selectedPlan) return;
              const price = Number(selectedPlan.priceMonthly || "0");
              if (price === 0) {
                changeMutation.mutate(selectedPlan.id);
                return;
              }
              if (!selectedPlan.stripePriceId) {
                return;
              }
              checkoutMutation.mutate(selectedPlan.id);
            }}
            disabled={!selectedPlan || checkoutMutation.isPending || changeMutation.isPending || (Number(selectedPlan?.priceMonthly || "0") > 0 && !selectedPlan?.stripePriceId)}
          >
            {selectedPlan && Number(selectedPlan.priceMonthly || "0") === 0 ? "Trocar para Free" : "Ir para checkout"}
          </Button>
        </div>
        {selectedPlan && Number(selectedPlan.priceMonthly || "0") > 0 && !selectedPlan.stripePriceId ? (
          <p className="mt-2 text-xs text-amber-600">Checkout nao configurado para este plano.</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(plansQuery.data?.plans ?? []).map((plan) => {
          const isCurrent = currentPlanId === plan.id || plan.name === companyPlan;
          const price = Number(plan.priceMonthly || "0");
          const hasStripe = Boolean(plan.stripePriceId);
          const disabled = isCurrent || (!hasStripe && price > 0);
          return (
            <div key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-orange-500">{plan.name}</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {price > 0 ? `R$ ${price.toFixed(2)}` : "R$ 0"}
                </p>
                <p className="text-sm text-slate-500">{plan.description ?? "Plano sob medida."}</p>
                {buildPlanFeatures(plan).length ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-500">
                    {buildPlanFeatures(plan).map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <Button
                className="mt-auto"
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
                  ? "Plano atual"
                  : price === 0
                    ? "Mudar para Free"
                    : hasStripe
                      ? "Mudar com Stripe"
                      : "Indisponivel"}
              </Button>
            </div>
          );
        })}
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
  } catch {
    // ignore
  }
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPlanFeatures(plan: { features?: string | null; tools?: string | null; limits?: string | null }) {
  const features = [...parsePlanList(plan.features), ...parsePlanList(plan.tools), ...parsePlanList(plan.limits)];
  return features.length ? features.slice(0, 6) : [];
}
