import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { usePushNotifications } from "../../hooks/usePushNotifications";

interface SalesReport {
  total: number | string;
  count: number | string;
}

export function AdminDashboard() {
  const salesQuery = useQuery({
    queryKey: ["reports", "sales"],
    queryFn: () => apiFetch<SalesReport>("/api/reports/sales")
  });
  const push = usePushNotifications();

  const total = salesQuery.data?.total ?? 0;
  const count = salesQuery.data?.count ?? 0;

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-brand-500 p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.3em]">Resumo</p>
        <h2 className="mt-2 text-2xl font-semibold">Dashboard em tempo real</h2>
        <p className="mt-2 text-sm text-white/80">Filtros por filial e periodo entram aqui.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline">Hoje</Button>
          <Button variant="outline">7 dias</Button>
          <Button variant="outline">30 dias</Button>
          <Button variant="outline" onClick={() => push.subscribe()}>
            Ativar push
          </Button>
          <Button variant="outline" onClick={() => push.sendTest()}>
            Enviar teste
          </Button>
          <span className="text-xs text-white/80">Push: {push.status}</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Vendas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">R$ {total}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Transacoes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{salesQuery.isLoading ? "Atualizando" : "Ativo"}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-6">
        <h3 className="text-lg font-semibold">Ocupacao por local</h3>
        <p className="mt-2 text-sm text-slate-600">Relatorio detalhado em /admin/reports.</p>
      </div>
    </section>
  );
}
