import axios from 'axios';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://gateway:4000/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Catalog API ──────────────────────────────────────
export const catalogApi = {
  searchItems: async (params) => {
    const { data } = await api.get('/catalog/items', { params });
    return data;
  },
  getItem: async (id) => {
    const { data } = await api.get(`/catalog/items/${id}`);
    return data;
  },
  getCategories: async () => {
    const { data } = await api.get('/catalog/categories');
    return data.categories;
  },
  getSuppliers: async () => {
    const { data } = await api.get('/catalog/suppliers');
    return data.suppliers;
  },
};

// ── Procurement API ──────────────────────────────────
export const procurementApi = {
  createDraft: async (payload) => {
    const { data } = await api.post('/procurement/purchase-orders', payload);
    return data;
  },
  listPOs: async (params) => {
    const { data } = await api.get('/procurement/purchase-orders', { params });
    return data;
  },
  getPO: async (id) => {
    const { data } = await api.get(`/procurement/purchase-orders/${id}`);
    return data;
  },
  updateDraft: async (id, payload) => {
    const { data } = await api.patch(`/procurement/purchase-orders/${id}`, payload);
    return data;
  },
  deleteDraft: async (id) => {
    await api.delete(`/procurement/purchase-orders/${id}`);
  },
  addLineItem: async (poId, payload) => {
    const { data } = await api.post(`/procurement/purchase-orders/${poId}/lines`, payload);
    return data;
  },
  updateLineItem: async (poId, lineId, payload) => {
    const { data } = await api.patch(`/procurement/purchase-orders/${poId}/lines/${lineId}`, payload);
    return data;
  },
  removeLineItem: async (poId, lineId) => {
    await api.delete(`/procurement/purchase-orders/${poId}/lines/${lineId}`);
  },
  submitPO: async (poId, payload) => {
    const { data } = await api.post(`/procurement/purchase-orders/${poId}/submit`, payload);
    return data;
  },
  approvePO: async (poId, payload = {}) => {
    const { data } = await api.post(`/procurement/purchase-orders/${poId}/approve`, payload);
    return data;
  },
  rejectPO: async (poId, payload = {}) => {
    const { data } = await api.post(`/procurement/purchase-orders/${poId}/reject`, payload);
    return data;
  },
  fulfillPO: async (poId, payload = {}) => {
    const { data } = await api.post(`/procurement/purchase-orders/${poId}/fulfill`, payload);
    return data;
  },
};

export default api;
