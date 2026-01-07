import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface Service {
  id: string;
  name: string;
  price: string;
  unit: string;
}

export function AdminServices() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("hora");

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiFetch<{ data: Service[] }>("/api/services")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Service>("/api/services", {
        method: "POST",
        body: JSON.stringify({ name, price: Number(price), unit })
      });
    },
    onSuccess: () => {
      setName("");
      setPrice("");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    }
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Servicos</h2>
        <p className="text-sm text-slate-600">Cadastro de servicos e precos.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo servico</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Preco"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="Unidade"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar servico"}
        </Button>
      </div>
      <div className="grid gap-3">
        {servicesQuery.data?.data?.map((service) => (
          <div key={service.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold">{service.name}</h3>
            <p className="text-sm text-slate-600">R$ {service.price} / {service.unit}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
