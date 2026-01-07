import { create } from "zustand";

interface TenantState {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
}

const defaultTenant = localStorage.getItem("tenantId") || "11111111-1111-1111-1111-111111111111";

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: defaultTenant,
  setTenantId: (tenantId) => {
    localStorage.setItem("tenantId", tenantId);
    set({ tenantId });
  }
}));
