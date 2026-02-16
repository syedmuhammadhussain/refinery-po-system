-- ============================================================
-- Catalog Service – Schema & Seed Data
-- Data owner: Catalog Service
-- ============================================================
\connect catalog_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Suppliers ────────────────────────────────────────────
CREATE TABLE suppliers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_suppliers_code ON suppliers(code);

-- ── Categories ───────────────────────────────────────────
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Catalog Items ────────────────────────────────────────
CREATE TABLE catalog_items (
    id              VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(500) NOT NULL,
    description     TEXT,
    category_id     UUID NOT NULL REFERENCES categories(id),
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    manufacturer    VARCHAR(200) NOT NULL,
    model           VARCHAR(200) NOT NULL,
    price_usd       NUMERIC(12,2) NOT NULL CHECK (price_usd >= 0),
    lead_time_days  INTEGER NOT NULL CHECK (lead_time_days >= 0),
    in_stock        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_items_supplier ON catalog_items(supplier_id);
CREATE INDEX idx_items_category ON catalog_items(category_id);
CREATE INDEX idx_items_price ON catalog_items(price_usd);
CREATE INDEX idx_items_lead_time ON catalog_items(lead_time_days);
CREATE INDEX idx_items_in_stock ON catalog_items(in_stock);
CREATE INDEX idx_items_name_trgm ON catalog_items USING gin(name gin_trgm_ops);
CREATE INDEX idx_items_model ON catalog_items(model);
CREATE INDEX idx_items_manufacturer ON catalog_items(manufacturer);

-- ── Item Specifications (EAV) ────────────────────────────
CREATE TABLE item_specs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id     VARCHAR(20) NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    spec_key    VARCHAR(100) NOT NULL,
    spec_value  VARCHAR(500) NOT NULL,
    UNIQUE(item_id, spec_key)
);
CREATE INDEX idx_specs_item ON item_specs(item_id);

-- ── Compatibility References ─────────────────────────────
CREATE TABLE item_compatibility (
    item_id         VARCHAR(20) NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    compatible_id   VARCHAR(20) NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, compatible_id),
    CHECK (item_id <> compatible_id)
);
CREATE INDEX idx_compat_item ON item_compatibility(item_id);

-- ── Auto-update trigger ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_items_updated BEFORE UPDATE ON catalog_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Suppliers
INSERT INTO suppliers (code, name) VALUES
    ('flexitallic', 'Flexitallic'),
    ('flowserve', 'Flowserve'),
    ('emerson', 'Emerson'),
    ('alfa-laval', 'Alfa Laval'),
    ('dewalt', 'DeWalt');

-- Categories
INSERT INTO categories (name) VALUES
    ('Gasket'),
    ('Valve'),
    ('Pump'),
    ('Instrumentation'),
    ('Heat Exchanger'),
    ('Hand Tool');

-- Catalog Items
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0001', 'Spiral Wound Gasket 2 in Class 150 RF, 316 SS/Graphite', 'Spiral Wound Gasket 2 in Class 150 RF, 316 SS/Graphite. Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'SWG-FLEX-2IN-150', 95.00, 5, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0002', 'Spiral Wound Gasket 4 in Class 300 RF, 316 SS/Graphite', 'Spiral Wound Gasket 4 in Class 300 RF, 316 SS/Graphite. Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'SWG-FLEX-4IN-300', 28.00, 3, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0003', 'Spiral Wound Gasket 6 in Class 600 RF, 316 SS/Graphite', 'Spiral Wound Gasket 6 in Class 600 RF, 316 SS/Graphite. Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'SWG-FLEX-6IN-600', 95.00, 14, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0004', 'Spiral Wound Gasket 8 in Class 900 RF, 316 SS/Graphite', 'Spiral Wound Gasket 8 in Class 900 RF, 316 SS/Graphite. Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'SWG-FLEX-8IN-900', 62.00, 3, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0005', 'RTJ Gasket R23 Soft Iron (Oval)', 'RTJ Gasket R23 Soft Iron (Oval). Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'RTJ-FLEX-R23-SOFTIR', 140.00, 21, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0006', 'RTJ Gasket R24 316 SS (Octagonal)', 'RTJ Gasket R24 316 SS (Octagonal). Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'RTJ-FLEX-R24-316SS', 95.00, 7, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0007', 'RTJ Gasket R35 Soft Iron (Octagonal)', 'RTJ Gasket R35 Soft Iron (Octagonal). Approved supplier: Flexitallic. Standard: ASME B16.20.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'RTJ-FLEX-R35-SOFTIR', 140.00, 7, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0008', 'PTFE Sheet Gasket Material, 1/16 in Thickness (60x60 in)', 'PTFE Sheet Gasket Material, 1/16 in Thickness (60x60 in). Approved supplier: Flexitallic. Standard: ASTM F104.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'SHT-FLEX-1_16in', 18.00, 3, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0009', 'CNAF (NBR Binder) Sheet Gasket Material, 1/8 in Thickness (60x60 in)', 'CNAF (NBR Binder) Sheet Gasket Material, 1/8 in Thickness (60x60 in). Approved supplier: Flexitallic. Standard: ASTM F104.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'SHT-FLEX-1_8in', 38.00, 2, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('GST-0010', 'Kammprofile Gasket 10 in Class 300 RF, 316 SS Core / Graphite Facing', 'Kammprofile Gasket 10 in Class 300 RF, 316 SS Core / Graphite Facing. Approved supplier: Flexitallic. Standard: EN 1514-6.', (SELECT id FROM categories WHERE name='Gasket'), (SELECT id FROM suppliers WHERE code='flexitallic'), 'Flexitallic', 'KAM-FLEX-10IN-300', 260.00, 10, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0101', 'Ball Valve 2 in Class 150', 'Ball Valve 2 in Class 150. Approved supplier: Flowserve. Designed to API 608 / ASME B16.34.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-BV-2IN-150', 2359.00, 10, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0102', 'Ball Valve 4 in Class 300', 'Ball Valve 4 in Class 300. Approved supplier: Flowserve. Designed to API 608 / ASME B16.34.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-BV-4IN-300', 1019.00, 28, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0103', 'Gate Valve 6 in Class 300', 'Gate Valve 6 in Class 300. Approved supplier: Flowserve. Designed to API 600 / ASME B16.34.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-GV-6IN-300', 3202.00, 35, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0104', 'Check Valve 6 in Class 600', 'Check Valve 6 in Class 600. Approved supplier: Flowserve. Designed to API 594 / ASME B16.34.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-CV-6IN-600', 2406.00, 35, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0105', 'Globe Valve 2 in Class 300', 'Globe Valve 2 in Class 300. Approved supplier: Flowserve. Designed to API 602 / ASME B16.34.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-GLV-2IN-300', 2330.00, 10, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('PMP-0201', 'ANSI Process Pump 6x4-13', 'ANSI Process Pump 6x4-13. Approved supplier: Flowserve. Complies with ANSI B73.1.', (SELECT id FROM categories WHERE name='Pump'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-3196-OH1-6X4-13', 15797.00, 75, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('PMP-0202', 'ANSI Process Pump 3x2-10', 'ANSI Process Pump 3x2-10. Approved supplier: Flowserve. Complies with ANSI B73.1.', (SELECT id FROM categories WHERE name='Pump'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-3196-OH1-3X2-10', 24365.00, 45, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('PMP-0203', 'API 610 OH2 Pump 4x3-13', 'API 610 OH2 Pump 4x3-13. Approved supplier: Flowserve. Complies with API 610.', (SELECT id FROM categories WHERE name='Pump'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-DMX-OH2-4X3-13', 17198.00, 45, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('PMP-0204', 'API 610 BB2 Pump BB2-10', 'API 610 BB2 Pump BB2-10. Approved supplier: Flowserve. Complies with API 610.', (SELECT id FROM categories WHERE name='Pump'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-HPX-BB2-BB2-10', 27956.00, 21, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('PMP-0205', 'Mag Drive Pump 2x1-6', 'Mag Drive Pump 2x1-6. Approved supplier: Flowserve. Complies with ANSI B73.3.', (SELECT id FROM categories WHERE name='Pump'), (SELECT id FROM suppliers WHERE code='flowserve'), 'Flowserve', 'FLS-Sealmatic-Sealless-2X1-6', 33072.00, 45, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('INS-0401', 'Pressure Transmitter (0-300 psi)', 'Pressure Transmitter 0-300 psi. Approved supplier: Emerson. Suitable for refinery measurement and control.', (SELECT id FROM categories WHERE name='Instrumentation'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson', 'Rosemount 3051', 9800.00, 7, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('INS-0402', 'Differential Pressure Transmitter (0-100 inH2O)', 'Differential Pressure Transmitter 0-100 inH2O. Approved supplier: Emerson. Suitable for refinery measurement and control.', (SELECT id FROM categories WHERE name='Instrumentation'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson', 'Rosemount 3051DP', 8285.00, 21, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('INS-0403', 'Radar Level Transmitter (0-20 m)', 'Radar Level Transmitter 0-20 m. Approved supplier: Emerson. Suitable for refinery measurement and control.', (SELECT id FROM categories WHERE name='Instrumentation'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson', 'Rosemount 5408', 12881.00, 14, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('INS-0404', 'Temperature Transmitter (-50 to 250C)', 'Temperature Transmitter -50 to 250C. Approved supplier: Emerson. Suitable for refinery measurement and control.', (SELECT id FROM categories WHERE name='Instrumentation'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson', 'Rosemount 644', 15311.00, 7, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('INS-0405', 'Vibration Transmitter (0-1 in/s)', 'Vibration Transmitter 0-1 in/s. Approved supplier: Emerson. Suitable for refinery measurement and control.', (SELECT id FROM categories WHERE name='Instrumentation'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson', 'CSI 9420', 13483.00, 7, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0301', 'Control Valve, Globe 2 in Class 300', 'Control Valve, Globe 2 in Class 300. Approved supplier: Emerson (Fisher). Designed to IEC 60534.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson Fisher', 'Fisher EZ', 7318.00, 28, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0302', 'Control Valve, Globe 3 in Class 300', 'Control Valve, Globe 3 in Class 300. Approved supplier: Emerson (Fisher). Designed to IEC 60534.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson Fisher', 'Fisher GX', 3094.00, 28, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0303', 'Control Valve, Globe 4 in Class 600', 'Control Valve, Globe 4 in Class 600. Approved supplier: Emerson (Fisher). Designed to IEC 60534.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson Fisher', 'Fisher ET', 7715.00, 21, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0304', 'Control Valve, Globe 1 in Class 800', 'Control Valve, Globe 1 in Class 800. Approved supplier: Emerson (Fisher). Designed to IEC 60534.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson Fisher', 'Fisher EZ', 8859.00, 35, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('VLV-0305', 'Control Valve, Globe 2 in Class 150', 'Control Valve, Globe 2 in Class 150. Approved supplier: Emerson (Fisher). Designed to IEC 60534.', (SELECT id FROM categories WHERE name='Valve'), (SELECT id FROM suppliers WHERE code='emerson'), 'Emerson Fisher', 'Fisher GX', 4893.00, 35, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0301', 'Shell and Tube Heat Exchanger 100 sq ft', 'Shell and Tube Heat Exchanger 100 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-TEMAE-100', 34489.00, 90, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0302', 'Shell and Tube Heat Exchanger 180 sq ft', 'Shell and Tube Heat Exchanger 180 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-TEMAAES-180', 84053.00, 75, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0303', 'Plate Heat Exchanger, Gasketed 60 sq ft', 'Plate Heat Exchanger, Gasketed 60 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-GasketedPlate-60', 82041.00, 75, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0304', 'Plate Heat Exchanger, Semi-welded 80 sq ft', 'Plate Heat Exchanger, Semi-welded 80 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-Semi-weldedPlate-80', 20809.00, 45, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0305', 'Air Cooler, Fin Fan 250 sq ft', 'Air Cooler, Fin Fan 250 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-FinFan-250', 31237.00, 45, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0306', 'Reboiler Exchanger, Kettle 220 sq ft', 'Reboiler Exchanger, Kettle 220 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-Kettle-220', 15844.00, 45, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0307', 'Condenser Exchanger 140 sq ft', 'Condenser Exchanger 140 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-TEMABEU-140', 27764.00, 90, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0308', 'Oil Cooler Exchanger 90 sq ft', 'Oil Cooler Exchanger 90 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-Shell&Tube-90', 15287.00, 60, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0309', 'Feed/Effluent Exchanger 260 sq ft', 'Feed/Effluent Exchanger 260 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-TEMAAES-260', 52421.00, 75, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('HEX-0310', 'Charge Cooler Exchanger 120 sq ft', 'Charge Cooler Exchanger 120 sq ft. Approved supplier: Alfa Laval. Built for refinery heat transfer duty.', (SELECT id FROM categories WHERE name='Heat Exchanger'), (SELECT id FROM suppliers WHERE code='alfa-laval'), 'Alfa Laval', 'AL-TEMAE-120', 54644.00, 90, false);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0501', 'Cordless Hammer Drill/Driver 18V XR', 'Cordless Hammer Drill/Driver 18V XR. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DCD996', 129.00, 2, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0502', 'Corded 1/2in VSR Drill', 'Corded 1/2in VSR Drill. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWD210G', 12.00, 7, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0503', '20oz Rip Claw Hammer', '20oz Rip Claw Hammer. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT51048', 129.00, 7, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0504', '16oz Ball Peen Hammer', '16oz Ball Peen Hammer. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT51004', 59.00, 4, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0505', 'Screwdriver Set, Slotted/Phillips 8pc', 'Screwdriver Set, Slotted/Phillips 8pc. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT65098', 79.00, 1, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0506', 'Phillips Screwdriver PH2 6in', 'Phillips Screwdriver PH2 6in. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT65022', 12.00, 4, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0507', 'Slotted Screwdriver 1/4in 6in', 'Slotted Screwdriver 1/4in 6in. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT65018', 22.00, 1, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0508', 'Adjustable Wrench 10in', 'Adjustable Wrench 10in. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT75498', 15.00, 2, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0509', 'Needle Nose Pliers 8in', 'Needle Nose Pliers 8in. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT70276', 12.00, 5, true);
INSERT INTO catalog_items (id, name, description, category_id, supplier_id, manufacturer, model, price_usd, lead_time_days, in_stock)
  VALUES ('TOL-0510', 'Utility Knife Retractable', 'Utility Knife Retractable. Approved supplier: DeWalt. Industrial maintenance tool.', (SELECT id FROM categories WHERE name='Hand Tool'), (SELECT id FROM suppliers WHERE code='dewalt'), 'DeWalt', 'DWHT10046', 199.00, 1, true);

-- Specifications
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'nominalSize', '2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'pressureClass', 'ASME 150');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'face', 'RF');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'windingMaterial', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'fillerMaterial', 'Graphite');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'innerRing', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0001', 'outerRing', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'nominalSize', '4 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'face', 'RF');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'windingMaterial', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'fillerMaterial', 'Graphite');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'innerRing', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0002', 'outerRing', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'nominalSize', '6 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'pressureClass', 'ASME 600');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'face', 'RF');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'windingMaterial', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'fillerMaterial', 'Graphite');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'innerRing', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0003', 'outerRing', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'nominalSize', '8 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'pressureClass', 'ASME 900');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'face', 'RF');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'windingMaterial', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'fillerMaterial', 'Graphite');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'innerRing', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0004', 'outerRing', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0005', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0005', 'ringNumber', 'R23');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0005', 'profile', 'Oval');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0005', 'material', 'Soft Iron');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0005', 'pressureClass', 'ASME 600');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0006', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0006', 'ringNumber', 'R24');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0006', 'profile', 'Octagonal');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0006', 'material', '316 SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0006', 'pressureClass', 'ASME 900');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0007', 'standard', 'ASME B16.20');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0007', 'ringNumber', 'R35');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0007', 'profile', 'Octagonal');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0007', 'material', 'Soft Iron');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0007', 'pressureClass', 'ASME 1500');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0008', 'standard', 'ASTM F104');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0008', 'thickness', '1/16 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0008', 'sheetSize', '60x60 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0008', 'material', 'PTFE');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0008', 'maxTemperature', '200C');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0009', 'standard', 'ASTM F104');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0009', 'thickness', '1/8 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0009', 'sheetSize', '60x60 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0009', 'material', 'CNAF (NBR Binder)');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0009', 'maxTemperature', '260C');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0010', 'standard', 'EN 1514-6');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0010', 'nominalSize', '10 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0010', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0010', 'face', 'RF');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0010', 'coreMaterial', '316 SS Core');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('GST-0010', 'facingMaterial', 'Graphite Facing');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'standard', 'API 608; ASME B16.34');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'nominalSize', '2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'pressureClass', 'ASME 150');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'bodyMaterial', 'ASTM A351 CF8M (316)');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'trimOrSeat', 'Full Port, PTFE seats');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'nace', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0101', 'fireSafe', 'API 607');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'standard', 'API 608; ASME B16.34');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'nominalSize', '4 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'bodyMaterial', 'ASTM A216 WCB');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'trimOrSeat', 'Full Port, RPTFE seats');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'nace', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0102', 'fireSafe', 'API 607');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'standard', 'API 600; ASME B16.34');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'nominalSize', '6 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'bodyMaterial', 'ASTM A216 WCB');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'trimOrSeat', '13Cr trim');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'nace', 'MR0175 compliant');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0103', 'fireSafe', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'standard', 'API 594; ASME B16.34');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'nominalSize', '6 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'pressureClass', 'ASME 600');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'bodyMaterial', 'ASTM A351 CF8M (316)');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'trimOrSeat', 'Dual-plate');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'nace', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0104', 'fireSafe', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'standard', 'API 602; ASME B16.34');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'nominalSize', '2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'bodyMaterial', 'ASTM A105');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'trimOrSeat', '13Cr trim');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'nace', 'MR0175 compliant');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0105', 'fireSafe', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'standard', 'ANSI B73.1');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'hydraulicSize', '6x4-13');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'configuration', 'OH1');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'casingMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'ratedFlow', '400 gpm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'ratedHead', '180 ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'sealPlan', 'API Plan 11');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0201', 'driver', 'Explosion-proof motor');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'standard', 'ANSI B73.1');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'hydraulicSize', '3x2-10');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'configuration', 'OH1');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'casingMaterial', '316 Stainless Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'ratedFlow', '150 gpm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'ratedHead', '220 ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'sealPlan', 'API Plan 11');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0202', 'driver', 'Explosion-proof motor');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'standard', 'API 610');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'hydraulicSize', '4x3-13');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'configuration', 'OH2');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'casingMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'ratedFlow', '300 gpm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'ratedHead', '260 ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'sealPlan', 'API Plan 53A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0203', 'driver', 'TEFC motor');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'standard', 'API 610');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'hydraulicSize', 'BB2-10');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'configuration', 'BB2');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'casingMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'ratedFlow', '650 gpm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'ratedHead', '500 ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'sealPlan', 'API Plan 52');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0204', 'driver', 'Explosion-proof motor');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'standard', 'ANSI B73.3');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'hydraulicSize', '2x1-6');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'configuration', 'Sealless');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'casingMaterial', '316 Stainless Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'ratedFlow', '70 gpm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'ratedHead', '120 ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'sealPlan', 'Sealless');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('PMP-0205', 'driver', 'TEFC motor');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0401', 'measurementType', 'Pressure Transmitter');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0401', 'range', '0-300 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0401', 'communication', '4-20 mA + HART');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0401', 'accuracy', '0.075%');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0401', 'hazardousArea', 'FM/CSA');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0401', 'processConnection', '1/2in NPT');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0402', 'measurementType', 'Differential Pressure Transmitter');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0402', 'range', '0-100 inH2O');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0402', 'communication', '4-20 mA + HART');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0402', 'accuracy', '0.075%');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0402', 'hazardousArea', 'ATEX/IECEx');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0402', 'processConnection', '1/4in NPT');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0403', 'measurementType', 'Radar Level Transmitter');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0403', 'range', '0-20 m');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0403', 'communication', '4-20 mA + HART');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0403', 'accuracy', '±3 mm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0403', 'hazardousArea', 'FM/CSA');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0403', 'processConnection', '1/4in NPT');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0404', 'measurementType', 'Temperature Transmitter');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0404', 'range', '-50 to 250C');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0404', 'communication', '4-20 mA + HART');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0404', 'accuracy', '0.1%');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0404', 'hazardousArea', 'FM/CSA');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0404', 'processConnection', '1/2in NPT');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0405', 'measurementType', 'Vibration Transmitter');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0405', 'range', '0-1 in/s');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0405', 'communication', 'WirelessHART');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0405', 'accuracy', '±2%');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0405', 'hazardousArea', 'ATEX/IECEx + FM/CSA');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('INS-0405', 'processConnection', '1/4in NPT');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'standard', 'IEC 60534');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'nominalSize', '2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'bodyMaterial', 'ASTM A216 WCB');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'trim', 'Cage guided, equal %');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'actuation', 'Pneumatic diaphragm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0301', 'positioner', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'standard', 'IEC 60534');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'nominalSize', '3 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'pressureClass', 'ASME 300');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'bodyMaterial', 'ASTM A351 CF8M (316)');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'trim', 'Low noise trim');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'actuation', 'Electric actuator');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0302', 'positioner', 'Digital positioner');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'standard', 'IEC 60534');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'nominalSize', '4 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'pressureClass', 'ASME 600');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'bodyMaterial', 'ASTM A217 WC6');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'trim', 'Anti-cavitation');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'actuation', 'Pneumatic diaphragm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0303', 'positioner', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'standard', 'IEC 60534');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'nominalSize', '1 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'pressureClass', 'ASME 800');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'bodyMaterial', 'ASTM A182 F316');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'endConnection', 'Socket Weld');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'trim', 'High pressure trim');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'actuation', 'Pneumatic diaphragm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0304', 'positioner', 'Digital positioner');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'standard', 'IEC 60534');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'nominalSize', '2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'pressureClass', 'ASME 150');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'bodyMaterial', 'ASTM A216 WCB');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'endConnection', 'RF Flanged');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'trim', 'General service');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'actuation', 'Pneumatic diaphragm');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('VLV-0305', 'positioner', 'N/A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'temaOrType', 'TEMA E');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'surfaceArea', '100 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'tubeOrPlateMaterial', 'Admiralty Brass');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'designPressure', '300 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0301', 'designTemperature', '350 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'temaOrType', 'TEMA AES');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'surfaceArea', '180 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'tubeOrPlateMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'designPressure', '450 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0302', 'designTemperature', '400 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'temaOrType', 'Gasketed Plate');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'surfaceArea', '60 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'shellMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'tubeOrPlateMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'designPressure', '230 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0303', 'designTemperature', '300 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'temaOrType', 'Semi-welded Plate');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'surfaceArea', '80 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'shellMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'tubeOrPlateMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'designPressure', '435 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0304', 'designTemperature', '320 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'temaOrType', 'Fin Fan');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'surfaceArea', '250 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'tubeOrPlateMaterial', 'Aluminum fins');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'designPressure', '150 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0305', 'designTemperature', '250 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'temaOrType', 'Kettle');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'surfaceArea', '220 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'tubeOrPlateMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'designPressure', '600 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0306', 'designTemperature', '450 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'temaOrType', 'TEMA BEU');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'surfaceArea', '140 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'tubeOrPlateMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'designPressure', '300 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0307', 'designTemperature', '350 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'temaOrType', 'Shell & Tube');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'surfaceArea', '90 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'tubeOrPlateMaterial', 'CuNi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'designPressure', '230 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0308', 'designTemperature', '300 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'temaOrType', 'TEMA AES');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'surfaceArea', '260 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'tubeOrPlateMaterial', '316L SS');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'designPressure', '450 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0309', 'designTemperature', '420 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'designCode', 'ASME VIII');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'temaOrType', 'TEMA E');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'surfaceArea', '120 sq ft');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'shellMaterial', 'Carbon Steel');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'tubeOrPlateMaterial', 'Admiralty Brass');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'designPressure', '300 psi');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('HEX-0310', 'designTemperature', '350 F');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0501', 'toolType', 'Drill');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0501', 'voltage', '18V');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0501', 'chuck', '1/2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0501', 'maxTorque', '820 in-lbs');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0501', 'speed', '0-2000 RPM');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0501', 'warranty', 'Limited lifetime');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0502', 'toolType', 'Drill');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0502', 'voltage', '120V');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0502', 'chuck', '1/2 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0502', 'current', '10A');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0502', 'speed', '0-1200 RPM');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0502', 'warranty', '3 years');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0503', 'toolType', 'Hammer');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0503', 'headWeight', '20 oz');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0503', 'handle', 'Fiberglass');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0503', 'overallLength', '13.5 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0503', 'warranty', '3 years');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0504', 'toolType', 'Hammer');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0504', 'headWeight', '16 oz');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0504', 'handle', 'Hickory');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0504', 'overallLength', '13 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0504', 'warranty', '3 years');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0505', 'toolType', 'Screwdriver');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0505', 'tips', 'Slotted/Phillips');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0505', 'count', '8');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0505', 'magnetic', 'Yes');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0505', 'warranty', 'Limited lifetime');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0506', 'toolType', 'Screwdriver');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0506', 'tip', 'PH2');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0506', 'shaftLength', '6 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0506', 'magnetic', 'Yes');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0506', 'warranty', '1 year');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0507', 'toolType', 'Screwdriver');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0507', 'tip', 'Slotted 1/4 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0507', 'shaftLength', '6 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0507', 'magnetic', 'No');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0507', 'warranty', '3 years');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0508', 'toolType', 'Wrench');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0508', 'length', '10 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0508', 'jawCapacity', '1.25 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0508', 'finish', 'Chrome');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0508', 'warranty', '3 years');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0509', 'toolType', 'Pliers');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0509', 'length', '8 in');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0509', 'cuttingEdge', 'Yes');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0509', 'handle', 'Bi-material');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0509', 'warranty', '1 year');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0510', 'toolType', 'Knife');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0510', 'bladeType', 'Trapezoid');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0510', 'body', 'Metal');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0510', 'quickChange', 'Yes');
INSERT INTO item_specs (item_id, spec_key, spec_value) VALUES ('TOL-0510', 'warranty', '1 year');

-- Compatibility
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0101', 'GST-0009');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0101', 'GST-0002');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0102', 'GST-0006');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0102', 'GST-0001');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0103', 'GST-0002');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0103', 'GST-0004');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0104', 'GST-0010');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0104', 'GST-0007');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0105', 'GST-0003');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0105', 'GST-0005');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0201', 'GST-0006');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0201', 'GST-0010');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0201', 'VLV-0104');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0202', 'GST-0002');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0202', 'GST-0010');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0202', 'VLV-0104');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0203', 'GST-0008');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0203', 'GST-0010');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0203', 'VLV-0104');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0204', 'GST-0005');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0204', 'GST-0002');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0204', 'VLV-0102');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0205', 'GST-0002');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0205', 'GST-0006');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('PMP-0205', 'VLV-0103');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0301', 'GST-0008');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0301', 'GST-0003');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0302', 'GST-0009');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0302', 'GST-0001');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0303', 'GST-0004');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0303', 'GST-0009');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0304', 'GST-0006');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0304', 'GST-0003');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0305', 'GST-0009');
INSERT INTO item_compatibility (item_id, compatible_id) VALUES ('VLV-0305', 'GST-0001');
