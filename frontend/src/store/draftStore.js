import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Zustand 5 store for PO draft state.
 * Persists across page reloads via localStorage.
 */
const useDraftStore = create(
  persist(
    (set, get) => ({
      // Draft PO state
      poId: null,
      supplierCode: null,
      supplierName: null,
      items: [],
      step: 'cart', // 'cart' | 'header' | 'review'

      // Header fields
      requestor: '',
      costCenter: '',
      neededByDate: '',
      paymentTerms: 'Net 30',
      notes: '',

      // Actions
      setDraft: (po) =>
        set({
          poId: po.id,
          supplierCode: po.supplier_code,
          supplierName: po.supplier_name,
        }),

      addItem: (line) =>
        set((state) => ({ items: [...state.items, line] })),

      updateItemQty: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === lineId ? { ...item, quantity } : item
          ),
        })),

      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== lineId),
        })),

      setStep: (step) => set({ step }),

      setHeader: (fields) => set(fields),

      clearDraft: () =>
        set({
          poId: null,
          supplierCode: null,
          supplierName: null,
          items: [],
          step: 'cart',
          requestor: '',
          costCenter: '',
          neededByDate: '',
          paymentTerms: 'Net 30',
          notes: '',
        }),
    }),
    {
      name: 'refinery-po-draft',
      storage: createJSONStorage(() => {
        // SSR guard: return no-op storage on server
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
    }
  )
);

export default useDraftStore;
