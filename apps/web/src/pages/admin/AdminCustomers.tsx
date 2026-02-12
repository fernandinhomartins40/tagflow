import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/button";
import { Nfc, Barcode, QrCode, Hash } from "lucide-react";
import { apiFetch } from "../../services/api";
import { ScannerModal } from "../../components/ScannerModal";
import { AddCreditModal, type PaymentMethod } from "../../components/AddCreditModal";
import { useNfcReader } from "../../hooks/useNfcReader";
import { PlanLimitsDisplay } from "../../components/PlanLimitsDisplay";
import type { Customer, Branch, PaginatedResponse } from "../../types/api";

export function AdminCustomers() {
  const queryClient = useQueryClient();

  // Estados do formulário
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [branchId, setBranchId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<PaginatedResponse<Customer>>("/api/customers")
  });

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<PaginatedResponse<Branch>>("/api/branches")
  });

  // Mutation para criar cliente
  const createMutation = useMutation({
    mutationFn: async () => {
      // Remover máscaras - apenas dígitos
      const cpfDigits = cpf.replace(/\D/g, "");
      const phoneDigits = phone.replace(/\D/g, "");

      // Construir payload básico com campos obrigatórios
      const payload: Record<string, any> = {
        name: name.trim(),
        cpf: cpfDigits,
        phone: phoneDigits
      };

      // Adicionar email apenas se preenchido
      if (email.trim()) {
        payload.email = email.trim();
      }

      // Adicionar birthDate apenas se preenchido e válido
      if (birthDate.trim()) {
        const dateDigits = birthDate.replace(/\D/g, "");
        if (dateDigits.length === 8) {
          const day = dateDigits.slice(0, 2);
          const month = dateDigits.slice(2, 4);
          const year = dateDigits.slice(4, 8);
          payload.birthDate = `${year}-${month}-${day}`;
        }
      }

      // Adicionar creditLimit apenas se preenchido
      if (creditLimit.trim()) {
        const limitDigits = creditLimit.replace(/\D/g, "");
        if (limitDigits) {
          payload.creditLimit = Number(limitDigits) / 100;
        }
      }

      // Adicionar branchId apenas se selecionado
      if (branchId && branchId !== "") {
        payload.branchId = branchId;
      }

      console.log("=== PAYLOAD CRIACAO CLIENTE ===");
      console.log(JSON.stringify(payload, null, 2));

      const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": localStorage.getItem("tenantId") || ""
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Erro ao criar cliente");
      }

      return response.json();
    },
    onSuccess: () => {
      // Limpar formulário
      setName("");
      setCpf("");
      setBirthDate("");
      setPhone("");
      setEmail("");
      setCreditLimit("");
      setBranchId("");
      setFormError(null);

      // Recarregar lista de clientes
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => {
      setFormError(error.message);
    }
  });

  // Mutation para adicionar créditos
  const addCreditsMutation = useMutation({
    mutationFn: async ({ id, amount, method }: { id: string; amount: number; method: PaymentMethod }) => {
      return apiFetch(`/api/customers/${id}/add-credits`, {
        method: "POST",
        body: JSON.stringify({ amount, paymentMethod: method })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] })
  });

  // Mutation para vincular identificador
  const linkIdentifierMutation = useMutation({
    mutationFn: async ({ id, type, code }: { id: string; type: string; code: string }) => {
      return apiFetch(`/api/customers/${id}/activate-tag`, {
        method: "POST",
        body: JSON.stringify({ type, code })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] })
  });

  // Funções de máscara
  const maskCpf = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const maskPhone = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const maskDate = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatCurrency = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const number = Number(digits) / 100;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Validação de CPF
  const isValidCpf = (cpfValue: string): boolean => {
    const digits = cpfValue.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(digits[10])) return false;

    return true;
  };

  // Validação de telefone
  const isValidPhone = (phoneValue: string): boolean => {
    const digits = phoneValue.replace(/\D/g, "");
    return digits.length >= 10;
  };

  // Validação de email
  const isValidEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) return true; // Email é opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  // Handler do submit
  const handleSubmit = () => {
    // Validações
    if (!name.trim()) {
      setFormError("Informe o nome do cliente.");
      return;
    }

    if (!isValidCpf(cpf)) {
      setFormError("CPF inválido. Verifique os dígitos verificadores.");
      return;
    }

    if (!isValidPhone(phone)) {
      setFormError("Informe um telefone válido com pelo menos 10 dígitos.");
      return;
    }

    if (!isValidEmail(email)) {
      setFormError("Email inválido.");
      return;
    }

    setFormError(null);
    createMutation.mutate();
  };

  // Formatar valores para exibição
  const formatDateDisplay = (value: string | null | undefined): string => {
    if (!value) return "-";
    if (value.includes("/")) return value;
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const formatCurrencyDisplay = (value: number | string | null | undefined): string => {
    const num = typeof value === "string" ? parseFloat(value) || 0 : value || 0;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-slate-600">Cadastro, identificadores e saldo.</p>
        </div>
        <PlanLimitsDisplay resource="customers" compact />
      </header>

      <PlanLimitsDisplay resource="customers" />

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo cliente</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome *"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            placeholder="CPF *"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={birthDate}
            onChange={(e) => setBirthDate(maskDate(e.target.value))}
            placeholder="Nascimento (DD/MM/AAAA)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="Telefone/WhatsApp *"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (opcional)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={creditLimit}
            onChange={(e) => setCreditLimit(formatCurrency(e.target.value))}
            placeholder="Limite de crédito (pós-pago)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          {branchesQuery.data?.data && branchesQuery.data.data.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            >
              <option value="">Todas as filiais</option>
              {branchesQuery.data.data.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {formError && <p className="mt-3 text-sm text-rose-500">{formError}</p>}
        <Button
          className="mt-3"
          onClick={handleSubmit}
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
            <p className="text-sm text-slate-600">Nascimento: {formatDateDisplay(customer.birthDate)}</p>
            <p className="text-sm text-slate-600">Telefone: {customer.phone ? maskPhone(customer.phone) : "-"}</p>
            <p className="text-sm text-slate-600">
              Saldo pré-pago: {formatCurrencyDisplay(customer.credits)}
            </p>
            <p className="text-sm text-slate-600">
              Limite de crédito (pós-pago): {formatCurrencyDisplay(customer.creditLimit)}
            </p>
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
              {isNfc && <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={`Codigo para ${customerId.slice(0, 6)}...`}
        className="w-full rounded-xl border border-brand-100 px-3 py-2"
      />
      <Button size="sm" onClick={() => onLink(type, code)}>
        Vincular
      </Button>
      {nfcDialogOpen && (
        <NfcDialog
          onClose={() => setNfcDialogOpen(false)}
          onRead={(value) => {
            setCode(value);
            onLink(type, value);
            setNfcDialogOpen(false);
          }}
        />
      )}
      {scannerOpen && (
        <ScannerModal
          open={scannerOpen}
          mode={scannerMode}
          onClose={() => setScannerOpen(false)}
          onScan={(value) => setCode(value)}
        />
      )}
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
