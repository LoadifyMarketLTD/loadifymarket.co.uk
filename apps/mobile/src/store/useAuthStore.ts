import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; name: string; email: string; avatar?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: async (_email: string, _password: string) => {
    // Mock login
    await new Promise((r) => setTimeout(r, 500));
    set({
      isAuthenticated: true,
      user: { id: '1', name: 'John Doe', email: 'john@example.com' },
    });
  },
  logout: () => set({ isAuthenticated: false, user: null }),
}));
