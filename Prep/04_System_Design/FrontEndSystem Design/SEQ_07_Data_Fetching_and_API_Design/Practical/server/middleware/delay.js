// ── Artificial delay middleware — simulates network latency for labs ──────────
function delay(ms) {
  return (req, res, next) => {
    const d = typeof ms === 'function' ? ms(req) : ms;
    setTimeout(next, d);
  };
}

// Random delay between min and max ms
function randomDelay(min = 200, max = 1500) {
  return (req, res, next) => {
    const d = min + Math.floor(Math.random() * (max - min));
    res.setHeader('X-Artificial-Delay', d);
    setTimeout(next, d);
  };
}

// Slow search to demonstrate debounce benefit
function searchDelay(req, res, next) {
  const d = 300 + Math.floor(Math.random() * 700);
  res.setHeader('X-Artificial-Delay', d);
  setTimeout(next, d);
}

module.exports = { delay, randomDelay, searchDelay };
