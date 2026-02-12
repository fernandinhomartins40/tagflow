import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { createCustomerSchema, type CreateCustomerInput } from "../../schemas/customer";
import { Button } from "../ui/button";
import { maskCpf, maskPhone, maskDate } from "../../utils/customer";
import type { Customer, Branch } from "../../types/api";

interface CustomerEditModalProps {
  customer: Customer;
  branches?: Branch[];
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<CreateCustomerInput>) => Promise<void>;
}

const formatCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatDateDisplay = (value: string | null | undefined): string => {
  if (!value) return "";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
};

export function CustomerEditModal({
  customer,
  branches = [],
  open,
  onClose,
  onSave
}: CustomerEditModalProps) {
  const [birthDateMasked, setBirthDateMasked] = useState("");
  const [creditLimitMasked, setCreditLimitMasked] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema.partial()),
    defaultValues: {
      name: customer.name,
      email: customer.email || "",
      birthDate: formatDateDisplay(customer.birthDate),
      creditLimit: parseFloat(customer.creditLimit || "0"),
      branchId: customer.branchId || ""
    }
  });

  // Inicializar máscaras quando o modal abre
  useEffect(() => {
    if (open) {
      setBirthDateMasked(formatDateDisplay(customer.birthDate));
      const creditValue = parseFloat(customer.creditLimit || "0");
      if (creditValue > 0) {
        const digits = Math.round(creditValue * 100).toString();
        setCreditLimitMasked(formatCurrency(digits));
      } else {
        setCreditLimitMasked("");
      }

      reset({
        name: customer.name,
        email: customer.email || "",
        birthDate: formatDateDisplay(customer.birthDate),
        creditLimit: creditValue,
        branchId: customer.branchId || ""
      });
    }
  }, [open, customer, reset]);

  const handleBirthDateChange = (value: string) => {
    const masked = maskDate(value);
    setBirthDateMasked(masked);
    setValue("birthDate", masked, { shouldValidate: true });
  };

  const handleCreditLimitChange = (value: string) => {
    const masked = formatCurrency(value);
    setCreditLimitMasked(masked);
    const digits = value.replace(/\D/g, "");
    const amount = digits ? Number(digits) / 100 : 0;
    setValue("creditLimit", amount, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (data) => {
    await onSave(data);
    onClose();
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Editar Cliente</h3>
            <p className="mt-1 text-sm text-slate-600">
              CPF: {maskCpf(customer.cpf || "")} | Tel: {maskPhone(customer.phone || "")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nome <span className="text-rose-500">*</span>
              </label>
              <input
                {...register("name")}
                placeholder="Nome completo"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="email@exemplo.com"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Data de Nascimento
              </label>
              <input
                value={birthDateMasked}
                onChange={(e) => handleBirthDateChange(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.birthDate && (
                <p className="mt-1 text-xs text-rose-500">{errors.birthDate.message}</p>
              )}
            </div>

            {/* Limite de crédito */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Limite de Crédito (Pós-pago)
              </label>
              <input
                value={creditLimitMasked}
                onChange={(e) => handleCreditLimitChange(e.target.value)}
                placeholder="R$ 0,00"
                className="w-full rounded-xl border border-brand-100 px-3 py-2"
              />
              {errors.creditLimit && (
                <p className="mt-1 text-xs text-rose-500">{errors.creditLimit.message}</p>
              )}
            </div>

            {/* Filial */}
            {branches.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Filial
                </label>
                <select
                  {...register("branchId")}
                  className="w-full rounded-xl border border-brand-100 px-3 py-2"
                >
                  <option value="">Todas as filiais</option>
                  {branches.map((branch) => (
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

          {/* Informação sobre campos não editáveis */}
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              <strong>Nota:</strong> CPF e telefone não podem ser editados pois são usados como
              identificadores únicos do sistema.
            </p>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
