import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { useAuthStore } from "../../store/auth";

interface CompanySubscription {
  id: string;
  status?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  planId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

interface CompanyPlan {
  id: string;
  name: string;
  priceMonthly: string;
  currency: string;
  stripePriceId?: string | null;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  status: string;
  theme?: string | null;
  logoUrl?: string | null;
  domain?: string | null;
  createdAt: string;
  renewedAt?: string | null;
  subscription?: CompanySubscription | null;
  planDetails?: CompanyPlan | null;
}

interface CompaniesResponse {
  data: Company[];
  meta?: { total: number };
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  companyId: string;
  branchId?: string | null;
  createdAt?: string;
}

interface UsersResponse {
  data: UserAccount[];
}

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  priceMonthly: string;
  currency: string;
  stripePriceId?: string | null;
  active: boolean;
  createdAt: string;
}

interface PlansResponse {
  data: Plan[];
}

interface CompanyFormState {
  name: string;
  cnpj: string;
  plan: string;
  status: string;
  theme: string;
  logoUrl: string;
  domain: string;
}

const emptyForm: CompanyFormState = {
  name: "",
  cnpj: "",
  plan: "Free",
  status: "active",
  theme: "",
  logoUrl: "",
  domain: ""
};

const emptyUserForm = {
  name: "",
  email: "",
  role: "operator",
  companyId: "",
  active: true
};

const emptyPlanForm = {
  name: "",
  description: "",
  priceMonthly: "0.00",
  currency: "brl",
  stripePriceId: "",
  active: true
};

export function AdminSuperAdmin() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === "super_admin";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"companies" | "users" | "plans">("companies");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userSearch, setUserSearch] = useState("");
  const [userCompanyFilter, setUserCompanyFilter] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState("temp1234");
  const [userError, setUserError] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [planError, setPlanError] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutCompany, setCheckoutCompany] = useState<Company | null>(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState("");

  const companiesQuery = useQuery({
    queryKey: ["superadmin", "companies"],
    queryFn: () => apiFetch<CompaniesResponse>("/api/superadmin/companies"),
    enabled: isSuperAdmin
  });

  const usersQuery = useQuery({
    queryKey: ["superadmin", "users", userSearch, userCompanyFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (userCompanyFilter) params.set("companyId", userCompanyFilter);
      if (userSearch) params.set("search", userSearch);
      const query = params.toString();
      return apiFetch<UsersResponse>(`/api/superadmin/users${query ? `?${query}` : ""}`);
    },
    enabled: isSuperAdmin
  });

  const plansQuery = useQuery({
    queryKey: ["superadmin", "plans"],
    queryFn: () => apiFetch<PlansResponse>("/api/superadmin/plans"),
    enabled: isSuperAdmin
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CompanyFormState) => {
      return apiFetch("/api/superadmin/companies", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "companies"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CompanyFormState }) => {
      return apiFetch(`/api/superadmin/companies/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "companies"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/superadmin/companies/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "companies"] });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: typeof emptyUserForm & { password?: string }) => {
      return apiFetch("/api/superadmin/users", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof emptyUserForm & { password?: string } }) => {
      return apiFetch(`/api/superadmin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/superadmin/users/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return apiFetch(`/api/superadmin/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password })
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "users"] });
    }
  });

  const createPlanMutation = useMutation({
    mutationFn: async (payload: typeof emptyPlanForm) => {
      return apiFetch("/api/superadmin/plans", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "plans"] });
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof emptyPlanForm }) => {
      return apiFetch(`/api/superadmin/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "plans"] });
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/superadmin/plans/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin", "plans"] });
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ companyId, planId }: { companyId: string; planId: string }) => {
      return apiFetch<{ url: string }>("/api/superadmin/companies/" + companyId + "/checkout", {
        method: "POST",
        body: JSON.stringify({ planId })
      });
    }
  });

  const filteredCompanies = useMemo(() => {
    const list = companiesQuery.data?.data ?? [];
    if (!search.trim()) return list;
    const query = search.toLowerCase();
    return list.filter((company) =>
      [
        company.name,
        company.cnpj,
        company.plan,
        company.planDetails?.name ?? "",
        company.status,
        company.domain ?? ""
      ].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [companiesQuery.data?.data, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ ...emptyUserForm, companyId: companiesQuery.data?.data?.[0]?.id ?? "" });
    setUserError(null);
    setUserModalOpen(true);
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlanForm);
    setPlanError(null);
    setPlanModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name: company.name ?? "",
      cnpj: company.cnpj ?? "",
      plan: company.plan ?? "",
      status: company.status ?? "",
      theme: company.theme ?? "",
      logoUrl: company.logoUrl ?? "",
      domain: company.domain ?? ""
    });
    setError(null);
    setModalOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name ?? "",
      description: plan.description ?? "",
      priceMonthly: plan.priceMonthly ?? "0.00",
      currency: plan.currency ?? "brl",
      stripePriceId: plan.stripePriceId ?? "",
      active: plan.active ?? true
    });
    setPlanError(null);
    setPlanModalOpen(true);
  };

  const openCheckout = (company: Company) => {
    setCheckoutCompany(company);
    setCheckoutPlanId(company.subscription?.planId ?? "");
    setCheckoutModalOpen(true);
  };

  const openEditUser = (account: UserAccount) => {
    setEditingUser(account);
    setUserForm({
      name: account.name ?? "",
      email: account.email ?? "",
      role: account.role ?? "operator",
      companyId: account.companyId ?? "",
      active: account.active ?? true
    });
    setUserError(null);
    setUserModalOpen(true);
  };

  const openPasswordReset = (account: UserAccount) => {
    setPasswordTarget(account);
    setNewPassword("temp1234");
    setPasswordModalOpen(true);
  };

  const handleSave = async () => {
    setError(null);
    const payload: CompanyFormState = {
      name: form.name.trim(),
      cnpj: form.cnpj.trim(),
      plan: form.plan.trim(),
      status: form.status.trim(),
      theme: form.theme.trim(),
      logoUrl: form.logoUrl.trim(),
      domain: form.domain.trim()
    };

    if (!payload.name || !payload.cnpj || !payload.plan || !payload.status) {
      setError("Preencha os campos obrigatorios.");
      return;
    }

    const normalized: CompanyFormState = {
      ...payload,
      theme: payload.theme || "",
      logoUrl: payload.logoUrl || "",
      domain: payload.domain || ""
    };

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload: normalized });
    } else {
      await createMutation.mutateAsync(normalized);
    }

    setModalOpen(false);
    setEditing(null);
  };

  const handleSaveUser = async () => {
    setUserError(null);
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.companyId) {
      setUserError("Preencha os campos obrigatorios.");
      return;
    }

    const payload = {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      companyId: userForm.companyId,
      active: userForm.active
    };

    if (editingUser) {
      await updateUserMutation.mutateAsync({ id: editingUser.id, payload });
    } else {
      await createUserMutation.mutateAsync(payload);
    }

    setUserModalOpen(false);
    setEditingUser(null);
  };

  const handlePasswordReset = async () => {
    if (!passwordTarget) return;
    if (newPassword.trim().length < 6) {
      setUserError("Senha deve ter no minimo 6 caracteres.");
      return;
    }
    await resetPasswordMutation.mutateAsync({ id: passwordTarget.id, password: newPassword.trim() });
    setPasswordModalOpen(false);
    setPasswordTarget(null);
  };

  const handleSavePlan = async () => {
    setPlanError(null);
    if (!planForm.name.trim() || !planForm.priceMonthly.trim()) {
      setPlanError("Informe nome e valor.");
      return;
    }
    const payload = {
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      priceMonthly: planForm.priceMonthly.trim(),
      currency: planForm.currency.trim() || "brl",
      stripePriceId: planForm.stripePriceId.trim(),
      active: planForm.active
    };
    if (editingPlan) {
      await updatePlanMutation.mutateAsync({ id: editingPlan.id, payload });
    } else {
      await createPlanMutation.mutateAsync(payload);
    }
    setPlanModalOpen(false);
    setEditingPlan(null);
  };

  const handleCheckout = async () => {
    if (!checkoutCompany || !checkoutPlanId) return;
    const res = await checkoutMutation.mutateAsync({ companyId: checkoutCompany.id, planId: checkoutPlanId });
    setCheckoutModalOpen(false);
    setCheckoutCompany(null);
    if (res?.url) {
      window.open(res.url, "_blank", "noopener,noreferrer");
    }
  };

  const toggleUserActive = (account: UserAccount) => {
    updateUserMutation.mutate({
      id: account.id,
      payload: {
        name: account.name,
        email: account.email,
        role: account.role,
        companyId: account.companyId,
        active: !account.active
      }
    });
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        Acesso restrito ao super admin.
      </div>
    );
  }

  const companyMap = new Map((companiesQuery.data?.data ?? []).map((company) => [company.id, company.name]));

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Super admin</h2>
          <p className="text-sm text-slate-600">Gestao completa de clientes e usuarios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === "companies" ? "default" : "outline"} onClick={() => setActiveTab("companies")}>
            Empresas
          </Button>
          <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => setActiveTab("users")}>
            Usuarios
          </Button>
          <Button variant={activeTab === "plans" ? "default" : "outline"} onClick={() => setActiveTab("plans")}>
            Planos
          </Button>
        </div>
      </header>

      {activeTab === "companies" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Total: <span className="font-semibold">{companiesQuery.data?.meta?.total ?? filteredCompanies.length}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, CNPJ, plano ou dominio"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 sm:max-w-xs"
              />
              <Button onClick={openCreate}>Nova empresa</Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{company.name}</p>
                    <p className="text-xs text-slate-500">CNPJ: {company.cnpj}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {company.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Plano: {company.planDetails?.name ?? company.plan}
                  {company.domain ? ` | Dominio: ${company.domain}` : ""}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Assinatura: {company.subscription?.status ?? "sem assinatura"}
                  {company.subscription?.currentPeriodEnd
                    ? ` | Renova em ${new Date(company.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                    : ""}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(company)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openCheckout(company)}>
                    Checkout
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(company.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
            {filteredCompanies.length === 0 ? <p className="text-sm text-slate-500">Nenhuma empresa encontrada.</p> : null}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 text-left">Empresa</th>
                  <th className="py-2 text-left">CNPJ</th>
                  <th className="py-2 text-left">Plano</th>
                  <th className="py-2 text-left">Assinatura</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Dominio</th>
                  <th className="py-2 text-left">Criada</th>
                  <th className="py-2 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-t border-slate-200">
                    <td className="py-2 font-medium">{company.name}</td>
                    <td className="py-2">{company.cnpj}</td>
                    <td className="py-2">{company.planDetails?.name ?? company.plan}</td>
                    <td className="py-2">{company.subscription?.status ?? "sem assinatura"}</td>
                    <td className="py-2">{company.status}</td>
                    <td className="py-2">{company.domain ?? "-"}</td>
                    <td className="py-2">{new Date(company.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(company)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openCheckout(company)}>
                          Checkout
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(company.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td className="py-4 text-sm text-slate-500" colSpan={8}>
                      Nenhuma empresa encontrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "users" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Total: <span className="font-semibold">{usersQuery.data?.data?.length ?? 0}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Buscar usuario por nome ou email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 sm:max-w-xs"
              />
              <select
                value={userCompanyFilter}
                onChange={(event) => setUserCompanyFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 sm:max-w-xs"
              >
                <option value="">Todas as empresas</option>
                {(companiesQuery.data?.data ?? []).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <Button onClick={openCreateUser}>Novo usuario</Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {(usersQuery.data?.data ?? []).map((account) => (
              <div key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{account.name}</p>
                    <p className="text-xs text-slate-500">{account.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                    {account.active ? "Ativo" : "Bloqueado"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {companyMap.get(account.companyId) ?? "Empresa desconhecida"} | {account.role}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditUser(account)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openPasswordReset(account)}>
                    Reset senha
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleUserActive(account)}
                  >
                    {account.active ? "Bloquear" : "Liberar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteUserMutation.mutate(account.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
            {(usersQuery.data?.data?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Nenhum usuario encontrado.</p> : null}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 text-left">Usuario</th>
                  <th className="py-2 text-left">Email</th>
                  <th className="py-2 text-left">Empresa</th>
                  <th className="py-2 text-left">Perfil</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {(usersQuery.data?.data ?? []).map((account) => (
                  <tr key={account.id} className="border-t border-slate-200">
                    <td className="py-2 font-medium">{account.name}</td>
                    <td className="py-2">{account.email}</td>
                    <td className="py-2">{companyMap.get(account.companyId) ?? "-"}</td>
                    <td className="py-2">{account.role}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                        {account.active ? "Ativo" : "Bloqueado"}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditUser(account)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openPasswordReset(account)}>
                          Reset senha
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserActive(account)}
                        >
                          {account.active ? "Bloquear" : "Liberar"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteUserMutation.mutate(account.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(usersQuery.data?.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td className="py-4 text-sm text-slate-500" colSpan={6}>
                      Nenhum usuario encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "plans" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Total: <span className="font-semibold">{plansQuery.data?.data?.length ?? 0}</span>
            </p>
            <Button onClick={openCreatePlan}>Novo plano</Button>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {(plansQuery.data?.data ?? []).map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-xs text-slate-500">{plan.description ?? "-"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                    {plan.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  R$ {Number(plan.priceMonthly).toFixed(2)} / mes
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditPlan(plan)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deletePlanMutation.mutate(plan.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
            {(plansQuery.data?.data?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">Nenhum plano encontrado.</p> : null}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 text-left">Plano</th>
                  <th className="py-2 text-left">Valor</th>
                  <th className="py-2 text-left">Stripe Price</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                {(plansQuery.data?.data ?? []).map((plan) => (
                  <tr key={plan.id} className="border-t border-slate-200">
                    <td className="py-2 font-medium">{plan.name}</td>
                    <td className="py-2">R$ {Number(plan.priceMonthly).toFixed(2)}</td>
                    <td className="py-2">{plan.stripePriceId ?? "-"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${plan.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                        {plan.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditPlan(plan)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deletePlanMutation.mutate(plan.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(plansQuery.data?.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td className="py-4 text-sm text-slate-500" colSpan={5}>
                      Nenhum plano encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <CompanyModal
          title={editing ? "Editar empresa" : "Nova empresa"}
          onClose={() => setModalOpen(false)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome da empresa"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={form.cnpj}
              onChange={(event) => setForm((prev) => ({ ...prev, cnpj: event.target.value }))}
              placeholder="CNPJ"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <select
              value={form.plan}
              onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Selecione o plano</option>
              {(plansQuery.data?.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.name}>
                  {plan.name}
                </option>
              ))}
            </select>
            <input
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              placeholder="Status"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={form.domain}
              onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
              placeholder="Dominio"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={form.theme}
              onChange={(event) => setForm((prev) => ({ ...prev, theme: event.target.value }))}
              placeholder="Tema"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={form.logoUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
              placeholder="Logo URL"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2"
            />
          </div>
          {error ? <p className="mt-2 text-sm text-rose-500">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              Salvar
            </Button>
          </div>
        </CompanyModal>
      ) : null}

      {userModalOpen ? (
        <CompanyModal title={editingUser ? "Editar usuario" : "Novo usuario"} onClose={() => setUserModalOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="operator">Operador</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
            <select
              value={userForm.companyId}
              onChange={(event) => setUserForm((prev) => ({ ...prev, companyId: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Selecione a empresa</option>
              {(companiesQuery.data?.data ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={userForm.active}
                onChange={(event) => setUserForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Usuario ativo
            </label>
          </div>
          {userError ? <p className="mt-2 text-sm text-rose-500">{userError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={createUserMutation.isPending || updateUserMutation.isPending}>
              Salvar
            </Button>
          </div>
        </CompanyModal>
      ) : null}

      {planModalOpen ? (
        <CompanyModal title={editingPlan ? "Editar plano" : "Novo plano"} onClose={() => setPlanModalOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={planForm.name}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nome do plano"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={planForm.priceMonthly}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, priceMonthly: event.target.value }))}
              placeholder="Valor mensal"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={planForm.currency}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, currency: event.target.value }))}
              placeholder="Moeda (ex: brl)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <input
              value={planForm.stripePriceId}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, stripePriceId: event.target.value }))}
              placeholder="Stripe Price ID"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            <textarea
              value={planForm.description}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descricao do plano"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={planForm.active}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Plano ativo
            </label>
          </div>
          {planError ? <p className="mt-2 text-sm text-rose-500">{planError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPlanModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
              Salvar
            </Button>
          </div>
        </CompanyModal>
      ) : null}

      {checkoutModalOpen && checkoutCompany ? (
        <CompanyModal title="Checkout Stripe" onClose={() => setCheckoutModalOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Empresa: {checkoutCompany.name}</p>
            <select
              value={checkoutPlanId}
              onChange={(event) => setCheckoutPlanId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Selecione o plano</option>
              {(plansQuery.data?.data ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {Number(plan.priceMonthly).toFixed(2)}
                </option>
              ))}
            </select>
            {checkoutMutation.isError ? <p className="text-sm text-rose-500">Falha ao gerar checkout.</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCheckoutModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={!checkoutPlanId || checkoutMutation.isPending}>
              {checkoutMutation.isPending ? "Gerando..." : "Abrir checkout"}
            </Button>
          </div>
        </CompanyModal>
      ) : null}

      {passwordModalOpen && passwordTarget ? (
        <CompanyModal title="Resetar senha" onClose={() => setPasswordModalOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Usuario: {passwordTarget.name}</p>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nova senha"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </div>
          {userError ? <p className="mt-2 text-sm text-rose-500">{userError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePasswordReset} disabled={resetPasswordMutation.isPending}>
              Confirmar
            </Button>
          </div>
        </CompanyModal>
      ) : null}
    </section>
  );
}

function CompanyModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/50"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))"
      }}
    >
      <div
        className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        style={{ maxHeight: "calc(100vh - 3rem)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-sm text-slate-500" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">{children}</div>
      </div>
    </div>,
    document.body
  );
}
