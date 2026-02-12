/**
 * Tipos compartilhados para consistência entre frontend e backend
 */

export interface Customer {
  id: string;
  name: string;
  cpf?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  credits: string; // numeric vem como string do backend
  creditLimit: string; // numeric vem como string do backend
  branchId?: string | null;
  active?: boolean;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: string; // numeric vem como string do backend
  category?: string | null;
  stock?: number | null;
  active?: boolean | null;
  imageUrl?: string | null;
  imageUrlMedium?: string | null;
  imageUrlSmall?: string | null;
  createdAt?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: string; // numeric vem como string do backend
  unit: string;
  active?: boolean | null;
  imageUrl?: string | null;
  imageUrlMedium?: string | null;
  imageUrlSmall?: string | null;
  createdAt?: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  capacity?: number | null;
  price: string; // numeric vem como string do backend
  priceUnit: "hour" | "day" | "month" | "period";
  branchId?: string | null;
  active?: boolean | null;
  imageUrl?: string | null;
  imageUrlMedium?: string | null;
  imageUrlSmall?: string | null;
  createdAt?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  hours?: string | null;
  settings?: string | null;
  createdAt?: string;
}

export interface User {
  id: string;
  companyId: string;
  branchId?: string | null;
  name: string;
  email: string;
  role: "admin" | "operator" | "super_admin";
  active?: boolean;
  createdAt?: string;
}

export interface PlanLimits {
  customers: { current: number; max: number | null };
  users: { current: number; max: number | null };
  branches: { current: number; max: number | null };
  bookings: { current: number; max: number | null };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total?: number;
  };
}
