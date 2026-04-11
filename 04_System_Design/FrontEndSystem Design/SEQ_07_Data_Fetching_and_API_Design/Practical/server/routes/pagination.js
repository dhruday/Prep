// ── Pagination routes — offset, cursor, keyset comparison ───────────────────
const express = require('express');
const router = express.Router();
const { statements, db } = require('../db');

// ── OFFSET pagination: GET /api/pagination/offset ───────────────────────────
router.get('/offset', (req, res) => {
  const start = Date.now();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { total } = statements.getProductCount.get();
  const products = statements.getProducts.all(limit, offset);
  const duration = Date.now() - start;

  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Query-Time-Ms', duration);

  res.json({
    data: products,
    pagination: {
      type: 'offset',
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    _debug: { queryTimeMs: duration, offset, sql: 'LIMIT ? OFFSET ?' },
  });
});

// ── CURSOR pagination: GET /api/pagination/cursor ───────────────────────────
router.get('/cursor', (req, res) => {
  const start = Date.now();
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const cursor = req.query.cursor ? parseInt(Buffer.from(req.query.cursor, 'base64').toString()) : 0;
  const direction = req.query.direction || 'forward';

  let products;
  if (direction === 'backward' && cursor > 0) {
    products = statements.getProductsCursorDesc.all(cursor, limit);
    products.reverse();
  } else {
    products = statements.getProductsCursor.all(cursor, limit);
  }

  const duration = Date.now() - start;
  const hasMore = products.length === limit;
  const nextCursor = hasMore ? Buffer.from(String(products[products.length - 1].id)).toString('base64') : null;
  const prevCursor = products.length > 0 ? Buffer.from(String(products[0].id)).toString('base64') : null;

  res.setHeader('X-Query-Time-Ms', duration);
  res.setHeader('X-Has-More', hasMore);
  if (nextCursor) res.setHeader('X-Cursor', nextCursor);

  res.json({
    data: products,
    pagination: {
      type: 'cursor',
      limit,
      hasMore,
      nextCursor,
      prevCursor,
    },
    _debug: {
      queryTimeMs: duration,
      decodedCursor: cursor,
      sql: 'WHERE id > ? ORDER BY id LIMIT ?',
    },
  });
});

// ── KEYSET pagination: GET /api/pagination/keyset ───────────────────────────
// Pagination by (price, id) composite key — demonstrates multi-column keyset
router.get('/keyset', (req, res) => {
  const start = Date.now();
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  let products;
  if (req.query.after_price && req.query.after_id) {
    const afterPrice = parseFloat(req.query.after_price);
    const afterId = parseInt(req.query.after_id);
    products = statements.getProductsKeyset.all(afterPrice, afterPrice, afterId, limit);
  } else {
    products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.price, p.id LIMIT ?').all(limit);
  }

  const duration = Date.now() - start;
  const hasMore = products.length === limit;
  const lastItem = products[products.length - 1];

  res.setHeader('X-Query-Time-Ms', duration);

  res.json({
    data: products,
    pagination: {
      type: 'keyset',
      limit,
      hasMore,
      nextKey: hasMore ? { after_price: lastItem.price, after_id: lastItem.id } : null,
    },
    _debug: {
      queryTimeMs: duration,
      sql: 'WHERE (price > ? OR (price = ? AND id > ?)) ORDER BY price, id LIMIT ?',
    },
  });
});

// ── Relay-style connection: GET /api/pagination/relay ────────────────────────
router.get('/relay', (req, res) => {
  const first = Math.min(100, Math.max(1, parseInt(req.query.first) || 20));
  const after = req.query.after ? parseInt(Buffer.from(req.query.after, 'base64').toString()) : 0;

  const nodes = statements.getProductsCursor.all(after, first + 1); // fetch one extra to check hasNextPage
  const hasNextPage = nodes.length > first;
  if (hasNextPage) nodes.pop();

  const edges = nodes.map(node => ({
    node,
    cursor: Buffer.from(String(node.id)).toString('base64'),
  }));

  res.json({
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: after > 0,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    },
    totalCount: statements.getProductCount.get().total,
  });
});

// ── Benchmark endpoint: compare offset at deep page vs cursor ───────────────
router.get('/benchmark', (req, res) => {
  const page = parseInt(req.query.page) || 500;
  const limit = 20;

  // Offset approach (slow at high page numbers)
  const t1 = Date.now();
  const offset = (page - 1) * limit;
  const offsetResults = statements.getProducts.all(limit, offset);
  const offsetTime = Date.now() - t1;

  // Cursor approach (consistent speed)
  const t2 = Date.now();
  const cursorId = offset; // simulate cursor pointing to same position
  const cursorResults = statements.getProductsCursor.all(cursorId, limit);
  const cursorTime = Date.now() - t2;

  res.json({
    page,
    limit,
    offset: { timeMs: offsetTime, count: offsetResults.length, sql: `OFFSET ${offset}` },
    cursor: { timeMs: cursorTime, count: cursorResults.length, sql: `WHERE id > ${cursorId}` },
    speedup: offsetTime > 0 ? `${(offsetTime / Math.max(1, cursorTime)).toFixed(1)}x` : 'N/A',
  });
});

module.exports = router;
