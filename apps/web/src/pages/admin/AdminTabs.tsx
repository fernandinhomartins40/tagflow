import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { formatCurrencyInput, parseCurrencyInput } from "../../utils/currency";

interface Tab {
  id: string;
  customerId: string;
  identifierCode: string;
  type: "credit" | "prepaid";
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string | null;
}

interface TabItem {
  id: string;
  productId?: string | null;
  serviceId?: string | null;
  locationId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: string;
  total: string;
  createdAt: string;
}

type PaymentMethod = "cash" | "debit" | "credit" | "pix";

interface PaymentRow {
  method: PaymentMethod;
  amount: string;
}

export function AdminTabs() {
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState<"credit" | "prepaid">("prepaid");
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [closingTab, setClosingTab] = useState<Tab | null>(null);
  const [closeTotal, setCloseTotal] = useState(0);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([{ method: "cash", amount: "" }]);
  const [listError, setListError] = useState<string | null>(null);

  const tabsQuery = useQuery({
    queryKey: ["tabs"],
    queryFn: () => apiFetch<{ data: Tab[] }>("/api/tabs")
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/customers")
  });

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/products")
  });

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/services")
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/locations")
  });

  const tabDetailsQuery = useQuery({
    queryKey: ["tab-details", activeTabId],
    queryFn: () => apiFetch<{ tab: Tab; items: TabItem[] }>(`/api/tabs/${activeTabId}`),
    enabled: Boolean(activeTabId)
  });

  const cashOpenQuery = useQuery({
    queryKey: ["cash-open"],
    queryFn: () => apiFetch<{ data: { id: string } | null }>("/api/cash/open")
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Tab>("/api/tabs/open", {
        method: "POST",
        body: JSON.stringify({ identifier, type })
      });
    },
    onSuccess: () => {
      setIdentifier("");
      tabsQuery.refetch();
    }
  });

  const closeMutation = useMutation({
    mutationFn: async (payload: { tabId: string; payments?: Array<{ method: PaymentMethod; amount: number }> }) => {
      const details = await apiFetch<{ items: TabItem[] }>(`/api/tabs/${payload.tabId}`);
      const close = await apiFetch<{ charges: Array<{ customerId: string; amount: number }>; total: number }>(`/api/tabs/close`, {
        method: "POST",
        body: JSON.stringify({ tabId: payload.tabId, payments: payload.payments })
      });
      return { close, items: details.items ?? [], tabId: payload.tabId, payments: payload.payments ?? [] };
    },
    onSuccess: ({ close, items, tabId, payments: paid }) => {
      const customers = customersQuery.data?.data ?? [];
      const resolveName = (id: string) => customers.find((c) => c.id === id)?.name ?? `Cliente ${id.slice(0, 6)}`;
      const itemsHtml = items
        .map((item) => {
          const productName = productsQuery.data?.data?.find((p) => p.id === item.productId)?.name;
          const serviceName = servicesQuery.data?.data?.find((s) => s.id === item.serviceId)?.name;
          const locationName = locationsQuery.data?.data?.find((l) => l.id === item.locationId)?.name;
          const label = productName || serviceName || locationName || item.description || "Item";
          return `<tr><td>${label}</td><td>${item.quantity}</td><td>R$ ${item.unitPrice}</td><td>R$ ${item.total}</td></tr>`;
        })
        .join("");
      const chargesHtml = (close.charges ?? [])
        .map((charge) => `<tr><td>${resolveName(charge.customerId)}</td><td>R$ ${charge.amount.toFixed(2)}</td></tr>`)
        .join("");
      const paymentsHtml = (paid ?? [])
        .map((payment) => `<tr><td>${payment.method}</td><td>R$ ${payment.amount.toFixed(2)}</td></tr>`)
        .join("");

      const win = window.open("", "recibo", "width=420,height=600");
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Recibo</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
                h1 { font-size: 18px; margin: 0 0 6px; }
                p { margin: 4px 0; font-size: 12px; color: #6b7280; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                th, td { text-align: left; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
                .total { margin-top: 12px; font-weight: 600; }
              </style>
            </head>
            <body>
              <h1>Recibo Tagflow</h1>
              <p>Comanda: ${tabId}</p>
              <p>Data: ${new Date().toISOString()}</p>
              <table>
                <thead>
                  <tr><th>Item</th><th>Qtd</th><th>Unit</th><th>Total</th></tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Valor</th></tr>
                </thead>
                <tbody>${chargesHtml}</tbody>
              </table>
              ${paymentsHtml ? `
              <table>
                <thead>
                  <tr><th>Pagamento</th><th>Valor</th></tr>
                </thead>
                <tbody>${paymentsHtml}</tbody>
              </table>
              ` : ""}
              <p class="total">Total: R$ ${(close.total ?? 0).toFixed(2)}</p>
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
        win.print();
        win.close();
      }
      tabsQuery.refetch();
      setClosingTab(null);
      setCloseTotal(0);
      setCloseError(null);
      setPayments([{ method: "cash", amount: "" }]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erro ao fechar comanda.";
      setCloseError(message);
      if (!closingTab) {
        setListError(message);
      }
    }
  });

  useEffect(() => {
    if (!closingTab) return;
    apiFetch<{ items: TabItem[] }>(`/api/tabs/${closingTab.id}`).then((details) => {
      const total = (details.items ?? []).reduce((sum, item) => sum + Number(item.total), 0);
      setCloseTotal(total);
    });
  }, [closingTab]);

  const resolveItemLabel = (item: TabItem) => {
    const productName = productsQuery.data?.data?.find((p) => p.id === item.productId)?.name;
    const serviceName = servicesQuery.data?.data?.find((s) => s.id === item.serviceId)?.name;
    const locationName = locationsQuery.data?.data?.find((l) => l.id === item.locationId)?.name;
    return productName || serviceName || locationName || item.description || "Item";
  };

  const paymentSum = payments.reduce((sum, payment) => sum + parseCurrencyInput(payment.amount), 0);
  const paymentRemaining = closeTotal - paymentSum;
  const paymentDiff = Math.abs(paymentRemaining);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Comandas</h2>
        <p className="text-sm text-slate-600">Abra, acompanhe e feche comandas.</p>
      </header>
      {listError ? <p className="text-sm text-rose-500">{listError}</p> : null}

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Abrir comanda</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="NFC, codigo de barras ou numero"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "credit" | "prepaid")}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            <option value="prepaid">Pre-paga</option>
            <option value="credit">Credito</option>
          </select>
          <Button onClick={() => openMutation.mutate()}>
            {openMutation.isPending ? "Abrindo..." : "Abrir comanda"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {tabsQuery.data?.data?.map((tab) => (
          <div key={tab.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Comanda {tab.id.slice(0, 6)}</h3>
                <p className="text-sm text-slate-600">Identificador: {tab.identifierCode}</p>
                <p className="text-sm text-slate-600">Tipo: {tab.type === "credit" ? "Credito" : "Pre-paga"}</p>
                <p className="text-sm text-slate-600">Status: {tab.status}</p>
                <p className="text-xs text-slate-400">
                  Aberta em {new Date(tab.openedAt).toLocaleString("pt-BR")}
                </p>
                {tab.closedAt ? (
                  <p className="text-xs text-slate-400">
                    Fechada em {new Date(tab.closedAt).toLocaleString("pt-BR")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setActiveTabId(activeTabId === tab.id ? null : tab.id)}>
                  {activeTabId === tab.id ? "Ocultar itens" : "Ver itens"}
                </Button>
                {tab.status === "open" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setListError(null);
                      if (tab.type === "credit") {
                        setClosingTab(tab);
                        return;
                      }
                      closeMutation.mutate({ tabId: tab.id });
                    }}
                  >
                    Fechar comanda
                  </Button>
                ) : null}
              </div>
            </div>

            {activeTabId === tab.id ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-semibold text-slate-700">Itens da comanda</h4>
                {tabDetailsQuery.isLoading ? (
                  <p className="mt-2 text-sm text-slate-500">Carregando itens...</p>
                ) : tabDetailsQuery.data?.items?.length ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-slate-400">
                        <tr>
                          <th className="py-2 text-left">Item</th>
                          <th className="py-2 text-left">Qtd</th>
                          <th className="py-2 text-left">Unitario</th>
                          <th className="py-2 text-left">Total</th>
                          <th className="py-2 text-left">Data/Hora</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-600">
                        {tabDetailsQuery.data.items.map((item) => (
                          <tr key={item.id} className="border-t border-slate-200">
                            <td className="py-2">{resolveItemLabel(item)}</td>
                            <td className="py-2">{item.quantity}</td>
                            <td className="py-2">R$ {Number(item.unitPrice).toFixed(2)}</td>
                            <td className="py-2">R$ {Number(item.total).toFixed(2)}</td>
                            <td className="py-2">{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Nenhum item registrado.</p>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {closingTab ? (
        <Modal
          title="Fechar comanda com pagamento"
          onClose={() => {
            setClosingTab(null);
            setCloseTotal(0);
            setCloseError(null);
          }}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Total da comanda: <strong>R$ {closeTotal.toFixed(2)}</strong>
            </div>

            {!cashOpenQuery.data?.data ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                Caixa fechado. Abra o caixa para concluir o pagamento.
              </div>
            ) : null}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700">Formas de pagamento</h4>
              {payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={payment.method}
                    onChange={(event) => {
                      const value = event.target.value as PaymentMethod;
                      setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, method: value } : p)));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="debit">Debito</option>
                    <option value="credit">Credito</option>
                    <option value="pix">Pix</option>
                  </select>
                  <input
                    value={payment.amount}
                    onChange={(event) => {
                      const value = formatCurrencyInput(event.target.value);
                      setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, amount: value } : p)));
                    }}
                    placeholder="Valor"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setPayments((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setPayments((prev) => [...prev, { method: "cash", amount: "" }])}
              >
                Adicionar forma
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              Recebido: <strong>R$ {paymentSum.toFixed(2)}</strong>{" "}
              <span className={paymentDiff > 0.01 ? "text-amber-600" : "text-emerald-600"}>
                {paymentDiff > 0.01 ? `(Diferenca R$ ${paymentRemaining.toFixed(2)})` : "(OK)"}
              </span>
            </div>

            {closeError ? <p className="text-sm text-rose-500">{closeError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setClosingTab(null);
                  setCloseTotal(0);
                  setCloseError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                disabled={!cashOpenQuery.data?.data || paymentDiff > 0.01}
                onClick={() => {
                  setCloseError(null);
                  const parsed = payments
                    .map((payment) => ({
                      method: payment.method,
                      amount: parseCurrencyInput(payment.amount)
                    }))
                    .filter((payment) => payment.amount > 0);
                  if (!parsed.length) {
                    setCloseError("Informe ao menos um pagamento.");
                    return;
                  }
                  closeMutation.mutate({ tabId: closingTab.id, payments: parsed });
                }}
              >
                Confirmar fechamento
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-modal-root="true"
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/50"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))"
      }}
    >
      <div
        data-modal-panel="true"
        className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-sm text-slate-500" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}
