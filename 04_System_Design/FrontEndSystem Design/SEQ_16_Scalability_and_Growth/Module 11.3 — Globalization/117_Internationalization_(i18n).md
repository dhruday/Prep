# 117. Internationalization (i18n)

## 1. High-Level Explanation (Frontend Interview Level)

**Internationalization (i18n)** is the process of designing and implementing software that can be easily adapted to multiple languages and regions without requiring engineering changes for each locale.

- **What**: Architecture enabling localized user experiences—translatable strings, locale-specific formatting (dates, numbers, currencies), bidirectional text support (RTL), cultural adaptations
- **Why**: Access global markets (75% of users prefer native language), legal compliance (EU requires local language), improved UX (native speakers convert 3x more), competitive advantage
- **When**: Essential for global products (B2C SaaS, e-commerce), multi-national enterprises, apps targeting non-English markets
- **Role**: Foundation layer of frontend architecture—affects component design, state management, routing, asset loading, SEO

**Key Principle**: "Write once, translate anywhere"—code doesn't know about specific languages, all text externalized to translation files.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Core i18n Concepts

**1. Locale Definition**
```javascript
// Locale: language + region + (optional) script + variant
const locales = {
  'en-US': { language: 'English', region: 'United States', direction: 'ltr' },
  'en-GB': { language: 'English', region: 'United Kingdom', direction: 'ltr' },
  'ar-SA': { language: 'Arabic', region: 'Saudi Arabia', direction: 'rtl' },
  'zh-Hans-CN': { language: 'Chinese', script: 'Simplified', region: 'China', direction: 'ltr' },
  'pt-BR': { language: 'Portuguese', region: 'Brazil', direction: 'ltr' }
};

// Locale fallback chain
function getLocaleChain(locale) {
  // 'zh-Hans-CN' → ['zh-Hans-CN', 'zh-Hans', 'zh', 'en']
  const parts = locale.split('-');
  const chain = [];
  
  for (let i = parts.length; i > 0; i--) {
    chain.push(parts.slice(0, i).join('-'));
  }
  
  chain.push('en'); // Default fallback
  return chain;
}
```

**2. Translation File Architecture**

**Flat Structure** (Simple):
```json
// locales/en.json
{
  "nav.home": "Home",
  "nav.about": "About",
  "product.addToCart": "Add to Cart",
  "product.outOfStock": "Out of Stock",
  "checkout.total": "Total"
}

// locales/es.json
{
  "nav.home": "Inicio",
  "nav.about": "Acerca de",
  "product.addToCart": "Añadir al Carrito",
  "product.outOfStock": "Agotado",
  "checkout.total": "Total"
}
```

**Nested Structure** (Organized):
```json
// locales/en.json
{
  "nav": {
    "home": "Home",
    "about": "About"
  },
  "product": {
    "addToCart": "Add to Cart",
    "outOfStock": "Out of Stock",
    "stock": {
      "inStock": "{{count}} items available",
      "lowStock": "Only {{count}} left!",
      "outOfStock": "Out of stock"
    }
  }
}
```

**Namespaced** (Scalable):
```javascript
// locales/en/common.json
{ "nav": { "home": "Home" } }

// locales/en/product.json  
{ "addToCart": "Add to Cart" }

// locales/en/checkout.json
{ "total": "Total" }

// Load namespaces on-demand
i18n.loadNamespaces(['common', 'product']);
```

**3. Interpolation & Pluralization**

**Basic Interpolation**:
```javascript
// Translation
{
  "greeting": "Hello, {{name}}!",
  "cart": "You have {{count}} items in your cart"
}

// Usage
t('greeting', { name: 'Alice' }); // "Hello, Alice!"
t('cart', { count: 5 }); // "You have 5 items in your cart"
```

**Pluralization** (ICU Message Format):
```json
{
  "items": {
    "zero": "No items",
    "one": "{{count}} item",
    "other": "{{count}} items"
  },
  
  "daysRemaining": {
    "=0": "Today",
    "=1": "Tomorrow",
    "other": "In {{count}} days"
  }
}
```

**Complex Plurals** (Russian has 6 plural forms):
```json
{
  "items_ru": {
    "one": "{{count}} предмет",    // 1, 21, 31... (ends in 1, not 11)
    "few": "{{count}} предмета",   // 2-4, 22-24... (ends in 2-4, not 12-14)
    "many": "{{count}} предметов", // 0, 5-20, 25-30... (others)
    "other": "{{count}} предметов"
  }
}
```

**Gender & Context**:
```json
{
  "welcome": {
    "male": "Welcome, Mr. {{name}}",
    "female": "Welcome, Ms. {{name}}",
    "other": "Welcome, {{name}}"
  }
}

// Usage
t('welcome', { context: user.gender, name: user.name });
```

**4. Date & Number Formatting**

**Intl API** (Browser-native):
```javascript
// Date formatting
const date = new Date('2024-03-15');

new Intl.DateTimeFormat('en-US').format(date);
// "3/15/2024"

new Intl.DateTimeFormat('de-DE').format(date);
// "15.3.2024"

new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(date);
// "March 15, 2024"

// Relative time
new Intl.RelativeTimeFormat('en').format(-1, 'day');
// "1 day ago"

new Intl.RelativeTimeFormat('es').format(-1, 'day');
// "hace 1 día"

// Number formatting
const number = 1234567.89;

new Intl.NumberFormat('en-US').format(number);
// "1,234,567.89"

new Intl.NumberFormat('de-DE').format(number);
// "1.234.567,89"

// Currency
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(99.99);
// "$99.99"

new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY'
}).format(99.99);
// "¥100" (no decimals for JPY)

// Percentage
new Intl.NumberFormat('en-US', {
  style: 'percent'
}).format(0.123);
// "12%"
```

**5. Right-to-Left (RTL) Support**

**CSS Direction**:
```css
/* Global RTL */
html[dir="rtl"] {
  direction: rtl;
}

/* Logical properties (auto-flip for RTL) */
.container {
  padding-inline-start: 20px; /* left in LTR, right in RTL */
  padding-inline-end: 10px;
  margin-block-start: 10px;  /* top */
  margin-block-end: 10px;    /* bottom */
}

/* Flip icons/images */
html[dir="rtl"] .icon-arrow {
  transform: scaleX(-1); /* Mirror horizontally */
}

/* Text alignment */
.text {
  text-align: start; /* left in LTR, right in RTL */
}
```

**React Implementation**:
```jsx
function App() {
  const { dir } = useI18n();
  
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);
  
  return <div>{/* App content */}</div>;
}
```

**6. Locale Detection & Switching**

**Detection Priority**:
```javascript
function detectLocale() {
  // 1. URL parameter (?lang=es)
  const urlLocale = new URLSearchParams(window.location.search).get('lang');
  if (urlLocale) return urlLocale;
  
  // 2. User preference (stored in cookie/localStorage)
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale) return savedLocale;
  
  // 3. Browser settings
  const browserLocales = navigator.languages || [navigator.language];
  const supportedLocales = ['en', 'es', 'fr', 'de', 'ja'];
  
  for (const browserLocale of browserLocales) {
    const lang = browserLocale.split('-')[0];
    if (supportedLocales.includes(lang)) {
      return lang;
    }
  }
  
  // 4. Geo-IP lookup
  const geoLocale = await fetch('/api/geo').then(r => r.json()).then(d => d.locale);
  if (geoLocale) return geoLocale;
  
  // 5. Default
  return 'en';
}
```

**Locale Switching**:
```javascript
async function switchLocale(newLocale) {
  // 1. Load translations
  await i18n.changeLanguage(newLocale);
  
  // 2. Update HTML attributes
  document.documentElement.lang = newLocale;
  document.documentElement.dir = getDirection(newLocale);
  
  // 3. Save preference
  localStorage.setItem('locale', newLocale);
  document.cookie = `locale=${newLocale}; max-age=31536000; path=/`;
  
  // 4. Reload dynamic content
  router.replace(router.asPath, router.asPath, { locale: newLocale });
  
  // 5. Update meta tags for SEO
  updateMetaTags(newLocale);
}
```

**7. Performance Optimization**

**Code Splitting by Locale**:
```javascript
// Webpack dynamic import
async function loadLocale(locale) {
  const translations = await import(
    /* webpackChunkName: "locale-[request]" */
    `./locales/${locale}.json`
  );
  
  i18n.addResourceBundle(locale, 'translation', translations);
}

// Only load active locale (not all 20 languages)
// Reduces initial bundle size by 80%+
```

**Lazy Loading Namespaces**:
```javascript
// Load common translations on app start
i18n.loadNamespaces(['common']);

// Load page-specific translations on route change
router.events.on('routeChangeComplete', (url) => {
  if (url.startsWith('/products')) {
    i18n.loadNamespaces(['product', 'reviews']);
  } else if (url.startsWith('/checkout')) {
    i18n.loadNamespaces(['checkout', 'payment']);
  }
});
```

**Translation Caching**:
```javascript
// Service Worker caches translation files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('translations-v1').then((cache) => {
      return cache.addAll([
        '/locales/en.json',
        '/locales/es.json',
        '/locales/fr.json'
      ]);
    })
  );
});

// Update strategy: stale-while-revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/locales/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open('translations-v1').then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});
```

**What NOT to Do**:
- ❌ Hardcode text in components (`<button>Click here</button>`)
- ❌ String concatenation for sentences (word order varies by language)
- ❌ Assume LTR only (breaks for Arabic, Hebrew)
- ❌ Use flags to represent languages (flags = countries, not languages)
- ❌ Load all locales eagerly (wastes bandwidth)

---

## 3. Clear Real-World Examples

### Example 1: Airbnb i18n at Scale

**Scale**:
- **62 languages** supported
- **7M+ translation strings**
- **Dynamic content** (listings, reviews) translated via Google Translate API with human review

**Architecture**:
```javascript
// Translation string extraction
// Airbnb uses Polyglot.js + custom tooling
const translations = {
  'listing.price': '${{price}} per night',
  'listing.guests': {
    one: '{{count}} guest',
    other: '{{count}} guests'
  },
  'booking.dates': '{{startDate}} - {{endDate}}'
};

// Dynamic date formatting per locale
function formatStay(startDate, endDate, locale) {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric'
  });
  
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

// Usage
formatStay(new Date('2024-03-15'), new Date('2024-03-20'), 'en-US');
// "Mar 15 - Mar 20"

formatStay(new Date('2024-03-15'), new Date('2024-03-20'), 'fr-FR');
// "15 mars - 20 mars"
```

**Translation Workflow**:
1. Developers write strings in English with keys
2. CI/CD extracts strings to translation management system (Smartling)
3. Professional translators translate to 62 languages
4. Translations deployed with each release
5. A/B testing on translation quality (different phrasings)

### Example 2: Mozilla Firefox Localization

**Community-Driven**:
- **100+ languages** (including minority languages)
- **Volunteer translators** via Mozilla L10n platform
- **String freeze** 2 weeks before release (no new strings)

**Key Technique: Fluent Localization**:
```fluent
# en-US
new-tab-button = New Tab
    .aria-label = Open a new tab
    .tooltip = New Tab (Ctrl+T)

tabs-count = { $count ->
    [one] { $count } tab
   *[other] { $count } tabs
}

# es-ES
new-tab-button = Nueva pestaña
    .aria-label = Abrir nueva pestaña
    .tooltip = Nueva pestaña (Ctrl+T)

tabs-count = { $count ->
    [one] { $count} pestaña
   *[other] { $count } pestañas
}
```

**Benefits**: Attributes (ARIA, tooltips) localized alongside main text. Plural rules handled per locale.

### Example 3: Shopify Multi-Currency & Locale

**Challenge**: E-commerce needs currency + language support.

**Implementation**:
```javascript
// Shopify's approach
const storefront = {
  locale: 'fr-CA',      // French (Canada)
  currency: 'CAD',      // Canadian Dollar
  timezone: 'America/Toronto'
};

// Product pricing
function formatPrice(amount, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

formatPrice(99.99, 'CAD', 'fr-CA');
// "99,99 $ CA"

formatPrice(99.99, 'CAD', 'en-CA');
// "$99.99 CAD"

// Tax display (regional variation)
const taxRules = {
  'US': { inclusive: false, label: 'Tax' },
  'EU': { inclusive: true, label: 'VAT' },
  'CA': { inclusive: false, label: 'GST/HST' }
};

function displayPrice(amount, region) {
  const rule = taxRules[region];
  const label = rule.inclusive ? 'incl. {{label}}' : '+ {{label}}';
  
  return `${formatPrice(amount, getCurrency(region), getLocale(region))} ${t(label, { label: rule.label })}`;
}
```

**Result**: Same product shows correctly localized pricing in 175 countries.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you architect internationalization for a global application?"

**Answer**:

"I'd design a **comprehensive i18n system** with these layers:

**1. Translation Architecture**:

Store translations in **JSON files per locale** (`en.json`, `es.json`). Use **namespacing** for scalability—split by feature (`common.json`, `product.json`, `checkout.json`). Load namespaces on-demand to avoid loading all translations upfront.

**Format**:
```json
{
  "product": {
    "addToCart": "Add to Cart",
    "stock": {
      "inStock": "{{count}} available",
      "lowStock": "Only {{count}} left!"
    }
  }
}
```

**2. Locale Detection**:

Priority chain: (1) URL parameter (`?lang=es`), (2) User preference (cookie), (3) Browser settings (`navigator.languages`), (4) Geo-IP, (5) Default to English.

**3. Text Rendering**:

Use i18n library (react-i18next, FormatJS) with hooks:
```jsx
const { t } = useTranslation('product');
return <button>{t('addToCart')}</button>;
```

Never hardcode text. All strings externalized.

**4. Formatting**:

Use **Intl API** for dates, numbers, currency—automatically locale-aware:
```javascript
new Intl.DateTimeFormat(locale).format(date);
new Intl.NumberFormat(locale, { style: 'currency', currency }).format(price);
```

**5. RTL Support**:

Detect RTL locales (`ar`, `he`, `fa`), set `dir="rtl"` on `<html>`. Use CSS logical properties (`padding-inline-start` instead of `padding-left`) for auto-flip. Mirror icons with `transform: scaleX(-1)`.

**6. Pluralization**:

Use ICU Message Format:
```json
{
  "items": {
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

Handles complex rules (Russian has 6 plural forms).

**7. Performance**:

**Code split by locale**: Load only active locale via dynamic import. Reduces bundle by 80% (1 locale vs 20).

**Lazy load namespaces**: Common translations on app load, page-specific on route change.

**CDN caching**: Translation files served from CDN with long TTLs (immutable, versioned).

**8. Translation Workflow**:

Developers add keys → CI extracts strings → Translation management system (Smartling, Phrase) → Professional translators → Deploy with release.

**9. SEO**:

**Subdomains**: `en.example.com`, `es.example.com`  
**Subdirectories**: `example.com/en`, `example.com/es`  
**Hreflang tags**:
```html
<link rel=\"alternate\" hreflang=\"en\" href=\"https://example.com/en/product\" />
<link rel=\"alternate\" hreflang=\"es\" href=\"https://example.com/es/producto\" />
```

**Trade-offs**:

Subdirectories preferred (easier management, single domain authority) vs subdomains (cleaner separation, different servers).

**Real-World**: Airbnb supports 62 languages with 7M+ strings. Shopify handles 175 countries × multiple languages = 300+ locale combinations."

### Follow-Up Questions

**Q1**: "How do you handle dynamic content translation?"

**A**: "Two approaches:

**1. Server-Side Translation** (Preferred):
```javascript
// Store user-generated content in all supported languages
const listing = {
  title: {
    'en': 'Beautiful Apartment',
    'es': 'Hermoso Apartamento',
    'fr': 'Bel Appartement'
  }
};

// Serve appropriate language
const title = listing.title[userLocale] || listing.title.en;
```

Airbnb uses this for listings (owners provide translations or hire translators).

**2. Machine Translation** (Fallback):
```javascript
async function translateDynamic(text, targetLocale) {
  // Check cache first
  const cached = await cache.get(`translate:${text}:${targetLocale}`);
  if (cached) return cached;
  
  // Translate via Google Translate API
  const translated = await googleTranslate.translate(text, targetLocale);
  
  // Cache result (1 week TTL)
  await cache.set(`translate:${text}:${targetLocale}`, translated, 604800);
  
  return translated;
}
```

Used for user reviews, comments where manual translation impractical.

**Hybrid**: Machine translate + human review for quality. Amazon translates product reviews automatically, flags low-confidence translations for review."

**Q2**: "How do you test i18n thoroughly?"

**A**: "Multi-layered testing:

**1. Pseudo-Localization** (Development):
```javascript
// Replace English with accented characters + length expansion
function pseudoLocalize(text) {
  const map = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
  let result = text.replace(/[aeiou]/g, m => map[m] || m);
  
  // Add 30% length (many languages 20-50% longer than English)
  result += ' ' + 'x'.repeat(Math.floor(text.length * 0.3));
  
  // Add markers to detect concatenation
  return `[${result}]`;
}

// English: "Hello"
// Pseudo:   "[Hélló xxxxx]"
```

Benefits: Detects hardcoded strings, UI overflow, concatenation issues.

**2. RTL Testing**:
```javascript
// Force RTL mode for testing
document.documentElement.dir = 'rtl';
```

Verify: layout not broken, icons flipped correctly, scroll position, animations.

**3. Visual Regression**:
```javascript
// Percy, Chromatic: Screenshot each page in all locales
test('Homepage in Spanish', async () => {
  await i18n.changeLanguage('es');
  await page.goto('/');
  await percySnapshot('Homepage - Spanish');
});
```

Catches: text overflow, misaligned elements, broken layouts.

**4. Translation Coverage**:
```javascript
// CI job checks for missing translations
const en = require('./locales/en.json');
const es = require('./locales/es.json');

const enKeys = Object.keys(flattenObject(en));
const esKeys = Object.keys(flattenObject(es));

const missing = enKeys.filter(k => !esKeys.includes(k));

if (missing.length > 0) {
  throw new Error(`Missing Spanish translations: ${missing.join(', ')}`);
}
```

**5. Locale-Specific E2E**:
```javascript
// Test checkout flow in multiple locales
test.each(['en', 'es', 'de'])('Checkout flow - %s', async (locale) => {
  await i18n.changeLanguage(locale);
  await completeCheckout();
  expect(confirmationMessage).toBeVisible();
});
```

**6. Real User Testing**: Beta program with native speakers in target markets."

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Market Access**: 75% of users prefer native language → 3x conversion rates
- **Revenue**: Localized UX increases purchases 25-50%
- **Legal**: EU/China require local language for consumer apps
- **Trust**: Native language = brand credibility

**User Experience**:
- **Comprehension**: Users understand features in native language
- **Comfort**: Native formats (dates, currency) feel familiar
- **Accessibility**: RTL support for 400M+ Arabic/Hebrew speakers

### How It Works (Technical Summary)

**1. Setup**: Install i18n library (react-i18next), create translation files per locale

**2. Externalize**: Replace hardcoded text with translation keys: `t('product.addToCart')`

**3. Formatting**: Use Intl API for dates, numbers, currency (locale-aware)

**4. Detection**: Detect user locale (browser settings, geo-IP, preference)

**5. RTL**: Set `dir="rtl"` for Arabic/Hebrew, use logical CSS properties

**6. Performance**: Code split by locale, lazy load namespaces, CDN cache translations

**7. Workflow**: Developers add keys → CI extracts → TMS → Translators → Deploy

**FAANG-Level Expectation**:
- Support 20+ languages (50+ for truly global)
- < 100ms locale switching
- < 5% bundle size overhead per locale (code splitting)
- RTL layouts pixel-perfect
- Professional translations (not machine-only)
- Pluralization for all languages (including complex rules)
- Dynamic content translation strategy
