'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import useDraftStore from '../../../store/draftStore.js';
import { procurementApi } from '../../../lib/api.js';
import Link from 'next/link';
import {
  ShoppingCart, FileText, Eye, Send, ArrowLeft, ArrowRight,
  Trash2, Plus, Minus, Package, Loader2, AlertTriangle, Check,
} from 'lucide-react';

const STEPS = [
  { id: 'cart',   label: 'Line Items',      icon: ShoppingCart },
  { id: 'header', label: 'PO Details',       icon: FileText },
  { id: 'review', label: 'Review & Submit',  icon: Eye },
];

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useDraftStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const currentStepIdx = STEPS.findIndex((s) => s.id === draft.step);

  // ── No draft? Redirect to catalog ────────────────
  if (!draft.poId) {
    return (
      <div className="card p-12 text-center">
        <Package size={48} className="mx-auto text-steel-300 mb-4" />
        <div className="text-lg font-semibold text-steel-500">No active draft</div>
        <div className="text-sm text-steel-400 mt-1 mb-4">
          Browse the catalog and add items to start a purchase order
        </div>
        <Link href="/catalog" className="btn-primary">Browse Catalog</Link>
      </div>
    );
  }

  // ── Quantity handlers ────────────────────────────
  const handleUpdateQty = async (line, delta) => {
    const newQty = Math.max(1, line.quantity + delta);
    try {
      await procurementApi.updateLineItem(draft.poId, line.id, { quantity: newQty });
      draft.updateItemQty(line.id, newQty);
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const handleRemoveLine = async (lineId) => {
    try {
      await procurementApi.removeLineItem(draft.poId, lineId);
      draft.removeItem(lineId);
      // If no items left, reset draft
      if (draft.items.length <= 1) {
        await procurementApi.deleteDraft(draft.poId).catch(() => {});
        draft.clearDraft();
      }
    } catch (err) {
      console.error('Failed to remove line:', err);
    }
  };

  // ── Submit PO ────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Update header first
      await procurementApi.updateDraft(draft.poId, {
        requestor: draft.requestor,
        cost_center: draft.costCenter,
        needed_by_date: draft.neededByDate || null,
        payment_terms: draft.paymentTerms,
        notes: draft.notes,
      });

      // Submit
      await procurementApi.submitPO(draft.poId, {
        changedBy: draft.requestor || 'Buyer',
        notes: 'PO submitted for approval',
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      draft.clearDraft();
      router.push('/purchase-orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit PO');
    }
    setSubmitting(false);
  };

  const handleDiscardDraft = async () => {
    if (!confirm('Discard this draft? All items will be removed.')) return;
    try {
      await procurementApi.deleteDraft(draft.poId).catch(() => {});
    } catch { /* ignore */ }
    draft.clearDraft();
    router.push('/catalog');
  };

  const draftTotal = draft.items.reduce(
    (sum, line) => sum + line.quantity * parseFloat(line.unit_price || 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">New Purchase Order</h1>
          <p className="text-steel-500 mt-1">
            {draft.supplierName} · {draft.items.length} item{draft.items.length !== 1 ? 's' : ''} · ${draftTotal.toLocaleString()}
          </p>
        </div>
        <button onClick={handleDiscardDraft} className="btn-secondary text-red-600 hover:bg-red-50">
          <Trash2 size={16} /> Discard
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, idx) => {
          const active = idx === currentStepIdx;
          const completed = idx < currentStepIdx;
          return (
            <div key={step.id} className="flex items-center gap-2">
              {idx > 0 && <div className={`w-12 h-0.5 ${completed ? 'bg-brand-500' : 'bg-steel-200'}`} />}
              <button
                onClick={() => draft.setStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-brand-600 text-white' :
                  completed ? 'bg-brand-100 text-brand-700' :
                  'bg-steel-100 text-steel-500'
                }`}
              >
                {completed ? <Check size={16} /> : <step.icon size={16} />}
                {step.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* ── Step 1: Cart ──────────────────────────── */}
      {draft.step === 'cart' && (
        <div className="space-y-4">
          <div className="card">
            <div className="px-6 py-4 border-b border-steel-100 flex items-center justify-between">
              <h2 className="font-semibold text-steel-700">Line Items</h2>
              <Link href="/catalog" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                <Plus size={14} className="inline mr-1" />Add items
              </Link>
            </div>
            <div className="divide-y divide-steel-100">
              {draft.items.map((line) => (
                <div key={line.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{line.item_name}</div>
                    <div className="text-xs text-steel-400">{line.item_model} · ${parseFloat(line.unit_price).toLocaleString()} each</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleUpdateQty(line, -1)} disabled={line.quantity <= 1} className="btn-secondary p-1.5">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{line.quantity}</span>
                    <button onClick={() => handleUpdateQty(line, 1)} className="btn-secondary p-1.5">
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right w-28">
                    <div className="font-bold text-sm">${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleRemoveLine(line.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-steel-100 flex justify-between items-center bg-steel-50 rounded-b-xl">
              <span className="font-semibold">Estimated Total</span>
              <span className="text-xl font-bold">${draftTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => draft.setStep('header')} className="btn-primary" disabled={draft.items.length === 0}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Header Details ────────────────── */}
      {draft.step === 'header' && (
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-steel-700 mb-2">Purchase Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Requestor *</label>
                <input
                  type="text"
                  value={draft.requestor}
                  onChange={(e) => draft.setHeader({ requestor: e.target.value })}
                  placeholder="Your name"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Cost Center *</label>
                <input
                  type="text"
                  value={draft.costCenter}
                  onChange={(e) => draft.setHeader({ costCenter: e.target.value })}
                  placeholder="e.g. CC-4500-OPS"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Needed By Date</label>
                <input
                  type="date"
                  value={draft.neededByDate}
                  onChange={(e) => draft.setHeader({ neededByDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Payment Terms</label>
                <select
                  value={draft.paymentTerms}
                  onChange={(e) => draft.setHeader({ paymentTerms: e.target.value })}
                  className="input-field"
                >
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                  <option>Due on Receipt</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-steel-600 mb-1">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => draft.setHeader({ notes: e.target.value })}
                placeholder="Optional notes for the supplier…"
                className="input-field"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => draft.setStep('cart')} className="btn-secondary">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => draft.setStep('review')}
              disabled={!draft.requestor || !draft.costCenter}
              className="btn-primary"
            >
              Review <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ───────────────── */}
      {draft.step === 'review' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-steel-700 mb-4">Review Order</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div><div className="text-xs text-steel-400">Supplier</div><div className="text-sm font-medium">{draft.supplierName}</div></div>
              <div><div className="text-xs text-steel-400">Requestor</div><div className="text-sm font-medium">{draft.requestor}</div></div>
              <div><div className="text-xs text-steel-400">Cost Center</div><div className="text-sm font-medium">{draft.costCenter}</div></div>
              <div><div className="text-xs text-steel-400">Payment Terms</div><div className="text-sm font-medium">{draft.paymentTerms}</div></div>
            </div>
            {draft.neededByDate && (
              <div className="mb-4"><span className="text-xs text-steel-400">Needed By: </span><span className="text-sm font-medium">{draft.neededByDate}</span></div>
            )}
            {draft.notes && (
              <div className="mb-6 p-3 bg-steel-50 rounded-lg text-sm text-steel-600">{draft.notes}</div>
            )}

            {/* Items summary */}
            <div className="border border-steel-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-steel-50 text-left">
                    <th className="px-4 py-2 font-semibold text-steel-600">Item</th>
                    <th className="px-4 py-2 font-semibold text-steel-600 text-center">Qty</th>
                    <th className="px-4 py-2 font-semibold text-steel-600 text-right">Unit Price</th>
                    <th className="px-4 py-2 font-semibold text-steel-600 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {draft.items.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{line.item_name}</div>
                        <div className="text-xs text-steel-400">{line.item_model}</div>
                      </td>
                      <td className="px-4 py-3 text-center">{line.quantity}</td>
                      <td className="px-4 py-3 text-right">${parseFloat(line.unit_price).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold">${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-steel-50 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3 text-right text-lg">${draftTotal.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => draft.setStep('header')} className="btn-secondary">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Purchase Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
