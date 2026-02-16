import pool from '../config/database.js';

const VALID_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['FULFILLED'],
  REJECTED: [],
  FULFILLED: [],
};

const PurchaseOrder = {
  /**
   * Create a new draft PO. Supports idempotency via idempotencyKey.
   */
  async createDraft({ supplierCode, supplierName, idempotencyKey }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Idempotency check
      if (idempotencyKey) {
        const existing = await client.query(
          'SELECT id, po_number, status, supplier_code, supplier_name, total_amount, created_at FROM purchase_orders WHERE idempotency_key = $1',
          [idempotencyKey]
        );
        if (existing.rows.length > 0) {
          await client.query('COMMIT');
          return existing.rows[0];
        }
      }

      const { rows } = await client.query(`
        INSERT INTO purchase_orders
          (supplier_code, supplier_name, status, idempotency_key)
        VALUES ($1, $2, 'DRAFT', $3)
        RETURNING id, po_number, status, supplier_code, supplier_name, total_amount, created_at
      `, [supplierCode, supplierName, idempotencyKey || null]);

      const po = rows[0];

      // Record initial timeline entry
      await client.query(`
        INSERT INTO po_status_timeline
          (po_id, from_status, to_status, changed_by, notes)
        VALUES ($1, NULL, 'DRAFT', 'System', 'PO created')
      `, [po.id]);

      await client.query('COMMIT');
      return po;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Add a line item. Enforces single-supplier constraint.
   * Returns 409 on supplier mismatch (via DB trigger or pre-check).
   */
  async addLineItem(poId, { catalogItemId, quantity, itemName, itemModel, manufacturer, unitPrice, leadTimeDays, inStock, supplierCode }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify PO is in DRAFT
      const poRes = await client.query(
        'SELECT id, status, supplier_code FROM purchase_orders WHERE id = $1 FOR UPDATE',
        [poId]
      );
      if (poRes.rows.length === 0) {
        const err = new Error('Purchase order not found');
        err.status = 404;
        throw err;
      }
      const po = poRes.rows[0];
      if (po.status !== 'DRAFT') {
        const err = new Error('Can only add items to DRAFT purchase orders');
        err.status = 400;
        throw err;
      }

      // Pre-check supplier match
      if (supplierCode && supplierCode !== po.supplier_code) {
        const err = new Error(
          `Supplier mismatch: PO is for "${po.supplier_code}", item belongs to "${supplierCode}"`
        );
        err.status = 409;
        err.code = 'SUPPLIER_MISMATCH';
        throw err;
      }

      const { rows } = await client.query(`
        INSERT INTO po_line_items
          (po_id, catalog_item_id, quantity, item_name, item_model, manufacturer,
           unit_price, lead_time_days, in_stock, supplier_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [poId, catalogItemId, quantity, itemName, itemModel, manufacturer || '',
          unitPrice, leadTimeDays, inStock ?? false, supplierCode]);

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      // Map DB trigger error to 409
      if (err.code === '23514' && err.message?.includes('supplier')) {
        err.status = 409;
        err.code = 'SUPPLIER_MISMATCH';
      }
      throw err;
    } finally {
      client.release();
    }
  },

  async updateLineItem(poId, lineId, { quantity }) {
    const { rows } = await pool.query(`
      UPDATE po_line_items
      SET quantity = $1, updated_at = NOW()
      WHERE id = $2 AND po_id = $3
      RETURNING *
    `, [quantity, lineId, poId]);

    if (rows.length === 0) {
      const err = new Error('Line item not found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  },

  async removeLineItem(poId, lineId) {
    const { rowCount } = await pool.query(
      'DELETE FROM po_line_items WHERE id = $1 AND po_id = $2',
      [lineId, poId]
    );
    if (rowCount === 0) {
      const err = new Error('Line item not found');
      err.status = 404;
      throw err;
    }
  },

  /**
   * Update PO header fields (requestor, cost_center, etc.)
   */
  async updateDraft(poId, fields) {
    const allowed = ['requestor', 'cost_center', 'needed_by_date', 'payment_terms', 'notes'];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      const err = new Error('No valid fields to update');
      err.status = 400;
      throw err;
    }

    values.push(poId);
    const { rows } = await pool.query(`
      UPDATE purchase_orders
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND status = 'DRAFT'
      RETURNING *
    `, values);

    if (rows.length === 0) {
      const err = new Error('PO not found or not in DRAFT status');
      err.status = 404;
      throw err;
    }
    return rows[0];
  },

  async deleteDraft(poId) {
    const { rowCount } = await pool.query(
      "DELETE FROM purchase_orders WHERE id = $1 AND status = 'DRAFT'",
      [poId]
    );
    if (rowCount === 0) {
      const err = new Error('PO not found or not in DRAFT status');
      err.status = 404;
      throw err;
    }
  },

  /**
   * Submit a PO: generate PO number, transition to SUBMITTED.
   */
  async submit(poId, { changedBy = 'Buyer', notes = '' } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const poRes = await client.query(
        'SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE',
        [poId]
      );
      if (poRes.rows.length === 0) {
        const err = new Error('PO not found');
        err.status = 404;
        throw err;
      }

      const po = poRes.rows[0];
      if (po.status !== 'DRAFT') {
        const err = new Error(`Cannot submit a PO in ${po.status} status`);
        err.status = 400;
        throw err;
      }

      // Check at least one line item
      const lineCount = await client.query(
        'SELECT COUNT(*) AS cnt FROM po_line_items WHERE po_id = $1',
        [poId]
      );
      if (parseInt(lineCount.rows[0].cnt, 10) === 0) {
        const err = new Error('Cannot submit PO with no line items');
        err.status = 400;
        throw err;
      }

      // Generate PO number
      const poNumRes = await client.query('SELECT generate_po_number() AS po_number');
      const poNumber = poNumRes.rows[0].po_number;

      // Transition status
      await client.query(`
        UPDATE purchase_orders
        SET status = 'SUBMITTED', po_number = $1, updated_at = NOW()
        WHERE id = $2
      `, [poNumber, poId]);

      // Record timeline
      await client.query(`
        INSERT INTO po_status_timeline
          (po_id, from_status, to_status, changed_by, notes)
        VALUES ($1, 'DRAFT', 'SUBMITTED', $2, $3)
      `, [poId, changedBy, notes || 'PO submitted for approval']);

      await client.query('COMMIT');
      return { ...po, po_number: poNumber, status: 'SUBMITTED' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Generic status transition (approve, reject, fulfill).
   */
  async transitionStatus(poId, toStatus, { changedBy = 'System', notes = '' } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE',
        [poId]
      );
      if (rows.length === 0) {
        const err = new Error('PO not found');
        err.status = 404;
        throw err;
      }

      const po = rows[0];
      const allowed = VALID_TRANSITIONS[po.status] || [];
      if (!allowed.includes(toStatus)) {
        const err = new Error(`Invalid transition: ${po.status} → ${toStatus}`);
        err.status = 400;
        throw err;
      }

      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [toStatus, poId]
      );

      await client.query(`
        INSERT INTO po_status_timeline
          (po_id, from_status, to_status, changed_by, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [poId, po.status, toStatus, changedBy, notes]);

      await client.query('COMMIT');
      return { ...po, status: toStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findById(id) {
    const poRes = await pool.query(
      'SELECT * FROM purchase_orders WHERE id = $1', [id]
    );
    if (poRes.rows.length === 0) return null;

    const po = poRes.rows[0];

    const [linesRes, timelineRes] = await Promise.all([
      pool.query('SELECT * FROM po_line_items WHERE po_id = $1 ORDER BY created_at', [id]),
      pool.query('SELECT * FROM po_status_timeline WHERE po_id = $1 ORDER BY created_at', [id]),
    ]);

    po.lineItems = linesRes.rows;
    po.timeline = timelineRes.rows;
    return po;
  },

  async list({ status, page = 1, limit = 15 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`po.status = $${idx}`);
      values.push(status);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total FROM purchase_orders po ${where}`,
      values
    );

    const dataRes = await pool.query(`
      SELECT po.*,
        (SELECT COUNT(*) FROM po_line_items li WHERE li.po_id = po.id) AS line_count
      FROM purchase_orders po
      ${where}
      ORDER BY po.updated_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]);

    const total = parseInt(countRes.rows[0].total, 10);
    return {
      purchaseOrders: dataRes.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};

export default PurchaseOrder;