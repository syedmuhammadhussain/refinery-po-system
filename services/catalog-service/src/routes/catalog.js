import { Router } from 'express';
import CatalogItem from '../models/CatalogItem.js';

const router = Router();

// GET /items — search, filter, sort, paginate
router.get('/items', async (req, res) => {
  const {
    query, category, supplier, inStock,
    sortBy = 'name', sortOrder = 'asc',
    page = '1', limit = '12',
  } = req.query;

  const result = await CatalogItem.search({
    query, category, supplier, inStock,
    sortBy, sortOrder,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  res.json(result);
});

// GET /items/batch?ids=ID1,ID2
router.get('/items/batch', async (req, res) => {
  const ids = req.query.ids?.split(',').filter(Boolean) ?? [];
  if (ids.length === 0) return res.json({ items: [] });

  const items = await CatalogItem.findByIds(ids);
  res.json({ items });
});

// GET /items/:id
router.get('/items/:id', async (req, res) => {
  const item = await CatalogItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// GET /categories
router.get('/categories', async (_req, res) => {
  const categories = await CatalogItem.getCategories();
  res.json({ categories });
});

// GET /suppliers
router.get('/suppliers', async (_req, res) => {
  const suppliers = await CatalogItem.getSuppliers();
  res.json({ suppliers });
});

export default router;
