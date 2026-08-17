// ── Search route — artificial delay for debounce/abort demos ─────────────────
const express = require('express');
const router = express.Router();
const { statements } = require('../db');
const { searchDelay } = require('../middleware/delay');

// GET /api/search?q=...&delay=true — with artificial delay for debounce labs
router.get('/', (req, res) => {
  const q = req.query.q || '';
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const addDelay = req.query.delay !== 'false';

  if (q.length < 1) {
    return res.json({ data: [], meta: { query: q, count: 0, requestId: req.query.rid || null } });
  }

  const doSearch = () => {
    const products = statements.searchProducts.all(`%${q}%`, limit);
    res.json({
      data: products,
      meta: {
        query: q,
        count: products.length,
        requestId: req.query.rid || null,
        timestamp: Date.now(),
      },
    });
  };

  if (addDelay) {
    // 200-800ms random delay to simulate real search latency
    const d = 200 + Math.floor(Math.random() * 600);
    res.setHeader('X-Artificial-Delay', d);
    setTimeout(doSearch, d);
  } else {
    doSearch();
  }
});

// GET /api/search/slow — always slow (1-3s) to show debounce value clearly
router.get('/slow', (req, res) => {
  const q = req.query.q || '';
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const d = 1000 + Math.floor(Math.random() * 2000);

  res.setHeader('X-Artificial-Delay', d);

  setTimeout(() => {
    if (q.length < 1) return res.json({ data: [], meta: { query: q, count: 0 } });
    const products = statements.searchProducts.all(`%${q}%`, limit);
    res.json({ data: products, meta: { query: q, count: products.length, delayMs: d } });
  }, d);
});

module.exports = router;
