import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<{ data: User[] }>("/api/users")
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<User>("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role })
      });
    },
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Usuarios</h2>
        <p className="text-sm text-slate-600">Gerencie administradores e operadores.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Novo usuario</h3>
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
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-xl border border-brand-100 px-3 py-2"
          >
            <option value="operator">Operador</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </div>
        <Button className="mt-3" onClick={() => createMutation.mutate()}>
          {createMutation.isPending ? "Salvando..." : "Adicionar usuario"}
        </Button>
      </div>
      <div className="grid gap-3">
        {usersQuery.data?.data?.map((user) => (
          <div key={user.id} className="rounded-2xl border border-brand-100 bg-white p-4">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-sm text-slate-600">{user.email}</p>
            <p className="text-xs text-brand-500">{user.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
