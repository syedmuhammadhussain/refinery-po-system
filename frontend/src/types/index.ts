// ── Catalog Types ─────────────────────────────────
export interface CatalogItem {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  price_usd: string;
  lead_time_days: number;
  in_stock: boolean;
  description?: string;
  unit_of_measure?: string;
  supplier: string;
  supplier_code: string;
  category: string;
  specs: Record<string, string>;
  compatibility?: Compatibility[];
}

export interface Compatibility {
  compatible_item_id: string;
  relationship_type: string;
  notes?: string;
}

export interface Supplier {
  code: string;
  name: string;
}

// ── Procurement Types ─────────────────────────────
export type POStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export interface PurchaseOrder {
  id: string;
  po_number: string | null;
  status: POStatus;
  supplier_code: string;
  supplier_name: string;
  total_amount: string;
  requestor?: string;
  cost_center?: string;
  needed_by_date?: string;
  payment_terms?: string;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
  line_count?: number;
  lineItems?: POLineItem[];
  timeline?: TimelineEntry[];
}

export interface POLineItem {
  id: string;
  po_id: string;
  catalog_item_id: string;
  quantity: number;
  item_name: string;
  item_model: string;
  unit_price: string;
  lead_time_days: number;
  supplier_code: string;
  created_at: string;
}

export interface TimelineEntry {
  id: string;
  po_id: string;
  from_status: POStatus | null;
  to_status: POStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
}

// ── Pagination ────────────────────────────────────
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
