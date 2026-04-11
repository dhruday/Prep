// ── Streaming / SSE routes — for abort, streaming cancel labs ────────────────
const express = require('express');
const router = express.Router();

// ── GET /api/streaming/sse — Server-Sent Events stream ──────────────────────
router.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let count = 0;
  const maxEvents = parseInt(req.query.max) || 50;
  const intervalMs = parseInt(req.query.interval) || 500;

  const timer = setInterval(() => {
    count++;
    const data = JSON.stringify({
      id: count,
      timestamp: Date.now(),
      message: `Event #${count}`,
      value: +(Math.random() * 100).toFixed(2),
    });
    res.write(`id: ${count}\ndata: ${data}\n\n`);

    if (count >= maxEvents) {
      res.write('event: done\ndata: {}\n\n');
      clearInterval(timer);
      res.end();
    }
  }, intervalMs);

  // Cleanup on client disconnect (AbortController demo)
  req.on('close', () => {
    clearInterval(timer);
  });
});

// ── GET /api/streaming/ai-chat — simulates AI token streaming ───────────────
router.get('/ai-chat', (req, res) => {
  const prompt = req.query.prompt || 'Hello world';
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const words = `Here is a detailed response to your query about "${prompt}". In modern frontend systems, data fetching is a critical concern that directly impacts user experience, performance, and system reliability. The key patterns include request deduplication, optimistic updates, error boundaries, circuit breakers, and graceful degradation. Each of these patterns addresses specific failure modes and user experience requirements at scale.`.split(' ');

  let i = 0;
  const timer = setInterval(() => {
    if (i >= words.length) {
      res.write('data: [DONE]\n\n');
      clearInterval(timer);
      res.end();
      return;
    }
    res.write(`data: ${JSON.stringify({ token: words[i] + ' ', index: i })}\n\n`);
    i++;
  }, 50 + Math.floor(Math.random() * 80));

  req.on('close', () => clearInterval(timer));
});

// ── GET /api/streaming/progress — progress events ───────────────────────────
router.get('/progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let progress = 0;
  const timer = setInterval(() => {
    progress += 5 + Math.floor(Math.random() * 10);
    if (progress >= 100) {
      progress = 100;
      res.write(`data: ${JSON.stringify({ progress, status: 'complete' })}\n\n`);
      clearInterval(timer);
      res.end();
      return;
    }
    res.write(`data: ${JSON.stringify({ progress, status: 'processing' })}\n\n`);
  }, 300);

  req.on('close', () => clearInterval(timer));
});

module.exports = router;
