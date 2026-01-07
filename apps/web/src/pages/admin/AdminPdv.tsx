import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { ScannerModal } from "../../components/ScannerModal";
import { useNfcReader } from "../../hooks/useNfcReader";

interface Customer {
  id: string;
  name: string;
  credits: string;
}

export function AdminPdv() {
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [items, setItems] = useState<Array<{ productId?: string; serviceId?: string; quantity: string; unitPrice: string }>>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [splitParticipants, setSplitParticipants] = useState<Array<{ customerId: string; amount: string }>>([]);
  const nfc = useNfcReader();

  const lookupQuery = useQuery({
    queryKey: ["customer-by-identifier", identifier],
    queryFn: () => apiFetch<{ data: Customer | null }>(`/api/customers/by-identifier/${identifier}`),
    enabled: Boolean(identifier)
  });

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string; price: string }> }>("/api/products")
  });

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string; price: string }> }>("/api/services")
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/customers")
  });

  const consumeMutation = useMutation({
    mutationFn: async () => {
      const customer = lookupQuery.data?.data;
      if (!customer) {
        throw new Error("Cliente nao encontrado");
      }
      return apiFetch("/api/transactions/consume", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          amount: Number(amount),
          items: items
            .filter((item) => item.quantity && item.unitPrice && (item.productId || item.serviceId))
            .map((item) => ({
              productId: item.productId || undefined,
              serviceId: item.serviceId || undefined,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice)
            }))
        })
      });
    }
  });

  const splitMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/api/transactions/split", {
        method: "POST",
        body: JSON.stringify({
          participants: splitParticipants
            .filter((participant) => participant.customerId && participant.amount)
            .map((participant) => ({ customerId: participant.customerId, amount: Number(participant.amount) }))
        })
      });
    }
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">PDV</h2>
        <p className="text-sm text-slate-600">Identifique o cliente e registre consumo.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <label className="text-xs uppercase tracking-[0.2em] text-brand-400">Identificador</label>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="NFC, codigo de barras ou numero"
          className="mt-2 w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => lookupQuery.refetch()}>Buscar cliente</Button>
          <Button variant="outline" onClick={() => nfc.start()}>
            Ler NFC
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            Scan camera
          </Button>
        </div>
        {nfc.data ? (
          <div className="mt-3 rounded-xl bg-brand-50 p-3">
            <p className="text-sm text-slate-600">NFC lido: {nfc.data}</p>
            <Button className="mt-2" size="sm" onClick={() => setIdentifier(nfc.data ?? "")}>
              Usar identificador
            </Button>
          </div>
        ) : null}
        {lookupQuery.data?.data ? (
          <div className="mt-4 rounded-xl bg-brand-50 p-3">
            <p className="text-sm text-slate-600">Cliente: {lookupQuery.data.data.name}</p>
            <p className="text-sm text-slate-600">Saldo: R$ {lookupQuery.data.data.credits}</p>
          </div>
        ) : null}
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Itens</h3>
        <p className="text-sm text-slate-600">Adicione produtos e servicos rapidamente.</p>
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={`${index}-item`} className="grid gap-2 md:grid-cols-4">
              <select
                value={item.productId || ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const selected = productsQuery.data?.data?.find((product) => product.id === value);
                  const copy = [...items];
                  copy[index] = {
                    ...copy[index],
                    productId: value || undefined,
                    serviceId: undefined,
                    unitPrice: selected?.price ?? item.unitPrice
                  };
                  setItems(copy);
                }}
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              >
                <option value="">Produto</option>
                {productsQuery.data?.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <select
                value={item.serviceId || ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const selected = servicesQuery.data?.data?.find((service) => service.id === value);
                  const copy = [...items];
                  copy[index] = {
                    ...copy[index],
                    serviceId: value || undefined,
                    productId: undefined,
                    unitPrice: selected?.price ?? item.unitPrice
                  };
                  setItems(copy);
                }}
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              >
                <option value="">Servico</option>
                {servicesQuery.data?.data?.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <input
                value={item.quantity}
                onChange={(event) => {
                  const copy = [...items];
                  copy[index] = { ...copy[index], quantity: event.target.value };
                  setItems(copy);
                }}
                placeholder="Qtd"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              <input
                value={item.unitPrice}
                onChange={(event) => {
                  const copy = [...items];
                  copy[index] = { ...copy[index], unitPrice: event.target.value };
                  setItems(copy);
                }}
                placeholder="Preco unit"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setItems([...items, { quantity: "1", unitPrice: "" }])}>
            Adicionar item
          </Button>
        </div>
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Valor total"
          className="mt-2 w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => {
            const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
            setAmount(total.toFixed(2));
          }}
        >
          Calcular total
        </Button>
        <Button className="mt-3" onClick={() => consumeMutation.mutate()}>
          {consumeMutation.isPending ? "Registrando..." : "Registrar consumo"}
        </Button>
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Divisao de conta</h3>
        <p className="text-sm text-slate-600">Distribua valores entre varios clientes.</p>
        <div className="mt-3 space-y-2">
          {splitParticipants.map((participant, index) => (
            <div key={`${participant.customerId}-${index}`} className="grid gap-2 md:grid-cols-3">
              <select
                value={participant.customerId}
                onChange={(event) => {
                  const copy = [...splitParticipants];
                  copy[index] = { ...copy[index], customerId: event.target.value };
                  setSplitParticipants(copy);
                }}
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              >
                <option value="">Cliente</option>
                {lookupQuery.data?.data ? (
                  <option value={lookupQuery.data.data.id}>{lookupQuery.data.data.name}</option>
                ) : null}
                {customersQuery.data?.data?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <input
                value={participant.amount}
                onChange={(event) => {
                  const copy = [...splitParticipants];
                  copy[index] = { ...copy[index], amount: event.target.value };
                  setSplitParticipants(copy);
                }}
                placeholder="Valor"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSplitParticipants(splitParticipants.filter((_, i) => i !== index))}
              >
                Remover
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSplitParticipants([...splitParticipants, { customerId: "", amount: "" }])}
          >
            Adicionar participante
          </Button>
        </div>
        <Button className="mt-3" onClick={() => splitMutation.mutate()}>
          {splitMutation.isPending ? "Dividindo..." : "Registrar divisao"}
        </Button>
      </div>
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => setIdentifier(value)}
      />
    </section>
  );
}
