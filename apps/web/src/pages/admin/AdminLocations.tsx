import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface Location {
  id: string;
  name: string;
  type: string;
  price: string;
  capacity?: number | null;
}

export function AdminLocations() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("quadra");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch<{ data: Location[] }>("/api/locations")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Location>("/api/locations", {
        method: "POST",
        body: JSON.stringify({ name, type, price: Number(price), capacity: Number(capacity) })
      });
    },
    onSuccess: () => {
      setName("");
      setPrice("");
      setCapacity("");
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Locais</h2>
        <p className="text-sm text-slate-600">Gestao de locais para locacao.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo local</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={type}
            onChange={(event) => setType(event.target.value)}
            placeholder="Tipo"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="Capacidade"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Preco"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar local"}
        </Button>
      </div>
      <div className="grid gap-3">
        {locationsQuery.data?.data?.map((location) => (
          <div key={location.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold">{location.name}</h3>
            <p className="text-sm text-slate-600">{location.type}</p>
            <p className="text-sm text-slate-600">Capacidade: {location.capacity ?? "-"}</p>
            <p className="text-sm text-slate-600">R$ {location.price}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
