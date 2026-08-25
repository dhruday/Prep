// ── REST API routes — CRUD, filtering, sorting, caching demos ────────────────
const express = require('express');
const router = express.Router();
const { statements } = require('../db');

// ── GET /api/rest/products — offset pagination with filters ─────────────────
router.get('/products', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { total } = statements.getProductCount.get();
  const products = statements.getProducts.all(limit, offset);
  const pageCount = Math.ceil(total / limit);

  // Expose pagination metadata via headers (REST best practice)
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page-Count', pageCount);
  res.setHeader('X-Has-More', page < pageCount);

  // ETag for caching demos
  const etag = `"products-p${page}-l${limit}-${total}"`;
  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.json({
    data: products,
    meta: { page, limit, total, pageCount, hasMore: page < pageCount },
  });
});

// ── GET /api/rest/products/:id ──────────────────────────────────────────────
router.get('/products/:id', (req, res) => {
  const product = statements.getProductById.get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  // Cache-Control for stale-while-revalidate demo
  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
  res.json(product);
});

// ── GET /api/rest/products/search — for debounce labs ───────────────────────
router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  if (q.length < 1) return res.json({ data: [], meta: { query: q, count: 0 } });

  const products = statements.searchProducts.all(`%${q}%`, limit);
  res.json({ data: products, meta: { query: q, count: products.length } });
});

// ── GET /api/rest/categories ────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(statements.getCategories.all());
});

// ── POST /api/rest/products — create (for optimistic update labs) ───────────
router.post('/products', (req, res) => {
  const { name, description, price, category_id } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price required' });

  const result = statements.getProductById.get(
    require('../db').db.prepare('INSERT INTO products (name, description, price, category_id, rating, stock) VALUES (?, ?, ?, ?, 0, 0)').run(
      name, description || '', price, category_id || 1
    ).lastInsertRowid
  );
  res.status(201).json(result);
});

// ── PUT /api/rest/products/:id — update ─────────────────────────────────────
router.put('/products/:id', (req, res) => {
  const existing = statements.getProductById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { name, description, price } = req.body;
  require('../db').db.prepare('UPDATE products SET name = ?, description = ?, price = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(name || existing.name, description || existing.description, price || existing.price, req.params.id);

  res.json(statements.getProductById.get(req.params.id));
});

// ── DELETE /api/rest/products/:id ───────────────────────────────────────────
router.delete('/products/:id', (req, res) => {
  const existing = statements.getProductById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  require('../db').db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
