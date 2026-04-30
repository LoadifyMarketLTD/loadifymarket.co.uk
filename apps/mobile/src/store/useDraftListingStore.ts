import { create } from 'zustand';

interface DraftListingState {
  step: number;
  title: string;
  category: string;
  condition: string;
  acceptOffers: boolean;
  price: string;
  description: string;
  location: string;
  deliveryOption: string;
  setStep: (step: number) => void;
  setField: (field: string, value: string | boolean) => void;
  reset: () => void;
}

export const useDraftListingStore = create<DraftListingState>((set) => ({
  step: 1,
  title: '',
  category: '',
  condition: '',
  acceptOffers: false,
  price: '',
  description: '',
  location: 'London, UK',
  deliveryOption: '',
  setStep: (step) => set({ step }),
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  reset: () => set({ step: 1, title: '', category: '', condition: '', acceptOffers: false, price: '', description: '', location: 'London, UK', deliveryOption: '' }),
}));
