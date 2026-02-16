'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { procurementApi } from '../../../lib/api.js';
import useDraftStore from '../../../store/draftStore.js';
import {
  ArrowLeft, Clock, CheckCircle, XCircle,
  Package, Loader2, User, Building, Calendar, CreditCard,
  Edit3, Trash2, Send,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const statusColors = {
  DRAFT: 'bg-steel-500',
  SUBMITTED: 'bg-amber-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  FULFILLED: 'bg-brand-600',
};

export default function PODetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useDraftStore();
  const [actionLoading, setActionLoading] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['po', id],
    queryFn: () => procurementApi.getPO(id),
    enabled: !!id,
  });

  // ── Status transition actions (Approve / Reject / Fulfill) ──
  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      const payload = { changedBy: 'Buyer', notes: actionNotes || `PO ${action}` };
      if (action === 'approve') await procurementApi.approvePO(id, payload);
      else if (action === 'reject') await procurementApi.rejectPO(id, payload);
      else if (action === 'fulfill') await procurementApi.fulfillPO(id, payload);
      queryClient.invalidateQueries({ queryKey: ['po', id] });
      queryClient.invalidateQueries({ queryKey: ['pos-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setActionNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
    setActionLoading(null);
  };

  // ── DRAFT: "Continue Editing" → Load PO into Zustand → redirect to wizard ──
  const handleContinueEditing = () => {
    if (!po) return;
    // Load this PO's data into the Zustand draft store
    draft.clearDraft();
    draft.setDraft({
      id: po.id,
      supplier_code: po.supplier_code,
      supplier_name: po.supplier_name,
    });
    // Load header fields if they exist
    draft.setHeader({
      requestor: po.requestor || '',
      costCenter: po.cost_center || '',
      neededByDate: po.needed_by_date ? po.needed_by_date.split('T')[0] : '',
      paymentTerms: po.payment_terms || 'Net 30',
      notes: po.notes || '',
    });
    // Load line items into Zustand
    const lines = po.lineItems || [];
    for (const line of lines) {
      draft.addItem(line);
    }
    router.push('/purchase-orders/new');
  };

  // ── DRAFT: Delete ──
  const handleDeleteDraft = async () => {
    if (!confirm('Delete this draft permanently? This cannot be undone.')) return;
    setActionLoading('delete');
    try {
      await procurementApi.deleteDraft(id);
      // If this is the active draft in Zustand, clear it
      if (draft.poId === id) {
        draft.clearDraft();
      }
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-dashboard'] });
      router.push('/purchase-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete draft');
    }
    setActionLoading(null);
  };

  // ── Loading state ──
  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin text-brand-500" />
    </div>
  );

  // ── Not found ──
  if (error || !po) return (
    <div className="card p-8 sm:p-12 text-center">
      <div className="text-lg font-semibold text-steel-500">Purchase order not found</div>
      <Link href="/purchase-orders" className="btn-primary mt-4 inline-flex">Back to POs</Link>
    </div>
  );

  const lines = po.lineItems || [];
  const timeline = po.timeline || [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
        <button onClick={() => router.push('/purchase-orders')} className="btn-secondary p-2 self-start">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">{po.po_number || 'Draft PO'}</h1>
            <span className={`badge status-${po.status} text-xs sm:text-sm`}>{po.status}</span>
          </div>
          <div className="text-xs sm:text-sm text-steel-500 mt-1">
            {po.supplier_name} · Created {new Date(po.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xl sm:text-2xl font-bold">${parseFloat(po.total_amount).toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-steel-500">{lines.length} line item{lines.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column: Details + Lines */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Order details */}
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold mb-3 sm:mb-4 text-steel-700 text-sm sm:text-base">Order Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: User, label: 'Requestor', value: po.requestor },
                { icon: Building, label: 'Cost Center', value: po.cost_center },
                { icon: Calendar, label: 'Needed By', value: po.needed_by_date ? new Date(po.needed_by_date).toLocaleDateString() : null },
                { icon: CreditCard, label: 'Payment', value: po.payment_terms },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={14} className="text-steel-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-steel-400">{label}</div>
                    <div className="text-sm font-medium truncate">{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
            {po.notes && (
              <div className="mt-4 p-3 bg-steel-50 rounded-lg text-sm text-steel-600">{po.notes}</div>
            )}
          </div>

          {/* Line items */}
          <div className="card">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-steel-100">
              <h2 className="font-semibold text-steel-700 text-sm sm:text-base">Line Items</h2>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-50 text-left">
                    <th className="px-6 py-3 font-semibold text-steel-600">Item</th>
                    <th className="px-4 py-3 font-semibold text-steel-600">Model</th>
                    <th className="px-4 py-3 font-semibold text-steel-600 text-center">Qty</th>
                    <th className="px-4 py-3 font-semibold text-steel-600 text-right">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-steel-600 text-center">Lead</th>
                    <th className="px-6 py-3 font-semibold text-steel-600 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-steel-50">
                      <td className="px-6 py-4">
                        <div className="font-medium">{line.item_name}</div>
                        <div className="text-xs text-steel-400 font-mono">{line.catalog_item_id}</div>
                      </td>
                      <td className="px-4 py-4 text-steel-600">{line.item_model}</td>
                      <td className="px-4 py-4 text-center font-semibold">{line.quantity}</td>
                      <td className="px-4 py-4 text-right">${parseFloat(line.unit_price).toLocaleString()}</td>
                      <td className="px-4 py-4 text-center">{line.lead_time_days}d</td>
                      <td className="px-6 py-4 text-right font-bold">
                        ${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-steel-50 font-bold">
                    <td colSpan={5} className="px-6 py-3 text-right">Total</td>
                    <td className="px-6 py-3 text-right text-lg">${parseFloat(po.total_amount).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-steel-100">
              {lines.map((line) => (
                <div key={line.id} className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium text-sm">{line.item_name}</div>
                    <span className="font-bold text-sm shrink-0 ml-2">
                      ${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-steel-400 mb-2">{line.item_model} · {line.catalog_item_id}</div>
                  <div className="flex gap-4 text-xs text-steel-500">
                    <span>Qty: {line.quantity}</span>
                    <span>${parseFloat(line.unit_price).toLocaleString()} each</span>
                    <span>{line.lead_time_days}d lead</span>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-steel-50 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">${parseFloat(po.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Actions + Timeline */}
        <div className="space-y-4 sm:space-y-6">

          {/* ═══ DRAFT Actions ═══ */}
          {po.status === 'DRAFT' && (
            <div className="card p-4 sm:p-5">
              <h3 className="font-semibold mb-3 text-steel-700 text-sm sm:text-base">Draft Actions</h3>
              <p className="text-xs text-steel-400 mb-4">
                This order is still a draft. Continue editing to fill in details and submit for approval.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleContinueEditing}
                  className="btn-primary w-full text-sm justify-center"
                >
                  <Edit3 size={16} /> Continue Editing
                </button>
                <button
                  onClick={handleDeleteDraft}
                  disabled={actionLoading === 'delete'}
                  className="btn-secondary w-full text-sm justify-center text-red-600 hover:bg-red-50 hover:border-red-200"
                >
                  {actionLoading === 'delete' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete Draft
                </button>
              </div>
            </div>
          )}

          {/* ═══ SUBMITTED Actions (Approve / Reject) ═══ */}
          {po.status === 'SUBMITTED' && (
            <div className="card p-4 sm:p-5">
              <h3 className="font-semibold mb-3 text-steel-700 text-sm sm:text-base">Review Actions</h3>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Optional notes…"
                className="input-field mb-3 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={!!actionLoading}
                  className="btn-success flex-1 text-xs sm:text-sm"
                >
                  {actionLoading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={!!actionLoading}
                  className="btn-danger flex-1 text-xs sm:text-sm"
                >
                  {actionLoading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* ═══ APPROVED Actions (Fulfill) ═══ */}
          {po.status === 'APPROVED' && (
            <div className="card p-4 sm:p-5">
              <h3 className="font-semibold mb-3 text-steel-700 text-sm sm:text-base">Fulfillment</h3>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Optional notes…"
                className="input-field mb-3 text-sm"
                rows={2}
              />
              <button
                onClick={() => handleAction('fulfill')}
                disabled={!!actionLoading}
                className="btn-primary w-full text-sm justify-center"
              >
                {actionLoading === 'fulfill' ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                Mark Fulfilled
              </button>
            </div>
          )}

          {/* ═══ Timeline (all statuses) ═══ */}
          <div className="card p-4 sm:p-5">
            <h3 className="font-semibold mb-4 text-steel-700 text-sm sm:text-base">Status Timeline</h3>
            <div className="space-y-0">
              {timeline.map((entry, i) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${statusColors[entry.to_status] || 'bg-steel-300'} ring-4 ring-white`} />
                    {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-steel-200 my-1" />}
                  </div>
                  <div className="pb-5">
                    <div className="font-medium text-sm">
                      {entry.from_status ? `${entry.from_status} → ` : ''}{entry.to_status}
                    </div>
                    <div className="text-xs text-steel-400 mt-0.5">
                      {new Date(entry.created_at).toLocaleString()} · {entry.changed_by}
                    </div>
                    {entry.notes && <div className="text-xs text-steel-500 mt-1">{entry.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}