import { create } from "zustand";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  setAuth: (token: string | null, refreshToken: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  setAuth: (token, refreshToken) => set({ token, refreshToken })
}));
