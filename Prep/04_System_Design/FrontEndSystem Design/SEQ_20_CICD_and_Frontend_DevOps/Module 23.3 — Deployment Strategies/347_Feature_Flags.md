# 347 – Feature Flags as Deployment Safety Valve

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Feature flags decouple **deployment** from **release**. Code ships to production behind a flag (off by default). Toggle on for specific users/percentages. If issues arise, disable the flag — no redeployment needed. Enables: trunk-based dev, A/B testing, gradual rollouts, kill switches.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── SIMPLE FEATURE FLAG IMPLEMENTATION ────
interface FeatureFlags {
  newCheckout: boolean;
  darkMode: boolean;
  aiSearch: boolean;
}

const FLAGS: FeatureFlags = {
  newCheckout: false,   // not yet released
  darkMode: true,       // released to all
  aiSearch: false,      // internal testing
};

function isEnabled(flag: keyof FeatureFlags, userId?: string): boolean {
  // Could be: static config, API response, or LaunchDarkly SDK
  return FLAGS[flag];
}

// Usage in component
function CheckoutPage() {
  if (isEnabled('newCheckout')) {
    return <NewCheckoutFlow />;
  }
  return <LegacyCheckoutFlow />;
}

// ──── ADVANCED: TARGETING RULES ────
interface FlagConfig {
  enabled: boolean;
  percentage: number;     // rollout percentage
  allowlist: string[];    // specific user IDs
  rules: Array<{
    attribute: string;    // 'country', 'plan', 'role'
    operator: 'eq' | 'in' | 'gt';
    value: string | string[] | number;
  }>;
}

function evaluateFlag(config: FlagConfig, context: UserContext): boolean {
  // 1. Check allowlist
  if (config.allowlist.includes(context.userId)) return true;
  // 2. Check rules
  for (const rule of config.rules) {
    if (!matchRule(rule, context)) return false;
  }
  // 3. Check percentage (consistent hashing)
  const hash = hashString(context.userId);
  return (hash % 100) < config.percentage;
}

// ──── CLEANUP: REMOVE OLD FLAGS ────
// CRITICAL: Feature flags are technical debt if not cleaned up
// Process:
// 1. Flag is 100% rolled out for 2 weeks with no issues
// 2. Create "flag cleanup" ticket
// 3. Remove flag checks, delete old code path
// 4. Remove flag from config
```

### Tools
| Tool | Type | Best For |
|---|---|---|
| **LaunchDarkly** | SaaS | Enterprise, complex targeting |
| **Unleash** | Open source (self-hosted) | Budget-conscious teams |
| **Flagsmith** | Open source + SaaS | Mid-size teams |
| **ConfigCat** | SaaS | Simple use cases |
| **Custom** | DIY | Small teams, simple flags |

### Anti-Patterns
- ❌ Too many active flags (> 20) — becomes unmaintainable
- ❌ Never cleaning up flags — dead code accumulation
- ❌ Flags in hot paths without caching — performance hit
- ❌ Complex flag dependencies — if flagA and flagB interactions

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Feature flags let me deploy daily but release features on demand. I use them for gradual rollouts (1% → 100%), kill switches for production incidents, and A/B testing. Critical discipline: clean up flags within 2 weeks of full rollout. At SAP, feature flags enabled us to ship trunk-based while maintaining enterprise release control."*

## 4. 🧠 MEMORY AID
**"Deploy ≠ Release. Ship code behind flag → toggle to release → monitor → full rollout → clean up flag."**

## 5. 🎯 KEY INSIGHT
Feature flags are the safest deployment pattern — combine with canary releases for maximum safety: flag controls feature visibility, canary controls traffic percentage.
