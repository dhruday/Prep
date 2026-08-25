# 118. Theming & White-Labeling

## 1. High-Level Explanation (Frontend Interview Level)

**Theming & White-Labeling** is the architectural capability to dynamically customize an application's visual appearance, branding, and sometimes functionality for different customers, brands, or contexts without changing the core codebase.

- **What**: System for runtime customization of colors, typography, logos, layouts, domain names, and features—allowing single codebase to serve multiple branded experiences
- **Why**: B2B SaaS multi-tenancy (each client gets branded portal), white-label products (resellers rebrand as their own), accessibility (dark mode, high contrast), user personalization
- **When**: Essential for SaaS platforms, marketplace apps, enterprise software, design systems, multi-brand companies
- **Role**: Core architectural decision affecting component design, state management, asset loading, CSS architecture, deployment strategy

**Key Principle**: "One codebase, infinite appearances"—separation of logic from presentation enables cost-effective customization at scale.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Theming Architecture Patterns

**1. CSS Custom Properties (CSS Variables)**

**Modern Standard**:
```css
/* Base theme tokens */
:root {
  --color-primary: #0066cc;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  
  --font-family-base: 'Inter', sans-serif;
  --font-size-base: 16px;
  --spacing-unit: 8px;
  
  --border-radius: 4px;
  --shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Dark theme override */
[data-theme="dark"] {
  --color-primary: #4dabf7;
  --color-background: #1a1a1a;
  --color-text: #ffffff;
  --shadow: 0 2px 4px rgba(0,0,0,0.5);
}

/* Component usage */
.button {
  background-color: var(--color-primary);
  color: white;
  padding: calc(var(--spacing-unit) * 2);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  font-family: var(--font-family-base);
}
```

**JavaScript Theme Switching**:
```javascript
function applyTheme(themeConfig) {
  const root = document.documentElement;
  
  Object.entries(themeConfig).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}

// Example usage
const darkTheme = {
  'color-primary': '#4dabf7',
  'color-background': '#1a1a1a',
  'color-text': '#ffffff'
};

applyTheme(darkTheme);
```

**Benefits**: Runtime switching (no CSS rebuilds), scoped overrides, inheritance, broad browser support (IE 11+).

**2. CSS-in-JS with Theme Context**

**Styled-Components Approach**:
```javascript
// theme.js
const lightTheme = {
  colors: {
    primary: '#0066cc',
    background: '#ffffff',
    text: '#000000'
  },
  spacing: {
    unit: 8,
    small: '8px',
    medium: '16px',
    large: '24px'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      small: '14px',
      base: '16px',
      large: '20px'
    }
  }
};

const darkTheme = {
  ...lightTheme,
  colors: {
    primary: '#4dabf7',
    background: '#1a1a1a',
    text: '#ffffff'
  }
};

// App.jsx
import { ThemeProvider } from 'styled-components';

function App() {
  const [theme, setTheme] = useState('light');
  const themeConfig = theme === 'light' ? lightTheme : darkTheme;
  
  return (
    <ThemeProvider theme={themeConfig}>
      <GlobalStyle />
      <AppContent />
    </ThemeProvider>
  );
}

// Button.jsx
import styled from 'styled-components';

const StyledButton = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.medium};
  font-family: ${props => props.theme.typography.fontFamily};
  
  &:hover {
    opacity: 0.8;
  }
`;
```

**Dynamic Theme Loading**:
```javascript
// Load tenant-specific theme from API
async function loadTenantTheme(tenantId) {
  const response = await fetch(`/api/themes/${tenantId}`);
  const themeConfig = await response.json();
  
  return {
    colors: {
      primary: themeConfig.primaryColor,
      secondary: themeConfig.secondaryColor,
      ...themeConfig.colors
    },
    logo: themeConfig.logoUrl,
    favicon: themeConfig.faviconUrl,
    customCSS: themeConfig.customCSS
  };
}

// Usage
const theme = await loadTenantTheme('acme-corp');
```

**3. White-Label Architecture**

**Multi-Tenant Theme Registry**:
```javascript
const tenantThemes = {
  'acme-corp': {
    name: 'Acme Corporation',
    domain: 'portal.acme.com',
    logo: 'https://cdn.example.com/logos/acme.svg',
    colors: {
      primary: '#ff0000',
      secondary: '#333333'
    },
    features: {
      advancedAnalytics: true,
      customReports: true,
      sso: true
    }
  },
  
  'globex': {
    name: 'Globex Inc',
    domain: 'app.globex.com',
    logo: 'https://cdn.example.com/logos/globex.svg',
    colors: {
      primary: '#0066cc',
      secondary: '#6c757d'
    },
    features: {
      advancedAnalytics: false,
      customReports: false,
      sso: false
    }
  }
};

// Tenant detection by domain
function detectTenant() {
  const hostname = window.location.hostname;
  
  // Check custom domains
  const tenant = Object.entries(tenantThemes).find(
    ([id, config]) => config.domain === hostname
  );
  
  if (tenant) {
    return tenant[0];
  }
  
  // Check subdomain (tenant.example.com)
  const subdomain = hostname.split('.')[0];
  if (tenantThemes[subdomain]) {
    return subdomain;
  }
  
  // Check path (/tenant/dashboard)
  const pathTenant = window.location.pathname.split('/')[1];
  if (tenantThemes[pathTenant]) {
    return pathTenant;
  }
  
  return 'default';
}
```

**4. Design Tokens System**

**Token Definition**:
```json
{
  "color": {
    "brand": {
      "primary": { "value": "#0066cc" },
      "secondary": { "value": "#6c757d" }
    },
    "semantic": {
      "success": { "value": "{color.brand.primary}" },
      "danger": { "value": "#dc3545" }
    }
  },
  "spacing": {
    "xs": { "value": "4px" },
    "sm": { "value": "8px" },
    "md": { "value": "16px" },
    "lg": { "value": "24px" },
    "xl": { "value": "32px" }
  },
  "typography": {
    "fontFamily": {
      "base": { "value": "Inter, system-ui, sans-serif" },
      "heading": { "value": "Montserrat, sans-serif" }
    },
    "fontSize": {
      "sm": { "value": "14px" },
      "base": { "value": "16px" },
      "lg": { "value": "20px" },
      "xl": { "value": "24px" }
    }
  }
}
```

**Token Compilation** (Style Dictionary):
```javascript
// build-tokens.js
const StyleDictionary = require('style-dictionary');

StyleDictionary.extend({
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables'
      }]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/es6'
      }]
    },
    json: {
      transformGroup: 'js',
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.json',
        format: 'json/nested'
      }]
    }
  }
}).buildAllPlatforms();

// Output: CSS variables, JS constants, JSON for runtime
```

**5. Runtime Theme Injection**

**Server-Side Injection** (Next.js):
```javascript
// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    
    // Detect tenant from request
    const tenant = detectTenantFromRequest(ctx.req);
    const theme = await loadTenantTheme(tenant);
    
    return { ...initialProps, theme };
  }
  
  render() {
    const { theme } = this.props;
    
    return (
      <Html>
        <Head>
          {/* Inject theme as CSS variables */}
          <style dangerouslySetInnerHTML={{
            __html: `
              :root {
                --color-primary: ${theme.colors.primary};
                --color-secondary: ${theme.colors.secondary};
                --logo-url: url('${theme.logo}');
              }
            `
          }} />
          
          {/* Tenant-specific favicon */}
          <link rel="icon" href={theme.favicon} />
          
          {/* Custom CSS */}
          {theme.customCSS && (
            <style dangerouslySetInnerHTML={{ __html: theme.customCSS }} />
          )}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

**Edge Workers Theme Resolution**:
```javascript
// Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const tenant = detectTenantFromDomain(url.hostname);
  
  // Fetch theme from KV store (< 5ms)
  const theme = await THEMES_KV.get(tenant, 'json');
  
  if (!theme) {
    return fetch(request); // Pass through
  }
  
  // Fetch HTML from origin
  const response = await fetch(request);
  const html = await response.text();
  
  // Inject theme variables
  const themedHtml = html.replace(
    '<head>',
    `<head>
      <style>
        :root {
          --color-primary: ${theme.colors.primary};
          --logo-url: url('${theme.logo}');
        }
      </style>
      <link rel="icon" href="${theme.favicon}">`
  );
  
  return new Response(themedHtml, {
    headers: response.headers
  });
}
```

**6. Feature Flagging by Theme**

**Conditional Features**:
```javascript
function Dashboard() {
  const { features } = useTheme();
  
  return (
    <div>
      <StandardMetrics />
      
      {features.advancedAnalytics && <AdvancedAnalytics />}
      {features.customReports && <ReportBuilder />}
      {features.exportData && <ExportButton />}
    </div>
  );
}

// Theme configuration controls feature availability
const theme = {
  tenantId: 'acme-corp',
  tier: 'enterprise',
  features: {
    advancedAnalytics: true,  // Enterprise feature
    customReports: true,
    exportData: true,
    apiAccess: true
  }
};
```

**7. Theme Performance Optimization**

**Critical CSS Extraction**:
```javascript
// Extract critical theme CSS for above-fold content
async function extractCriticalThemeCSS(theme) {
  const criticalVars = [
    'color-primary',
    'color-background',
    'color-text',
    'font-family-base',
    'logo-url'
  ];
  
  return criticalVars.map(varName => 
    `--${varName}: ${theme[varName]};`
  ).join('\n');
}

// Inline critical CSS, defer rest
<style>{criticalCSS}</style>
<link rel="stylesheet" href="/theme-full.css" media="print" onload="this.media='all'" />
```

**Theme Caching**:
```javascript
// Cache themes in Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('themes-v1').then(cache => {
      return cache.addAll([
        '/api/themes/acme-corp',
        '/api/themes/globex'
      ]);
    })
  );
});

// Serve from cache, update in background
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/themes/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fresh = fetch(event.request).then(response => {
          caches.open('themes-v1').then(cache => {
            cache.put(event.request, response.clone());
          });
          return response;
        });
        
        return cached || fresh;
      })
    );
  }
});
```

**What NOT to Do**:
- ❌ Hardcode colors/styles in components (prevents theming)
- ❌ Generate separate CSS bundles per theme (doesn't scale)
- ❌ No theme preview (users can't test before applying)
- ❌ Allow unrestricted custom CSS (security risk, breaks layout)
- ❌ Load all themes upfront (wastes bandwidth)

---

## 3. Clear Real-World Examples

### Example 1: Shopify Theme System

**Architecture**:
```javascript
// 10,000+ themes available
// Merchants can customize via theme editor

const shopifyTheme = {
  // JSON-based theme configuration
  settings_schema: [
    {
      name: 'Colors',
      settings: [
        {
          type: 'color',
          id: 'color_primary',
          label: 'Primary color',
          default: '#000000'
        },
        {
          type: 'color',
          id: 'color_secondary',
          label: 'Secondary color',
          default: '#ffffff'
        }
      ]
    },
    {
      name: 'Typography',
      settings: [
        {
          type: 'font_picker',
          id: 'font_body',
          label: 'Body font',
          default: 'helvetica_n4'
        }
      ]
    }
  ],
  
  // Liquid templates use theme variables
  templates: {
    'product.liquid': `
      <div style="color: {{ settings.color_primary }}">
        <h1>{{ product.title }}</h1>
      </div>
    `
  }
};

// Real-time preview
function updateThemePreview(settingId, value) {
  document.documentElement.style.setProperty(
    `--${settingId}`,
    value
  );
}
```

**Scale**: 2M+ merchants, each with custom theme.

### Example 2: Salesforce Lightning Design System

**Token-Based Theming**:
```css
/* Salesforce Lightning tokens */
:root {
  --slds-c-button-brand-color-background: #0176d3;
  --slds-c-button-brand-color-border: #0176d3;
  --slds-c-button-radius-border: 0.25rem;
}

/* Custom theme override */
.theme-retail {
  --slds-c-button-brand-color-background: #ff6b35;
  --slds-c-button-brand-color-border: #ff6b35;
}

/* Component automatically themed */
.slds-button_brand {
  background: var(--slds-c-button-brand-color-background);
  border-color: var(--slds-c-button-brand-color-border);
  border-radius: var(--slds-c-button-radius-border);
}
```

**Enterprise Theming**: Each Salesforce org can customize via Setup → Themes.

### Example 3: WordPress Multi-Site Theming

**Database-Driven Themes**:
```php
// Each site in network has own theme
$theme = get_option('theme_mods_' . get_option('stylesheet'));

// Theme customizer settings
$customizer->add_setting('primary_color', [
  'default' => '#0073aa',
  'transport' => 'postMessage' // Live preview
]);

// Frontend usage
?>
<style>
  :root {
    --primary-color: <?php echo get_theme_mod('primary_color'); ?>;
  }
</style>
```

**Scale**: 43% of web uses WordPress, millions with custom themes.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you architect a white-label SaaS platform?"

**Answer**:

"I'd design a **multi-tenant theming system** with these layers:

**1. Theme Storage**:

Store themes in **database per tenant**:
```sql
CREATE TABLE tenant_themes (
  tenant_id VARCHAR(255) PRIMARY KEY,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  logo_url TEXT,
  favicon_url TEXT,
  custom_css TEXT,
  features JSON,
  created_at TIMESTAMP
);
```

**2. Runtime Detection**:

Detect tenant by: (1) Custom domain (`portal.acme.com`), (2) Subdomain (`acme.example.com`), (3) Path (`/acme/dashboard`). Store mapping in Redis for fast lookups.

**3. Theme Application**:

**CSS Variables** for runtime theming:
```javascript
function applyTheme(theme) {
  document.documentElement.style.setProperty('--color-primary', theme.primaryColor);
  document.documentElement.style.setProperty('--logo-url', `url('${theme.logoUrl}')`);
}
```

**Server-side injection** for initial paint (no flash):
```html
<style>
  :root {
    --color-primary: ${theme.primaryColor};
  }
</style>
```

**4. Component Architecture**:

Components reference theme tokens, never hardcoded values:
```jsx
const Button = styled.button`
  background: var(--color-primary);
  color: var(--color-text);
  font-family: var(--font-family);
`;
```

**5. Asset Management**:

Store tenant assets in **CDN with tenant prefix**:
```
cdn.example.com/tenants/acme/logo.svg
cdn.example.com/tenants/acme/favicon.ico
```

Serve with long cache TTLs (versioned URLs for updates).

**6. Feature Flags**:

Link features to tenant tier:
```javascript
const features = {
  'acme-corp': {
    tier: 'enterprise',
    advancedAnalytics: true,
    customReports: true,
    apiAccess: true
  }
};

// Conditionally render
{features.advancedAnalytics && <AdvancedDashboard />}
```

**7. Theme Editor**:

Admin UI for tenants to customize:
- Color picker for primary/secondary colors
- Logo upload (validate dimensions, file size)
- Custom CSS editor (with validation, sandboxing)
- Live preview before applying

**8. Performance**:

**Cache themes** in Redis (1hr TTL). **Preload** tenant theme on login. **Critical CSS** inlined for first paint. **Service Worker** caches theme assets.

**9. Security**:

**Sanitize custom CSS** (remove `<script>`, `javascript:`, `@import`). **CSP headers** prevent XSS. **Rate limit** theme API to prevent abuse.

**Trade-offs**:

Custom CSS powerful but risky—allow only for enterprise tier with review process. CSS variables fast but limited IE support (provide fallback).

**Real-World**: Shopify supports 2M+ custom storefronts. Salesforce allows org-wide theme customization. WordPress powers millions of themed sites."

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Multi-Tenancy**: Single codebase serves 1000s of branded clients (cost efficiency)
- **White-Label**: Enable resellers to rebrand (expand market reach)
- **Personalization**: User-selected themes improve satisfaction
- **Accessibility**: Dark mode, high contrast themes (compliance)

### How It Works (Technical Summary)

**1. Storage**: Themes in database/KV store, keyed by tenant ID
**2. Detection**: Identify tenant from domain/subdomain/path
**3. Loading**: Fetch theme config, cache in memory/Redis
**4. Application**: Inject CSS variables, swap assets
**5. Components**: Reference theme tokens (`var(--color-primary)`)
**6. Features**: Conditionally render based on tenant tier
**7. Caching**: Cache themes (1hr TTL), Service Worker for assets

**FAANG-Level**: Support 1000+ tenants, < 100ms theme switching, zero layout shift, security-reviewed custom CSS, real-time theme preview
