import pool from '../config/database.js';

const CatalogItem = {
  /**
   * Full-text search with filters, sorting and pagination.
   * Uses PostgreSQL pg_trgm for fuzzy matching.
   */
  async search({ query, category, supplier, inStock, sortBy, sortOrder, page = 1, limit = 12 }) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (query?.trim()) {
      conditions.push(`(
        ci.name ILIKE $${idx} OR ci.id ILIKE $${idx}
        OR s.name ILIKE $${idx} OR ci.manufacturer ILIKE $${idx}
        OR ci.model ILIKE $${idx}
      )`);
      values.push(`%${query.trim()}%`);
      idx++;
    }

    if (category) {
      conditions.push(`cat.name = $${idx}`);
      values.push(category);
      idx++;
    }

    if (supplier) {
      conditions.push(`s.name = $${idx}`);
      values.push(supplier);
      idx++;
    }

    if (inStock === 'true') {
      conditions.push(`ci.in_stock = true`);
    } else if (inStock === 'false') {
      conditions.push(`ci.in_stock = false`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortMap = {
      price: 'ci.price_usd',
      lead_time: 'ci.lead_time_days',
      supplier: 's.name',
      name: 'ci.name',
    };
    const orderCol = sortMap[sortBy] || 'ci.name';
    const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM catalog_items ci
      JOIN suppliers s ON ci.supplier_id = s.id
      JOIN categories cat ON ci.category_id = cat.id
      ${where}
    `;

    const dataQuery = `
      SELECT
        ci.id, ci.name, ci.manufacturer, ci.model,
        ci.price_usd, ci.lead_time_days, ci.in_stock,
        s.name AS supplier, s.code AS supplier_code,
        cat.name AS category,
        json_object_agg(COALESCE(isp.spec_key, '__none__'), isp.spec_value)
          FILTER (WHERE isp.spec_key IS NOT NULL) AS specs
      FROM catalog_items ci
      JOIN suppliers s ON ci.supplier_id = s.id
      JOIN categories cat ON ci.category_id = cat.id
      LEFT JOIN item_specs isp ON ci.id = isp.item_id
      ${where}
      GROUP BY ci.id, s.name, s.code, cat.name
      ORDER BY ${orderCol} ${orderDir}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const [countRes, dataRes] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(dataQuery, [...values, limit, offset]),
    ]);

    const total = parseInt(countRes.rows[0].total, 10);

    return {
      items: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(id) {
    const itemQuery = `
      SELECT
        ci.id, ci.name, ci.manufacturer, ci.model,
        ci.price_usd, ci.lead_time_days, ci.in_stock,
        ci.description,
        s.name AS supplier, s.code AS supplier_code,
        cat.name AS category
      FROM catalog_items ci
      JOIN suppliers s ON ci.supplier_id = s.id
      JOIN categories cat ON ci.category_id = cat.id
      WHERE ci.id = $1
    `;

    const specsQuery = `
      SELECT spec_key, spec_value FROM item_specs WHERE item_id = $1
    `;

    const compatQuery = `
      SELECT ic.compatible_id, ci.name AS compatible_name, ci.model AS compatible_model
      FROM item_compatibility ic
      JOIN catalog_items ci ON ci.id = ic.compatible_id
      WHERE ic.item_id = $1
    `;

    const [itemRes, specsRes, compatRes] = await Promise.all([
      pool.query(itemQuery, [id]),
      pool.query(specsQuery, [id]),
      pool.query(compatQuery, [id]),
    ]);

    if (itemRes.rows.length === 0) return null;

    const item = itemRes.rows[0];
    item.specs = {};
    for (const row of specsRes.rows) {
      item.specs[row.spec_key] = row.spec_value;
    }
    item.compatibility = compatRes.rows;
    return item;
  },

  async findByIds(ids) {
    if (!ids?.length) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(`
      SELECT
        ci.id, ci.name, ci.manufacturer, ci.model,
        ci.price_usd, ci.lead_time_days, ci.in_stock,
        s.name AS supplier, s.code AS supplier_code
      FROM catalog_items ci
      JOIN suppliers s ON ci.supplier_id = s.id
      WHERE ci.id IN (${placeholders})
    `, ids);
    return rows;
  },

  async getCategories() {
    const { rows } = await pool.query(
      'SELECT DISTINCT name FROM categories ORDER BY name'
    );
    return rows.map((r) => r.name);
  },

  async getSuppliers() {
    const { rows } = await pool.query(
      'SELECT code, name FROM suppliers ORDER BY name'
    );
    return rows;
  },
};

export default CatalogItem;