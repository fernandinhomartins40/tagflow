import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { formatCurrencyInput, parseCurrencyInput } from "../../utils/currency";

interface CashRegister {
  id: string;
  status: "open" | "closed";
  openingFloat: string;
  closingFloat?: string | null;
  totalCash: string;
  totalDebit: string;
  totalCredit: string;
  totalPix: string;
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
}

interface CashTotals {
  cash: number;
  debit: number;
  credit: number;
  pix: number;
}

export function AdminCash() {
  const [openingFloat, setOpeningFloat] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingFloat, setClosingFloat] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const openQuery = useQuery({
    queryKey: ["cash-open"],
    queryFn: () => apiFetch<{ data: CashRegister | null; totals?: CashTotals }>("/api/cash/open")
  });

  const historyParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", "20");
    if (startAt) params.set("startAt", new Date(startAt).toISOString());
    if (endAt) params.set("endAt", new Date(endAt).toISOString());
    return params.toString();
  }, [startAt, endAt]);

  const historyQuery = useQuery({
    queryKey: ["cash-history", historyParams],
    queryFn: () => apiFetch<{ data: CashRegister[] }>(`/api/cash/history?${historyParams}`)
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        openingFloat: parseCurrencyInput(openingFloat),
        notes: openingNotes || undefined
      };
      return apiFetch("/api/cash/open", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      setOpeningFloat("");
      setOpeningNotes("");
      openQuery.refetch();
      historyQuery.refetch();
    }
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!openQuery.data?.data?.id) throw new Error("Caixa nao encontrado");
      const payload = {
        cashRegisterId: openQuery.data.data.id,
        closingFloat: closingFloat ? parseCurrencyInput(closingFloat) : undefined,
        notes: closingNotes || undefined
      };
      return apiFetch("/api/cash/close", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      setClosingFloat("");
      setClosingNotes("");
      openQuery.refetch();
      historyQuery.refetch();
    }
  });

  const openRegister = openQuery.data?.data ?? null;
  const totals = openQuery.data?.totals ?? { cash: 0, debit: 0, credit: 0, pix: 0 };
  const openingValue = Number(openRegister?.openingFloat ?? 0);
  const expectedCash = openingValue + totals.cash;
  const closingValue = parseCurrencyInput(closingFloat);
  const cashDiff = closingFloat ? closingValue - expectedCash : null;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Caixa</h2>
          <p className="text-sm text-slate-600">Abertura, conferencia e fechamento.</p>
        </div>
      </header>

      {!openRegister ? (
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Abrir caixa</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={openingFloat}
              onChange={(event) => setOpeningFloat(formatCurrencyInput(event.target.value))}
              placeholder="Troco inicial (dinheiro)"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            <input
              value={openingNotes}
              onChange={(event) => setOpeningNotes(event.target.value)}
              placeholder="Observacoes"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            <Button className="w-full sm:w-auto" onClick={() => openMutation.mutate()}>
              {openMutation.isPending ? "Abrindo..." : "Abrir caixa"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Caixa aberto</h3>
              <p className="text-sm text-slate-600">Abertura: {new Date(openRegister.openedAt).toLocaleString("pt-BR")}</p>
              <p className="text-sm text-slate-600">Troco inicial: R$ {openingValue.toFixed(2)}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Aberto</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-400">Dinheiro</p>
              <p className="text-lg font-semibold">R$ {totals.cash.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-400">Debito</p>
              <p className="text-lg font-semibold">R$ {totals.debit.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-400">Credito</p>
              <p className="text-lg font-semibold">R$ {totals.credit.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-400">Pix</p>
              <p className="text-lg font-semibold">R$ {totals.pix.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Dinheiro esperado (troco + recebimentos): <strong>R$ {expectedCash.toFixed(2)}</strong>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={closingFloat}
              onChange={(event) => setClosingFloat(formatCurrencyInput(event.target.value))}
              placeholder="Conferencia: dinheiro contado"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            <input
              value={closingNotes}
              onChange={(event) => setClosingNotes(event.target.value)}
              placeholder="Observacoes"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            <Button className="w-full sm:w-auto" onClick={() => closeMutation.mutate()}>
              {closeMutation.isPending ? "Fechando..." : "Fechar caixa"}
            </Button>
          </div>

          {cashDiff !== null ? (
            <p className={`mt-2 text-sm ${cashDiff === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              Diferenca apurada: R$ {cashDiff.toFixed(2)}
            </p>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Historico de caixas</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => historyQuery.refetch()}>
            Atualizar
          </Button>
        </div>

        {historyQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Carregando...</p>
        ) : historyQuery.data?.data?.length ? (
          <>
            <div className="mt-3 grid gap-3 md:hidden">
              {historyQuery.data.data.map((register) => (
                <div key={register.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold capitalize">{register.status}</p>
                    <p className="text-xs text-slate-500">Troco: R$ {Number(register.openingFloat).toFixed(2)}</p>
                  </div>
                  <p className="text-xs text-slate-500">Abertura: {new Date(register.openedAt).toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-slate-500">
                    Fechamento: {register.closedAt ? new Date(register.closedAt).toLocaleString("pt-BR") : "-"}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>Dinheiro: R$ {Number(register.totalCash).toFixed(2)}</div>
                    <div>Debito: R$ {Number(register.totalDebit).toFixed(2)}</div>
                    <div>Credito: R$ {Number(register.totalCredit).toFixed(2)}</div>
                    <div>Pix: R$ {Number(register.totalPix).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Abertura</th>
                    <th className="py-2 text-left">Fechamento</th>
                    <th className="py-2 text-left">Troco</th>
                    <th className="py-2 text-left">Dinheiro</th>
                    <th className="py-2 text-left">Debito</th>
                    <th className="py-2 text-left">Credito</th>
                    <th className="py-2 text-left">Pix</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {historyQuery.data.data.map((register) => (
                    <tr key={register.id} className="border-t border-slate-200">
                      <td className="py-2 capitalize">{register.status}</td>
                      <td className="py-2">{new Date(register.openedAt).toLocaleString("pt-BR")}</td>
                      <td className="py-2">{register.closedAt ? new Date(register.closedAt).toLocaleString("pt-BR") : "-"}</td>
                      <td className="py-2">R$ {Number(register.openingFloat).toFixed(2)}</td>
                      <td className="py-2">R$ {Number(register.totalCash).toFixed(2)}</td>
                      <td className="py-2">R$ {Number(register.totalDebit).toFixed(2)}</td>
                      <td className="py-2">R$ {Number(register.totalCredit).toFixed(2)}</td>
                      <td className="py-2">R$ {Number(register.totalPix).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Nenhum caixa encontrado.</p>
        )}
      </div>
    </section>
  );
}
