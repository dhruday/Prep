# 145. Rage Click Detection

## 1. High-Level Explanation (Frontend Interview Level)

**Rage Click Detection** is the identification of user frustration signals—such as rapid repeated clicking, dead clicks (no response), or error clicks (result in error)—to automatically flag UX problems, prioritize bug fixes, and improve user experience by surfacing areas where users struggle.

- **What**: Detect rapid clicks (> 3 in 1s), dead clicks (no DOM change), error clicks (trigger error), scroll thrashing—signals user frustration
- **Why**: Identify UX problems proactively, prioritize high-impact bugs, improve conversion by fixing friction points
- **When**: Critical for e-commerce (checkout frustration), essential for support ticket reduction, helpful for A/B testing validation
- **Role**: Automated UX problem detection replacing manual user feedback with behavioral signals

**Key Principle**: "Actions speak louder than words"—rapid clicking reveals broken UI better than user reports.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Rage Click Detection Algorithm

**1. Basic Detection**:
```typescript
// Detect rage clicks (3+ clicks in 1 second)
interface RageClick {
  timestamp: number;
  target: Element;
  clickCount: number;
  timeWindow: number;
  coordinates: { x: number; y: number }[];
  context: {
    url: string;
    targetSelector: string;
    targetText: string;
    errorOccurred: boolean;
  };
}

class RageClickDetector {
  private clicks: Array<{ timestamp: number; target: Element; x: number; y: number }> = [];
  private rageClickThreshold = 3;
  private timeWindow = 1000; // 1 second
  private proximityThreshold = 50; // 50px radius
  
  init() {
    document.addEventListener('click', this.handleClick.bind(this), true);
  }
  
  private handleClick(event: MouseEvent) {
    const now = Date.now();
    const target = event.target as Element;
    
    // Add click to history
    this.clicks.push({
      timestamp: now,
      target,
      x: event.clientX,
      y: event.clientY
    });
    
    // Remove old clicks (outside time window)
    this.clicks = this.clicks.filter(click => 
      now - click.timestamp < this.timeWindow
    );
    
    // Check for rage click pattern
    const recentClicksOnTarget = this.getRecentClicksNearby(target, event.clientX, event.clientY);
    
    if (recentClicksOnTarget.length >= this.rageClickThreshold) {
      this.reportRageClick(recentClicksOnTarget);
    }
  }
  
  private getRecentClicksNearby(target: Element, x: number, y: number) {
    return this.clicks.filter(click => {
      // Same element or nearby location
      const sameTarget = click.target === target || click.target.contains(target);
      const distance = Math.sqrt(
        Math.pow(click.x - x, 2) + Math.pow(click.y - y, 2)
      );
      const nearby = distance < this.proximityThreshold;
      
      return sameTarget || nearby;
    });
  }
  
  private reportRageClick(clicks: typeof this.clicks) {
    const target = clicks[0].target;
    
    const rageClick: RageClick = {
      timestamp: Date.now(),
      target,
      clickCount: clicks.length,
      timeWindow: clicks[clicks.length - 1].timestamp - clicks[0].timestamp,
      coordinates: clicks.map(c => ({ x: c.x, y: c.y })),
      context: {
        url: window.location.href,
        targetSelector: this.getSelector(target),
        targetText: target.textContent?.substring(0, 100) || '',
        errorOccurred: this.hadRecentError()
      }
    };
    
    // Send to analytics
    this.trackRageClick(rageClick);
    
    // Log locally
    console.warn('[RAGE CLICK DETECTED]', rageClick);
    
    // Clear clicks to avoid duplicate reporting
    this.clicks = [];
  }
  
  private getSelector(element: Element): string {
    // Generate CSS selector for element
    if (element.id) {
      return `#${element.id}`;
    }
    
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }
  
  private hadRecentError(): boolean {
    // Check if error occurred in last 5 seconds
    const recentErrors = (window as any).__recentErrors__ || [];
    const fiveSecondsAgo = Date.now() - 5000;
    
    return recentErrors.some((errorTime: number) => errorTime > fiveSecondsAgo);
  }
  
  private trackRageClick(rageClick: RageClick) {
    // Send to analytics platform
    analytics.track('rage_click', {
      click_count: rageClick.clickCount,
      time_window: rageClick.timeWindow,
      target_selector: rageClick.context.targetSelector,
      target_text: rageClick.context.targetText,
      url: rageClick.context.url,
      error_occurred: rageClick.context.errorOccurred
    });
    
    // Send to error tracking (high priority)
    if (window.Sentry) {
      Sentry.captureMessage('Rage click detected', {
        level: 'warning',
        extra: rageClick
      });
    }
  }
}

// Initialize
const rageClickDetector = new RageClickDetector();
rageClickDetector.init();
```

**2. Dead Click Detection**:
```typescript
// Detect clicks that don't result in any change
class DeadClickDetector {
  private clickedElements = new WeakSet<Element>();
  private mutationTimeout = 500; // 500ms to wait for change
  
  init() {
    document.addEventListener('click', this.handleClick.bind(this), true);
  }
  
  private async handleClick(event: MouseEvent) {
    const target = event.target as Element;
    
    // Skip if already tracked (avoid duplicate reports)
    if (this.clickedElements.has(target)) return;
    
    // Skip links, buttons with href
    if (this.isInteractiveElement(target)) return;
    
    this.clickedElements.add(target);
    
    // Capture state before click
    const beforeSnapshot = this.captureSnapshot();
    
    // Wait for changes
    await this.delay(this.mutationTimeout);
    
    // Capture state after click
    const afterSnapshot = this.captureSnapshot();
    
    // Compare snapshots
    if (this.areSnapshotsIdentical(beforeSnapshot, afterSnapshot)) {
      this.reportDeadClick(target);
    }
  }
  
  private captureSnapshot() {
    return {
      html: document.body.innerHTML.length, // Rough proxy for changes
      url: window.location.href,
      scrollTop: window.scrollY,
      modalCount: document.querySelectorAll('[role="dialog"]').length,
      overlayCount: document.querySelectorAll('.modal, .overlay').length
    };
  }
  
  private areSnapshotsIdentical(before: any, after: any): boolean {
    return (
      before.html === after.html &&
      before.url === after.url &&
      before.modalCount === after.modalCount &&
      before.overlayCount === after.overlayCount &&
      Math.abs(before.scrollTop - after.scrollTop) < 100
    );
  }
  
  private isInteractiveElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    
    // Skip actual interactive elements
    if (tag === 'a' || tag === 'button') return true;
    if (element.hasAttribute('href')) return true;
    if (element.getAttribute('role') === 'button') return true;
    if ((element as HTMLElement).onclick) return true;
    
    return false;
  }
  
  private reportDeadClick(target: Element) {
    analytics.track('dead_click', {
      target_selector: this.getSelector(target),
      target_text: target.textContent?.substring(0, 100),
      url: window.location.href,
      cursor: window.getComputedStyle(target).cursor
    });
    
    console.warn('[DEAD CLICK]', target);
  }
  
  private getSelector(element: Element): string {
    // Same as rage click detector
    return rageClickDetector['getSelector'](element);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const deadClickDetector = new DeadClickDetector();
deadClickDetector.init();
```

**3. Error Click Detection**:
```typescript
// Detect clicks that trigger errors
class ErrorClickDetector {
  private recentClicks: Array<{ element: Element; timestamp: number }> = [];
  private errorWindow = 2000; // 2 seconds
  
  init() {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.recentClicks.push({
        element: event.target as Element,
        timestamp: Date.now()
      });
      
      // Clean old clicks
      const cutoff = Date.now() - this.errorWindow;
      this.recentClicks = this.recentClicks.filter(c => c.timestamp > cutoff);
    }, true);
    
    // Track errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });
  }
  
  private handleError(error: Error) {
    const now = Date.now();
    
    // Find recent clicks
    const recentClick = this.recentClicks
      .filter(c => now - c.timestamp < this.errorWindow)
      .pop();
    
    if (recentClick) {
      this.reportErrorClick(recentClick.element, error);
    }
  }
  
  private reportErrorClick(element: Element, error: Error) {
    analytics.track('error_click', {
      target_selector: this.getSelector(element),
      target_text: element.textContent?.substring(0, 100),
      error_message: error.message,
      error_stack: error.stack,
      url: window.location.href
    });
    
    // High priority error
    if (window.Sentry) {
      Sentry.captureException(error, {
        tags: {
          error_type: 'click_triggered'
        },
        extra: {
          clicked_element: this.getSelector(element)
        }
      });
    }
    
    console.error('[ERROR CLICK]', element, error);
  }
  
  private getSelector(element: Element): string {
    return rageClickDetector['getSelector'](element);
  }
}

const errorClickDetector = new ErrorClickDetector();
errorClickDetector.init();
```

### Frustration Scoring

**1. Calculate User Frustration**:
```typescript
// Aggregate frustration signals
interface FrustrationMetrics {
  rageClicks: number;
  deadClicks: number;
  errorClicks: number;
  rapidBackButton: number;
  formResets: number;
  scrollThrashing: number;
  
  // Derived
  frustrationScore: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class FrustrationTracker {
  private metrics: FrustrationMetrics = {
    rageClicks: 0,
    deadClicks: 0,
    errorClicks: 0,
    rapidBackButton: 0,
    formResets: 0,
    scrollThrashing: 0,
    frustrationScore: 0,
    severity: 'low'
  };
  
  incrementRageClick() {
    this.metrics.rageClicks++;
    this.calculateScore();
  }
  
  incrementDeadClick() {
    this.metrics.deadClicks++;
    this.calculateScore();
  }
  
  incrementErrorClick() {
    this.metrics.errorClicks++;
    this.calculateScore();
  }
  
  private calculateScore() {
    // Weighted scoring
    const score = 
      this.metrics.rageClicks * 20 +
      this.metrics.deadClicks * 10 +
      this.metrics.errorClicks * 30 +
      this.metrics.rapidBackButton * 15 +
      this.metrics.formResets * 25 +
      this.metrics.scrollThrashing * 5;
    
    this.metrics.frustrationScore = Math.min(score, 100);
    
    // Determine severity
    if (score >= 80) {
      this.metrics.severity = 'critical';
    } else if (score >= 50) {
      this.metrics.severity = 'high';
    } else if (score >= 20) {
      this.metrics.severity = 'medium';
    } else {
      this.metrics.severity = 'low';
    }
    
    // Report if high frustration
    if (this.metrics.severity === 'high' || this.metrics.severity === 'critical') {
      this.reportHighFrustration();
    }
  }
  
  private reportHighFrustration() {
    analytics.track('high_frustration_detected', this.metrics);
    
    // Trigger support intervention?
    if (this.metrics.severity === 'critical') {
      this.offerHelp();
    }
  }
  
  private offerHelp() {
    // Show chat widget or help modal
    console.log('[OFFER HELP] User experiencing critical frustration');
    
    // Example: Show Intercom chat
    if ((window as any).Intercom) {
      (window as any).Intercom('showNewMessage', 
        'I noticed you might be having trouble. Can I help?'
      );
    }
  }
  
  getMetrics(): FrustrationMetrics {
    return { ...this.metrics };
  }
}

export const frustrationTracker = new FrustrationTracker();
```

### Integration with Analytics Platforms

**1. Sentry Integration**:
```typescript
import * as Sentry from '@sentry/react';

// Capture rage clicks as Sentry breadcrumbs
Sentry.addBreadcrumb({
  category: 'ui.rage-click',
  message: 'Rage click detected',
  level: 'warning',
  data: {
    target: targetSelector,
    clickCount: 5,
    url: window.location.href
  }
});

// Or as custom event
Sentry.captureMessage('User frustration detected', {
  level: 'warning',
  tags: {
    frustration_level: 'high'
  },
  extra: frustrationTracker.getMetrics()
});
```

**2. FullStory Integration**:
```typescript
// FullStory automatically detects rage clicks
// Custom event for additional tracking
FS.event('Rage Click', {
  target_selector: targetSelector,
  click_count: clickCount,
  page_url: window.location.href
});

// Set user frustration property
FS.setUserVars({
  frustration_score: frustrationTracker.getMetrics().frustrationScore
});
```

**3. LogRocket Integration**:
```typescript
import LogRocket from 'logrocket';

// Track rage click
LogRocket.track('Rage Click', {
  target: targetSelector,
  clickCount: clickCount,
  hadError: errorOccurred
});

// Add custom tag to session
LogRocket.addTags({
  'high-frustration': true
});

// Get session URL for support
LogRocket.getSessionURL((sessionURL) => {
  // Automatically send to support if critical frustration
  if (frustrationTracker.getMetrics().severity === 'critical') {
    sendToSupport(sessionURL);
  }
});
```

### Actionable Insights Dashboard

**Backend Aggregation**:
```typescript
// Aggregate rage click data
interface RageClickReport {
  url: string;
  targetSelector: string;
  targetText: string;
  occurrences: number;
  uniqueUsers: number;
  avgClickCount: number;
  errorRate: number;
}

async function getRageClickHotspots(dateRange: DateRange): Promise<RageClickReport[]> {
  const rageClicks = await EventModel.aggregate([
    {
      $match: {
        event: 'rage_click',
        timestamp: { $gte: dateRange.start, $lte: dateRange.end }
      }
    },
    {
      $group: {
        _id: {
          url: '$properties.url',
          targetSelector: '$properties.target_selector',
          targetText: '$properties.target_text'
        },
        occurrences: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        totalClicks: { $sum: '$properties.click_count' },
        errorCount: {
          $sum: { $cond: ['$properties.error_occurred', 1, 0] }
        }
      }
    },
    {
      $project: {
        url: '$_id.url',
        targetSelector: '$_id.targetSelector',
        targetText: '$_id.targetText',
        occurrences: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgClickCount: { $divide: ['$totalClicks', '$occurrences'] },
        errorRate: { $divide: ['$errorCount', '$occurrences'] }
      }
    },
    {
      $sort: { occurrences: -1 }
    },
    {
      $limit: 50
    }
  ]);
  
  return rageClicks;
}

// Example output:
// [
//   {
//     url: '/checkout',
//     targetSelector: 'button.submit-payment',
//     targetText: 'Complete Purchase',
//     occurrences: 1234,
//     uniqueUsers: 567,
//     avgClickCount: 4.2,
//     errorRate: 0.78 // 78% had errors!
//   },
//   ...
// ]
```

### What NOT to Do

- ❌ **No threshold** (normal double-clicks flagged as rage)
- ❌ **Report every click** (noise, false positives)
- ❌ **Ignore context** (mobile vs desktop, network speed)
- ❌ **No action** (collect data but never fix issues)
- ❌ **Annoy users** (intrusive "need help?" popups)

---

## 3. Clear Real-World Examples

### Example 1: FullStory Rage Click

```typescript
// FullStory automatically detects and reports rage clicks
// View in FullStory dashboard: Sessions → Filter by "Rage Clicks"

// Custom implementation
document.addEventListener('click', (event) => {
  // FullStory tracks automatically, but you can add custom events
  if (isRageClick(event)) {
    FS.event('Custom Rage Click', {
      element: getSelector(event.target as Element),
      page: window.location.pathname
    });
  }
});

// View rage click heatmap in FullStory dashboard
```

### Example 2: Sentry Rage Click Breadcrumbs

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_DSN',
  
  integrations: [
    // Sentry Replay captures rage clicks automatically
    new Sentry.Replay({
      maskAllInputs: true,
      blockAllMedia: true
    })
  ]
});

// Rage clicks appear as breadcrumbs in error reports
// View: Sentry → Issues → Click error → Breadcrumbs → "Rage click detected"
```

### Example 3: Custom Dashboard

```typescript
// Rage click dashboard endpoint
app.get('/api/analytics/rage-clicks', async (req, res) => {
  const hotspots = await getRageClickHotspots({
    start: req.query.start,
    end: req.query.end
  });
  
  res.json({
    hotspots,
    summary: {
      totalRageClicks: hotspots.reduce((sum, h) => sum + h.occurrences, 0),
      affectedUsers: hotspots.reduce((sum, h) => sum + h.uniqueUsers, 0),
      topIssue: hotspots[0]
    }
  });
});

// Frontend dashboard
function RageClickDashboard() {
  const { data } = useQuery('/api/analytics/rage-clicks');
  
  return (
    <div>
      <h2>Rage Click Hotspots</h2>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Element</th>
            <th>Occurrences</th>
            <th>Users</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.hotspots.map(hotspot => (
            <tr key={hotspot.targetSelector}>
              <td>{hotspot.url}</td>
              <td>{hotspot.targetSelector}</td>
              <td>{hotspot.occurrences}</td>
              <td>{hotspot.uniqueUsers}</td>
              <td>{(hotspot.errorRate * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you detect and handle user frustration signals like rage clicking?"

**Answer**:

"I'd implement **automated frustration detection**:

**1. Rage Click Detection**:

Algorithm:
```typescript
// Track clicks
clicks.push({ timestamp, target, x, y });

// Filter recent (< 1 second)
recentClicks = clicks.filter(c => now - c.timestamp < 1000);

// Check threshold (≥ 3 clicks in same area)
if (recentClicks.length >= 3) {
  reportRageClick();
}
```

Signals rage when ≥ 3 clicks within 1 second in same 50px radius.

**2. Dead Click Detection**:

Detect clicks that cause no change:
```typescript
// Before click
const before = captureSnapshot();

// Wait 500ms
await delay(500);

// After click
const after = captureSnapshot();

// No change?
if (identical(before, after)) {
  reportDeadClick(); // Element looks clickable but isn't!
}
```

**3. Error Click Detection**:

Link clicks to subsequent errors:
```typescript
// Track recent clicks (last 2s)
recentClicks.push({ element, timestamp });

// On error
window.addEventListener('error', (e) => {
  const recentClick = recentClicks.pop();
  
  if (recentClick) {
    reportErrorClick(recentClick.element, e.error);
  }
});
```

**4. Frustration Scoring**:

Weighted scoring:
```typescript
score = 
  rageClicks * 20 +
  deadClicks * 10 +
  errorClicks * 30 +
  formResets * 25;

// severity: low < 20, medium < 50, high < 80, critical ≥ 80
```

**5. Actionable Insights**:

Aggregate to find hotspots:
```sql
SELECT 
  url,
  target_selector,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(click_count) as avg_clicks
FROM rage_clicks
GROUP BY url, target_selector
ORDER BY occurrences DESC
LIMIT 50;
```

**Example Output**:
```
/checkout | button.submit-payment | 1234 occurrences | 567 users
```

**Conclusion**: Button broken or slow → Priority fix!

**6. Integration**:

**FullStory**: Automatic rage click detection + heatmaps.

**Sentry**: Rage clicks as breadcrumbs in error reports.

**LogRocket**: Tag sessions with high frustration, prioritize for review.

**7. User Intervention**:

If critical frustration (score ≥ 80):
```typescript
if (frustrationScore >= 80) {
  // Offer help
  Intercom.showNewMessage(
    'I noticed you might be having trouble. Can I help?'
  );
}
```

Proactive support reduces abandonment.

**8. Real-World Example**:

At my last company, checkout had 15% cart abandonment. Rage click analysis revealed:
- "Apply Coupon" button had 800 rage clicks/week
- Button appeared clickable but was disabled (no visual feedback)
- 78% of rage clicks followed by error

Fix:
1. Show loading spinner when disabled
2. Display error message if invalid coupon
3. Add visual disabled state

Result: Rage clicks dropped 90%, abandonment reduced to 10%.

**9. Privacy**:

Don't record keystrokes or full inputs. Only:
- Click counts
- Target element selector
- Timing
- Correlation with errors

GDPR compliant (behavioral, not PII).

**10. Trade-offs**:

False positives: Legitimate double-clicks vs rage. Use 3-click threshold + time window.

Performance: Click tracking ~1% CPU overhead. Acceptable."

---

## 6. Why & How Summary

### Why It Matters

**Proactive UX**: Detect broken UI before users complain  
**Prioritization**: Data-driven bug fixing (fix high-rage elements first)  
**Conversion**: Reduce cart abandonment by fixing friction

### How It Works

**1. Detect**: Rage (≥3 clicks/1s), dead (no DOM change), error (triggers error)  
**2. Track**: Count occurrences by element selector + URL  
**3. Aggregate**: Find hotspots (most rage clicks)  
**4. Score**: Frustration score 0-100 (weighted signals)  
**5. Fix**: Prioritize elements with highest rage + error rate

**FAANG**: Rage click detection (FullStory, LogRocket), frustration scoring, proactive support (Intercom integration), heatmaps, A/B test validation with frustration metrics
