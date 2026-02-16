'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { procurementApi } from '../../lib/api.js';
import { FileText, Plus, Clock, ChevronRight } from 'lucide-react';

const statusFilters = ['', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED'];

export default function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter, page],
    queryFn: () => procurementApi.listPOs({ status: statusFilter || undefined, page, limit: 15 }),
  });

  const pos = data?.purchaseOrders || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-steel-500 mt-1">Manage and track your purchase orders</p>
        </div>
        <Link href="/purchase-orders/new" className="btn-primary">
          <Plus size={18} /> New PO
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-steel-100 p-1 rounded-xl w-fit">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              statusFilter === s ? 'bg-white text-steel-900 shadow-sm' : 'text-steel-500 hover:text-steel-700'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* PO list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5"><div className="skeleton h-12 rounded" /></div>
          ))}
        </div>
      ) : pos.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto text-steel-300 mb-4" />
          <div className="text-lg font-semibold text-steel-500">No purchase orders</div>
          <div className="text-sm text-steel-400 mt-1 mb-4">Create your first PO from the catalog</div>
          <Link href="/catalog" className="btn-primary">Browse Catalog</Link>
        </div>
      ) : (
        <div className="card divide-y divide-steel-100">
          {pos.map((po) => (
            <Link
              key={po.id}
              href={`/purchase-orders/${po.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-steel-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <span className={`badge status-${po.status}`}>{po.status}</span>
                <div>
                  <div className="font-semibold text-sm">{po.po_number || 'Draft (no number)'}</div>
                  <div className="text-xs text-steel-500 flex items-center gap-2">
                    <span>{po.supplier_name}</span>
                    <span>·</span>
                    <span>{po.line_count || 0} item{(po.line_count || 0) !== 1 ? 's' : ''}</span>
                    {po.requestor && <><span>·</span><span>{po.requestor}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-sm">${parseFloat(po.total_amount).toLocaleString()}</div>
                  <div className="text-xs text-steel-400 flex items-center gap-1">
                    <Clock size={12} /> {new Date(po.created_at).toLocaleDateString()}
                  </div>
                </div>
                <ChevronRight size={16} className="text-steel-300 group-hover:text-steel-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">
            Previous
          </button>
          <span className="text-sm text-steel-500">Page {page} of {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary text-sm">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
