import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Zustand 5 store for PO draft state.
 * Persists across page reloads via localStorage.
 *
 * STALE-STATE FIX:
 * Previously, calling clearDraft() updated the sidebar (Zustand)
 * but the dashboard still showed "1 DRAFT" because the React Query
 * cache ('pos-dashboard') was never invalidated.
 *
 * Fix: Components that delete drafts on the server must ALSO call
 * queryClient.invalidateQueries() for dashboard data. See useClearDraft hook.
 */
const useDraftStore = create(
  persist(
    (set) => ({
      // ── Draft PO state ────────────────────────────
      poId: null,
      supplierCode: null,
      supplierName: null,
      items: [],
      step: "cart", // 'cart' | 'header' | 'review'

      // ── Header fields ─────────────────────────────
      requestor: "",
      costCenter: "",
      neededByDate: "",
      paymentTerms: "Net 30",
      notes: "",

      // ── Hydration flag ────────────────────────────
      // Prevents SSR/client mismatch: components should check
      // _hydrated before rendering draft-dependent UI
      _hydrated: false,

      // ── Actions ───────────────────────────────────
      setDraft: (po) =>
        set({
          poId: po.id,
          supplierCode: po.supplier_code,
          supplierName: po.supplier_name,
        }),

      addItem: (line) => set((state) => ({ items: [...state.items, line] })),

      updateItemQty: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === lineId ? { ...item, quantity } : item,
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
          step: "cart",
          requestor: "",
          costCenter: "",
          neededByDate: "",
          paymentTerms: "Net 30",
          notes: "",
        }),
    }),
    {
      name: "refinery-po-draft",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) state._hydrated = true;
        };
      },
    },
  ),
);

export default useDraftStore;
