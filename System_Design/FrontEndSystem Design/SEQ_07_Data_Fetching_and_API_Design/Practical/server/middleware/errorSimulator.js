// ── Error simulator middleware — random failures for reliability labs ─────────
// Configurable failure rate, status codes, and delay before failure

function errorSimulator(opts = {}) {
  const failRate = opts.failRate || 0.3;        // 30% failure rate
  const timeoutRate = opts.timeoutRate || 0.1;   // 10% timeout rate
  const rateLimitRate = opts.rateLimitRate || 0.1; // 10% rate limit
  const timeoutMs = opts.timeoutMs || 10000;

  return (req, res, next) => {
    const roll = Math.random();

    // Simulate timeout (just hang)
    if (roll < timeoutRate) {
      res.setHeader('X-Simulated-Error', 'timeout');
      return setTimeout(() => {
        if (!res.headersSent) {
          res.status(504).json({ error: 'Gateway Timeout', simulated: true });
        }
      }, timeoutMs);
    }

    // Simulate rate limiting
    if (roll < timeoutRate + rateLimitRate) {
      const retryAfter = 2 + Math.floor(Math.random() * 5);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-Simulated-Error', '429');
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter,
        simulated: true,
      });
    }

    // Simulate server error
    if (roll < timeoutRate + rateLimitRate + failRate) {
      const codes = [500, 502, 503];
      const code = codes[Math.floor(Math.random() * codes.length)];
      res.setHeader('X-Simulated-Error', String(code));
      return res.status(code).json({
        error: code === 500 ? 'Internal Server Error' : code === 502 ? 'Bad Gateway' : 'Service Unavailable',
        simulated: true,
      });
    }

    next();
  };
}

module.exports = { errorSimulator };
