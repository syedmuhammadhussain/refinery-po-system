'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { procurementApi } from '../../../lib/api.js';
import {
  ArrowLeft, Clock, CheckCircle, XCircle,
  Package, Loader2, User, Building, Calendar, CreditCard,
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
  const [actionLoading, setActionLoading] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['po', id],
    queryFn: () => procurementApi.getPO(id),
    enabled: !!id,
  });

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      const payload = { changedBy: 'Buyer', notes: actionNotes || `PO ${action}` };
      if (action === 'approve') await procurementApi.approvePO(id, payload);
      else if (action === 'reject') await procurementApi.rejectPO(id, payload);
      else if (action === 'fulfill') await procurementApi.fulfillPO(id, payload);
      queryClient.invalidateQueries({ queryKey: ['po', id] });
      setActionNotes('');
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    }
    setActionLoading(null);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin text-brand-500" />
    </div>
  );

  if (error || !po) return (
    <div className="card p-12 text-center">
      <div className="text-lg font-semibold text-steel-500">Purchase order not found</div>
      <Link href="/purchase-orders" className="btn-primary mt-4 inline-flex">Back to POs</Link>
    </div>
  );

  const lines = po.lineItems || [];
  const timeline = po.timeline || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/purchase-orders')} className="btn-secondary p-2">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{po.po_number || 'Draft PO'}</h1>
            <span className={`badge status-${po.status} text-sm`}>{po.status}</span>
          </div>
          <div className="text-sm text-steel-500 mt-1">
            {po.supplier_name} · Created {new Date(po.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">${parseFloat(po.total_amount).toLocaleString()}</div>
          <div className="text-sm text-steel-500">{lines.length} line item{lines.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details + Lines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order details */}
          <div className="card p-6">
            <h2 className="font-semibold mb-4 text-steel-700">Order Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: User, label: 'Requestor', value: po.requestor },
                { icon: Building, label: 'Cost Center', value: po.cost_center },
                { icon: Calendar, label: 'Needed By', value: po.needed_by_date ? new Date(po.needed_by_date).toLocaleDateString() : null },
                { icon: CreditCard, label: 'Payment Terms', value: po.payment_terms },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={16} className="text-steel-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-steel-400">{label}</div>
                    <div className="text-sm font-medium">{value || '—'}</div>
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
            <div className="px-6 py-4 border-b border-steel-100">
              <h2 className="font-semibold text-steel-700">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-50 text-left">
                    <th className="px-6 py-3 font-semibold text-steel-600">Item</th>
                    <th className="px-4 py-3 font-semibold text-steel-600">Model</th>
                    <th className="px-4 py-3 font-semibold text-steel-600 text-center">Qty</th>
                    <th className="px-4 py-3 font-semibold text-steel-600 text-right">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-steel-600 text-center">Lead Time</th>
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
          </div>
        </div>

        {/* Right: Timeline + Actions */}
        <div className="space-y-6">
          {/* Actions */}
          {(po.status === 'SUBMITTED' || po.status === 'APPROVED') && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3 text-steel-700">Actions</h3>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Optional notes…"
                className="input-field mb-3 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                {po.status === 'SUBMITTED' && (
                  <>
                    <button onClick={() => handleAction('approve')} disabled={!!actionLoading} className="btn-success flex-1 text-sm">
                      {actionLoading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Approve
                    </button>
                    <button onClick={() => handleAction('reject')} disabled={!!actionLoading} className="btn-danger flex-1 text-sm">
                      {actionLoading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Reject
                    </button>
                  </>
                )}
                {po.status === 'APPROVED' && (
                  <button onClick={() => handleAction('fulfill')} disabled={!!actionLoading} className="btn-primary flex-1 text-sm">
                    {actionLoading === 'fulfill' ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                    Mark Fulfilled
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4 text-steel-700">Status Timeline</h3>
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
