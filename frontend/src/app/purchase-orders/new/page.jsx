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
  { id: 'cart',   label: 'Line Items',     shortLabel: 'Items',   icon: ShoppingCart },
  { id: 'header', label: 'PO Details',      shortLabel: 'Details', icon: FileText },
  { id: 'review', label: 'Review & Submit', shortLabel: 'Review',  icon: Eye },
];

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useDraftStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const currentStepIdx = STEPS.findIndex((s) => s.id === draft.step);

  // Helper: clear draft + invalidate all PO queries
  const invalidateAndClear = () => {
    draft.clearDraft();
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['pos-dashboard'] });
  };

  // ── No draft? Show empty state ────────────────────
  if (!draft.poId) {
    return (
      <div className="card p-8 sm:p-12 text-center max-w-lg mx-auto mt-8">
        <Package size={48} className="mx-auto text-steel-300 mb-4" />
        <div className="text-lg font-semibold text-steel-600">No active draft</div>
        <div className="text-sm text-steel-400 mt-2 mb-6">
          Browse the catalog and add items to start a new purchase order.
        </div>
        <Link href="/catalog" className="btn-primary">
          <ShoppingCart size={16} /> Browse Catalog
        </Link>
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
      // If last item removed, delete the whole PO
      if (draft.items.length <= 1) {
        await procurementApi.deleteDraft(draft.poId).catch(() => {});
        invalidateAndClear();
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
      // Save header fields to backend
      await procurementApi.updateDraft(draft.poId, {
        requestor: draft.requestor,
        cost_center: draft.costCenter,
        needed_by_date: draft.neededByDate || null,
        payment_terms: draft.paymentTerms,
        notes: draft.notes,
      });
      // Transition DRAFT → SUBMITTED
      await procurementApi.submitPO(draft.poId, {
        changedBy: draft.requestor || 'Buyer',
        notes: 'PO submitted for approval',
      });
      invalidateAndClear();
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
    invalidateAndClear();
    router.push('/catalog');
  };

  const draftTotal = draft.items.reduce(
    (sum, line) => sum + line.quantity * parseFloat(line.unit_price || 0), 0
  );

  const canProceedToReview = draft.requestor.trim() && draft.costCenter.trim();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">New Purchase Order</h1>
          <p className="text-steel-500 mt-1 text-sm">
            {draft.supplierName} · {draft.items.length} item{draft.items.length !== 1 ? 's' : ''} · ${draftTotal.toLocaleString()}
          </p>
        </div>
        <button onClick={handleDiscardDraft} className="btn-secondary text-red-600 hover:bg-red-50 shrink-0 text-xs sm:text-sm">
          <Trash2 size={16} /> <span className="hidden sm:inline">Discard</span>
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const active = idx === currentStepIdx;
          const completed = idx < currentStepIdx;
          return (
            <div key={step.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
              {idx > 0 && <div className={`w-6 sm:w-12 h-0.5 ${completed ? 'bg-brand-500' : 'bg-steel-200'}`} />}
              <button
                onClick={() => {
                  // Can go back freely, forward only if valid
                  if (idx <= currentStepIdx || (idx === 1) || (idx === 2 && canProceedToReview)) {
                    draft.setStep(step.id);
                  }
                }}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  active ? 'bg-brand-600 text-white' :
                  completed ? 'bg-brand-100 text-brand-700' :
                  'bg-steel-100 text-steel-500'
                }`}
              >
                {completed ? <Check size={14} /> : <step.icon size={14} />}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-red-700">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/*  STEP 1: CART — Line Items                     */}
      {/* ═══════════════════════════════════════════════ */}
      {draft.step === 'cart' && (
        <div className="space-y-4">
          <div className="card">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-steel-100 flex items-center justify-between">
              <h2 className="font-semibold text-steel-700 text-sm sm:text-base">Line Items</h2>
              <Link href="/catalog" className="text-xs sm:text-sm text-brand-600 hover:text-brand-700 font-medium">
                <Plus size={14} className="inline mr-1" />Add more items
              </Link>
            </div>

            {draft.items.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={36} className="mx-auto text-steel-300 mb-3" />
                <div className="text-sm text-steel-500 mb-3">No items in cart yet</div>
                <Link href="/catalog" className="btn-primary text-sm">Browse Catalog</Link>
              </div>
            ) : (
              <div className="divide-y divide-steel-100">
                {draft.items.map((line) => (
                  <div key={line.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{line.item_name}</div>
                      <div className="text-xs text-steel-400">
                        {line.item_model} · ${parseFloat(line.unit_price).toLocaleString()} each
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQty(line, -1)}
                          disabled={line.quantity <= 1}
                          className="btn-secondary p-1.5"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{line.quantity}</span>
                        <button onClick={() => handleUpdateQty(line, 1)} className="btn-secondary p-1.5">
                          <Plus size={14} />
                        </button>
                      </div>
                      {/* Line total */}
                      <div className="text-right w-24">
                        <div className="font-bold text-sm">
                          ${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}
                        </div>
                      </div>
                      {/* Remove */}
                      <button onClick={() => handleRemoveLine(line.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cart total */}
            {draft.items.length > 0 && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-steel-100 flex justify-between items-center bg-steel-50 rounded-b-xl">
                <span className="font-semibold text-sm sm:text-base">Estimated Total</span>
                <span className="text-lg sm:text-xl font-bold">${draftTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-end">
            <button
              onClick={() => draft.setStep('header')}
              disabled={draft.items.length === 0}
              className="btn-primary text-sm"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/*  STEP 2: HEADER — PO Details                   */}
      {/* ═══════════════════════════════════════════════ */}
      {draft.step === 'header' && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold text-steel-700 text-sm sm:text-base">Purchase Order Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Requestor <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={draft.requestor}
                  onChange={(e) => draft.setHeader({ requestor: e.target.value })}
                  placeholder="Your name"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Cost Center <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={draft.costCenter}
                  onChange={(e) => draft.setHeader({ costCenter: e.target.value })}
                  placeholder="e.g. CC-4500-OPS"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Needed By Date</label>
                <input
                  type="date"
                  value={draft.neededByDate}
                  onChange={(e) => draft.setHeader({ neededByDate: e.target.value })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-steel-600 mb-1">Payment Terms</label>
                <select
                  value={draft.paymentTerms}
                  onChange={(e) => draft.setHeader({ paymentTerms: e.target.value })}
                  className="input-field text-sm"
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
                className="input-field text-sm"
                rows={3}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button onClick={() => draft.setStep('cart')} className="btn-secondary text-sm">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => draft.setStep('review')}
              disabled={!canProceedToReview}
              className="btn-primary text-sm"
            >
              Review Order <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/*  STEP 3: REVIEW — Summary & Submit             */}
      {/* ═══════════════════════════════════════════════ */}
      {draft.step === 'review' && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-steel-700 mb-4 text-sm sm:text-base">Review Order</h2>

            {/* Header summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 p-4 bg-steel-50 rounded-lg">
              <div>
                <div className="text-xs text-steel-400">Supplier</div>
                <div className="text-sm font-medium">{draft.supplierName}</div>
              </div>
              <div>
                <div className="text-xs text-steel-400">Requestor</div>
                <div className="text-sm font-medium">{draft.requestor}</div>
              </div>
              <div>
                <div className="text-xs text-steel-400">Cost Center</div>
                <div className="text-sm font-medium">{draft.costCenter}</div>
              </div>
              <div>
                <div className="text-xs text-steel-400">Payment Terms</div>
                <div className="text-sm font-medium">{draft.paymentTerms}</div>
              </div>
            </div>

            {draft.neededByDate && (
              <div className="mb-4 text-sm">
                <span className="text-steel-400">Needed By: </span>
                <span className="font-medium">{draft.neededByDate}</span>
              </div>
            )}
            {draft.notes && (
              <div className="mb-6 p-3 bg-steel-50 rounded-lg text-sm text-steel-600">{draft.notes}</div>
            )}

            {/* Items table — desktop */}
            <div className="border border-steel-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm hidden sm:table">
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
                      <td className="px-4 py-3 text-right font-bold">
                        ${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}
                      </td>
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

              {/* Items — mobile */}
              <div className="sm:hidden divide-y divide-steel-100">
                {draft.items.map((line) => (
                  <div key={line.id} className="p-3">
                    <div className="font-medium text-sm">{line.item_name}</div>
                    <div className="text-xs text-steel-400 mb-2">{line.item_model}</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-steel-500">
                        Qty: {line.quantity} × ${parseFloat(line.unit_price).toLocaleString()}
                      </span>
                      <span className="font-bold">
                        ${(line.quantity * parseFloat(line.unit_price)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="p-3 bg-steel-50 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-lg">${draftTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation + Submit */}
          <div className="flex justify-between">
            <button onClick={() => draft.setStep('header')} className="btn-secondary text-sm">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || draft.items.length === 0}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-sm"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit Purchase Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}