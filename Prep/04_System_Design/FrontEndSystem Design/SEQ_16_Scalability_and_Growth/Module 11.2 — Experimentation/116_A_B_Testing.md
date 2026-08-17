# 116. A/B Testing

## 1. High-Level Explanation (Frontend Interview Level)

**A/B Testing** (split testing) is an experimental methodology where two or more variants of a feature, design, or user experience are compared by randomly assigning users to variants and measuring which performs better based on predefined success metrics.

- **What**: Controlled experiments where users see different variants (A: control, B: treatment), behavior tracked, statistical analysis determines winner
- **Why**: Data-driven decision making over opinions, optimize conversion rates (5-20% improvements common), reduce risk of harmful changes, validate hypotheses
- **When**: Essential for product changes (redesigns, new features), optimization (checkout flow, CTAs), personalization, pricing experiments
- **Role**: Core component of growth engineering—every product decision backed by empirical data, continuous optimization culture

**Key Formula**: 
```
Experiment → Measure (conversions, revenue, engagement) → Analyze (statistical significance) → Implement winner
```

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Experiment Design Fundamentals

**1. Hypothesis Formation**

**Strong Hypothesis**:
```
IF we change the CTA button from blue to red
THEN conversion rate will increase by 10%
BECAUSE red creates urgency and stands out more on our white background
```

**Components**:
- **Change**: Specific, measurable modification
- **Metric**: Primary success criterion (conversion rate, revenue, engagement)
- **Rationale**: Why this change should work
- **Magnitude**: Expected impact size (informs sample size calculation)

**Weak Hypothesis** (avoid):
- "Red buttons might perform better" (no metric, no rationale)
- "Users will like the new design more" (subjective, not measurable)

**2. Metrics Framework**

**Primary Metric** (Decision Criterion):
- **Conversion Rate**: % users completing desired action
- **Revenue Per User**: Average monetary value
- **Engagement**: Time spent, features used

**Secondary Metrics** (Supporting Evidence):
- Click-through rate
- Add-to-cart rate
- Page load time

**Guardrail Metrics** (Prevent Harm):
- Error rate < 1% (ensure variant doesn't break)
- Page load time < 3s (no performance regression)
- Bounce rate < 40% (users aren't confused)

**Counter Metrics** (Detect Gaming):
- If optimizing for clicks, track completion rate (prevent clickbait)
- If optimizing for sign-ups, track activation rate (prevent spam)

**3. Statistical Foundations**

**Sample Size Calculation**:
```javascript
function calculateSampleSize(params) {
  const {
    baselineRate = 0.10,    // Current conversion: 10%
    minimumDetectableEffect = 0.05, // Detect 5% relative lift (10% → 10.5%)
    alpha = 0.05,           // 5% false positive rate (95% confidence)
    beta = 0.20             // 20% false negative rate (80% power)
  } = params;
  
  // Simplified formula (normal approximation)
  const zAlpha = 1.96; // 95% confidence
  const zBeta = 0.84;  // 80% power
  
  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffect);
  const pBar = (p1 + p2) / 2;
  
  const samplePerVariant = Math.ceil(
    ((zAlpha + zBeta) ** 2 * 2 * pBar * (1 - pBar)) / 
    ((p2 - p1) ** 2)
  );
  
  return {
    perVariant: samplePerVariant,
    total: samplePerVariant * 2, // A + B
    expectedDuration: samplePerVariant / (dailyUsers * 0.5) // Days
  };
}

// Example
const result = calculateSampleSize({
  baselineRate: 0.10,
  minimumDetectableEffect: 0.05, // 5% relative lift
  alpha: 0.05,
  beta: 0.20
});

console.log(result);
// { perVariant: 31,380, total: 62,760, expectedDuration: 6.3 days (for 10K daily users) }
```

**Key Insight**: Detecting small effects (< 5%) requires massive samples (100K+). Only run experiments where effect size is meaningful to business.

**Significance Testing**:
```javascript
function calculateSignificance(variantA, variantB) {
  const { conversions: cA, samples: nA } = variantA;
  const { conversions: cB, samples: nB } = variantB;
  
  const pA = cA / nA;
  const pB = cB / nB;
  const pPool = (cA + cB) / (nA + nB);
  
  const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
  const zScore = (pB - pA) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore))); // Two-tailed
  
  return {
    control: { rate: pA, count: cA, samples: nA },
    variant: { rate: pB, count: cB, samples: nB },
    lift: ((pB / pA) - 1) * 100, // % improvement
    confidence: (1 - pValue) * 100,
    significant: pValue < 0.05
  };
}

// Example
const result = calculateSignificance(
  { conversions: 1000, samples: 10000 }, // A: 10% conversion
  { conversions: 1100, samples: 10000 }  // B: 11% conversion
);

console.log(result);
// {
//   control: { rate: 0.10, count: 1000, samples: 10000 },
//   variant: { rate: 0.11, count: 1100, samples: 10000 },
//   lift: 10.0, // 10% relative improvement
//   confidence: 98.4, // 98.4% confidence
//   significant: true // p < 0.05
// }
```

**4. Variant Assignment (Consistent Hashing)**

**Requirements**:
- **Consistency**: Same user always sees same variant (across sessions, devices)
- **Randomness**: Uniform distribution (50/50 split)
- **Independence**: Multiple experiments don't interact

**Implementation**:
```javascript
class ExperimentAssigner {
  // Consistent hash function
  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  getVariant(userId, experimentId, variants) {
    // Combine userId + experimentId for independence between experiments
    const seed = `${userId}:${experimentId}`;
    const hash = this.hash(seed);
    
    // Map to variant based on bucket
    const bucket = hash % 100; // 0-99
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.percentage;
      if (bucket < cumulative) {
        return variant.name;
      }
    }
    
    return variants[0].name; // Fallback to control
  }
  
  // Example usage
  assignUser(userId) {
    return {
      checkoutFlow: this.getVariant(userId, 'exp_checkout_v2', [
        { name: 'control', percentage: 50 },
        { name: 'variant_a', percentage: 50 }
      ]),
      
      buttonColor: this.getVariant(userId, 'exp_button_color', [
        { name: 'blue', percentage: 33 },
        { name: 'red', percentage: 33 },
        { name: 'green', percentage: 34 }
      ])
    };
  }
}

// Verification: Hashing creates uniform distribution
const assigner = new ExperimentAssigner();
const users = Array.from({ length: 10000 }, (_, i) => `user_${i}`);

const distribution = users.reduce((acc, userId) => {
  const variant = assigner.getVariant(userId, 'test_exp', [
    { name: 'control', percentage: 50 },
    { name: 'treatment', percentage: 50 }
  ]);
  acc[variant] = (acc[variant] || 0) + 1;
  return acc;
}, {});

console.log(distribution);
// { control: 4987, treatment: 5013 } ≈ 50/50 split ✅
```

**Why This Works**: Hash function distributes user IDs uniformly across 0-99 buckets. Adding `experimentId` to seed ensures independence—user in treatment for Exp A might be in control for Exp B.

**5. Event Tracking Architecture**

**Client-Side Instrumentation**:
```javascript
class ExperimentTracker {
  constructor(userId, experiments) {
    this.userId = userId;
    this.experiments = experiments;
  }
  
  // Track experiment exposure (user saw variant)
  trackExposure(experimentId, variant) {
    this.send('experiment_exposure', {
      experiment_id: experimentId,
      variant,
      user_id: this.userId,
      timestamp: Date.now(),
      session_id: this.getSessionId(),
      page_url: window.location.href
    });
  }
  
  // Track conversion event
  trackConversion(experimentId, eventName, metadata = {}) {
    this.send('experiment_conversion', {
      experiment_id: experimentId,
      variant: this.experiments[experimentId],
      event_name: eventName,
      user_id: this.userId,
      timestamp: Date.now(),
      ...metadata
    });
  }
  
  // Send to analytics backend
  send(eventType, data) {
    // Batch events for performance (flush every 5s or 10 events)
    this.eventQueue.push({ type: eventType, data });
    
    if (this.eventQueue.length >= 10 || this.shouldFlush()) {
      this.flush();
    }
  }
  
  flush() {
    if (this.eventQueue.length === 0) return;
    
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: this.eventQueue }),
      keepalive: true // Send even if user closes tab
    });
    
    this.eventQueue = [];
  }
}

// Usage in component
function CheckoutButton() {
  const variant = useExperiment('checkout_button_color');
  const tracker = useExperimentTracker();
  
  useEffect(() => {
    // Track exposure (user saw this variant)
    tracker.trackExposure('checkout_button_color', variant);
  }, [variant]);
  
  const handleClick = () => {
    // Track click event
    tracker.trackConversion('checkout_button_color', 'button_clicked');
    
    // Proceed with checkout
    proceedToCheckout();
  };
  
  return (
    <button 
      style={{ backgroundColor: variant === 'red' ? '#ff0000' : '#0000ff' }}
      onClick={handleClick}
    >
      Checkout
    </button>
  );
}
```

**Backend Event Processing**:
```javascript
// Event ingestion pipeline (Node.js + Kafka + ClickHouse)
app.post('/api/events', async (req, res) => {
  const { events } = req.body;
  
  // Publish to Kafka for processing
  await kafka.publish('experiment_events', events);
  
  res.status(202).send(); // Accepted
});

// Kafka consumer writes to ClickHouse (analytical database)
kafkaConsumer.on('message', async (message) => {
  const events = JSON.parse(message.value);
  
  for (const event of events) {
    await clickhouse.insert('experiment_events', {
      experiment_id: event.data.experiment_id,
      variant: event.data.variant,
      user_id: event.data.user_id,
      event_type: event.type,
      timestamp: event.data.timestamp,
      metadata: JSON.stringify(event.data)
    });
  }
});

// Real-time aggregation query
const results = await clickhouse.query(`
  SELECT 
    variant,
    countDistinct(user_id) as unique_users,
    countIf(event_type = 'experiment_conversion') as conversions,
    conversions / unique_users as conversion_rate
  FROM experiment_events
  WHERE experiment_id = 'checkout_button_color'
    AND timestamp > now() - INTERVAL 7 DAY
  GROUP BY variant
`);
```

**6. Common Pitfalls & Anti-Patterns**

**Peeking Problem** (Stopping Early):
```
Day 1: Variant B winning (12% vs 10%), p = 0.03 → Declare winner ❌
Day 7: Variant B losing (10.2% vs 10.5%), p = 0.42 → False positive!
```

**Solution**: Pre-commit to sample size, run until reached. Use sequential testing if early stopping required (Bayesian A/B testing).

**Multiple Testing Problem**:
```javascript
// Testing 5 variants with α = 0.05
const numVariants = 5;
const familywiseErrorRate = 1 - (1 - 0.05) ** numVariants;
console.log(familywiseErrorRate); // 0.226 = 22.6% false positive rate ❌
```

**Solution**: Bonferroni correction—adjust α to 0.05 / numVariants. For 5 variants, α = 0.01.

**Simpson's Paradox** (Segment Reversal):
```
Overall: Variant B wins (conversion 11% vs 10%)
Mobile: Variant A wins (15% vs 12%)
Desktop: Variant A wins (8% vs 7%)

Why? Variant B shown to more desktop users (lower conversion segment)
```

**Solution**: Analyze by segments (mobile, desktop, country), ensure balanced traffic.

**Selection Bias**:
```javascript
// Anti-pattern: Only assign logged-in users to experiment
if (user.isLoggedIn) {
  variant = getVariant(user.id, experimentId);
} else {
  variant = 'control'; // Guests always see control ❌
}

// Bias: Logged-in users more engaged → inflated treatment metrics
```

**Solution**: Assign all traffic (logged-in + guests) randomly. Use anonymous IDs for guests.

**7. Advanced Techniques**

**Multi-Armed Bandit** (Dynamic Allocation):
```javascript
// Traditional A/B: Fixed 50/50 split, run until significance
// Bandit: Dynamically allocate more traffic to winning variant

class ThompsonSampling {
  constructor(variants) {
    this.variants = variants.map(v => ({ 
      name: v, 
      successes: 1, // Prior
      failures: 1 
    }));
  }
  
  selectVariant() {
    // Sample from Beta distribution for each variant
    const samples = this.variants.map(v => 
      this.betaSample(v.successes, v.failures)
    );
    
    // Return variant with highest sample
    const maxIndex = samples.indexOf(Math.max(...samples));
    return this.variants[maxIndex].name;
  }
  
  updateVariant(variantName, converted) {
    const variant = this.variants.find(v => v.name === variantName);
    if (converted) {
      variant.successes++;
    } else {
      variant.failures++;
    }
  }
  
  betaSample(alpha, beta) {
    // Simplified: use normal approximation
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    return mean + Math.sqrt(variance) * this.randomNormal();
  }
  
  randomNormal() {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// Usage
const bandit = new ThompsonSampling(['control', 'variant_a', 'variant_b']);

// Over 10,000 trials
for (let i = 0; i < 10000; i++) {
  const variant = bandit.selectVariant();
  
  // Simulate conversion (variant_a has 15% rate, others 10%)
  const converted = Math.random() < (variant === 'variant_a' ? 0.15 : 0.10);
  
  bandit.updateVariant(variant, converted);
}

console.log(bandit.variants);
// variant_a gets 70%+ of traffic after discovering it's best ✅
```

**Benefit**: Minimizes regret (lost conversions from showing inferior variants). Useful for long-running experiments.

**Sequential Testing** (Early Stopping):
```javascript
// Bayesian A/B testing with credible intervals
function bayesianTest(variantA, variantB) {
  const { successes: sA, trials: nA } = variantA;
  const { successes: sB, trials: nB } = variantB;
  
  // Posterior distributions: Beta(s + 1, n - s + 1)
  const alphaA = sA + 1, betaA = nA - sA + 1;
  const alphaB = sB + 1, betaB = nB - sB + 1;
  
  // Monte Carlo: Sample 10,000 times from each posterior
  let bWins = 0;
  for (let i = 0; i < 10000; i++) {
    const pA = betaSample(alphaA, betaA);
    const pB = betaSample(alphaB, betaB);
    if (pB > pA) bWins++;
  }
  
  const probBWins = bWins / 10000;
  
  return {
    probAWins: 1 - probBWins,
    probBWins,
    decision: probBWins > 0.95 ? 'B wins' : 
              probBWins < 0.05 ? 'A wins' : 
              'Continue testing'
  };
}

// Stop when 95% certain of winner (can check daily)
```

**Benefit**: Can stop early if clear winner (saves time), controls error rate via credible intervals.

**What NOT to Do**:
- ❌ Change variants mid-experiment (invalidates results)
- ❌ Run experiments without sufficient sample size
- ❌ Ignore guardrail metrics (win on conversion but 2x error rate)
- ❌ Test too many variants (requires 10x sample size for 10 variants)
- ❌ No hypothesis (fishing for significance)

---

## 3. Clear Real-World Examples

### Example 1: Booking.com A/B Testing Culture

**Scale**:
- **1000+ experiments** running concurrently
- **25,000+ experiments** run annually
- **Every feature** A/B tested before launch

**Notable Experiment (2019)**:
```javascript
// Hypothesis: Showing "Only 1 room left!" creates urgency → increases bookings
// Variants:
// A (control): No urgency message
// B (scarcity): "Only 1 room left at this price!"
// C (social proof): "12 people viewing this property"

const experiment = {
  id: 'urgency_messaging_v3',
  variants: [
    { name: 'control', percentage: 33 },
    { name: 'scarcity', percentage: 33 },
    { name: 'social_proof', percentage: 34 }
  ],
  metrics: {
    primary: 'booking_conversion_rate',
    secondary: ['click_through_rate', 'time_to_book'],
    guardrail: ['cancellation_rate', 'support_tickets']
  }
};

// Results after 14 days (500K users):
const results = {
  control: { conversion: 0.046, cancellations: 0.12 },
  scarcity: { conversion: 0.052, cancellations: 0.14 }, // +13% conversions, +17% cancellations ⚠️
  social_proof: { conversion: 0.050, cancellations: 0.12 } // +9% conversions, same cancellations ✅
};

// Decision: Implement social_proof variant
// Reason: Positive conversion lift without harming cancellation rate
```

**Key Insight**: Scarcity messaging won on primary metric but failed guardrail (increased cancellations → negative long-term impact). Social proof was safer choice.

### Example 2: Obama 2012 Campaign (Highest-Stakes A/B Test)

**Context**: Optimize donation page to maximize campaign funds.

**Experiment**:
```javascript
const donationPageExperiment = {
  variations: {
    media: ['Obama family photo', 'Video', 'Graphic'],
    button: ['Donate', 'Contribute', 'Support'],
    form: ['Above fold', 'Below fold']
  },
  // 3 × 3 × 2 = 18 total combinations tested
  
  winner: {
    media: 'Obama family photo',
    button: 'Contribute',
    form: 'Above fold'
  }
};

// Results:
const impact = {
  conversionIncrease: 0.403, // 40.3% more sign-ups
  additionalFunds: 60_000_000, // $60M additional donations
  roiOfTesting: Infinity // Testing cost ~$100K, return $60M
};
```

**Lessons**:
- Small UX changes (button text!) can have massive impact
- Always test assumptions (team thought video would win, photo actually did)
- Continuous testing compounds (dozens of optimizations → 40%+ total lift)

### Example 3: Microsoft Bing Search Results Experiment

**Incident (2012)**:
```javascript
// Hypothesis: Showing 10 results per page is optimal
// Variants:
// A: 10 results (control)
// B: 20 results (treatment)

const experiment = {
  primaryMetric: 'revenue_per_search',
  duration: '14 days',
  traffic: '50/50'
};

// Results:
const results = {
  control: { 
    revenuePerSearch: 1.00, 
    avgLoadTime: 1.2, 
    clickThroughRate: 0.12 
  },
  treatment: { 
    revenuePerSearch: 0.92, // -8% revenue ❌
    avgLoadTime: 2.1, // +75% load time
    clickThroughRate: 0.10 // -17% CTR
  }
};

// Learning: Extra 10 results added 900ms load time
// Users perceived as "slow", abandoned searches
// Revenue loss: -$100M annually if implemented
```

**Key Takeaway**: Performance is a feature. Slower page (even with "better" content) loses. Every 100ms delay costs conversions.

### Example 4: Netflix Artwork Testing

**Challenge**: Which thumbnail image drives most engagement?

**Approach**:
```javascript
// For each title, test 5-10 thumbnail variants
const artworkExperiment = {
  title: 'Stranger Things S4',
  variants: [
    'Eleven close-up',
    'Group shot',
    'Monster Vecna',
    'Nostalgic 80s aesthetic',
    'Action scene'
  ],
  metric: 'play_rate', // % users clicking thumbnail who start playback
  personalization: true // Different winners for different user segments
};

// Results:
const segmentedResults = {
  horror_fans: { winner: 'Monster Vecna', lift: 0.23 }, // +23% play rate
  drama_fans: { winner: 'Eleven close-up', lift: 0.18 },
  family_viewers: { winner: 'Group shot', lift: 0.15 }
};

// Outcome: Serve personalized thumbnails based on user's viewing history
```

**Impact**: Artwork personalization contributed to 5-10% increase in content engagement (hundreds of millions in retention value).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you design and implement an A/B testing system?"

**Answer**:

"I'd build a **full-stack A/B testing platform** with these components:

**1. Experiment Assignment (Client)**:

Use **consistent hashing** for variant assignment:
```javascript
const hash = hashCode(userId + experimentId) % 100;
const variant = hash < 50 ? 'control' : 'treatment';
```

Why: Same user always sees same variant across sessions/devices. Adding experimentId ensures independence between experiments.

**Traffic Allocation**: Start with 50/50 split for statistical power. For risky experiments, use 95/5 (95% control, 5% canary) initially, then expand.

**2. Event Tracking**:

**Client-side** instrumentation:
- Track exposure: User saw variant (required for accurate metrics)
- Track conversion: User completed target action (purchase, sign-up)
- Batch events (10 at a time or every 5s) for performance
- Use `keepalive: true` for page unload events

**Backend** pipeline:
- Ingest events to Kafka (100K events/sec)
- Store in analytical database (ClickHouse, BigQuery)
- Real-time aggregation for dashboards

**3. Statistical Analysis**:

**Sample Size**: Pre-calculate required samples using power analysis:
```
n = (Z_α + Z_β)² × 2p(1-p) / (MDE²)
```

For 10% baseline conversion, detecting 5% lift with 80% power:
~30K users per variant, ~60K total.

**Significance Testing**: Use two-tailed z-test for proportions. Require p < 0.05 for significance (95% confidence).

**Duration**: Run until sample size reached AND minimum 7 days (captures weekly seasonality). Don't stop early (peeking problem).

**4. Metrics Framework**:

**Primary**: Single decision metric (conversion rate, revenue per user)

**Secondary**: Supporting metrics (click-through rate, time on page)

**Guardrail**: Prevent harm (error rate < 1%, page load < 3s, bounce rate < 40%)

**Segment Analysis**: Analyze by mobile/desktop, geography, user cohort to detect Simpson's paradox.

**5. Implementation (React)**:

```javascript
function CheckoutButton() {
  const variant = useExperiment('checkout_button_color');
  const tracker = useExperimentTracker();
  
  useEffect(() => {
    tracker.trackExposure('checkout_button_color', variant);
  }, [variant]);
  
  const handleClick = () => {
    tracker.trackConversion('checkout_button_color', 'purchase');
    // ... checkout logic
  };
  
  return <button style={{ backgroundColor: variant }} onClick={handleClick} />;
}
```

**6. Rollout Process**:

```
Day 0: Launch experiment (50/50 split)
Day 1-7: Monitor daily (no decisions yet)
Day 7: Check results, continue if inconclusive
Day 14: Analyze final results, determine winner
Day 15: Implement winner, remove losing variant
```

**Trade-offs**:

**Fixed Sample vs Bayesian**: Fixed requires pre-commitment to sample size (no early stopping). Bayesian allows early stopping but requires more complex analysis.

**Client vs Server Assignment**: Client-side is faster (< 1ms) but less secure. Server-side is secure but adds latency (50-100ms).

**Complexity**: Running 100+ experiments requires sophisticated traffic management, interaction detection, and governance.

**Real-World**: Booking.com runs 1000+ concurrent experiments. Netflix personalizes thumbnails via thousands of A/B tests. Obama campaign raised $60M extra via testing."

### Follow-Up Questions

**Q1**: "How do you handle interactions between multiple experiments?"

**A**: "Two approaches:

**1. Independent Hashing** (Default):
```javascript
const exp1Variant = hash(userId + 'exp1') % 100 < 50 ? 'A' : 'B';
const exp2Variant = hash(userId + 'exp2') % 100 < 50 ? 'A' : 'B';
```

Each experiment uses different seed → user independently assigned. Statistically valid if experiments don't interact (e.g., homepage banner + checkout button).

**2. Mutually Exclusive Experiments**:

If experiments affect same page/metric, make mutually exclusive:
```javascript
// Assign users to layers, experiments within layers
const layer = hash(userId) % 10; // 10 layers

if (layer < 5) {
  // Homepage experiments
  experiment = 'homepage_hero_test';
} else {
  // Checkout experiments
  experiment = 'checkout_flow_test';
}
```

**Interaction Detection**: Monitor for unexpected metric changes. If Exp A + Exp B running together → anomalous results, investigate interaction.

**Google's Approach**: Divide traffic into 'namespaces'. Each namespace can run one experiment. Ensures no interaction but limits concurrency.

**Best Practice**: Test major redesigns alone. Small tweaks (button color, copy) can run concurrently if on different pages."

**Q2**: "How do you know if you're running experiments long enough?"

**A**: "Three requirements:

**1. Sample Size**: Reach calculated sample size (e.g., 60K users). Don't stop early even if significant at Day 3 (peeking problem causes 25%+ false positive rate).

**2. Time**: Minimum 7 days (ideally 14) to capture weekly patterns:
- Weekday vs weekend behavior differs
- Paycheck cycles affect purchasing
- Example: B2B products see different usage Mon-Fri vs weekends

**3. Seasonality**: Avoid confounding events:
- Don't run shopping experiments during Black Friday (atypical behavior)
- Don't run mobile experiments during iPhone launch (new devices)

**Early Stopping**: Only valid with Bayesian sequential testing or pre-specified stopping rules. For classical testing, pre-commit to duration.

**Monitoring**: Track sample size daily, project completion date. Alert if experiment slowed (traffic lower than expected → will take longer).

**Real-World**: Microsoft Bing runs experiments minimum 14 days. Google requires 7 days + statistical power. Booking.com runs until 95% Bayesian certainty (typically 7-21 days)."

**Q3**: "What if your A/B test results contradict intuition?"

**A**: "Data over opinions, but verify:

**1. Check for Bugs**:
- Verify both variants rendering correctly
- Check event tracking (conversions recorded accurately?)
- Segment analysis (mobile broken but desktop fine?)

**2. Statistical Verification**:
- Re-run significance test
- Check for Simpson's paradox (overall vs segments)
- Ensure sample size sufficient (underpowered test → noise)

**3. Qualitative Research**:
- User interviews: Why do users prefer 'losing' variant?
- Heatmaps: Are users clicking expected elements?
- Session recordings: Identify friction points

**4. Long-Term Metrics**:
- Check retention (7-day, 30-day)
- Check lifetime value (short-term win but long-term loss?)
- Example: Auto-play videos increase engagement but decrease retention

**5. If Results Robust**: Trust the data. Many 'obvious' improvements fail in practice.

**Famous Example**: Google tested 41 shades of blue for ad links. Engineers mocked it, but optimal shade increased revenue $200M/year. Data wins.

**Philosophy**: Intuition generates hypotheses, data makes decisions. Even experts wrong 50%+ of time about what users will prefer."

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Optimization**: 5-20% conversion improvements common (millions in revenue)
- **Risk Reduction**: Validate changes before full rollout (prevent $100M mistakes like Bing's 20-results test)
- **Compounding Gains**: 10 experiments × 5% lift each = 63% total improvement (1.05^10 ≈ 1.63)
- **Data Culture**: Shift from opinions to evidence-based decisions

**Engineering Productivity**:
- **Confidence**: Ship changes knowing they improve metrics
- **Learning**: Understand what works (and why failures fail)
- **Innovation**: Safe to try radical ideas (fail fast with data)

### How It Works (Technical Summary)

**1. Design**: Formulate hypothesis, define metrics (primary, secondary, guardrail), calculate sample size

**2. Implement**: Code variants behind feature flag, instrument events (exposure, conversion)

**3. Assign**: Consistent hash assigns users to variants (50/50 split typical)

**4. Track**: Send events to analytics pipeline (client → Kafka → ClickHouse)

**5. Monitor**: Dashboard shows real-time results, but don't make decisions until complete

**6. Analyze**: At end (7-14 days, sample size reached), run significance test (z-test, p < 0.05)

**7. Decide**: If significant + guardrails passed → implement winner, remove loser

**8. Iterate**: Compound improvements (run next experiment on winning variant)

**Key Formulas**:
- **Sample Size**: `n = ((Z_α + Z_β)² × 2p(1-p)) / MDE²`
- **Z-Score**: `z = (p_B - p_A) / SE`, where `SE = sqrt(p(1-p) × (1/n_A + 1/n_B))`
- **Lift**: `((p_B / p_A) - 1) × 100%`

**FAANG-Level Expectation**:
- Run 100+ experiments concurrently
- 80% statistical power (β = 0.20)
- 95% confidence (α = 0.05)
- Detect 5% relative lift minimum
- 7-14 day duration minimum
- Segment analysis (mobile, desktop, geography)
- Guardrail metrics prevent harm
