import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface Branch {
  id: string;
  name: string;
  address?: string | null;
}

export function AdminBranches() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ data: Branch[] }>("/api/branches")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<Branch>("/api/branches", {
        method: "POST",
        body: JSON.stringify({ name, address })
      });
    },
    onSuccess: () => {
      setName("");
      setAddress("");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    }
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Filiais</h2>
        <p className="text-sm text-slate-600">Cadastre e gerencie unidades.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Nova filial</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Endereco"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar filial"}
        </Button>
      </div>
      <div className="grid gap-3">
        {branchesQuery.data?.data?.map((branch) => (
          <div key={branch.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold">{branch.name}</h3>
            <p className="text-sm text-slate-600">{branch.address ?? "-"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
