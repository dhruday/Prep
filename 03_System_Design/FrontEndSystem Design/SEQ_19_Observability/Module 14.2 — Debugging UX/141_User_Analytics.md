# 141. User Analytics

## 1. High-Level Explanation (Frontend Interview Level)

**User Analytics** is the systematic collection and analysis of user behavior data—including navigation patterns, feature usage, conversion funnels, and engagement metrics—to understand how users interact with the application and drive product decisions.

- **What**: Track page views, events, user properties, conversion funnels, cohorts—visualized in analytics platforms (GA4, Mixpanel, Amplitude) for product insights
- **Why**: Understand user behavior, optimize conversion paths, validate product hypotheses, measure feature adoption, identify friction points
- **When**: Essential for product-driven companies, critical for conversion optimization, required for A/B test analysis, growth strategy
- **Role**: Data foundation for product decisions enabling evidence-based iteration

**Key Principle**: "Data-driven product development"—let user behavior guide feature prioritization and UX improvements.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Event Tracking Architecture

**1. Event Taxonomy**:
```typescript
// Standardized event structure
interface AnalyticsEvent {
  // Event identification
  name: string;              // 'product_viewed', 'add_to_cart', 'purchase'
  category: string;          // 'engagement', 'conversion', 'error'
  
  // Event properties
  properties: Record<string, any>;
  
  // User context
  userId?: string;
  anonymousId: string;
  sessionId: string;
  
  // Timing
  timestamp: number;
  
  // Page context
  page: {
    url: string;
    title: string;
    path: string;
    referrer: string;
  };
  
  // Device context
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    browser: string;
    os: string;
  };
  
  // Campaign tracking
  campaign?: {
    source: string;
    medium: string;
    name: string;
  };
}

// Event taxonomy examples
const events = {
  // Page tracking
  page_viewed: {
    category: 'navigation',
    properties: ['page_type', 'content_id']
  },
  
  // Product interactions
  product_viewed: {
    category: 'engagement',
    properties: ['product_id', 'product_name', 'price', 'category']
  },
  
  product_added_to_cart: {
    category: 'conversion',
    properties: ['product_id', 'quantity', 'variant', 'price']
  },
  
  // Checkout funnel
  checkout_started: {
    category: 'conversion',
    properties: ['cart_value', 'item_count']
  },
  
  payment_info_entered: {
    category: 'conversion',
    properties: ['payment_method']
  },
  
  purchase_completed: {
    category: 'conversion',
    properties: ['transaction_id', 'revenue', 'items', 'tax', 'shipping']
  },
  
  // Feature usage
  feature_used: {
    category: 'engagement',
    properties: ['feature_name', 'action']
  },
  
  // Errors
  error_occurred: {
    category: 'error',
    properties: ['error_type', 'error_message', 'context']
  }
};
```

**2. Analytics SDK**:
```typescript
class Analytics {
  private userId?: string;
  private anonymousId: string;
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  private providers: AnalyticsProvider[] = [];
  
  constructor() {
    this.anonymousId = this.getOrCreateAnonymousId();
    this.sessionId = this.getOrCreateSessionId();
    
    // Initialize providers
    this.addProvider(new GoogleAnalyticsProvider());
    this.addProvider(new MixpanelProvider());
    this.addProvider(new SegmentProvider());
  }
  
  identify(userId: string, traits?: Record<string, any>) {
    this.userId = userId;
    
    // Send identify to all providers
    this.providers.forEach(provider => {
      provider.identify(userId, {
        ...traits,
        anonymousId: this.anonymousId
      });
    });
  }
  
  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      category: this.inferCategory(eventName),
      properties: properties || {},
      
      userId: this.userId,
      anonymousId: this.anonymousId,
      sessionId: this.sessionId,
      
      timestamp: Date.now(),
      
      page: {
        url: window.location.href,
        title: document.title,
        path: window.location.pathname,
        referrer: document.referrer
      },
      
      device: {
        type: this.getDeviceType(),
        browser: this.getBrowser(),
        os: this.getOS()
      },
      
      campaign: this.getCampaignParams()
    };
    
    // Add to queue
    this.queue.push(event);
    
    // Send to providers
    this.providers.forEach(provider => {
      provider.track(event);
    });
    
    // Batch flush
    if (this.queue.length >= 10) {
      this.flush();
    }
  }
  
  page(name?: string, properties?: Record<string, any>) {
    this.track('page_viewed', {
      page_name: name || document.title,
      ...properties
    });
  }
  
  addProvider(provider: AnalyticsProvider) {
    this.providers.push(provider);
  }
  
  private async flush() {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    // Send batch to backend
    const body = JSON.stringify({ events });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/batch', body);
    } else {
      await fetch('/api/analytics/batch', {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  private inferCategory(eventName: string): string {
    if (/_viewed$/.test(eventName)) return 'engagement';
    if (/_clicked$/.test(eventName)) return 'engagement';
    if (/purchase|checkout|payment/.test(eventName)) return 'conversion';
    if (/error|fail/.test(eventName)) return 'error';
    return 'other';
  }
  
  private getOrCreateAnonymousId(): string {
    let id = localStorage.getItem('analytics_anonymous_id');
    
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_anonymous_id', id);
    }
    
    return id;
  }
  
  private getOrCreateSessionId(): string {
    let id = sessionStorage.getItem('analytics_session_id');
    
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', id);
    }
    
    return id;
  }
  
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }
  
  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    return 'Other';
  }
  
  private getOS(): string {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS/i.test(ua)) return 'iOS';
    return 'Other';
  }
  
  private getCampaignParams() {
    const params = new URLSearchParams(window.location.search);
    
    const source = params.get('utm_source');
    const medium = params.get('utm_medium');
    const name = params.get('utm_campaign');
    
    if (source || medium || name) {
      return { source, medium, name };
    }
    
    return undefined;
  }
}

// Export singleton
export const analytics = new Analytics();
```

**3. React Hook Integration**:
```typescript
// useAnalytics hook
function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    analytics.track(eventName, properties);
  }, []);
  
  const trackPageView = useCallback((pageName?: string, properties?: Record<string, any>) => {
    analytics.page(pageName, properties);
  }, []);
  
  return { trackEvent, trackPageView };
}

// Usage in component
function ProductCard({ product }: Props) {
  const { trackEvent } = useAnalytics();
  
  const handleClick = () => {
    trackEvent('product_clicked', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.category
    });
  };
  
  return (
    <div onClick={handleClick}>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  );
}
```

### Conversion Funnel Tracking

**E-commerce Funnel**:
```typescript
// Track complete checkout funnel
class CheckoutFunnel {
  private funnelId: string;
  
  constructor() {
    this.funnelId = `funnel-${Date.now()}`;
  }
  
  startCheckout(cart: Cart) {
    analytics.track('checkout_started', {
      funnel_id: this.funnelId,
      cart_value: cart.total,
      item_count: cart.items.length,
      items: cart.items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    });
  }
  
  enterShippingInfo(shippingMethod: string) {
    analytics.track('shipping_info_entered', {
      funnel_id: this.funnelId,
      shipping_method: shippingMethod
    });
  }
  
  enterPaymentInfo(paymentMethod: string) {
    analytics.track('payment_info_entered', {
      funnel_id: this.funnelId,
      payment_method: paymentMethod
    });
  }
  
  completePurchase(transaction: Transaction) {
    analytics.track('purchase_completed', {
      funnel_id: this.funnelId,
      transaction_id: transaction.id,
      revenue: transaction.total,
      tax: transaction.tax,
      shipping: transaction.shipping,
      items: transaction.items
    });
  }
  
  abandonCheckout(step: string, reason?: string) {
    analytics.track('checkout_abandoned', {
      funnel_id: this.funnelId,
      step,
      reason
    });
  }
}

// Usage
const funnel = new CheckoutFunnel();

// Step 1
funnel.startCheckout(cart);

// Step 2
funnel.enterShippingInfo('standard');

// Step 3
funnel.enterPaymentInfo('credit_card');

// Step 4
funnel.completePurchase(transaction);
```

**Funnel Analysis**:
```typescript
// Backend: Calculate funnel drop-off
interface FunnelStep {
  step: string;
  users: number;
  dropOff: number;
  dropOffRate: number;
}

async function analyzeFunnel(funnelName: string, dateRange: DateRange): Promise<FunnelStep[]> {
  const steps = [
    'checkout_started',
    'shipping_info_entered',
    'payment_info_entered',
    'purchase_completed'
  ];
  
  const funnelData: FunnelStep[] = [];
  let previousUsers = 0;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    const users = await EventModel.distinct('userId', {
      event: step,
      timestamp: { $gte: dateRange.start, $lte: dateRange.end }
    }).length;
    
    const dropOff = i > 0 ? previousUsers - users : 0;
    const dropOffRate = i > 0 ? (dropOff / previousUsers) * 100 : 0;
    
    funnelData.push({
      step,
      users,
      dropOff,
      dropOffRate
    });
    
    previousUsers = users;
  }
  
  return funnelData;
}

// Example output:
// [
//   { step: 'checkout_started', users: 10000, dropOff: 0, dropOffRate: 0 },
//   { step: 'shipping_info_entered', users: 7000, dropOff: 3000, dropOffRate: 30 },
//   { step: 'payment_info_entered', users: 5000, dropOff: 2000, dropOffRate: 28.6 },
//   { step: 'purchase_completed', users: 4500, dropOff: 500, dropOffRate: 10 }
// ]
```

### Cohort Analysis

**Define Cohorts**:
```typescript
// Group users by acquisition date
async function defineAcquisitionCohort(month: string) {
  return await UserModel.find({
    created_at: {
      $gte: new Date(`${month}-01`),
      $lt: new Date(`${month}-31`)
    }
  }).select('userId');
}

// Track cohort retention
async function calculateRetention(cohort: string[], weeks: number) {
  const retention = [];
  
  for (let week = 0; week < weeks; week++) {
    const activeUsers = await EventModel.distinct('userId', {
      userId: { $in: cohort },
      event: 'session_started',
      timestamp: {
        $gte: new Date(Date.now() - week * 7 * 24 * 60 * 60 * 1000),
        $lt: new Date(Date.now() - (week - 1) * 7 * 24 * 60 * 60 * 1000)
      }
    }).length;
    
    retention.push({
      week,
      activeUsers,
      retentionRate: (activeUsers / cohort.length) * 100
    });
  }
  
  return retention;
}
```

### Privacy-Compliant Tracking

**GDPR Consent Management**:
```typescript
class ConsentManager {
  private consent: {
    analytics: boolean;
    marketing: boolean;
  } = {
    analytics: false,
    marketing: false
  };
  
  init() {
    // Load consent from cookie
    const consentCookie = this.getConsentCookie();
    
    if (consentCookie) {
      this.consent = JSON.parse(consentCookie);
    } else {
      // Show consent banner
      this.showConsentBanner();
    }
    
    // Only track if consented
    if (this.consent.analytics) {
      this.enableAnalytics();
    }
  }
  
  giveConsent(type: 'analytics' | 'marketing') {
    this.consent[type] = true;
    this.saveConsent();
    
    if (type === 'analytics') {
      this.enableAnalytics();
    }
  }
  
  revokeConsent(type: 'analytics' | 'marketing') {
    this.consent[type] = false;
    this.saveConsent();
    
    if (type === 'analytics') {
      this.disableAnalytics();
    }
  }
  
  private enableAnalytics() {
    // Initialize analytics only after consent
    analytics.init();
  }
  
  private disableAnalytics() {
    // Stop tracking, clear data
    analytics.disable();
    this.clearAnalyticsCookies();
  }
  
  private saveConsent() {
    document.cookie = `consent=${JSON.stringify(this.consent)}; max-age=31536000; path=/; SameSite=Lax`;
  }
  
  private getConsentCookie(): string | null {
    const match = document.cookie.match(/consent=([^;]+)/);
    return match ? match[1] : null;
  }
  
  private clearAnalyticsCookies() {
    // Clear analytics-related cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('_ga') || name.startsWith('_gid')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  }
  
  private showConsentBanner() {
    // Show UI for consent
  }
}
```

### What NOT to Do

- ❌ **Track PII without consent** (GDPR violations)
- ❌ **Inconsistent event naming** (hard to analyze)
- ❌ **No event properties** (lack context)
- ❌ **Track everything** (noise, expensive)
- ❌ **No data validation** (garbage in, garbage out)

---

## 3. Clear Real-World Examples

### Example 1: Mixpanel Implementation

```typescript
import mixpanel from 'mixpanel-browser';

mixpanel.init('YOUR_TOKEN', {
  debug: process.env.NODE_ENV === 'development',
  track_pageview: true,
  persistence: 'localStorage'
});

// Identify user
mixpanel.identify(user.id);
mixpanel.people.set({
  $email: user.email,
  $name: user.name,
  plan: user.plan,
  signupDate: user.createdAt
});

// Track event
mixpanel.track('Product Purchased', {
  product_id: '123',
  price: 99.99,
  category: 'Electronics'
});

// Funnel tracking
mixpanel.track('Checkout Started');
mixpanel.track('Payment Info Entered');
mixpanel.track('Purchase Completed');
```

### Example 2: Amplitude

```typescript
import * as amplitude from '@amplitude/analytics-browser';

amplitude.init('YOUR_API_KEY', {
  defaultTracking: {
    sessions: true,
    pageViews: true,
    formInteractions: true,
    fileDownloads: true
  }
});

// Track with user properties
amplitude.track('Button Clicked', {
  buttonName: 'Sign Up',
  page: '/landing'
}, {
  user_properties: {
    userType: 'free',
    cohort: '2024-01'
  }
});
```

### Example 3: Segment (CDP)

```typescript
import { AnalyticsBrowser } from '@segment/analytics-next';

const analytics = AnalyticsBrowser.load({ writeKey: 'YOUR_WRITE_KEY' });

// Segment routes to all destinations (GA4, Mixpanel, etc.)
analytics.identify(userId, {
  email: user.email,
  plan: 'enterprise'
});

analytics.track('Order Completed', {
  orderId: '12345',
  revenue: 99.99,
  products: [{ id: '456', name: 'Widget', price: 99.99 }]
});
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you design an analytics system for an e-commerce site?"

**Answer**:

"I'd design **event-driven analytics** with funnel and cohort analysis:

**1. Event Taxonomy**:

Standardize events:
- Page views: `page_viewed`
- Product: `product_viewed`, `product_added_to_cart`
- Checkout: `checkout_started`, `payment_entered`, `purchase_completed`

Each event includes properties (product_id, price, category).

**2. SDK**:

Centralized analytics SDK:
```typescript
analytics.track('product_clicked', {
  product_id: '123',
  price: 99.99
});
```

Queues events, batches to backend every 10 events or 30s.

**3. User Identification**:

- Anonymous ID: Persisted in localStorage (lifetime tracking)
- Session ID: Persisted in sessionStorage (session tracking)
- User ID: After login (cross-device tracking)

Link anonymous → authenticated when user logs in.

**4. Conversion Funnel**:

Track checkout steps:
```
Checkout Started → Shipping Info → Payment Info → Purchase
10,000 users    → 7,000 (30% drop) → 5,000 (28% drop) → 4,500 (10% drop)
```

Optimize steps with high drop-off.

**5. Cohort Analysis**:

Group users by signup month, track retention:
```
Jan 2024 cohort: 10,000 users
Week 1: 70% retained
Week 4: 50% retained
Week 12: 30% retained
```

**6. Privacy**:

GDPR compliant:
- Cookie consent before tracking
- No PII without consent
- Data retention: 90 days
- Right to delete user data

**7. Multi-Platform**:

Use **Segment** (CDP):
- Single SDK, route to GA4, Mixpanel, Amplitude
- Consistent events across web, mobile, backend

**8. Real-Time Dashboards**:

Mixpanel/Amplitude dashboards:
- Conversion rate by channel
- Feature adoption over time
- Cohort retention curves
- Funnel drop-off visualization

**Trade-offs**:

Tracking overhead (~10KB JS bundle). Sample non-critical events (10%). Balance detail vs cost.

**Real-World**: Amazon tracks every interaction for personalization. Netflix uses analytics to decide show renewals. Airbnb correlates features with booking conversion."

---

## 6. Why & How Summary

### Why It Matters

**Product Decisions**: Data-driven feature prioritization  
**Conversion**: Identify and optimize friction points  
**Growth**: Understand acquisition channels, retention

### How It Works

**1. Track**: Events (page views, interactions, conversions)  
**2. Identify**: Anonymous → session → user  
**3. Funnel**: Multi-step conversion tracking  
**4. Cohort**: Retention by acquisition date  
**5. Dashboard**: Visualize trends, segments

**FAANG**: Event-driven architecture, funnel optimization, cohort analysis, A/B test integration, privacy compliance
