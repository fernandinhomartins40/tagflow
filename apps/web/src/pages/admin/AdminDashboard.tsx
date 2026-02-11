import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { formatCurrencyValue } from "../../utils/currency";

interface SalesReport {
  total: number | string;
  count: number | string;
  startAt?: string;
  endAt?: string;
  branchId?: string | null;
}

export function AdminDashboard() {
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [branchId, setBranchId] = useState("");
  const [rangePreset, setRangePreset] = useState<"today" | "7d" | "30d" | "custom">("7d");

  const queryParams = () => {
    const params = new URLSearchParams();
    if (startAt) params.set("startAt", new Date(startAt).toISOString());
    if (endAt) params.set("endAt", new Date(endAt).toISOString());
    if (branchId) params.set("branchId", branchId);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/branches")
  });

  const salesQuery = useQuery({
    queryKey: ["reports", "sales", startAt, endAt, branchId],
    queryFn: () => apiFetch<SalesReport>(`/api/reports/sales${queryParams()}`)
  });

  const occupancyQuery = useQuery({
    queryKey: ["reports", "occupancy", startAt, endAt, branchId],
    queryFn: () =>
      apiFetch<{ data: Array<{ locationId: string; total: number }> }>(`/api/reports/occupancy${queryParams()}`)
  });

  const customersQuery = useQuery({
    queryKey: ["reports", "customers", startAt, endAt, branchId],
    queryFn: () =>
      apiFetch<{
        data: Array<{ customerId: string; total: number | string; count: number | string }>;
        customers: Array<{ id: string; name: string }>;
      }>(`/api/reports/customers${queryParams()}`)
  });

  const locationsQuery = useQuery({
    queryKey: ["locations", "dashboard"],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: string; name: string; branchId?: string | null }> }>("/api/locations?page=1&pageSize=200")
  });

  const totalValue = Number(salesQuery.data?.total ?? 0);
  const countValue = Number(salesQuery.data?.count ?? 0);
  const averageTicket = countValue > 0 ? totalValue / countValue : 0;

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    (locationsQuery.data?.data ?? []).forEach((location) => {
      if (branchId && location.branchId && location.branchId !== branchId) return;
      map.set(location.id, location.name);
    });
    return map;
  }, [locationsQuery.data?.data, branchId]);

  const topLocations = useMemo(() => {
    const data = occupancyQuery.data?.data ?? [];
    return [...data].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [occupancyQuery.data?.data]);

  const topCustomers = useMemo(() => {
    const data = customersQuery.data?.data ?? [];
    const customerMap = new Map((customersQuery.data?.customers ?? []).map((customer) => [customer.id, customer.name]));
    return data
      .slice()
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 5)
      .map((item) => ({
        id: item.customerId,
        name: customerMap.get(item.customerId) ?? item.customerId,
        total: Number(item.total),
        count: Number(item.count)
      }));
  }, [customersQuery.data?.data, customersQuery.data?.customers]);

  const setPresetRange = (preset: "today" | "7d" | "30d") => {
    const end = new Date();
    const start = new Date();
    if (preset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (preset === "7d") {
      start.setDate(end.getDate() - 7);
    } else {
      start.setDate(end.getDate() - 30);
    }
    setRangePreset(preset);
    setStartAt(start.toISOString().slice(0, 16));
    setEndAt(end.toISOString().slice(0, 16));
  };

  useEffect(() => {
    if (startAt || endAt) return;
    setPresetRange("7d");
  }, [startAt, endAt]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-brand-500 p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-white/80">Resumo</p>
        <h2 className="mt-2 text-2xl font-semibold">Dashboard operacional</h2>
        <p className="mt-2 text-sm text-white/80">Indicadores em tempo real com filtros por periodo e filial.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setPresetRange("today")}>Hoje</Button>
          <Button variant="outline" onClick={() => setPresetRange("7d")}>7 dias</Button>
          <Button variant="outline" onClick={() => setPresetRange("30d")}>30 dias</Button>
          <Button
            variant="outline"
            onClick={() => {
              setRangePreset("custom");
              setStartAt("");
              setEndAt("");
            }}
          >
            Personalizado
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="datetime-local"
          value={startAt}
          onChange={(event) => {
            setRangePreset("custom");
            setStartAt(event.target.value);
          }}
          className="w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <input
          type="datetime-local"
          value={endAt}
          onChange={(event) => {
            setRangePreset("custom");
            setEndAt(event.target.value);
          }}
          className="w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <select
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
          className="w-full rounded-xl border border-brand-100 px-3 py-2"
        >
          <option value="">Todas as filiais</option>
          {branchesQuery.data?.data?.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Vendas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrencyValue(totalValue)}</p>
          <p className="mt-1 text-xs text-slate-500">Periodo: {rangePreset === "custom" ? "Personalizado" : rangePreset.toUpperCase()}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Transacoes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{countValue}</p>
          <p className="mt-1 text-xs text-slate-500">Ticket medio: {formatCurrencyValue(averageTicket)}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Ocupacao</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{occupancyQuery.data?.data?.length ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Locais com uso no periodo</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{salesQuery.isLoading ? "Atualizando" : "Ativo"}</p>
          <p className="mt-1 text-xs text-slate-500">Ultima consulta: {new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Ocupacao por local</h3>
          <p className="mt-1 text-sm text-slate-600">Top 5 por quantidade de reservas.</p>
          <div className="mt-3 space-y-2">
            {topLocations.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma reserva no periodo.</p>
            ) : (
              topLocations.map((item) => (
                <div key={item.locationId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-sm">{locationMap.get(item.locationId) ?? item.locationId}</span>
                  <span className="text-sm font-semibold">{item.total}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Clientes mais ativos</h3>
          <p className="mt-1 text-sm text-slate-600">Top 5 por volume de compras.</p>
          <div className="mt-3 space-y-2">
            {topCustomers.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma transacao registrada.</p>
            ) : (
              topCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="text-xs text-slate-500">{customer.count} transacoes</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyValue(customer.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Acoes rapidas</h3>
        <p className="mt-1 text-sm text-slate-600">Atalhos para operacao diaria.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild>
            <a href="/admin/pdv">Abrir PDV</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/admin/reports">Ver relatorios</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/admin/customers">Clientes</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/admin/branches">Filiais</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
