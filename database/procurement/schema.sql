-- ============================================================
-- Procurement Service – Schema
-- Data owner: Procurement Service
-- Manages: Purchase Orders, PO Lines, Status Timeline
-- ============================================================
\connect procurement_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PO Number Sequence ───────────────────────────────────
-- Format: PO-YYYY-NNNNN (e.g. PO-2026-00001)
CREATE SEQUENCE po_number_seq START WITH 1 INCREMENT BY 1;

-- ── Purchase Orders ──────────────────────────────────────
CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number       VARCHAR(20) UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','FULFILLED')),
    supplier_code   VARCHAR(50) NOT NULL,
    supplier_name   VARCHAR(200) NOT NULL,
    requestor       VARCHAR(200),
    cost_center     VARCHAR(50),
    needed_by_date  DATE,
    payment_terms   VARCHAR(100),
    notes           TEXT,
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Idempotency: client can pass a unique key to prevent duplicate POs
    idempotency_key VARCHAR(100) UNIQUE
);

CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_code);
CREATE INDEX idx_po_po_number ON purchase_orders(po_number);
CREATE INDEX idx_po_created ON purchase_orders(created_at DESC);

-- ── PO Line Items ────────────────────────────────────────
-- Snapshots catalog data at time of addition/submission
CREATE TABLE po_line_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id           UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    catalog_item_id VARCHAR(20) NOT NULL,
    item_name       VARCHAR(500) NOT NULL,
    item_model      VARCHAR(200) NOT NULL DEFAULT '',
    manufacturer    VARCHAR(200) NOT NULL DEFAULT '',
    supplier_code   VARCHAR(50) NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0) DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL,
    lead_time_days  INTEGER NOT NULL DEFAULT 0,
    in_stock        BOOLEAN NOT NULL DEFAULT false,
    line_total      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    specs_snapshot  JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enforce single supplier per PO at DB level
    CONSTRAINT fk_line_supplier_match CHECK (true)
);

CREATE INDEX idx_lines_po ON po_line_items(po_id);
CREATE INDEX idx_lines_catalog ON po_line_items(catalog_item_id);

-- ── Status Timeline / Audit Log ──────────────────────────
CREATE TABLE po_status_timeline (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id       UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    changed_by  VARCHAR(200) NOT NULL DEFAULT 'system',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_po ON po_status_timeline(po_id);
CREATE INDEX idx_timeline_created ON po_status_timeline(created_at);

-- ── Trigger: auto-update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_updated BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Trigger: enforce single-supplier on line insert ──────
CREATE OR REPLACE FUNCTION enforce_single_supplier()
RETURNS TRIGGER AS $$
DECLARE
    po_supplier VARCHAR(50);
BEGIN
    SELECT supplier_code INTO po_supplier FROM purchase_orders WHERE id = NEW.po_id;
    IF po_supplier IS DISTINCT FROM NEW.supplier_code THEN
        RAISE EXCEPTION 'Supplier mismatch: PO supplier is %, but line item supplier is %', po_supplier, NEW.supplier_code
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_supplier
    BEFORE INSERT ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION enforce_single_supplier();

-- ── Trigger: recalculate PO total on line changes ────────
CREATE OR REPLACE FUNCTION recalculate_po_total()
RETURNS TRIGGER AS $$
DECLARE
    target_po_id UUID;
BEGIN
    target_po_id := COALESCE(NEW.po_id, OLD.po_id);
    UPDATE purchase_orders
    SET total_amount = COALESCE(
        (SELECT SUM(quantity * unit_price) FROM po_line_items WHERE po_id = target_po_id), 0
    )
    WHERE id = target_po_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_total_insert
    AFTER INSERT ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_po_total();

CREATE TRIGGER trg_recalc_total_update
    AFTER UPDATE ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_po_total();

CREATE TRIGGER trg_recalc_total_delete
    AFTER DELETE ON po_line_items
    FOR EACH ROW EXECUTE FUNCTION recalculate_po_total();

-- ── Function: generate PO number ─────────────────────────
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    seq_val BIGINT;
    year_str VARCHAR(4);
BEGIN
    seq_val := nextval('po_number_seq');
    year_str := EXTRACT(YEAR FROM NOW())::VARCHAR;
    RETURN 'PO-' || year_str || '-' || LPAD(seq_val::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ── Valid state transitions ──────────────────────────────
CREATE OR REPLACE FUNCTION validate_status_transition(
    current_status VARCHAR(20),
    new_status VARCHAR(20)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN CASE
        WHEN current_status = 'DRAFT' AND new_status = 'SUBMITTED' THEN true
        WHEN current_status = 'SUBMITTED' AND new_status IN ('APPROVED', 'REJECTED') THEN true
        WHEN current_status = 'APPROVED' AND new_status = 'FULFILLED' THEN true
        ELSE false
    END;
END;
$$ LANGUAGE plpgsql;
