import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { PlanLimitsDisplay } from "../../components/PlanLimitsDisplay";
import { createCustomerSchema, type CreateCustomerInput } from "../../schemas/customer";
import { useCustomers, type CustomerFilters } from "../../hooks/useCustomers";
import { CustomerTable } from "../../components/customers/CustomerTable";
import { CustomerFilters as Filters } from "../../components/customers/CustomerFilters";
import { Pagination } from "../../components/customers/Pagination";
import { CustomerEditModal } from "../../components/customers/CustomerEditModal";
import { IdentifierLinker } from "../../components/customers/IdentifierLinker";
import { AddCreditModal, type PaymentMethod } from "../../components/AddCreditModal";
import { maskCpf, maskPhone, maskDate, isValidCpf } from "../../utils/customer";
import type { Customer, Branch, PaginatedResponse } from "../../types/api";

const formatCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function AdminCustomers() {
  // Estado de paginação e filtros
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<CustomerFilters>({});

  // Estados de modais
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [linkingCustomer, setLinkingCustomer] = useState<Customer | null>(null);
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);

  // Estado para campos com máscara no formulário de criação
  const [cpfMasked, setCpfMasked] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [birthDateMasked, setBirthDateMasked] = useState("");
  const [creditLimitMasked, setCreditLimitMasked] = useState("");

  // Hook customizado de clientes
  const {
    customers,
    meta,
    isLoading,
    createCustomer,
    updateCustomer,
    addCredits,
    linkIdentifier,
    deleteCustomer
  } = useCustomers({ page, pageSize, filters });

  // Query de filiais
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<PaginatedResponse<Branch>>("/api/branches")
  });

  // React Hook Form para criação
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(createCustomerSchema) as any,
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      birthDate: "",
      creditLimit: 0,
      branchId: ""
    }
  });

  // Handlers de mudança com máscara
  const handleCpfChange = (value: string) => {
    const masked = maskCpf(value);
    setCpfMasked(masked);
    const digits = value.replace(/\D/g, "");
    setValue("cpf", digits, { shouldValidate: true, shouldDirty: true });
  };

  const handlePhoneChange = (value: string) => {
    const masked = maskPhone(value);
    setPhoneMasked(masked);
    const digits = value.replace(/\D/g, "");
    setValue("phone", digits, { shouldValidate: true, shouldDirty: true });
  };

  const handleBirthDateChange = (value: string) => {
    const masked = maskDate(value);
    setBirthDateMasked(masked);
    setValue("birthDate", masked, { shouldValidate: true, shouldDirty: true });
  };

  const handleCreditLimitChange = (value: string) => {
    const masked = formatCurrency(value);
    setCreditLimitMasked(masked);
    const digits = value.replace(/\D/g, "");
    const amount = digits ? Number(digits) / 100 : 0;
    setValue("creditLimit", amount, { shouldValidate: true, shouldDirty: true });
  };

  // Submit handler para criação
  const onSubmit = handleSubmit(async (data) => {
    if (!isValidCpf(data.cpf)) {
      alert("❌ CPF inválido");
      return;
    }

    try {
      await createCustomer.mutateAsync(data);
      reset();
      setCpfMasked("");
      setPhoneMasked("");
      setBirthDateMasked("");
      setCreditLimitMasked("");
      setShowCreateForm(false);
      alert("✅ Cliente criado com sucesso!");
    } catch (error: any) {
      alert(`❌ Erro ao criar cliente: ${error.message}`);
    }
  });

  // Handler para edição
  const handleEdit = async (data: Partial<CreateCustomerInput>) => {
    if (!editingCustomer) return;

    try {
      await updateCustomer.mutateAsync({ id: editingCustomer.id, data });
      alert("✅ Cliente atualizado com sucesso!");
    } catch (error: any) {
      alert(`❌ Erro ao atualizar cliente: ${error.message}`);
    }
  };

  // Handler para adicionar créditos
  const handleAddCredit = async (amount: number, method: PaymentMethod) => {
    if (!creditCustomer) return;

    try {
      await addCredits.mutateAsync({
        id: creditCustomer.id,
        amount,
        method
      });
      alert(`✅ Crédito de ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionado!`);
    } catch (error: any) {
      alert(`❌ Erro ao adicionar crédito: ${error.message}`);
    }
  };

  // Handler para vincular identificador
  const handleLinkIdentifier = async (type: string, code: string, tabType: string) => {
    if (!linkingCustomer) return;

    try {
      const result = await linkIdentifier.mutateAsync({
        id: linkingCustomer.id,
        type,
        code,
        tabType
      });
      alert(
        `✅ Identificador vinculado com sucesso!\n\nComanda criada: ${result.tab?.id ? "Sim" : "Não"}\nTipo: ${result.identifier?.tabType === "credit" ? "Crédito" : "Pré-pago"}`
      );
    } catch (error: any) {
      alert(`❌ Erro ao vincular identificador: ${error.message}`);
    }
  };

  // Handler para deletar
  const handleDelete = async (customer: Customer) => {
    try {
      await deleteCustomer.mutateAsync(customer.id);
      alert("✅ Cliente excluído com sucesso!");
    } catch (error: any) {
      alert(`❌ Erro ao excluir cliente: ${error.message}`);
    }
  };

  return (
    <section className="w-full min-w-0 space-y-4 overflow-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-slate-600">
            Gerencie cadastros, identificadores e saldo de clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PlanLimitsDisplay resource="customers" compact />
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </header>

      <PlanLimitsDisplay resource="customers" />

      {/* Formulário de criação (colapsável) */}
      {showCreateForm && (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-brand-100 bg-white p-4"
        >
          <h3 className="text-lg font-semibold">Novo cliente</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <input
                {...register("name")}
                placeholder="Nome *"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <input
                value={cpfMasked}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="CPF *"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.cpf && <p className="mt-1 text-xs text-rose-500">{errors.cpf.message}</p>}
            </div>

            <div>
              <input
                value={birthDateMasked}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                placeholder="Nascimento (DD/MM/AAAA)"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.birthDate && (
                <p className="mt-1 text-xs text-rose-500">{errors.birthDate.message}</p>
              )}
            </div>

            <div>
              <input
                value={phoneMasked}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Telefone/WhatsApp *"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <input
                {...register("email")}
                placeholder="Email (opcional)"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <input
                value={creditLimitMasked}
                onChange={(e) => handleCreditLimitChange(e.target.value)}
                placeholder="Limite de crédito (pós-pago)"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.creditLimit && (
                <p className="mt-1 text-xs text-rose-500">{errors.creditLimit.message}</p>
              )}
            </div>

            {branchesQuery.data?.data && branchesQuery.data.data.length > 0 && (
              <div>
                <select
                  {...register("branchId")}
                  className="w-full rounded-xl border border-brand-100 px-3 py-2"
                >
                  <option value="">Todas as filiais</option>
                  {branchesQuery.data.data.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {errors.branchId && (
                  <p className="mt-1 text-xs text-rose-500">{errors.branchId.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={isSubmitting || createCustomer.isPending}>
              {isSubmitting || createCustomer.isPending ? "Salvando..." : "Adicionar cliente"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <Filters
        filters={filters}
        onFiltersChange={setFilters}
        branches={branchesQuery.data?.data}
      />

      {/* Tabela de clientes */}
      <CustomerTable
        customers={customers}
        isLoading={isLoading}
        onEdit={setEditingCustomer}
        onDelete={handleDelete}
        onAddCredit={setCreditCustomer}
        onLinkIdentifier={setLinkingCustomer}
      />

      {/* Paginação */}
      {!isLoading && customers.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          total={meta?.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Modal de edição */}
      {editingCustomer && (
        <CustomerEditModal
          customer={editingCustomer}
          branches={branchesQuery.data?.data}
          open={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSave={handleEdit}
        />
      )}

      {/* Modal de vinculação de identificador */}
      {linkingCustomer && (
        <IdentifierLinker
          customerId={linkingCustomer.id}
          customerName={linkingCustomer.name}
          onLink={handleLinkIdentifier}
          isLoading={linkIdentifier.isPending}
          open={!!linkingCustomer}
          onClose={() => setLinkingCustomer(null)}
        />
      )}

      {/* Modal de adição de crédito */}
      {creditCustomer && (
        <AddCreditModal
          open={!!creditCustomer}
          onClose={() => setCreditCustomer(null)}
          onConfirm={handleAddCredit}
        />
      )}
    </section>
  );
}
