import { create } from "zustand";

type CustomerAuthStatus = "unknown" | "authenticated" | "unauthenticated";

interface CustomerUser {
  id: string;
  name: string;
  cpf: string;
  phone: string;
}

interface CustomerAuthState {
  status: CustomerAuthStatus;
  customer: CustomerUser | null;
  setAuth: (status: CustomerAuthStatus, customer?: CustomerUser | null) => void;
}

export const useCustomerAuthStore = create<CustomerAuthState>((set) => ({
  status: "unknown",
  customer: null,
  setAuth: (status, customer = null) => set({ status, customer })
}));
