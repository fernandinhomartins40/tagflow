import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

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

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Customer[] }>("/api/customers")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          cpf: cpf ? onlyDigits(cpf) : null,
          birthDate: birthDate ? toIsoDate(birthDate) : null,
          phone: phone ? onlyDigits(phone) : null,
          creditLimit: Number(creditLimit) || 0
        })
      });
    },
    onSuccess: () => {
      setName("");
      setCpf("");
      setBirthDate("");
      setPhone("");
      setCreditLimit("");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }
  });

  const addCreditsMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      return apiFetch(`/api/customers/${id}/add-credits`, {
        method: "POST",
        body: JSON.stringify({ amount })
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
            onChange={(event) => setCreditLimit(event.target.value)}
            placeholder="Limite de credito (pos-pago)"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
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
                onAdd={(amount) => addCreditsMutation.mutate({ id: customer.id, amount })}
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
  const [type, setType] = useState("nfc");
  const [code, setCode] = useState("");

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-3">
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        className="w-full rounded-xl border border-brand-100 px-3 py-2"
      >
        <option value="nfc">NFC</option>
        <option value="barcode">Codigo de barras</option>
        <option value="qr">QR Code</option>
        <option value="manual">Numeracao</option>
      </select>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder={`Codigo para ${customerId.slice(0, 6)}...`}
        className="w-full rounded-xl border border-brand-100 px-3 py-2"
      />
      <Button size="sm" onClick={() => onLink(type, code)}>
        Vincular
      </Button>
    </div>
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

function CreditAdder({ customerId, onAdd }: { customerId: string; onAdd: (amount: number) => void }) {
  const [amount, setAmount] = useState("50");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder={`Credito para ${customerId.slice(0, 6)}...`}
        className="w-32 rounded-xl border border-brand-100 px-3 py-2 text-sm"
      />
      <Button size="sm" variant="outline" onClick={() => onAdd(Number(amount))}>
        Adicionar credito pre-pago
      </Button>
    </div>
  );
}
