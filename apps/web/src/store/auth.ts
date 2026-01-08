import { create } from "zustand";

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setAuth: (status: AuthStatus, user?: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  user: null,
  setAuth: (status, user = null) => set({ status, user })
}));
