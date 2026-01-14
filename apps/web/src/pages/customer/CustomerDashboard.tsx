import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { customerApiFetch } from "../../services/customerApi";
import { formatCurrencyValue } from "../../utils/currency";

interface OverviewResponse {
  customer: {
    id: string;
    name: string;
    cpf: string;
    phone: string;
  };
  companies: Array<{
    companyId: string;
    companyName: string;
    credits: string;
    totalSpent: number;
    transactions: number;
    lastTransactionAt: string | null;
  }>;
  recentTransactions: Array<{
    id: string;
    companyId: string;
    companyName: string;
    amount: string;
    type: string;
    createdAt: string;
  }>;
}

export function CustomerDashboard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["customer", "overview"],
    queryFn: () => customerApiFetch<OverviewResponse>("/api/customer/overview")
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      return customerApiFetch("/api/customer/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },
    onSuccess: () => {
      setPasswordMessage("Senha atualizada.");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (err) => {
      setPasswordMessage(err instanceof Error ? err.message : "Falha ao atualizar senha.");
    }
  });

  const totalSpent = overviewQuery.data?.companies?.reduce((sum, company) => sum + Number(company.totalSpent || 0), 0) ?? 0;
  const totalCredits = overviewQuery.data?.companies?.reduce((sum, company) => sum + Number(company.credits || 0), 0) ?? 0;
  const totalTransactions = overviewQuery.data?.companies?.reduce((sum, company) => sum + Number(company.transactions || 0), 0) ?? 0;

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Resumo do cliente</h2>
        <p className="text-sm text-slate-600 dark:text-neutral-300">Gastos e saldos em todas as lojas Tagflow.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Total gasto</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrencyValue(totalSpent)}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Saldo acumulado</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrencyValue(totalCredits)}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Transacoes</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalTransactions}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Lojas onde voce ja foi</h3>
        <div className="mt-3 space-y-2">
          {overviewQuery.data?.companies?.length ? (
            overviewQuery.data.companies.map((company) => (
              <div key={company.companyId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{company.companyName}</p>
                  <p className="text-xs text-slate-500">
                    {company.transactions} transacoes · Ultima visita{" "}
                    {company.lastTransactionAt ? new Date(company.lastTransactionAt).toLocaleDateString("pt-BR") : "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrencyValue(Number(company.totalSpent || 0))}</p>
                  <p className="text-xs text-slate-500">Saldo: {formatCurrencyValue(Number(company.credits || 0))}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Nenhum registro encontrado.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Transacoes recentes</h3>
          <div className="mt-3 space-y-2">
            {overviewQuery.data?.recentTransactions?.length ? (
              overviewQuery.data.recentTransactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.companyName}</p>
                    <p className="text-xs text-slate-500">
                      {item.type} · {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrencyValue(Number(item.amount))}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sem transacoes recentes.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Seguranca</h3>
          <p className="mt-1 text-sm text-slate-600">Atualize sua senha para manter a conta protegida.</p>
          <div className="mt-3 space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Senha atual"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nova senha"
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
            />
            <Button onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Salvando..." : "Atualizar senha"}
            </Button>
            {passwordMessage ? <p className="text-xs text-slate-500">{passwordMessage}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
