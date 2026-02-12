import { z } from "zod";

/**
 * Schema de validação para criação de cliente
 * Deve estar sincronizado com o schema do backend em apps/api/src/routes/customers.ts
 */
export const createCustomerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 dígitos"),
  email: z
    .string()
    .email("Email inválido")
    .or(z.literal(""))
    .optional()
    .transform(val => val === "" ? undefined : val),
  birthDate: z
    .string()
    .optional()
    .transform(val => val === "" ? undefined : val),
  creditLimit: z
    .number()
    .optional()
    .transform(val => val === 0 ? undefined : val),
  branchId: z
    .string()
    .uuid("ID de filial inválido")
    .optional()
    .transform(val => val === "" ? undefined : val)
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
