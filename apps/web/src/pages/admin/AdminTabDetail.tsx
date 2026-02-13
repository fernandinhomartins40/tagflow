import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  CreditCard,
  Wallet,
  Clock,
  Hash,
  ShoppingBag,
  ChevronRight,
  Users,
  Receipt,
  AlertCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { formatCurrencyInput, parseCurrencyInput } from "../../utils/currency";

interface Tab {
  id: string;
  companyId: string;
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
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
}

interface TabItemParticipant {
  id: string;
  tabItemId: string;
  customerId: string;
  amount: string;
}

interface Customer {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
}

type PaymentMethod = "cash" | "debit" | "credit" | "pix";

interface PaymentRow {
  method: PaymentMethod;
  amount: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix"
};

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function AdminTabDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [closingOpen, setClosingOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([{ method: "cash", amount: "" }]);

  const tabDetailQuery = useQuery({
    queryKey: ["tab-details", id],
    queryFn: () => apiFetch<{ tab: Tab; items: TabItem[]; participants: TabItemParticipant[] }>(`/api/tabs/${id}`),
    enabled: Boolean(id)
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Customer[] }>("/api/customers")
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

  const cashOpenQuery = useQuery({
    queryKey: ["cash-open"],
    queryFn: () => apiFetch<{ data: { id: string } | null }>("/api/cash/open")
  });

  const tab = tabDetailQuery.data?.tab;
  const items = tabDetailQuery.data?.items ?? [];
  const participants = tabDetailQuery.data?.participants ?? [];
  const customers = customersQuery.data?.data ?? [];

  const customer = customers.find((c) => c.id === tab?.customerId);

  const totalItems = items.reduce((sum, item) => sum + Number(item.total), 0);

  const paymentSum = payments.reduce((sum, p) => sum + parseCurrencyInput(p.amount), 0);
  const paymentRemaining = totalItems - paymentSum;
  const paymentDiff = Math.abs(paymentRemaining);

  const resolveItemLabel = (item: TabItem) => {
    const productName = productsQuery.data?.data?.find((p) => p.id === item.productId)?.name;
    const serviceName = servicesQuery.data?.data?.find((s) => s.id === item.serviceId)?.name;
    const locationName = locationsQuery.data?.data?.find((l) => l.id === item.locationId)?.name;
    return productName || serviceName || locationName || item.description || "Item";
  };

  const resolveCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name ?? `Cliente ${customerId.slice(0, 6)}`;
  };

  const closeMutation = useMutation({
    mutationFn: async (payload: { tabId: string; payments?: Array<{ method: PaymentMethod; amount: number }> }) => {
      const close = await apiFetch<{
        charges: Array<{ customerId: string; amount: number }>;
        total: number;
      }>("/api/tabs/close", {
        method: "POST",
        body: JSON.stringify({ tabId: payload.tabId, payments: payload.payments })
      });
      return { close, tabId: payload.tabId, payments: payload.payments ?? [] };
    },
    onSuccess: ({ close, tabId, payments: paid }) => {
      const itemsHtml = items
        .map((item) => {
          const label = resolveItemLabel(item);
          return `<tr><td>${label}</td><td>${item.quantity}</td><td>R$ ${Number(item.unitPrice).toFixed(2)}</td><td>R$ ${Number(item.total).toFixed(2)}</td></tr>`;
        })
        .join("");
      const chargesHtml = (close.charges ?? [])
        .map((charge) => `<tr><td>${resolveCustomerName(charge.customerId)}</td><td>R$ ${charge.amount.toFixed(2)}</td></tr>`)
        .join("");
      const paymentsHtml = paid
        .map((p) => `<tr><td>${PAYMENT_LABELS[p.method]}</td><td>R$ ${p.amount.toFixed(2)}</td></tr>`)
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
              <p>Data: ${new Date().toLocaleString("pt-BR")}</p>
              <table>
                <thead><tr><th>Item</th><th>Qtd</th><th>Unit</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <table>
                <thead><tr><th>Cliente</th><th>Valor</th></tr></thead>
                <tbody>${chargesHtml}</tbody>
              </table>
              ${paymentsHtml ? `<table><thead><tr><th>Pagamento</th><th>Valor</th></tr></thead><tbody>${paymentsHtml}</tbody></table>` : ""}
              <p class="total">Total: R$ ${(close.total ?? 0).toFixed(2)}</p>
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
        win.print();
        win.close();
      }

      setClosingOpen(false);
      setCloseError(null);
      setPayments([{ method: "cash", amount: "" }]);
      tabDetailQuery.refetch();
    },
    onError: (error: unknown) => {
      setCloseError(error instanceof Error ? error.message : "Erro ao fechar comanda.");
    }
  });

  if (tabDetailQuery.isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/tabs" className="hover:text-slate-700">Comandas</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Carregando...</span>
        </div>
        <p className="text-sm text-slate-500">Carregando detalhes da comanda...</p>
      </section>
    );
  }

  if (!tab) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/tabs" className="hover:text-slate-700">Comandas</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Não encontrada</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">Comanda não encontrada.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/tabs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Comandas
        </Button>
      </section>
    );
  }

  const isOpen = tab.status === "open";
  const isCredit = tab.type === "credit";

  // Agrupa participantes por item
  const participantsByItem = participants.reduce<Record<string, TabItemParticipant[]>>((acc, p) => {
    if (!acc[p.tabItemId]) acc[p.tabItemId] = [];
    acc[p.tabItemId].push(p);
    return acc;
  }, {});

  return (
    <section className="space-y-5">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/tabs" className="hover:text-slate-700 hover:underline">
            Comandas
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-700">#{tab.id.slice(0, 8)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/tabs")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          <h2 className="text-2xl font-semibold">
            Comanda #{tab.id.slice(0, 8)}
          </h2>

          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isOpen ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"
            }`}
          >
            {isOpen ? "ABERTA" : "FECHADA"}
          </span>

          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isCredit ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
            }`}
          >
            {isCredit ? (
              <span className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                CRÉDITO
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                PRÉ-PAGO
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Grid de cards informativos */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card: Dados da Comanda */}
        <div className="rounded-2xl border border-brand-100 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Receipt className="h-5 w-5 text-brand-500" />
            <h3 className="font-semibold">Dados da Comanda</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-mono text-xs text-right break-all text-slate-700">{tab.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1 text-slate-500">
                <Hash className="h-3.5 w-3.5" />
                Identificador
              </dt>
              <dd className="font-semibold text-slate-700">{tab.identifierCode}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1 text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Abertura
              </dt>
              <dd className="text-slate-700">{new Date(tab.openedAt).toLocaleString("pt-BR")}</dd>
            </div>
            {tab.closedAt && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Fechamento</dt>
                <dd className="text-slate-700">{new Date(tab.closedAt).toLocaleString("pt-BR")}</dd>
              </div>
            )}
            {tab.closedAt && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Duração</dt>
                <dd className="font-semibold text-slate-700">{formatDuration(tab.openedAt, tab.closedAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Card: Cliente */}
        <div className="rounded-2xl border border-brand-100 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="h-5 w-5 text-brand-500" />
            <h3 className="font-semibold">Cliente</h3>
          </div>
          {customer ? (
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Nome</dt>
                <dd className="font-semibold text-slate-700">{customer.name}</dd>
              </div>
              {customer.cpf && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">CPF</dt>
                  <dd className="text-slate-700">{customer.cpf}</dd>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Telefone</dt>
                  <dd className="text-slate-700">{customer.phone}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Carregando dados do cliente...</p>
          )}
        </div>

        {/* Card: Resumo Financeiro */}
        <div className="rounded-2xl border border-brand-100 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <ShoppingBag className="h-5 w-5 text-brand-500" />
            <h3 className="font-semibold">Resumo Financeiro</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Itens</dt>
              <dd className="text-slate-700">{items.length}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Total</dt>
              <dd className="text-xl font-bold text-slate-900">
                R$ {totalItems.toFixed(2)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Tipo</dt>
              <dd className={`font-semibold ${isCredit ? "text-orange-600" : "text-blue-600"}`}>
                {isCredit ? "Crédito (pós-pago)" : "Pré-pago (saldo)"}
              </dd>
            </div>
          </dl>

          {isOpen && (
            <Button
              className="mt-2 w-full"
              onClick={() => {
                setCloseError(null);
                setClosingOpen(true);
              }}
            >
              Fechar comanda
            </Button>
          )}
        </div>
      </div>

      {/* Tabela: Itens da Comanda */}
      <div className="rounded-2xl border border-brand-100 bg-white">
        <div className="flex items-center gap-2 border-b border-brand-100 px-4 py-3">
          <ShoppingBag className="h-4 w-4 text-brand-500" />
          <h3 className="font-semibold text-slate-700">Itens da Comanda</h3>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Nenhum item registrado nesta comanda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Qtd</th>
                  <th className="px-4 py-3 text-right">Unitário</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Data/Hora</th>
                  <th className="px-4 py-3 text-left">Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const itemParticipants = participantsByItem[item.id] ?? [];
                  return (
                    <Fragment key={item.id}>
                      <tr className="text-slate-600 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{resolveItemLabel(item)}</td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">R$ {Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          R$ {Number(item.total).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {item.startAt && item.endAt ? (
                            <span>
                              {new Date(item.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {" → "}
                              {new Date(item.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {" "}
                              <span className="text-slate-400">({formatDuration(item.startAt, item.endAt)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Sub-linha: participantes deste item */}
                      {itemParticipants.length > 0 && (
                        <tr key={`${item.id}-participants`} className="bg-slate-50/60">
                          <td colSpan={6} className="px-4 py-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Users className="h-3.5 w-3.5" />
                              <span className="font-semibold">Divisão de conta:</span>
                              <div className="flex flex-wrap gap-2">
                                {itemParticipants.map((p) => (
                                  <span
                                    key={p.id}
                                    className="rounded-lg bg-white border border-slate-200 px-2 py-0.5"
                                  >
                                    {resolveCustomerName(p.customerId)}{" "}
                                    <strong>R$ {Number(p.amount).toFixed(2)}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                    R$ {totalItems.toFixed(2)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de fechamento */}
      {closingOpen && (
        <CloseTabModal
          tab={tab}
          total={totalItems}
          payments={payments}
          setPayments={setPayments}
          paymentSum={paymentSum}
          paymentRemaining={paymentRemaining}
          paymentDiff={paymentDiff}
          cashOpen={Boolean(cashOpenQuery.data?.data)}
          closeError={closeError}
          isPending={closeMutation.isPending}
          onClose={() => {
            setClosingOpen(false);
            setCloseError(null);
            setPayments([{ method: "cash", amount: "" }]);
          }}
          onConfirm={(parsed) => {
            setCloseError(null);
            closeMutation.mutate({ tabId: tab.id, payments: parsed });
          }}
        />
      )}
    </section>
  );
}

interface CloseTabModalProps {
  tab: Tab;
  total: number;
  payments: PaymentRow[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRow[]>>;
  paymentSum: number;
  paymentRemaining: number;
  paymentDiff: number;
  cashOpen: boolean;
  closeError: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (payments: Array<{ method: PaymentMethod; amount: number }>) => void;
}

function CloseTabModal({
  tab,
  total,
  payments,
  setPayments,
  paymentSum,
  paymentRemaining,
  paymentDiff,
  cashOpen,
  closeError,
  isPending,
  onClose,
  onConfirm
}: CloseTabModalProps) {
  if (typeof document === "undefined") return null;

  const isCredit = tab.type === "credit";

  const handleConfirm = () => {
    const parsed = payments
      .map((p) => ({ method: p.method, amount: parseCurrencyInput(p.amount) }))
      .filter((p) => p.amount > 0);

    if (isCredit && !parsed.length) {
      return;
    }

    onConfirm(parsed.length ? parsed : []);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/50"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))"
      }}
    >
      <div
        className="mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Fechar Comanda #{tab.id.slice(0, 8)}</h3>
          <button className="text-sm text-slate-500 hover:text-slate-700" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Total da comanda:{" "}
            <strong className="text-slate-900">R$ {total.toFixed(2)}</strong>
          </div>

          {isCredit && !cashOpen && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Caixa fechado. Abra o caixa para concluir o pagamento.
            </div>
          )}

          {isCredit && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700">Formas de pagamento</h4>
              {payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={payment.method}
                    onChange={(e) => {
                      const value = e.target.value as PaymentMethod;
                      setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, method: value } : p)));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="debit">Débito</option>
                    <option value="credit">Crédito</option>
                    <option value="pix">Pix</option>
                  </select>
                  <input
                    value={payment.amount}
                    onChange={(e) => {
                      const value = formatCurrencyInput(e.target.value);
                      setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, amount: value } : p)));
                    }}
                    placeholder="Valor"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPayments((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayments((prev) => [...prev, { method: "cash", amount: "" }])}
              >
                + Adicionar forma
              </Button>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                Recebido:{" "}
                <strong>R$ {paymentSum.toFixed(2)}</strong>{" "}
                <span className={paymentDiff > 0.01 ? "text-amber-600" : "text-emerald-600"}>
                  {paymentDiff > 0.01
                    ? `(Diferença R$ ${paymentRemaining.toFixed(2)})`
                    : "(OK)"}
                </span>
              </div>
            </div>
          )}

          {!isCredit && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
              Comanda pré-paga: o saldo será debitado automaticamente do cliente.
            </div>
          )}

          {closeError && (
            <p className="flex items-center gap-1 text-sm text-rose-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {closeError}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={
              isPending ||
              (isCredit && (!cashOpen || paymentDiff > 0.01))
            }
            onClick={handleConfirm}
          >
            {isPending ? "Fechando..." : "Confirmar fechamento"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
