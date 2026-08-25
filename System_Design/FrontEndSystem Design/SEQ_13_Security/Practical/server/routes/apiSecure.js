// ─────────────────────────────────────────────────────────────────────────────
// routes/apiSecure.js — Secure API Consumption Endpoints
// ─────────────────────────────────────────────────────────────────────────────
// Demonstrates secure API patterns: interceptors, proxy, validation, errors.
//
// Endpoints:
//   GET  /api/secure/protected          — JWT-protected resource
//   GET  /api/secure/slow               — Slow endpoint (for timeout demo)
//   GET  /api/secure/error/:code        — Returns specific HTTP error codes
//   POST /api/secure/validate           — Schema validation with Zod
//   GET  /api/secure/proxy-weather      — API key proxy pattern
//   GET  /api/secure/circuit-breaker    — Flaky endpoint for circuit breaker demo
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { verifyJWT } = require('../middleware/auth');

// ── Protected Resource ───────────────────────────────────────────────────────
router.get('/protected', verifyJWT, (req, res) => {
  res.json({
    data: 'This is protected data that requires a valid JWT',
    user: req.user.username,
    accessedAt: new Date().toISOString(),
  });
});

// ── Slow Endpoint (Timeout Demo) ─────────────────────────────────────────────
router.get('/slow', (req, res) => {
  const delay = Math.min(parseInt(req.query.delay) || 3000, 10000);
  setTimeout(() => {
    res.json({ data: 'Response after delay', delay, unit: 'ms' });
  }, delay);
});

// ── Error Codes ──────────────────────────────────────────────────────────────
router.get('/error/:code', (req, res) => {
  const code = parseInt(req.params.code);
  const errors = {
    400: { error: 'Bad Request', message: 'Invalid input parameters', hint: 'Check request body schema' },
    401: { error: 'Unauthorized', message: 'Authentication required', hint: 'Include Authorization: Bearer <token>' },
    403: { error: 'Forbidden', message: 'Insufficient permissions', hint: 'Your role lacks access to this resource' },
    404: { error: 'Not Found', message: 'Resource does not exist', hint: 'Check the URL path' },
    429: { error: 'Too Many Requests', message: 'Rate limit exceeded', hint: 'Wait and retry with exponential backoff' },
    500: { error: 'Internal Server Error', message: 'Something went wrong', safeMessage: 'An unexpected error occurred. Please try again.' },
    502: { error: 'Bad Gateway', message: 'Upstream service unavailable' },
    503: { error: 'Service Unavailable', message: 'Server is temporarily overloaded' },
  };

  const errorBody = errors[code] || { error: 'Unknown', message: `HTTP ${code}` };

  // Demonstrate SAFE vs UNSAFE error responses
  const mode = req.query.mode || 'safe';
  if (mode === 'unsafe') {
    errorBody.stackTrace = new Error('Simulated error').stack;
    errorBody.internalDetails = 'Database connection to db-prod-3.internal:5432 failed';
    errorBody.serverVersion = 'Express 4.21.0 / Node 20.11.0';
    errorBody.warning = '⚠️ This response leaks internal details — NEVER do this in production!';
  }

  res.status(code).json(errorBody);
});

// ── Schema Validation (Zod) ──────────────────────────────────────────────────
// Validates request body against a Zod schema before processing
const transferSchema = z.object({
  to: z.string().min(1).max(50),
  amount: z.number().positive().max(1000000),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  note: z.string().max(200).optional(),
});

router.post('/validate', express.json(), (req, res) => {
  const result = transferSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
        code: i.code,
      })),
      schema: {
        to: 'string, 1-50 chars, required',
        amount: 'positive number, max 1M, required',
        currency: 'USD|EUR|GBP, default USD',
        note: 'string, max 200 chars, optional',
      },
    });
  }

  res.json({
    valid: true,
    sanitizedData: result.data,
    note: 'Zod parsed and typed the data — safe to use in business logic',
  });
});

// ── API Key Proxy Pattern ────────────────────────────────────────────────────
// Frontend calls OUR server, which adds the API key and forwards to the real API.
// This keeps the API key server-side (never exposed to the browser).
router.get('/proxy-weather', async (req, res) => {
  const city = req.query.city || 'London';

  // In production: const API_KEY = process.env.WEATHER_API_KEY;
  // For this lab: we simulate the response
  res.json({
    pattern: 'API Key Proxy',
    explanation: [
      '1. Frontend calls: GET /api/secure/proxy-weather?city=London',
      '2. Server adds API key: GET api.weather.com/v1?key=SECRET&city=London',
      '3. Server returns response to frontend',
      '4. API key NEVER leaves the server',
    ],
    simulatedResponse: {
      city,
      temperature: Math.round(15 + Math.random() * 15),
      unit: 'celsius',
      condition: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
    },
    securityBenefit: 'API key is server-side only. Even if XSS occurs, attacker cannot steal the key.',
  });
});

// ── Circuit Breaker Demo ─────────────────────────────────────────────────────
// Simulates a flaky upstream service that fails ~50% of the time
let requestCount = 0;
router.get('/circuit-breaker', (req, res) => {
  requestCount++;

  // Fail every other request (simulate flaky service)
  if (requestCount % 2 === 0) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      requestNumber: requestCount,
      hint: 'Implement a circuit breaker to handle this gracefully',
    });
  }

  // Occasional slow response
  const delay = Math.random() > 0.7 ? 2000 : 100;
  setTimeout(() => {
    res.json({
      data: 'Success from flaky service',
      requestNumber: requestCount,
      responseTime: delay + 'ms',
    });
  }, delay);
});

module.exports = router;
