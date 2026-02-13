import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Nfc, Barcode, QrCode, Hash, CreditCard, Wallet, User } from "lucide-react";
import { apiFetch } from "../../services/api";
import { formatCurrencyInput, parseCurrencyInput } from "../../utils/currency";
import { ScannerModal } from "../../components/ScannerModal";
import { useNfcReader } from "../../hooks/useNfcReader";

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

interface Customer {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
}

type PaymentMethod = "cash" | "debit" | "credit" | "pix";
type IdentifierType = "nfc" | "barcode" | "qr" | "manual";

interface PaymentRow {
  method: PaymentMethod;
  amount: string;
}

export function AdminTabs() {
  const [identifierType, setIdentifierType] = useState<IdentifierType>("nfc");
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState<"credit" | "prepaid">("prepaid");
  const [closingTab, setClosingTab] = useState<Tab | null>(null);
  const [closeTotal, setCloseTotal] = useState(0);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([{ method: "cash", amount: "" }]);
  const [listError, setListError] = useState<string | null>(null);
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"qr" | "barcode">("qr");

  const tabsQuery = useQuery({
    queryKey: ["tabs"],
    queryFn: () => apiFetch<{ data: Tab[] }>("/api/tabs")
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

  const openMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Tab>("/api/tabs/open", {
        method: "POST",
        body: JSON.stringify({ identifier, type })
      });
    },
    onSuccess: () => {
      setIdentifier("");
      setListError(null);
      tabsQuery.refetch();
    },
    onError: (error: Error) => {
      setListError(error.message);
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
              <p>Data: ${new Date().toLocaleString("pt-BR")}</p>
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

  const getCustomerInfo = (customerId: string) => {
    return customersQuery.data?.data?.find((c) => c.id === customerId);
  };

  const paymentSum = payments.reduce((sum, payment) => sum + parseCurrencyInput(payment.amount), 0);
  const paymentRemaining = closeTotal - paymentSum;
  const paymentDiff = Math.abs(paymentRemaining);

  const identifierOptions = [
    { value: "nfc", label: "NFC", icon: Nfc },
    { value: "barcode", label: "Codigo", icon: Barcode },
    { value: "qr", label: "QR Code", icon: QrCode },
    { value: "manual", label: "Numeracao", icon: Hash }
  ] as const;

  const handleIdentifierSelect = (type: IdentifierType) => {
    setIdentifierType(type);
    if (type === "nfc") {
      setNfcDialogOpen(true);
    } else if (type === "barcode") {
      setScannerMode("barcode");
      setScannerOpen(true);
    } else if (type === "qr") {
      setScannerMode("qr");
      setScannerOpen(true);
    }
  };

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Comandas</h2>
        <p className="text-sm text-slate-600">Abra, acompanhe e feche comandas.</p>
      </header>
      {listError && <p className="text-sm text-rose-500">{listError}</p>}

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Buscar e abrir comanda</h3>

        {/* Seletor de tipo de identificador */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {identifierOptions.map((option) => {
            const active = identifierType === option.value;
            const isNfc = option.value === "nfc";
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleIdentifierSelect(option.value)}
                className={`flex aspect-square flex-col items-center justify-center rounded-2xl border px-2 text-xs font-semibold transition ${
                  active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100 bg-white text-slate-600"
                } ${isNfc ? "relative animate-pulse border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1">{option.label}</span>
                {isNfc && <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Digite ou escaneie o identificador"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "credit" | "prepaid")}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            <option value="prepaid">Pre-paga (saldo)</option>
            <option value="credit">Credito (fiado)</option>
          </select>
          <Button onClick={() => openMutation.mutate()} disabled={!identifier.trim() || openMutation.isPending}>
            {openMutation.isPending ? "Abrindo..." : "Abrir comanda"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {tabsQuery.data?.data?.map((tab) => {
          const customer = getCustomerInfo(tab.customerId);
          const isOpen = tab.status === "open";
          const isCredit = tab.type === "credit";

          return (
            <div
              key={tab.id}
              className={`rounded-2xl border p-4 ${
                isOpen
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      Comanda #{tab.id.slice(0, 8)}
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isOpen
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-400 text-white"
                    }`}>
                      {isOpen ? "ABERTA" : "FECHADA"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isCredit
                        ? "bg-orange-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}>
                      {isCredit ? (
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          CREDITO
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          PRE-PAGO
                        </span>
                      )}
                    </span>
                  </div>

                  {customer && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-slate-700">
                      <User className="h-4 w-4" />
                      <strong>{customer.name}</strong>
                      {customer.cpf && <span className="text-slate-500">• CPF: {customer.cpf}</span>}
                    </div>
                  )}

                  <p className="mt-1 text-sm text-slate-600">
                    <strong>Identificador:</strong> {tab.identifierCode}
                  </p>
                  <p className="text-xs text-slate-500">
                    Aberta em {new Date(tab.openedAt).toLocaleString("pt-BR")}
                  </p>
                  {tab.closedAt && (
                    <p className="text-xs text-slate-500">
                      Fechada em {new Date(tab.closedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/admin/tabs/${tab.id}`}>
                    <Button size="sm" variant="outline">
                      Ver detalhes
                    </Button>
                  </Link>
                  {isOpen && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setListError(null);
                        if (isCredit) {
                          setClosingTab(tab);
                          return;
                        }
                        closeMutation.mutate({ tabId: tab.id });
                      }}
                    >
                      Fechar comanda
                    </Button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* NFC Dialog */}
      {nfcDialogOpen && (
        <NfcDialog
          onClose={() => setNfcDialogOpen(false)}
          onRead={(value) => {
            setIdentifier(value);
            setNfcDialogOpen(false);
          }}
        />
      )}

      {/* Scanner Modal */}
      {scannerOpen && (
        <ScannerModal
          open={scannerOpen}
          mode={scannerMode}
          onClose={() => setScannerOpen(false)}
          onScan={(value) => {
            setIdentifier(value);
            setScannerOpen(false);
          }}
        />
      )}

      {/* Close Tab Modal */}
      {closingTab && (
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

            {!cashOpenQuery.data?.data && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                Caixa fechado. Abra o caixa para concluir o pagamento.
              </div>
            )}

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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="debit">Debito</option>
                    <option value="credit">Credito</option>
                    <option value="pix">Pix</option>
                  </select>
                  <input
                    value={payment.amount}
                    onChange={(e) => {
                      const value = formatCurrencyInput(e.target.value);
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

            {closeError && <p className="text-sm text-rose-500">{closeError}</p>}

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
      )}
    </section>
  );
}

function NfcDialog({ onClose, onRead }: { onClose: () => void; onRead: (value: string) => void }) {
  if (typeof document === "undefined") return null;
  const nfc = useNfcReader();
  const lastReadRef = useRef<string | null>(null);

  useEffect(() => {
    nfc.clear();
    nfc.start();
    return () => nfc.stop();
  }, []);

  useEffect(() => {
    if (!nfc.data) return;
    if (lastReadRef.current === nfc.data) return;
    lastReadRef.current = nfc.data;
    onRead(nfc.data);
  }, [nfc.data, onRead]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-emerald-200 opacity-70" />
          <Nfc className="relative h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Aguardando NFC</h3>
        <p className="mt-2 text-sm text-slate-600">Aproxime a pulseira/cartao para ler o identificador.</p>
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            nfc.status === "lido"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : nfc.status === "detectado"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : nfc.status.includes("erro")
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {nfc.status === "lido" && nfc.data
            ? `Leitura OK: ${nfc.data}`
            : nfc.status === "detectado"
              ? "NFC detectado, mas o identificador nao foi lido. Tente outro cartao."
              : nfc.status.includes("erro")
                ? "Falha ao ler NFC. Tente novamente."
                : "Aguardando leitura NFC..."}
        </div>
        <Button className="mt-4 w-full" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>,
    document.body
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
