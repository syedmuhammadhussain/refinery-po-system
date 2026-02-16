'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { catalogApi, procurementApi } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import useDraftStore from '../../store/draftStore.js';
import {
  Search, ShoppingCart, Package, Clock,
  AlertTriangle, ChevronLeft, ChevronRight,
  X, Loader2, Check,
} from 'lucide-react';

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = useDraftStore();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [supplier, setSupplier] = useState(searchParams.get('supplier') || '');
  const [inStock, setInStock] = useState(searchParams.get('inStock') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [addingItem, setAddingItem] = useState(null);
  const [addedItem, setAddedItem] = useState(null);
  const [supplierError, setSupplierError] = useState(null);

  const debouncedQuery = useDebounce(searchInput, 400);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (category) params.set('category', category);
    if (supplier) params.set('supplier', supplier);
    if (inStock) params.set('inStock', inStock);
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
    if (page > 1) params.set('page', page.toString());
    router.replace(`/catalog?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, category, supplier, inStock, sortBy, sortOrder, page, router]);

  // Fetch catalog items (TanStack Query v5: placeholderData replaces keepPreviousData)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['catalog', debouncedQuery, category, supplier, inStock, sortBy, sortOrder, page],
    queryFn: () => catalogApi.searchItems({
      query: debouncedQuery, category, supplier, inStock, sortBy, sortOrder, page, limit: 12,
    }),
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.getCategories });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: catalogApi.getSuppliers });

  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const sortOptions = [
    { label: 'Name A–Z',           sortBy: 'name',      sortOrder: 'asc' },
    { label: 'Price Low→High',     sortBy: 'price',     sortOrder: 'asc' },
    { label: 'Price High→Low',     sortBy: 'price',     sortOrder: 'desc' },
    { label: 'Lead Time Low→High', sortBy: 'lead_time', sortOrder: 'asc' },
    { label: 'Lead Time High→Low', sortBy: 'lead_time', sortOrder: 'desc' },
    { label: 'Supplier A–Z',       sortBy: 'supplier',  sortOrder: 'asc' },
  ];

  const handleAddToOrder = async (item) => {
    setAddingItem(item.id);
    setSupplierError(null);
    try {
      if (!draft.poId) {
        const po = await procurementApi.createDraft({
          supplierCode: item.supplier_code,
          supplierName: item.supplier,
          idempotencyKey: `draft-${Date.now()}`,
        });
        draft.setDraft(po);
        const line = await procurementApi.addLineItem(po.id, { catalogItemId: item.id, quantity: 1 });
        draft.addItem(line);
      } else {
        if (item.supplier_code !== draft.supplierCode) {
          setSupplierError({
            itemName: item.name,
            itemSupplier: item.supplier,
            poSupplier: draft.supplierName,
          });
          setAddingItem(null);
          return;
        }
        const line = await procurementApi.addLineItem(draft.poId, { catalogItemId: item.id, quantity: 1 });
        draft.addItem(line);
      }
      setAddedItem(item.id);
      setTimeout(() => setAddedItem(null), 2000);
    } catch (err) {
      if (err.response?.status === 409) {
        setSupplierError({
          itemName: item.name,
          itemSupplier: item.supplier,
          poSupplier: draft.supplierName,
        });
      } else {
        console.error('Failed to add item:', err);
      }
    }
    setAddingItem(null);
  };

  const isInDraft = (itemId) => draft.items.some((i) => i.catalog_item_id === itemId);

  const clearFilters = () => {
    setSearchInput('');
    setCategory('');
    setSupplier('');
    setInStock('');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  };

  const hasFilters = searchInput || category || supplier || inStock;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Equipment Catalog</h1>
        <p className="text-steel-500 mt-1">Browse and search refinery equipment for purchase orders</p>
      </div>

      {/* Supplier mismatch error */}
      {supplierError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-red-800">Supplier Mismatch</div>
            <div className="text-sm text-red-700 mt-1">
              Cannot add &ldquo;{supplierError.itemName}&rdquo; from <strong>{supplierError.itemSupplier}</strong> &ndash;
              your current draft is locked to <strong>{supplierError.poSupplier}</strong>.
              All items in a PO must come from the same supplier.
            </div>
          </div>
          <button onClick={() => setSupplierError(null)} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search + Filters Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
              placeholder="Search by name, ID, supplier, manufacturer, model…"
              className="input-field pl-10"
            />
            {isFetching && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 animate-spin" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="input-field w-auto min-w-[140px]">
              <option value="">All Categories</option>
              {(categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={supplier} onChange={(e) => { setSupplier(e.target.value); setPage(1); }} className="input-field w-auto min-w-[140px]">
              <option value="">All Suppliers</option>
              {(suppliers || []).map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
            <select value={inStock} onChange={(e) => { setInStock(e.target.value); setPage(1); }} className="input-field w-auto min-w-[120px]">
              <option value="">Stock Status</option>
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>
            <select
              value={`${sortBy}|${sortOrder}`}
              onChange={(e) => { const [sb, so] = e.target.value.split('|'); setSortBy(sb); setSortOrder(so); setPage(1); }}
              className="input-field w-auto min-w-[180px]"
            >
              {sortOptions.map((o) => (
                <option key={`${o.sortBy}|${o.sortOrder}`} value={`${o.sortBy}|${o.sortOrder}`}>{o.label}</option>
              ))}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className="btn-secondary text-xs px-3">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-steel-500">
          <span>{pagination.total} item{pagination.total !== 1 ? 's' : ''} found</span>
          {draft.poId && (
            <span className="text-brand-600 font-medium">
              Draft active: {draft.supplierName} ({draft.items.length} item{draft.items.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-3/4 rounded mb-3" />
              <div className="skeleton h-4 w-1/2 rounded mb-4" />
              <div className="skeleton h-20 rounded mb-3" />
              <div className="skeleton h-9 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Items grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {items.map((item) => (
            <div key={item.id} className="card p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded">{item.id}</span>
                <span className={`badge text-xs ${item.in_stock ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.in_stock ? 'In Stock' : `Lead ${item.lead_time_days}d`}
                </span>
              </div>
              <h3 className="font-semibold text-sm text-steel-900 mb-1 line-clamp-2">{item.name}</h3>
              <div className="text-xs text-steel-500 mb-3">{item.supplier} · {item.manufacturer} · {item.model}</div>
              <div className="flex-1">
                <div className="text-xs text-steel-400 mb-1.5">Specifications</div>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  {Object.entries(item.specs || {}).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="text-xs">
                      <span className="text-steel-400">{k}: </span>
                      <span className="text-steel-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-steel-100">
                <div>
                  <div className="text-lg font-bold text-steel-900">${parseFloat(item.price_usd).toLocaleString()}</div>
                  <div className="text-xs text-steel-400 flex items-center gap-1">
                    <Clock size={12} /> {item.lead_time_days} days lead time
                  </div>
                </div>
                <button
                  onClick={() => handleAddToOrder(item)}
                  disabled={addingItem === item.id || isInDraft(item.id)}
                  className={`btn-primary text-xs px-3 py-2 ${
                    isInDraft(item.id) ? 'bg-emerald-600 hover:bg-emerald-600' :
                    addedItem === item.id ? 'bg-emerald-600' : ''
                  }`}
                >
                  {addingItem === item.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isInDraft(item.id) ? (
                    <><Check size={14} /> In Draft</>
                  ) : addedItem === item.id ? (
                    <><Check size={14} /> Added</>
                  ) : (
                    <><ShoppingCart size={14} /> Add</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center">
          <Package size={48} className="mx-auto text-steel-300 mb-4" />
          <div className="text-lg font-semibold text-steel-500">No items found</div>
          <div className="text-sm text-steel-400 mt-1">Try adjusting your search or filters</div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum ? 'bg-brand-600 text-white' : 'text-steel-600 hover:bg-steel-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary text-sm px-3 py-2">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>}>
      <CatalogContent />
    </Suspense>
  );
}
