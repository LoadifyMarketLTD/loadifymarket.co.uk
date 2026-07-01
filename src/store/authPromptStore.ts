import { create } from 'zustand';

export type AuthPromptContext = 'sell' | 'message' | 'buy' | 'save' | null;

interface AuthPromptState {
  isOpen: boolean;
  context: AuthPromptContext;
  open: (context?: AuthPromptContext) => void;
  close: () => void;
}

export const useAuthPromptStore = create<AuthPromptState>((set) => ({
  isOpen: false,
  context: null,
  open: (context = null) => set({ isOpen: true, context }),
  close: () => set({ isOpen: false, context: null }),
}));
