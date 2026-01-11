import { create } from "zustand";

interface TenantState {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
}

const defaultTenant = localStorage.getItem("tenantId") || "";

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: defaultTenant,
  setTenantId: (tenantId) => {
    localStorage.setItem("tenantId", tenantId);
    set({ tenantId });
  }
}));
