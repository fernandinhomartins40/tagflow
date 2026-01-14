import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { usePushNotifications } from "../../hooks/usePushNotifications";

interface Company {
  id: string;
  name: string;
  plan: string;
  status: string;
  domain?: string | null;
}

export function AdminSettings() {
  const user = useAuthStore((state) => state.user);
  const push = usePushNotifications();
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");

  const companyQuery = useQuery({
    queryKey: ["companies", "me"],
    queryFn: () => apiFetch<{ data: Company[] }>("/api/companies")
  });

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<{ data: Array<{ id: string; name: string }> }>("/api/branches")
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission(Notification.permission);
    push.checkStatus();
  }, [push]);

  const company = companyQuery.data?.data?.[0];
  const branchCount = branchesQuery.data?.data?.length ?? 0;

  const notificationStatus = useMemo(() => {
    if (push.status === "inscrito") return "Ativo";
    if (push.status === "nao inscrito") return "Inativo";
    if (push.status === "VAPID nao configurado") return "Sem VAPID";
    if (push.status === "SW nao suportado") return "Sem suporte";
    if (push.status === "Permissao negada") return "Permissao negada";
    if (push.status === "Permissao pendente") return "Permissao pendente";
    if (push.status === "removido") return "Desativado";
    return push.status || "Idle";
  }, [push.status]);

  const canSendTest = push.status === "inscrito";
  const isSubscribed = push.status === "inscrito";

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Configuracoes</h2>
        <p className="text-sm text-slate-600 dark:text-neutral-300">Preferencias, conta e notificacoes.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Conta</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-neutral-300">
            <p><span className="text-slate-500 dark:text-neutral-400">Usuario:</span> {user?.name ?? "-"}</p>
            <p><span className="text-slate-500 dark:text-neutral-400">Email:</span> {user?.email ?? "-"}</p>
            <p><span className="text-slate-500 dark:text-neutral-400">Perfil:</span> {user?.role ?? "-"}</p>
            <p><span className="text-slate-500 dark:text-neutral-400">Filiais:</span> {branchCount}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/admin/users">Gerenciar usuarios</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/admin/branches">Gerenciar filiais</a>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-4">
          <h3 className="text-lg font-semibold">Empresa</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-neutral-300">
            <p><span className="text-slate-500 dark:text-neutral-400">Nome:</span> {company?.name ?? "-"}</p>
            <p><span className="text-slate-500 dark:text-neutral-400">Plano:</span> {company?.plan ?? "-"}</p>
            <p><span className="text-slate-500 dark:text-neutral-400">Status:</span> {company?.status ?? "-"}</p>
            <p><span className="text-slate-500 dark:text-neutral-400">Dominio:</span> {company?.domain ?? "-"}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/admin/subscriptions">Ver assinaturas</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <h3 className="text-lg font-semibold">Notificacoes</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
          Controle de notificacoes push para avisos operacionais e alertas.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Permissao</p>
            <p className="mt-1 font-semibold">{permission === "unknown" ? "Carregando" : permission}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Status</p>
            <p className="mt-1 font-semibold">{notificationStatus}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-400">Ambiente</p>
            <p className="mt-1 font-semibold">{import.meta.env.VITE_VAPID_PUBLIC_KEY ? "VAPID ok" : "Sem VAPID"}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {isSubscribed ? (
            <Button variant="outline" onClick={() => push.unsubscribe()}>
              Desativar notificacoes
            </Button>
          ) : (
            <Button onClick={() => push.subscribe()}>
              Ativar notificacoes
            </Button>
          )}
          <Button variant="outline" onClick={() => push.sendTest()} disabled={!canSendTest}>
            Enviar teste
          </Button>
          <Button variant="outline" onClick={() => push.checkStatus()}>
            Atualizar status
          </Button>
        </div>
        {push.status && push.status !== "inscrito" && push.status !== "nao inscrito" ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">Status: {push.status}</p>
        ) : null}
      </div>
    </section>
  );
}
