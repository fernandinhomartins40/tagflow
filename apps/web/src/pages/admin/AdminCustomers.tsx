import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface Customer {
  id: string;
  name: string;
  credits: string;
  email?: string;
}

export function AdminCustomers() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Customer[] }>("/api/customers")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name, email })
      });
    },
    onSuccess: () => {
      setName("");
      setEmail("");
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
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
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
            <p className="text-sm text-brand-400">{customer.email || "Sem email"}</p>
            <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
            <p className="text-sm text-slate-600">Saldo: R$ {customer.credits ?? 0}</p>
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
        <option value="manual">Manual</option>
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
        Adicionar credito
      </Button>
    </div>
  );
}
