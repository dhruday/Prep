# Module 2.1 — Browser Architecture

> How does a browser turn raw bytes into an interactive web page?

---

## Topics

| # | Topic | File |
|---|-------|------|
| 9 | How the Browser Works (High Level) | [09_How_the_Browser_Works.md](./09_How_the_Browser_Works.md) |
| 10 | Critical Rendering Path (CRP) | [10_Critical_Rendering_Path.md](./10_Critical_Rendering_Path.md) |
| 11 | HTML Parsing, CSSOM, Render Tree | [11_HTML_Parsing_CSSOM_Render_Tree.md](./11_HTML_Parsing_CSSOM_Render_Tree.md) |

---

## Core Concepts

- **Browser Process Model** — Multi-process architecture: Browser, Renderer, GPU, Network, Plugin processes
- **Navigation Flow** — DNS → TCP → TLS → HTTP → Parse → Render
- **Critical Rendering Path** — The sequence of steps a browser takes from bytes to pixels
- **DOM + CSSOM = Render Tree** — Separate trees are merged to produce what's actually painted
- **Render-blocking resources** — CSS and synchronous JS stop the parser

## Why It Matters in Interviews

Understanding browser architecture lets you reason about:
- Why SSR improves FCP (server sends pre-rendered HTML → browser skips JS execution for initial render)
- Why inline critical CSS improves performance (eliminates a network round-trip in the CRP)
- Why `<script>` at the bottom of `<body>` was a best practice (avoids blocking the parser)
- Why `async` / `defer` attributes exist and what the difference is
