import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../services/api";
import type { Customer, PaginatedResponse } from "../types/api";
import type { CreateCustomerInput } from "../schemas/customer";
import type { PaymentMethod } from "../components/AddCreditModal";
import { normalizeCpf, normalizePhone } from "../utils/customer";

export interface CustomerFilters {
  search?: string;
  branchId?: string;
  hasBalance?: boolean;
  hasLimit?: boolean;
}

export interface UseCustomersOptions {
  page?: number;
  pageSize?: number;
  filters?: CustomerFilters;
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const queryClient = useQueryClient();
  const { page = 1, pageSize = 25, filters = {} } = options;

  // Query para listar clientes
  const customersQuery = useQuery({
    queryKey: ["customers", { page, pageSize, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.branchId && { branchId: filters.branchId }),
        ...(filters.hasBalance !== undefined && { hasBalance: filters.hasBalance.toString() }),
        ...(filters.hasLimit !== undefined && { hasLimit: filters.hasLimit.toString() })
      });
      return apiFetch<PaginatedResponse<Customer>>(`/api/customers?${params}`);
    }
  });

  // Mutation para criar cliente
  const createMutation = useMutation({
    mutationFn: async (data: CreateCustomerInput) => {
      const payload: any = {
        name: data.name.trim(),
        cpf: data.cpf.replace(/\D/g, ""),
        phone: data.phone.replace(/\D/g, "")
      };

      if (data.email && data.email.trim()) {
        payload.email = data.email.trim();
      }

      if (data.birthDate && data.birthDate.trim()) {
        const dateDigits = data.birthDate.replace(/\D/g, "");
        if (dateDigits.length === 8) {
          const day = dateDigits.slice(0, 2);
          const month = dateDigits.slice(2, 4);
          const year = dateDigits.slice(4, 8);
          payload.birthDate = `${year}-${month}-${day}`;
        }
      }

      if (data.creditLimit && data.creditLimit > 0) {
        payload.creditLimit = data.creditLimit;
      }

      if (data.branchId && data.branchId !== "") {
        payload.branchId = data.branchId;
      }

      return apiFetch<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }
  });

  // Mutation para atualizar cliente
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCustomerInput> }) => {
      const payload: any = {};

      if (data.name) payload.name = data.name.trim();
      if (data.email !== undefined) payload.email = data.email?.trim() || null;
      if (data.creditLimit !== undefined) payload.creditLimit = data.creditLimit;
      if (data.branchId !== undefined) payload.branchId = data.branchId || null;

      if (data.birthDate !== undefined) {
        if (data.birthDate && data.birthDate.trim()) {
          const dateDigits = data.birthDate.replace(/\D/g, "");
          if (dateDigits.length === 8) {
            const day = dateDigits.slice(0, 2);
            const month = dateDigits.slice(2, 4);
            const year = dateDigits.slice(4, 8);
            payload.birthDate = `${year}-${month}-${day}`;
          }
        } else {
          payload.birthDate = null;
        }
      }

      return apiFetch<Customer>(`/api/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }
  });

  // Mutation para adicionar créditos
  const addCreditsMutation = useMutation({
    mutationFn: async ({ id, amount, method }: { id: string; amount: number; method: PaymentMethod }) => {
      return apiFetch(`/api/customers/${id}/add-credits`, {
        method: "POST",
        body: JSON.stringify({ amount, paymentMethod: method })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] })
  });

  // Mutation para vincular identificador
  const linkIdentifierMutation = useMutation({
    mutationFn: async ({
      id,
      type,
      code,
      tabType
    }: {
      id: string;
      type: string;
      code: string;
      tabType: string
    }) => {
      return apiFetch(`/api/customers/${id}/activate-tag`, {
        method: "POST",
        body: JSON.stringify({ type, code, tabType })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-identifiers"] });
    }
  });

  // Mutation para deletar cliente
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/customers/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }
  });

  return {
    customers: customersQuery.data?.data || [],
    meta: customersQuery.data?.meta,
    isLoading: customersQuery.isLoading,
    isError: customersQuery.isError,
    error: customersQuery.error,
    createCustomer: createMutation,
    updateCustomer: updateMutation,
    addCredits: addCreditsMutation,
    linkIdentifier: linkIdentifierMutation,
    deleteCustomer: deleteMutation
  };
}
