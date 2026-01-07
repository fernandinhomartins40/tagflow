import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../../services/api";
import { Button } from "../../components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface SalesReport {
  total: number | string;
  count: number | string;
}

interface OccupancyReport {
  data: Array<{ locationId: string; total: number }>;
}

interface CustomersReport {
  data: Array<{ customerId: string; total: number; count: number }>;
}

export function AdminReports() {
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [branchId, setBranchId] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/branches")
  });

  const queryParams = () => {
    const params = new URLSearchParams();
    if (startAt) params.set("startAt", new Date(startAt).toISOString());
    if (endAt) params.set("endAt", new Date(endAt).toISOString());
    if (branchId) params.set("branchId", branchId);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const salesQuery = useQuery({
    queryKey: ["reports", "sales", startAt, endAt, branchId],
    queryFn: () => apiFetch<SalesReport>(`/api/reports/sales${queryParams()}`)
  });

  const occupancyQuery = useQuery({
    queryKey: ["reports", "occupancy", startAt, endAt, branchId],
    queryFn: () => apiFetch<OccupancyReport>(`/api/reports/occupancy${queryParams()}`)
  });

  const customersQuery = useQuery({
    queryKey: ["reports", "customers", startAt, endAt, branchId],
    queryFn: () => apiFetch<CustomersReport>(`/api/reports/customers${queryParams()}`)
  });

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.text("Relatorios Tagflow", 14, 16);

    autoTable(doc, {
      startY: 24,
      head: [["Indicador", "Valor"]],
      body: [
        ["Vendas", `R$ ${salesQuery.data?.total ?? 0}`],
        ["Transacoes", `${salesQuery.data?.count ?? 0}`]
      ]
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Local", "Total"]],
      body: (occupancyQuery.data?.data ?? []).map((item) => [item.locationId, String(item.total)])
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Cliente", "Transacoes"]],
      body: (customersQuery.data?.data ?? []).map((item) => [item.customerId, String(item.count)])
    });

    doc.save("tagflow-relatorios.pdf");
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const salesSheet = XLSX.utils.aoa_to_sheet([
      ["Indicador", "Valor"],
      ["Vendas", salesQuery.data?.total ?? 0],
      ["Transacoes", salesQuery.data?.count ?? 0]
    ]);
    XLSX.utils.book_append_sheet(wb, salesSheet, "Vendas");

    const occupancySheet = XLSX.utils.aoa_to_sheet([
      ["Local", "Total"],
      ...(occupancyQuery.data?.data ?? []).map((item) => [item.locationId, item.total])
    ]);
    XLSX.utils.book_append_sheet(wb, occupancySheet, "Ocupacao");

    const customersSheet = XLSX.utils.aoa_to_sheet([
      ["Cliente", "Transacoes"],
      ...(customersQuery.data?.data ?? []).map((item) => [item.customerId, item.count])
    ]);
    XLSX.utils.book_append_sheet(wb, customersSheet, "Clientes");

    XLSX.writeFile(wb, "tagflow-relatorios.xlsx");
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Relatorios</h2>
        <p className="text-sm text-slate-600">Indicadores de vendas e ocupacao.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportPdf}>
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={exportExcel}>
            Exportar Excel
          </Button>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Vendas</h3>
          <p className="text-sm text-slate-600">Total: R$ {salesQuery.data?.total ?? 0}</p>
          <p className="text-sm text-slate-600">Transacoes: {salesQuery.data?.count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Ocupacao</h3>
          {occupancyQuery.data?.data?.map((item) => (
            <p key={item.locationId} className="text-sm text-slate-600">
              {item.locationId}: {item.total}
            </p>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Clientes frequentes</h3>
        {customersQuery.data?.data?.map((item) => (
          <p key={item.customerId} className="text-sm text-slate-600">
            {item.customerId}: {item.count} transacoes
          </p>
        ))}
      </div>
    </section>
  );
}
