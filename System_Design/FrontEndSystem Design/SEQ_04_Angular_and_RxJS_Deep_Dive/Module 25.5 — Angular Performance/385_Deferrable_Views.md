# 385 – Deferrable Views (@defer block, Angular 17+)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**@defer** (Angular 17+) lazily loads parts of a template — not just routes, but individual components, pipes, and directives within a page. Supports triggers like viewport visibility, interaction, idle, timer, and hover. Includes @placeholder, @loading, and @error blocks.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── BASIC @defer ────
@Component({
  template: `
    <h1>Dashboard</h1>
    
    <!-- Heavy chart component loaded only when needed -->
    @defer {
      <app-heavy-chart [data]="chartData" />
    } @placeholder {
      <div class="skeleton">Chart loading area...</div>
    } @loading (minimum 500ms) {
      <app-spinner />
    } @error {
      <p>Failed to load chart component</p>
    }
  `,
})
export class DashboardComponent { }

// ──── TRIGGER: on viewport (lazy load when scrolled into view) ────
@defer (on viewport) {
  <app-comments [postId]="post.id" />
} @placeholder {
  <div style="height: 200px">Scroll to load comments</div>
}

// ──── TRIGGER: on interaction ────
@defer (on interaction) {
  <app-rich-editor [content]="content" />
} @placeholder {
  <textarea placeholder="Click to load rich editor...">{{ content }}</textarea>
}

// ──── TRIGGER: on hover ────
@defer (on hover) {
  <app-user-tooltip [userId]="user.id" />
} @placeholder {
  <span>{{ user.name }}</span>
}

// ──── TRIGGER: on idle (browser idle) ────
@defer (on idle) {
  <app-analytics-widget />
} @placeholder {
  <div>Analytics loading...</div>
}

// ──── TRIGGER: on timer ────
@defer (on timer(3s)) {
  <app-ad-banner />
} @placeholder {
  <div></div>
}

// ──── TRIGGER: when (boolean condition) ────
@defer (when showAdvanced) {
  <app-advanced-settings />
}

// ──── MULTIPLE TRIGGERS ────
@defer (on viewport; on timer(5s)) {
  <app-recommendations />
} @placeholder {
  <div>Recommendations...</div>
}

// ──── PREFETCH ────
// Separate prefetch from rendering trigger
@defer (on interaction; prefetch on idle) {
  <app-heavy-form />
} @placeholder {
  <button>Click to open form</button>
}
// Code downloads during idle, renders on click — instant!

// ──── REAL-WORLD: BELOW-THE-FOLD CONTENT ────
@Component({
  template: `
    <!-- Above the fold — eagerly loaded -->
    <app-hero-banner />
    <app-featured-products [products]="featured" />
    
    <!-- Below the fold — deferred -->
    @defer (on viewport; prefetch on idle) {
      <app-reviews [productId]="productId" />
    } @placeholder {
      <div class="reviews-skeleton" style="height: 400px"></div>
    }
    
    @defer (on viewport) {
      <app-related-products />
    } @placeholder {
      <div class="related-skeleton" style="height: 300px"></div>
    }
    
    @defer (on viewport) {
      <app-footer />
    }
  `,
})
export class ProductPageComponent { }
```

### @defer Triggers
| Trigger | When | Use Case |
|---|---|---|
| `on idle` | Browser idle | Non-critical features |
| `on viewport` | Scrolled into view | Below-fold content |
| `on interaction` | Click/focus/keydown | Click-to-load |
| `on hover` | Mouse hover | Tooltips, previews |
| `on timer(Xs)` | After X seconds | Delayed content |
| `when expr` | Boolean condition | Conditional features |
| `on immediate` | ASAP (default) | Load but defer chunk |

### @defer vs Lazy Routes
| Feature | @defer | Lazy Routes |
|---|---|---|
| **Scope** | Template section | Entire page/route |
| **Trigger** | 6+ options | Navigation |
| **Granularity** | Component-level | Route-level |
| **Use** | Intra-page optimization | Inter-page splitting |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"@defer enables component-level lazy loading within a template — not just route-level. I use 'on viewport' for below-fold content, 'on interaction' for heavy editors, and 'prefetch on idle' to pre-download code during browser idle for instant rendering later. At SAP, this reduced initial page weight by 40% on our product dashboard."*

## 4. 🧠 MEMORY AID
**"@defer = lazy load template sections. Triggers: viewport, interaction, hover, idle, timer, when. @placeholder → @loading → content or @error. prefetch separates download from render."**
