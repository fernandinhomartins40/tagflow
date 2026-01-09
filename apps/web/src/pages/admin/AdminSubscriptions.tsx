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

  const companyPlan = plansQuery.data?.company?.plan ?? "Free";
  const currentPlanId = plansQuery.data?.subscription?.planId ?? null;

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
              </div>
              <Button
                className="mt-auto"
                variant={isCurrent ? "outline" : "default"}
                disabled={disabled || checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate(plan.id)}
              >
                {isCurrent ? "Plano atual" : price === 0 ? "Manter Free" : hasStripe ? "Assinar com Stripe" : "Indisponivel"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
