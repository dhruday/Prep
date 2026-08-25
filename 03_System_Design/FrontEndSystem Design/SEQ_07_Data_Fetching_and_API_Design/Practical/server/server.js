// ─────────────────────────────────────────────────────────────────────────────
// server.js — Data Fetching & API Design Labs Server
// ─────────────────────────────────────────────────────────────────────────────
// Express server serving:
//   1. API endpoints for all data-fetching labs (6 route modules)
//   2. Static HTML files from Practical/ lab directories
//   3. Study HTML files from Study/ directory
//
// Port 4001 (avoids conflict with Security Labs on 3001)
// Start: npm start | npm run dev (with file watching)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4001;

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(require('./middleware/cors'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/rest',        require('./routes/rest'));
app.use('/api/pagination',  require('./routes/pagination'));
app.use('/api/search',      require('./routes/search'));
app.use('/api/unreliable',  require('./routes/unreliable'));
app.use('/api/streaming',   require('./routes/streaming'));
app.use('/api/posts',       require('./routes/posts'));

// ── Multi-endpoint dashboard (for parallel/degradation labs) ─────────────────
app.get('/api/dashboard', async (req, res) => {
  const { statements } = require('./db');
  const start = Date.now();

  // Simulate a dashboard that aggregates multiple services
  const results = {};
  try { results.products = { data: statements.getProducts.all(5, 0), status: 'ok' }; }
  catch (e) { results.products = { error: e.message, status: 'error' }; }

  try { results.posts = { data: statements.getPosts.all(5, 0), status: 'ok' }; }
  catch (e) { results.posts = { error: e.message, status: 'error' }; }

  try {
    results.stats = {
      data: {
        totalProducts: statements.getProductCount.get().total,
        totalPosts: statements.getPostCount.get().total,
        categories: statements.getCategories.all().length,
      },
      status: 'ok'
    };
  } catch (e) { results.stats = { error: e.message, status: 'error' }; }

  res.json({ widgets: results, aggregatedIn: Date.now() - start });
});

// ── Static File Serving ──────────────────────────────────────────────────────
const practicalDir = path.join(__dirname, '..');
const studyDir = path.join(__dirname, '..', '..', 'Study');
const rootDir = path.join(__dirname, '..', '..');

app.use('/labs', express.static(practicalDir, { extensions: ['html'], index: false }));
app.use('/study', express.static(studyDir, { extensions: ['html'], index: false }));

// ── Index Page ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Data Fetching Labs — FAANG Senior Frontend Prep</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f1117;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;line-height:1.6}
.container{max-width:1200px;margin:0 auto;padding:32px 24px}
h1{font-size:28px;color:#60a5fa;margin-bottom:8px}
.sub{color:#94a3b8;margin-bottom:32px}
.module{margin-bottom:32px}
.module h2{font-size:18px;margin-bottom:12px;border-bottom:1px solid #333;padding-bottom:8px}
.m1 h2{color:#60a5fa} .m2 h2{color:#10b981} .m3 h2{color:#f59e0b} .m4 h2{color:#ef4444}
.topics{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.topic{background:#1a1b26;border:1px solid #2d2d3d;border-radius:8px;padding:16px}
.topic h3{font-size:14px;margin-bottom:8px}
.topic a{text-decoration:none;font-size:13px;display:block;padding:2px 0}
.m1 .topic a{color:#60a5fa} .m2 .topic a{color:#10b981} .m3 .topic a{color:#f59e0b} .m4 .topic a{color:#ef4444}
.topic a:hover{text-decoration:underline;opacity:.85}
.status{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#22c55e}
.legend{display:flex;gap:16px;margin-bottom:24px;font-size:13px;color:#94a3b8}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:8px}
.badge-lab{background:#1e3a5f;color:#60a5fa}
.badge-study{background:#1a3a2a;color:#10b981}
.section-divider{margin:40px 0 20px;border:none;border-top:1px solid #333}
</style>
</head><body>
<div class="container">
<h1>📡 Data Fetching & API Design — Hands-On Labs + Study</h1>
<p class="sub">FAANG Senior Frontend Interview Prep · Express Server + SQLite (10K records) · Port ${PORT}</p>
<div class="legend">
  <span><span class="status"></span>All labs use server at localhost:${PORT}</span>
  <span class="badge badge-lab">Practical</span> Hands-on interactive labs
  <span class="badge badge-study">Study</span> Deep-dive knowledge
</div>

<div class="module m1">
<h2>📦 Module 6.1 — API Consumption</h2>
<div class="topics">
  <div class="topic">
    <h3>01 · REST Patterns<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.1_API_Consumption/01_REST_Patterns/01_Basic_Fetch_vs_Abstraction.html"><span class="status"></span>01 Basic Fetch vs Abstraction</a>
    <a href="/labs/6.1_API_Consumption/01_REST_Patterns/02_Interceptors_Auth_Headers.html"><span class="status"></span>02 Interceptors & Auth Headers</a>
    <a href="/labs/6.1_API_Consumption/01_REST_Patterns/03_Error_Transformation.html"><span class="status"></span>03 Error Transformation</a>
    <a href="/labs/6.1_API_Consumption/01_REST_Patterns/04_Request_Response_Logging.html"><span class="status"></span>04 Request/Response Logging</a>
    <a href="/labs/6.1_API_Consumption/01_REST_Patterns/05_Caching_Strategies.html"><span class="status"></span>05 Caching Strategies</a>
  </div>
  <div class="topic">
    <h3>02 · GraphQL<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.1_API_Consumption/02_GraphQL/01_Query_vs_REST_Comparison.html"><span class="status"></span>01 Query vs REST Comparison</a>
    <a href="/labs/6.1_API_Consumption/02_GraphQL/02_Fragment_Colocation.html"><span class="status"></span>02 Fragment Colocation</a>
    <a href="/labs/6.1_API_Consumption/02_GraphQL/03_Normalized_Cache.html"><span class="status"></span>03 Normalized Cache</a>
    <a href="/labs/6.1_API_Consumption/02_GraphQL/04_Mutation_Optimistic.html"><span class="status"></span>04 Mutation + Optimistic</a>
    <a href="/labs/6.1_API_Consumption/02_GraphQL/05_N_Plus_One_Problem.html"><span class="status"></span>05 N+1 Problem</a>
  </div>
  <div class="topic">
    <h3>03 · tRPC<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.1_API_Consumption/03_tRPC/01_End_to_End_Types.html"><span class="status"></span>01 End-to-End Types</a>
    <a href="/labs/6.1_API_Consumption/03_tRPC/02_Procedures_Middleware.html"><span class="status"></span>02 Procedures & Middleware</a>
    <a href="/labs/6.1_API_Consumption/03_tRPC/03_Zod_Validation.html"><span class="status"></span>03 Zod Validation</a>
    <a href="/labs/6.1_API_Consumption/03_tRPC/04_Error_Handling.html"><span class="status"></span>04 Error Handling</a>
  </div>
  <div class="topic">
    <h3>Study<span class="badge badge-study">3 Files</span></h3>
    <a href="/study/6.1_API_Consumption/78_REST_Deep_Study.html"><span class="status" style="background:#10b981"></span>78 REST Deep Study</a>
    <a href="/study/6.1_API_Consumption/79_GraphQL_Deep_Study.html"><span class="status" style="background:#10b981"></span>79 GraphQL Deep Study</a>
    <a href="/study/6.1_API_Consumption/80_tRPC_Deep_Study.html"><span class="status" style="background:#10b981"></span>80 tRPC Deep Study</a>
  </div>
</div></div>

<div class="module m2">
<h2>📋 Module 6.2 — Lists & Streams</h2>
<div class="topics">
  <div class="topic">
    <h3>04 · Pagination<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.2_Lists_Streams/04_Pagination/01_Offset_Pagination.html"><span class="status"></span>01 Offset Pagination</a>
    <a href="/labs/6.2_Lists_Streams/04_Pagination/02_Cursor_Pagination.html"><span class="status"></span>02 Cursor Pagination</a>
    <a href="/labs/6.2_Lists_Streams/04_Pagination/03_Keyset_Pagination.html"><span class="status"></span>03 Keyset Pagination</a>
    <a href="/labs/6.2_Lists_Streams/04_Pagination/04_Offset_vs_Cursor_Benchmark.html"><span class="status"></span>04 Offset vs Cursor Benchmark</a>
    <a href="/labs/6.2_Lists_Streams/04_Pagination/05_Relay_Connection_Spec.html"><span class="status"></span>05 Relay Connection Spec</a>
  </div>
  <div class="topic">
    <h3>05 · Infinite Scroll<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.2_Lists_Streams/05_Infinite_Scroll/01_IntersectionObserver_Sentinel.html"><span class="status"></span>01 IntersectionObserver Sentinel</a>
    <a href="/labs/6.2_Lists_Streams/05_Infinite_Scroll/02_Virtual_Scrolling.html"><span class="status"></span>02 Virtual Scrolling</a>
    <a href="/labs/6.2_Lists_Streams/05_Infinite_Scroll/03_Scroll_Position_Restoration.html"><span class="status"></span>03 Scroll Restoration</a>
    <a href="/labs/6.2_Lists_Streams/05_Infinite_Scroll/04_Bidirectional_Scroll.html"><span class="status"></span>04 Bidirectional Scroll</a>
    <a href="/labs/6.2_Lists_Streams/05_Infinite_Scroll/05_Pull_to_Refresh.html"><span class="status"></span>05 Pull to Refresh</a>
  </div>
  <div class="topic">
    <h3>Study<span class="badge badge-study">3 Files</span></h3>
    <a href="/study/6.2_Lists_Streams/81_Pagination_Deep_Study.html"><span class="status" style="background:#10b981"></span>81 Pagination Deep Study</a>
    <a href="/study/6.2_Lists_Streams/82_Infinite_Scroll_Deep_Study.html"><span class="status" style="background:#10b981"></span>82 Infinite Scroll Deep Study</a>
    <a href="/study/6.2_Lists_Streams/83_Cursor_vs_Offset_Deep_Study.html"><span class="status" style="background:#10b981"></span>83 Cursor vs Offset Deep Study</a>
  </div>
</div></div>

<div class="module m3">
<h2>🎯 Module 6.3 — Request Control</h2>
<div class="topics">
  <div class="topic">
    <h3>06 · Debounce & Throttle<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.3_Request_Control/06_Debounce_Throttle/01_Debounce_Search.html"><span class="status"></span>01 Debounce Search</a>
    <a href="/labs/6.3_Request_Control/06_Debounce_Throttle/02_Throttle_Scroll.html"><span class="status"></span>02 Throttle Scroll</a>
    <a href="/labs/6.3_Request_Control/06_Debounce_Throttle/03_Leading_vs_Trailing.html"><span class="status"></span>03 Leading vs Trailing</a>
    <a href="/labs/6.3_Request_Control/06_Debounce_Throttle/04_React_Hook_Patterns.html"><span class="status"></span>04 React Hook Patterns</a>
  </div>
  <div class="topic">
    <h3>07 · Parallel & Sequential<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.3_Request_Control/07_Parallel_Sequential/01_Waterfall_Detection.html"><span class="status"></span>01 Waterfall Detection</a>
    <a href="/labs/6.3_Request_Control/07_Parallel_Sequential/02_Promise_Methods.html"><span class="status"></span>02 Promise Methods</a>
    <a href="/labs/6.3_Request_Control/07_Parallel_Sequential/03_Dependency_Graph.html"><span class="status"></span>03 Dependency Graph</a>
    <a href="/labs/6.3_Request_Control/07_Parallel_Sequential/04_HTTP_Connection_Limits.html"><span class="status"></span>04 HTTP Connection Limits</a>
  </div>
  <div class="topic">
    <h3>08 · Optimistic Updates<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.3_Request_Control/08_Optimistic_Updates/01_Like_Toggle.html"><span class="status"></span>01 Like Toggle</a>
    <a href="/labs/6.3_Request_Control/08_Optimistic_Updates/02_Add_Item.html"><span class="status"></span>02 Add Item</a>
    <a href="/labs/6.3_Request_Control/08_Optimistic_Updates/03_Delete_with_Undo.html"><span class="status"></span>03 Delete with Undo</a>
    <a href="/labs/6.3_Request_Control/08_Optimistic_Updates/04_Conflict_Resolution.html"><span class="status"></span>04 Conflict Resolution</a>
  </div>
  <div class="topic">
    <h3>09 · AbortController<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.3_Request_Control/09_AbortController/01_Search_Race_Condition.html"><span class="status"></span>01 Search Race Condition</a>
    <a href="/labs/6.3_Request_Control/09_AbortController/02_Component_Unmount.html"><span class="status"></span>02 Component Unmount</a>
    <a href="/labs/6.3_Request_Control/09_AbortController/03_Timeout_Pattern.html"><span class="status"></span>03 Timeout Pattern</a>
    <a href="/labs/6.3_Request_Control/09_AbortController/04_Stream_Cancellation.html"><span class="status"></span>04 Stream Cancellation</a>
    <a href="/labs/6.3_Request_Control/09_AbortController/05_Multi_Signal.html"><span class="status"></span>05 Multi Signal</a>
  </div>
  <div class="topic">
    <h3>Study<span class="badge badge-study">4 Files</span></h3>
    <a href="/study/6.3_Request_Control/84_Debounce_Throttle_Deep_Study.html"><span class="status" style="background:#10b981"></span>84 Debounce & Throttle</a>
    <a href="/study/6.3_Request_Control/85_Parallel_Sequential_Deep_Study.html"><span class="status" style="background:#10b981"></span>85 Parallel & Sequential</a>
    <a href="/study/6.3_Request_Control/86_Optimistic_Updates_Deep_Study.html"><span class="status" style="background:#10b981"></span>86 Optimistic Updates</a>
    <a href="/study/6.3_Request_Control/87_AbortController_Deep_Study.html"><span class="status" style="background:#10b981"></span>87 AbortController</a>
  </div>
</div></div>

<div class="module m4">
<h2>🛡️ Module 6.4 — Reliability</h2>
<div class="topics">
  <div class="topic">
    <h3>10 · Error Handling<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.4_Reliability/10_Error_Handling/01_Error_Classification.html"><span class="status"></span>01 Error Classification</a>
    <a href="/labs/6.4_Reliability/10_Error_Handling/02_Exponential_Backoff.html"><span class="status"></span>02 Exponential Backoff</a>
    <a href="/labs/6.4_Reliability/10_Error_Handling/03_Retry_After_429.html"><span class="status"></span>03 Retry-After 429</a>
    <a href="/labs/6.4_Reliability/10_Error_Handling/04_Idempotency_Keys.html"><span class="status"></span>04 Idempotency Keys</a>
    <a href="/labs/6.4_Reliability/10_Error_Handling/05_Error_Boundaries.html"><span class="status"></span>05 Error Boundaries</a>
  </div>
  <div class="topic">
    <h3>11 · Deduplication<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.4_Reliability/11_Deduplication/01_Promise_Map_Pattern.html"><span class="status"></span>01 Promise Map Pattern</a>
    <a href="/labs/6.4_Reliability/11_Deduplication/02_React_Query_Dedup.html"><span class="status"></span>02 React Query Dedup</a>
    <a href="/labs/6.4_Reliability/11_Deduplication/03_Service_Worker_Dedup.html"><span class="status"></span>03 Service Worker Dedup</a>
    <a href="/labs/6.4_Reliability/11_Deduplication/04_Cache_Invalidation.html"><span class="status"></span>04 Cache Invalidation</a>
  </div>
  <div class="topic">
    <h3>12 · Rate Limiting<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.4_Reliability/12_Rate_Limiting/01_Token_Bucket.html"><span class="status"></span>01 Token Bucket</a>
    <a href="/labs/6.4_Reliability/12_Rate_Limiting/02_Request_Queue.html"><span class="status"></span>02 Request Queue</a>
    <a href="/labs/6.4_Reliability/12_Rate_Limiting/03_Per_Endpoint_Config.html"><span class="status"></span>03 Per-Endpoint Config</a>
    <a href="/labs/6.4_Reliability/12_Rate_Limiting/04_Visibility_API_Pause.html"><span class="status"></span>04 Visibility API Pause</a>
  </div>
  <div class="topic">
    <h3>13 · Circuit Breaker<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.4_Reliability/13_Circuit_Breaker/01_State_Machine.html"><span class="status"></span>01 State Machine</a>
    <a href="/labs/6.4_Reliability/13_Circuit_Breaker/02_Per_Service_Registry.html"><span class="status"></span>02 Per-Service Registry</a>
    <a href="/labs/6.4_Reliability/13_Circuit_Breaker/03_Multi_Tab_Sync.html"><span class="status"></span>03 Multi-Tab Sync</a>
    <a href="/labs/6.4_Reliability/13_Circuit_Breaker/04_Monitoring_Dashboard.html"><span class="status"></span>04 Monitoring Dashboard</a>
  </div>
  <div class="topic">
    <h3>14 · Graceful Degradation<span class="badge badge-lab">4 Labs</span></h3>
    <a href="/labs/6.4_Reliability/14_Graceful_Degradation/01_Feature_Tier_Classification.html"><span class="status"></span>01 Feature Tiers</a>
    <a href="/labs/6.4_Reliability/14_Graceful_Degradation/02_Fallback_Chain.html"><span class="status"></span>02 Fallback Chain</a>
    <a href="/labs/6.4_Reliability/14_Graceful_Degradation/03_Network_Awareness.html"><span class="status"></span>03 Network Awareness</a>
    <a href="/labs/6.4_Reliability/14_Graceful_Degradation/04_Dashboard_Widgets.html"><span class="status"></span>04 Dashboard Widgets</a>
  </div>
  <div class="topic">
    <h3>15 · Skeleton Loaders<span class="badge badge-lab">5 Labs</span></h3>
    <a href="/labs/6.4_Reliability/15_Skeleton_Loaders/01_CSS_Shimmer.html"><span class="status"></span>01 CSS Shimmer</a>
    <a href="/labs/6.4_Reliability/15_Skeleton_Loaders/02_Shape_Matched.html"><span class="status"></span>02 Shape Matched</a>
    <a href="/labs/6.4_Reliability/15_Skeleton_Loaders/03_Delayed_Skeleton.html"><span class="status"></span>03 Delayed Skeleton</a>
    <a href="/labs/6.4_Reliability/15_Skeleton_Loaders/04_CLS_Prevention.html"><span class="status"></span>04 CLS Prevention</a>
    <a href="/labs/6.4_Reliability/15_Skeleton_Loaders/05_Accessibility.html"><span class="status"></span>05 Accessibility</a>
  </div>
  <div class="topic">
    <h3>Study<span class="badge badge-study">7 Files</span></h3>
    <a href="/study/6.4_Reliability/88_Error_Handling_Deep_Study.html"><span class="status" style="background:#10b981"></span>88 Error Handling</a>
    <a href="/study/6.4_Reliability/89_API_Contracts_Deep_Study.html"><span class="status" style="background:#10b981"></span>89 API Contracts</a>
    <a href="/study/6.4_Reliability/90_Deduplication_Deep_Study.html"><span class="status" style="background:#10b981"></span>90 Deduplication</a>
    <a href="/study/6.4_Reliability/91_Rate_Limiting_Deep_Study.html"><span class="status" style="background:#10b981"></span>91 Rate Limiting</a>
    <a href="/study/6.4_Reliability/92_Circuit_Breaker_Deep_Study.html"><span class="status" style="background:#10b981"></span>92 Circuit Breaker</a>
    <a href="/study/6.4_Reliability/93_Graceful_Degradation_Deep_Study.html"><span class="status" style="background:#10b981"></span>93 Graceful Degradation</a>
    <a href="/study/6.4_Reliability/94_Skeleton_Loaders_Deep_Study.html"><span class="status" style="background:#10b981"></span>94 Skeleton Loaders</a>
  </div>
</div></div>

<div style="margin-top:40px;padding:20px;background:#1e293b;border-radius:8px">
  <h3 style="color:#22c55e;font-size:14px;margin-bottom:8px">🧪 Quick API Test</h3>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="test('/api/rest/products?limit=3')" style="background:#1e40af;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">Products</button>
    <button onclick="test('/api/pagination/cursor?limit=3')" style="background:#1e40af;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">Cursor Pagination</button>
    <button onclick="test('/api/search?q=Premium')" style="background:#1e40af;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">Search</button>
    <button onclick="test('/api/unreliable/flaky?failRate=0.5')" style="background:#1e40af;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">Unreliable</button>
    <button onclick="test('/api/dashboard')" style="background:#1e40af;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">Dashboard</button>
  </div>
  <pre id="output" style="background:#0d1117;padding:12px;border-radius:6px;margin-top:12px;font-size:12px;max-height:300px;overflow:auto;white-space:pre-wrap;display:none"></pre>
</div>
</div>
<script>
async function test(url) {
  const el = document.getElementById('output');
  el.style.display = 'block';
  el.textContent = 'Loading...';
  try {
    const r = await fetch(url);
    const j = await r.json();
    el.textContent = JSON.stringify(j, null, 2);
  } catch(e) { el.textContent = 'Error: ' + e.message; }
}
</script>
</body></html>`);
});

// ── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📡 Data Fetching & API Design Labs Server                  ║
║  🌐 http://localhost:${PORT}                                   ║
║  📦 10,000 products · 500 posts · 2,000 comments seeded    ║
║  🧪 Labs: /labs/*   Study: /study/*   API: /api/*           ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
