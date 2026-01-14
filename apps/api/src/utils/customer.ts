import bcrypt from "bcryptjs";

export const normalizeCpf = (value: string) => value.replace(/\D/g, "");

export const normalizePhone = (value: string) => value.replace(/\D/g, "");

export const initialCustomerPassword = (name: string) => {
  const normalized = name.trim().replace(/\s+/g, "").toLowerCase();
  if (!normalized) return "cli";
  return normalized.slice(0, 3);
};

export const hashCustomerPassword = async (password: string) => bcrypt.hash(password, 10);
