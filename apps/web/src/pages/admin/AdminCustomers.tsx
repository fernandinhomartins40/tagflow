import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../components/ui/button";
import { Nfc, Barcode, QrCode, Hash } from "lucide-react";
import { apiFetch } from "../../services/api";
import { ScannerModal } from "../../components/ScannerModal";
import { AddCreditModal, type PaymentMethod } from "../../components/AddCreditModal";
import { useNfcReader } from "../../hooks/useNfcReader";
import { PlanLimitsDisplay } from "../../components/PlanLimitsDisplay";
import { createCustomerSchema, type CreateCustomerInput } from "../../schemas/customer";
import type { Customer, Branch, PaginatedResponse } from "../../types/api";

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
  return digit === parseInt(digits[10]);
};

export function AdminCustomers() {
  const queryClient = useQueryClient();

  // Estado para campos com máscara
  const [cpfMasked, setCpfMasked] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [birthDateMasked, setBirthDateMasked] = useState("");
  const [creditLimitMasked, setCreditLimitMasked] = useState("");

  // React Hook Form com validação Zod
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      birthDate: "",
      creditLimit: 0,
      branchId: ""
    }
  });

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
    mutationFn: async (data: CreateCustomerInput) => {
      // Remover máscaras e preparar dados
      const payload: any = {
        name: data.name.trim(),
        cpf: data.cpf.replace(/\D/g, ""),
        phone: data.phone.replace(/\D/g, "")
      };

      // Adicionar email apenas se preenchido
      if (data.email && data.email.trim()) {
        payload.email = data.email.trim();
      }

      // Converter birthDate para ISO format
      if (data.birthDate && data.birthDate.trim()) {
        const dateDigits = data.birthDate.replace(/\D/g, "");
        if (dateDigits.length === 8) {
          const day = dateDigits.slice(0, 2);
          const month = dateDigits.slice(2, 4);
          const year = dateDigits.slice(4, 8);
          payload.birthDate = `${year}-${month}-${day}`;
        }
      }

      // Adicionar creditLimit se maior que 0
      if (data.creditLimit && data.creditLimit > 0) {
        payload.creditLimit = data.creditLimit;
      }

      // Adicionar branchId se preenchido
      if (data.branchId && data.branchId !== "") {
        payload.branchId = data.branchId;
      }

      console.log("=== REACT HOOK FORM PAYLOAD ===");
      console.log(JSON.stringify(payload, null, 2));

      return apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      // Limpar formulário
      reset();
      setCpfMasked("");
      setPhoneMasked("");
      setBirthDateMasked("");
      setCreditLimitMasked("");

      // Recarregar lista
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
    mutationFn: async ({ id, type, code, tabType }: { id: string; type: string; code: string; tabType: string }) => {
      return apiFetch(`/api/customers/${id}/activate-tag`, {
        method: "POST",
        body: JSON.stringify({ type, code, tabType })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-identifiers"] });
    }
  });

  // Handlers de mudança com máscara
  const handleCpfChange = (value: string) => {
    const masked = maskCpf(value);
    setCpfMasked(masked);
    const digits = value.replace(/\D/g, "");
    setValue("cpf", digits, {
      shouldValidate: true,
      shouldDirty: true
    });
  };

  const handlePhoneChange = (value: string) => {
    const masked = maskPhone(value);
    setPhoneMasked(masked);
    const digits = value.replace(/\D/g, "");
    setValue("phone", digits, {
      shouldValidate: true,
      shouldDirty: true
    });
  };

  const handleBirthDateChange = (value: string) => {
    const masked = maskDate(value);
    setBirthDateMasked(masked);
    setValue("birthDate", masked, {
      shouldValidate: true,
      shouldDirty: true
    });
  };

  const handleCreditLimitChange = (value: string) => {
    const masked = formatCurrency(value);
    setCreditLimitMasked(masked);
    const digits = value.replace(/\D/g, "");
    const amount = digits ? Number(digits) / 100 : 0;
    setValue("creditLimit", amount, {
      shouldValidate: true,
      shouldDirty: true
    });
  };

  // Submit handler
  const onSubmit = handleSubmit(async (data) => {
    // Validação adicional de CPF
    if (!isValidCpf(data.cpf)) {
      console.error("CPF inválido:", data.cpf);
      return;
    }

    await createMutation.mutateAsync(data);
  });

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

      <form onSubmit={onSubmit} className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo cliente</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <input
              {...register("name")}
              placeholder="Nome *"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>

          <div>
            <input
              value={cpfMasked}
              onChange={(e) => handleCpfChange(e.target.value)}
              placeholder="CPF *"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            {errors.cpf && <p className="mt-1 text-xs text-rose-500">{errors.cpf.message}</p>}
          </div>

          <div>
            <input
              value={birthDateMasked}
              onChange={(e) => handleBirthDateChange(e.target.value)}
              placeholder="Nascimento (DD/MM/AAAA)"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            {errors.birthDate && <p className="mt-1 text-xs text-rose-500">{errors.birthDate.message}</p>}
          </div>

          <div>
            <input
              value={phoneMasked}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Telefone/WhatsApp *"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
          </div>

          <div>
            <input
              {...register("email")}
              placeholder="Email (opcional)"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
          </div>

          <div>
            <input
              value={creditLimitMasked}
              onChange={(e) => handleCreditLimitChange(e.target.value)}
              placeholder="Limite de crédito (pós-pago)"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            {errors.creditLimit && <p className="mt-1 text-xs text-rose-500">{errors.creditLimit.message}</p>}
          </div>

          {branchesQuery.data?.data && branchesQuery.data.data.length > 0 && (
            <div>
              <select
                {...register("branchId")}
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              >
                <option value="">Todas as filiais</option>
                {branchesQuery.data.data.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {errors.branchId && <p className="mt-1 text-xs text-rose-500">{errors.branchId.message}</p>}
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="mt-3"
          disabled={isSubmitting || createMutation.isPending}
        >
          {isSubmitting || createMutation.isPending ? "Salvando..." : "Adicionar cliente"}
        </Button>
      </form>

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
              onLink={(type, code, tabType) => linkIdentifierMutation.mutate({ id: customer.id, type, code, tabType })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function IdentifierLinker({ customerId, onLink }: { customerId: string; onLink: (type: string, code: string, tabType: string) => void }) {
  const [type, setType] = useState<"nfc" | "barcode" | "qr" | "manual">("nfc");
  const [code, setCode] = useState("");
  const [tabType, setTabType] = useState<"prepaid" | "credit">("prepaid");
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"qr" | "barcode">("qr");

  // Query para buscar identificadores vinculados
  const identifiersQuery = useQuery({
    queryKey: ["customer-identifiers", customerId],
    queryFn: async () => {
      const res = await apiFetch(`/api/customers/${customerId}/identifiers`);
      return res.json();
    }
  });

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

      {/* Seletor de tipo de comanda */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">Tipo de comanda:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTabType("prepaid")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              tabType === "prepaid"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Pré-pago
          </button>
          <button
            type="button"
            onClick={() => setTabType("credit")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              tabType === "credit"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Crédito
          </button>
        </div>
      </div>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={`Codigo para ${customerId.slice(0, 6)}...`}
        className="w-full rounded-xl border border-brand-100 px-3 py-2"
      />
      <Button size="sm" onClick={() => onLink(type, code, tabType)}>
        Vincular
      </Button>

      {/* Lista de identificadores vinculados */}
      {identifiersQuery.data?.identifiers && identifiersQuery.data.identifiers.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Identificadores vinculados:</p>
          <div className="space-y-1">
            {identifiersQuery.data.identifiers.map((identifier: any) => (
              <div
                key={identifier.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-mono text-slate-700">
                    {identifier.type.toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-900">{identifier.code}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    identifier.tabType === "credit"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {identifier.tabType === "credit" ? "Crédito" : "Pré-pago"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {nfcDialogOpen && (
        <NfcDialog
          onClose={() => setNfcDialogOpen(false)}
          onRead={(value) => {
            setCode(value);
            onLink(type, value, tabType);
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
