// ── CORS middleware for data-fetching labs ───────────────────────────────────
const cors = require('cors');

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Has-More', 'X-Cursor', 'Retry-After', 'X-RateLimit-Remaining'],
};

module.exports = cors(corsOptions);
