import { Router } from 'express';
import PurchaseOrder from '../models/PurchaseOrder.js';
import logger from '../config/logger.js';

const router = Router();

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:4001';

/**
 * Fetch a catalog item snapshot from the catalog service.
 *
 * This is an INTER-SERVICE call:
 *   procurement-service  →  catalog-service
 *
 * Inside Docker: CATALOG_URL = http://catalog-service:4001
 *   (Docker DNS resolves "catalog-service" to the container)
 *
 * Locally:       CATALOG_URL = http://localhost:4001
 *   (from .env file when running with VS Code debugger)
 */
async function fetchCatalogItem(catalogItemId) {
  const url = `${CATALOG_URL}/api/catalog/items/${catalogItemId}`;
  logger.info({ url, catalogItemId }, 'Fetching catalog item for PO line');

  let res;
  try {
    res = await fetch(url);
  } catch (networkErr) {
    // fetch() itself failed — catalog service unreachable
    logger.error({ err: networkErr, url }, 'Cannot reach catalog service');
    const err = new Error(`Catalog service unreachable at ${CATALOG_URL}`);
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    // Read the actual error from catalog service
    let body;
    try {
      body = await res.json();
    } catch {
      body = { error: `HTTP ${res.status}` };
    }

    logger.error({
      catalogItemId,
      upstreamStatus: res.status,
      upstreamError: body,
    }, 'Catalog service returned an error');

    if (res.status === 404) {
      const err = new Error(`Catalog item "${catalogItemId}" not found`);
      err.status = 404;
      throw err;
    }

    // Forward the real error (don't hide 500s as 404s!)
    const err = new Error(body.error || `Catalog service error: HTTP ${res.status}`);
    err.status = res.status >= 500 ? 502 : res.status;
    throw err;
  }

  return res.json();
}

// ════════════════════════════════════════════════════
//  PO CRUD
// ════════════════════════════════════════════════════

// POST / — Create draft PO
router.post('/', async (req, res) => {
  const { supplierCode, supplierName, idempotencyKey } = req.body;
  if (!supplierCode || !supplierName) {
    return res.status(400).json({ error: 'supplierCode and supplierName are required' });
  }
  const po = await PurchaseOrder.createDraft({ supplierCode, supplierName, idempotencyKey });
  res.status(201).json(po);
});

// GET / — List POs
router.get('/', async (req, res) => {
  const { status, page = '1', limit = '15' } = req.query;
  const result = await PurchaseOrder.list({
    status: status || undefined,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });
  res.json(result);
});

// GET /:id — Get PO detail
router.get('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  res.json(po);
});

// PATCH /:id — Update draft header
router.patch('/:id', async (req, res) => {
  const po = await PurchaseOrder.updateDraft(req.params.id, req.body);
  res.json(po);
});

// DELETE /:id — Delete draft
router.delete('/:id', async (req, res) => {
  await PurchaseOrder.deleteDraft(req.params.id);
  res.status(204).end();
});

// ════════════════════════════════════════════════════
//  LINE ITEMS
// ════════════════════════════════════════════════════

// GET /:id/lines — List line items for a PO
router.get('/:id/lines', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });
  res.json({ lineItems: po.lineItems });
});

// POST /:id/lines — Add line item (fetches catalog snapshot)
router.post('/:id/lines', async (req, res) => {
  const { catalogItemId, quantity = 1 } = req.body;
  if (!catalogItemId) {
    return res.status(400).json({ error: 'catalogItemId is required' });
  }

  // Fetch live data from catalog service (inter-service call)
  const item = await fetchCatalogItem(catalogItemId);

  const line = await PurchaseOrder.addLineItem(req.params.id, {
    catalogItemId,
    quantity,
    itemName: item.name,
    itemModel: item.model,
    manufacturer: item.manufacturer,
    unitPrice: item.price_usd,
    leadTimeDays: item.lead_time_days,
    inStock: item.in_stock,
    supplierCode: item.supplier_code,
  });

  res.status(201).json(line);
});

// PATCH /:id/lines/:lineId — Update line quantity
router.patch('/:id/lines/:lineId', async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be >= 1' });
  }
  const line = await PurchaseOrder.updateLineItem(req.params.id, req.params.lineId, { quantity });
  res.json(line);
});

// DELETE /:id/lines/:lineId — Remove line item
router.delete('/:id/lines/:lineId', async (req, res) => {
  await PurchaseOrder.removeLineItem(req.params.id, req.params.lineId);
  res.status(204).end();
});

// ════════════════════════════════════════════════════
//  STATUS TRANSITIONS
//
//  PO lifecycle:  DRAFT → SUBMITTED → APPROVED → FULFILLED
//                                   ↘ REJECTED
// ════════════════════════════════════════════════════

// POST /:id/submit
router.post('/:id/submit', async (req, res) => {
  const { changedBy, notes } = req.body;
  const po = await PurchaseOrder.submit(req.params.id, { changedBy, notes });
  logger.info({ poId: po.id, poNumber: po.po_number }, 'PO submitted');
  res.json(po);
});

// POST /:id/approve
router.post('/:id/approve', async (req, res) => {
  const { changedBy = 'Approver', notes = 'PO approved' } = req.body;
  const po = await PurchaseOrder.transitionStatus(req.params.id, 'APPROVED', { changedBy, notes });
  logger.info({ poId: po.id }, 'PO approved');
  res.json(po);
});

// POST /:id/reject
router.post('/:id/reject', async (req, res) => {
  const { changedBy = 'Approver', notes = 'PO rejected' } = req.body;
  const po = await PurchaseOrder.transitionStatus(req.params.id, 'REJECTED', { changedBy, notes });
  logger.info({ poId: po.id }, 'PO rejected');
  res.json(po);
});

// POST /:id/fulfill
router.post('/:id/fulfill', async (req, res) => {
  const { changedBy = 'Warehouse', notes = 'PO fulfilled' } = req.body;
  const po = await PurchaseOrder.transitionStatus(req.params.id, 'FULFILLED', { changedBy, notes });
  logger.info({ poId: po.id }, 'PO fulfilled');
  res.json(po);
});

export default router;