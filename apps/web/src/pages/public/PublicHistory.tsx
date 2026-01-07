import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";

interface HistoryResponse {
  history: Array<{ id: string; type: string; amount: string; createdAt: string }>;
}

export function PublicHistory() {
  const [identifier, setIdentifier] = useState("");
  const [history, setHistory] = useState<HistoryResponse["history"]>([]);

  const historyMutation = useMutation({
    mutationFn: async () => apiFetch<HistoryResponse>(`/api/public/history/${identifier}`),
    onSuccess: (data) => setHistory(data.history)
  });

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Historico</h2>
        <p className="text-sm text-slate-600">Ultimas transacoes e consumos.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <label className="text-xs uppercase tracking-[0.2em] text-brand-400">Identificador</label>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Digite o identificador"
          className="mt-2 w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <Button className="mt-3" onClick={() => historyMutation.mutate()}>
          Buscar historico
        </Button>
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        {history.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma movimentacao encontrada.</p>
        ) : (
          history.map((item) => (
            <div key={item.id} className="border-b border-brand-100 py-2">
              <p className="text-sm text-slate-600">{item.type}</p>
              <p className="text-sm text-slate-600">R$ {item.amount}</p>
              <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
