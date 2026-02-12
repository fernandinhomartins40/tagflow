import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../services/api";
import type { PlanLimits } from "../types/api";

interface PlanLimitsDisplayProps {
  resource: "customers" | "users" | "branches" | "bookings";
  compact?: boolean;
}

export function PlanLimitsDisplay({ resource, compact = false }: PlanLimitsDisplayProps) {
  const limitsQuery = useQuery({
    queryKey: ["plan-limits"],
    queryFn: () => apiFetch<PlanLimits>("/api/plan/limits"),
    staleTime: 60000, // Cache por 1 minuto
    refetchOnWindowFocus: false
  });

  if (limitsQuery.isLoading || !limitsQuery.data) {
    return null;
  }

  const limit = limitsQuery.data[resource];
  const { current, max } = limit;
  const percentage = max ? (current / max) * 100 : 0;
  const isNearLimit = max && percentage >= 80;
  const isAtLimit = max && current >= max;

  const resourceLabels = {
    customers: "clientes",
    users: "usuários",
    branches: "filiais",
    bookings: "reservas ativas"
  };

  if (compact) {
    return (
      <span className={`text-xs ${isAtLimit ? "text-rose-600 font-semibold" : isNearLimit ? "text-amber-600" : "text-slate-500"}`}>
        {current} / {max ?? "∞"} {resourceLabels[resource]}
      </span>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {resourceLabels[resource].charAt(0).toUpperCase() + resourceLabels[resource].slice(1)}
        </span>
        <span className={`text-sm font-semibold ${isAtLimit ? "text-rose-600" : isNearLimit ? "text-amber-600" : "text-slate-600"}`}>
          {current} / {max ?? "∞"}
        </span>
      </div>
      {max && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all ${isAtLimit ? "bg-rose-500" : isNearLimit ? "bg-amber-500" : "bg-brand-500"}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {isAtLimit && (
        <p className="mt-1 text-xs text-rose-600">
          Limite atingido. Faça upgrade do plano para continuar.
        </p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="mt-1 text-xs text-amber-600">
          Próximo do limite. Considere fazer upgrade.
        </p>
      )}
    </div>
  );
}
