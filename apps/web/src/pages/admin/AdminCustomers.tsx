import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/button";
import { Nfc, Barcode, QrCode, Hash } from "lucide-react";
import { apiFetch } from "../../services/api";
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from "../../utils/currency";
import { ScannerModal } from "../../components/ScannerModal";
import { AddCreditModal, type PaymentMethod } from "../../components/AddCreditModal";
import { useNfcReader } from "../../hooks/useNfcReader";

interface Customer {
  id: string;
  name: string;
  credits: string;
  cpf?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  creditLimit?: string | null;
}

export function AdminCustomers() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Customer[] }>("/api/customers")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name,
        cpf: onlyDigits(cpf),
        phone: onlyDigits(phone)
      };

      // Só adicionar campos opcionais se tiverem valor
      const isoDate = toIsoDate(birthDate);
      if (isoDate) payload.birthDate = isoDate;

      const limit = parseCurrencyInput(creditLimit);
      if (limit && limit > 0) payload.creditLimit = limit;

      return apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      setName("");
      setCpf("");
      setBirthDate("");
      setPhone("");
      setCreditLimit("");
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Falha ao cadastrar cliente.");
    }
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({ id, amount, method }: { id: string; amount: number; method: PaymentMethod }) => {
      return apiFetch(`/api/customers/${id}/add-credits`, {
        method: "POST",
        body: JSON.stringify({ amount, paymentMethod: method })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] })
  });

  const linkIdentifierMutation = useMutation({
    mutationFn: async ({ id, type, code }: { id: string; type: string; code: string }) => {
      return apiFetch(`/api/customers/${id}/activate-tag`, {
        method: "POST",
        body: JSON.stringify({ type, code })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] })
  });

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-slate-600">Cadastro, identificadores e saldo.</p>
        </div>
      </header>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo cliente</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={cpf}
            onChange={(event) => setCpf(maskCpf(event.target.value))}
            placeholder="CPF"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={birthDate}
            onChange={(event) => setBirthDate(maskDate(event.target.value))}
            placeholder="Nascimento (DD/MM/AAAA)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={phone}
            onChange={(event) => setPhone(maskPhone(event.target.value))}
            placeholder="Telefone/WhatsApp"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={creditLimit}
            onChange={(event) => setCreditLimit(formatCurrencyInput(event.target.value))}
            placeholder="Limite de credito (pos-pago)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        {formError ? <p className="mt-3 text-sm text-rose-500">{formError}</p> : null}
        <Button
          className="mt-3"
          onClick={() => {
            const cpfDigits = onlyDigits(cpf);
            const phoneDigits = onlyDigits(phone);
            if (!name.trim()) {
              setFormError("Informe o nome do cliente.");
              return;
            }
            if (cpfDigits.length !== 11) {
              setFormError("Informe um CPF valido.");
              return;
            }
            if (phoneDigits.length < 10) {
              setFormError("Informe um telefone valido.");
              return;
            }
            setFormError(null);
            createMutation.mutate();
          }}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Salvando..." : "Adicionar cliente"}
        </Button>
      </div>

      <div className="grid gap-4">
        {customersQuery.data?.data?.map((customer) => (
          <div key={customer.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
            <p className="text-sm text-slate-600">CPF: {customer.cpf ? maskCpf(customer.cpf) : "-"}</p>
            <p className="text-sm text-slate-600">Nascimento: {customer.birthDate ? formatDate(customer.birthDate) : "-"}</p>
            <p className="text-sm text-slate-600">Telefone: {customer.phone ? maskPhone(customer.phone) : "-"}</p>
            <p className="text-sm text-slate-600">Saldo pre-pago: R$ {customer.credits ?? 0}</p>
            <p className="text-sm text-slate-600">Limite de credito (pos-pago): R$ {customer.creditLimit ?? 0}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CreditAdder
                customerId={customer.id}
                onAdd={(amount, method) => addCreditsMutation.mutate({ id: customer.id, amount, method })}
              />
            </div>
            <IdentifierLinker
              customerId={customer.id}
              onLink={(type, code) => linkIdentifierMutation.mutate({ id: customer.id, type, code })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function IdentifierLinker({ customerId, onLink }: { customerId: string; onLink: (type: string, code: string) => void }) {
  const [type, setType] = useState<"nfc" | "barcode" | "qr" | "manual">("nfc");
  const [code, setCode] = useState("");
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"qr" | "barcode">("qr");

  const options = [
    { value: "nfc", label: "NFC", icon: Nfc },
    { value: "barcode", label: "Codigo", icon: Barcode },
    { value: "qr", label: "QR Code", icon: QrCode },
    { value: "manual", label: "Numeracao", icon: Hash }
  ] as const;

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => {
          const active = type === option.value;
          const isNfc = option.value === "nfc";
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setType(option.value);
                if (option.value === "nfc") {
                  setNfcDialogOpen(true);
                }
                if (option.value === "barcode") {
                  setScannerMode("barcode");
                  setScannerOpen(true);
                }
                if (option.value === "qr") {
                  setScannerMode("qr");
                  setScannerOpen(true);
                }
              }}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl border px-2 text-xs font-semibold transition ${
                active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-100 bg-white text-slate-600"
              } ${isNfc ? "relative animate-pulse border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1">{option.label}</span>
              {isNfc ? <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" /> : null}
            </button>
          );
        })}
      </div>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder={`Codigo para ${customerId.slice(0, 6)}...`}
        className="w-full rounded-xl border border-brand-100 px-3 py-2"
      />
      <Button size="sm" onClick={() => onLink(type, code)}>
        Vincular
      </Button>
      {nfcDialogOpen ? (
        <NfcDialog
          onClose={() => setNfcDialogOpen(false)}
          onRead={(value) => {
            setCode(value);
            onLink(type, value);
            setNfcDialogOpen(false);
          }}
        />
      ) : null}
      {scannerOpen ? (
        <ScannerModal
          open={scannerOpen}
          mode={scannerMode}
          onClose={() => setScannerOpen(false)}
          onScan={(value) => setCode(value)}
        />
      ) : null}
    </div>
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
        <p className="mt-2 text-sm text-slate-600">Encoste a pulseira/cartao para ler o identificador automaticamente.</p>
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskDate(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toIsoDate(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function CreditAdder({ customerId, onAdd }: { customerId: string; onAdd: (amount: number, method: PaymentMethod) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
        Adicionar credito pre-pago
      </Button>
      <AddCreditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={(amount, method) => onAdd(amount, method)}
      />
    </div>
  );
}
