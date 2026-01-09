import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Nfc } from "lucide-react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { useNfcReader } from "../../hooks/useNfcReader";
import { ScannerModal } from "../../components/ScannerModal";
import { formatCurrencyInput, parseCurrencyInput } from "../../utils/currency";

interface Customer {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
}

type IdentifierType = "nfc" | "barcode" | "qr" | "manual";
type TabType = "credit" | "prepaid";

export function AdminIdentifiers() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [identifierType, setIdentifierType] = useState<IdentifierType>("nfc");
  const [identifierCode, setIdentifierCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"qr" | "barcode">("qr");
  const [tabType, setTabType] = useState<TabType>("prepaid");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const nfc = useNfcReader();
  const lastAutoLinkRef = useRef<string | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Customer[] }>("/api/customers")
  });

  const filteredCustomers = useMemo(() => {
    if (!search) return customersQuery.data?.data ?? [];
    const term = search.toLowerCase();
    return (customersQuery.data?.data ?? []).filter((customer) => customer.name.toLowerCase().includes(term));
  }, [search, customersQuery.data?.data]);

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          cpf: cpf ? onlyDigits(cpf) : null,
          birthDate: birthDate ? toIsoDate(birthDate) : null,
          phone: phone ? onlyDigits(phone) : null,
          creditLimit: parseCurrencyInput(creditLimit)
        })
      });
    }
  });

  const linkIdentifierMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return apiFetch(`/api/customers/${customerId}/activate-tag`, {
        method: "POST",
        body: JSON.stringify({ type: identifierType, code: identifierCode, tabType })
      });
    },
    onSuccess: () => {
      setError(null);
      setSuccessOpen(true);
      setSelectedCustomerId(null);
      setSearch("");
      setIdentifierCode("");
      setTabType("prepaid");
      nfc.clear();
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }
  });

  const handleSubmit = async () => {
    setError(null);
    if (!identifierCode.trim()) {
      setError("Informe o codigo do identificador.");
      return;
    }

    let customerId = selectedCustomerId;
    if (mode === "new") {
      if (!name.trim()) {
        setError("Informe o nome do cliente.");
        return;
      }
      const created = await createCustomerMutation.mutateAsync();
      customerId = created.id;
      setName("");
      setCpf("");
      setBirthDate("");
      setPhone("");
      setCreditLimit("");
    }

    if (!customerId) {
      setError("Selecione um cliente.");
      return;
    }

    await linkIdentifierMutation.mutateAsync(customerId);
  };

  useEffect(() => {
    if (identifierType === "nfc") {
      setIdentifierCode("");
      setError(null);
      lastAutoLinkRef.current = null;
      nfc.start();
    } else {
      nfc.stop();
    }
  }, [identifierType, nfc]);

  useEffect(() => {
    if (!nfc.data) return;
    setIdentifierCode(nfc.data);
    if (identifierType !== "nfc") return;
    if (lastAutoLinkRef.current === nfc.data) return;
    if (mode === "existing" && !selectedCustomerId) {
      setError("Selecione um cliente antes de aproximar o NFC.");
      return;
    }
    if (mode === "new" && !name.trim()) {
      setError("Informe o nome antes de aproximar o NFC.");
      return;
    }
    lastAutoLinkRef.current = nfc.data;
    handleSubmit().catch(() => null);
  }, [nfc.data]);

  useEffect(() => {
    if (!successOpen) return;
    const timer = setTimeout(() => setSuccessOpen(false), 2000);
    return () => clearTimeout(timer);
  }, [successOpen]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Vincular identificador</h2>
        <p className="text-sm text-slate-600">Vincule pulseira/cartao antes de iniciar vendas.</p>
      </header>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>
            Cliente existente
          </Button>
          <Button variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
            Novo cliente
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            {mode === "existing" ? (
              <>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar cliente por nome"
                  className="w-full rounded-xl border border-brand-100 px-3 py-2"
                />
                <div className="flex flex-wrap gap-2">
                  {filteredCustomers.slice(0, 8).map((customer) => (
                    <Button
                      key={customer.id}
                      size="sm"
                      variant={selectedCustomerId === customer.id ? "default" : "outline"}
                      onClick={() => setSelectedCustomerId(customer.id)}
                    >
                      {customer.name}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome do cliente"
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
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-brand-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Aguardando NFC</p>
                  <p className="text-xs text-slate-500">Encoste a pulseira/cartao para ler automaticamente.</p>
                </div>
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-200 opacity-70" />
                  <Nfc className="relative h-5 w-5" />
                </span>
              </div>
              <div
                className={`mt-3 rounded-xl border px-3 py-3 text-sm ${
                  nfc.status === "lido"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : nfc.status.includes("erro")
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-dashed border-emerald-200 bg-white text-slate-600"
                }`}
              >
                {nfc.status === "lido" && identifierCode
                  ? `Leitura OK: ${identifierCode}`
                  : nfc.status.includes("erro")
                    ? "Falha ao ler NFC. Tente novamente."
                    : "Aguardando leitura NFC..."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant={identifierType === "nfc" ? "default" : "outline"} onClick={() => setIdentifierType("nfc")}>
                NFC
              </Button>
              <Button size="sm" variant={identifierType === "barcode" ? "default" : "outline"} onClick={() => { setIdentifierType("barcode"); setScannerMode("barcode"); setScannerOpen(true); }}>
                Codigo de barras
              </Button>
              <Button size="sm" variant={identifierType === "qr" ? "default" : "outline"} onClick={() => { setIdentifierType("qr"); setScannerMode("qr"); setScannerOpen(true); }}>
                QR Code
              </Button>
              <Button size="sm" variant={identifierType === "manual" ? "default" : "outline"} onClick={() => setIdentifierType("manual")}>
                Numeracao
              </Button>
            </div>

            {identifierType !== "nfc" ? (
              <input
                value={identifierCode}
                onChange={(event) => setIdentifierCode(event.target.value)}
                placeholder="Codigo do identificador"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
            ) : null}
            <select
              value={tabType}
              onChange={(event) => setTabType(event.target.value as TabType)}
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            >
              <option value="prepaid">Identificador pre-pago (saldo antecipado)</option>
              <option value="credit">Identificador credito (acerto no final)</option>
            </select>
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            {successOpen ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Identificador vinculado com sucesso.
              </div>
            ) : null}
            <Button onClick={handleSubmit} disabled={linkIdentifierMutation.isPending}>
              {linkIdentifierMutation.isPending ? "Vinculando..." : "Vincular identificador"}
            </Button>
          </div>
        </div>
      </div>

      <ScannerModal
        open={scannerOpen}
        mode={scannerMode}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => setIdentifierCode(value)}
      />
    </section>
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
