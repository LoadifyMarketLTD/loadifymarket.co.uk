import { create } from 'zustand';
import type { User, CartItem } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null }),
}));

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.productId === item.productId);
      let newItems;
      if (existingItem) {
        newItems = state.items.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        newItems = [...state.items, item];
      }
      const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { items: newItems, total };
    }),
  removeItem: (productId) =>
    set((state) => {
      const newItems = state.items.filter((i) => i.productId !== productId);
      const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { items: newItems, total };
    }),
  updateQuantity: (productId, quantity) =>
    set((state) => {
      const newItems = state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      return { items: newItems, total };
    }),
  clearCart: () => set({ items: [], total: 0 }),
  getTotalItems: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },
  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
