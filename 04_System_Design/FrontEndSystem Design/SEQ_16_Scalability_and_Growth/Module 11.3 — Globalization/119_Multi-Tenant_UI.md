# 119. Multi-Tenant UI

## 1. High-Level Explanation (Frontend Interview Level)

**Multi-Tenant UI** is an architectural pattern where a single application instance serves multiple independent customers (tenants), each with isolated data, customizations, and sometimes features, while sharing the same codebase and infrastructure.

- **What**: Single application serving multiple customers with data isolation, tenant-specific customization, conditional features, and shared infrastructure
- **Why**: Cost efficiency (single deployment vs N deployments), faster updates (deploy once, all tenants updated), economies of scale, simplified maintenance
- **When**: Essential for B2B SaaS platforms, enterprise software, white-label products, marketplace applications
- **Role**: Fundamental architecture decision affecting data modeling, routing, authentication, authorization, customization, and deployment

**Key Principle**: "Shared infrastructure, isolated experiences"—tenants share code but never see each other's data or affect each other's performance.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Multi-Tenancy Models

**1. Single Database, Shared Schema**
```sql
-- All tenants share same tables, rows tagged with tenant_id
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL, -- Partition key
  email VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP,
  INDEX idx_tenant (tenant_id)
);

-- Row-Level Security (Postgres)
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::text);
```

**Pros**: Simple, cost-effective, easy schema changes  
**Cons**: Risk of data leakage, noisy neighbor problem, harder compliance  
**Best For**: Small-medium tenants, cost-sensitive applications

**2. Single Database, Schema Per Tenant**
```sql
-- Each tenant gets own schema
CREATE SCHEMA tenant_acme;
CREATE TABLE tenant_acme.users (...);

CREATE SCHEMA tenant_globex;
CREATE TABLE tenant_globex.users (...);

-- Query with schema prefix
SELECT * FROM tenant_acme.users WHERE email = 'user@acme.com';
```

**Pros**: Better isolation, easier backups per tenant  
**Cons**: Schema changes require N updates, connection pooling complex  
**Best For**: Medium enterprises with compliance needs

**3. Database Per Tenant**
```javascript
const tenantDatabases = {
  'acme-corp': 'postgres://db1.example.com/acme',
  'globex': 'postgres://db2.example.com/globex'
};

function getDatabaseConnection(tenantId) {
  return new Pool({ connectionString: tenantDatabases[tenantId] });
}
```

**Pros**: Complete isolation, independent scaling, easy to move  
**Cons**: Expensive, complex management, slow schema changes  
**Best For**: Large enterprises, regulated industries

### Frontend Tenant Detection

**1. Domain-Based Detection**
```javascript
// Custom domains: portal.acme.com, app.globex.com
function detectTenantFromDomain() {
  const hostname = window.location.hostname;
  
  // Check domain mapping (Redis/database)
  const tenant = await fetch('/api/tenant/resolve', {
    method: 'POST',
    body: JSON.stringify({ domain: hostname })
  }).then(r => r.json());
  
  return tenant.id;
}

// Domain mapping stored in database
const domainMapping = {
  'portal.acme.com': 'acme-corp',
  'app.globex.com': 'globex'
};
```

**2. Subdomain-Based Detection**
```javascript
// Subdomain: acme.example.com, globex.example.com
function getTenantFromSubdomain() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  if (parts.length >= 3) {
    return parts[0]; // First part is tenant
  }
  
  return 'default';
}

// Routing in Next.js middleware
export function middleware(request) {
  const hostname = request.nextUrl.hostname;
  const tenant = hostname.split('.')[0];
  
  // Rewrite to tenant-specific pages
  request.nextUrl.pathname = `/${tenant}${request.nextUrl.pathname}`;
  return NextResponse.rewrite(request.nextUrl);
}
```

**3. Path-Based Detection**
```javascript
// Path: example.com/acme/dashboard, example.com/globex/dashboard
function getTenantFromPath() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  
  return parts[0]; // First path segment
}

// React Router
<BrowserRouter>
  <Routes>
    <Route path="/:tenantId/*" element={<TenantApp />} />
  </Routes>
</BrowserRouter>
```

### Tenant Context Management

**React Context Pattern**:
```typescript
// TenantContext.tsx
interface Tenant {
  id: string;
  name: string;
  logo: string;
  theme: ThemeConfig;
  features: Record<string, boolean>;
  settings: Record<string, any>;
}

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    detectAndLoadTenant().then(t => {
      setTenant(t);
      setLoading(false);
    });
  }, []);
  
  if (loading) return <Loading />;
  if (!tenant) return <TenantNotFound />;
  
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}

// Usage in component
function Dashboard() {
  const tenant = useTenant();
  
  return (
    <div>
      <h1>Welcome to {tenant.name}</h1>
      {tenant.features.advancedDashboard && <AdvancedMetrics />}
    </div>
  );
}
```

### Data Isolation Strategies

**1. Client-Side Filtering (Insecure)**
```javascript
// ❌ NEVER DO THIS - Client can bypass filter
const users = await fetch('/api/users').then(r => r.json());
const tenantUsers = users.filter(u => u.tenantId === currentTenant);
```

**2. Server-Side Filtering (Secure)**
```javascript
// ✅ Server enforces isolation
app.use((req, res, next) => {
  // Extract tenant from JWT, session, or domain
  req.tenantId = extractTenantId(req);
  next();
});

app.get('/api/users', async (req, res) => {
  // Query automatically scoped to tenant
  const users = await db.query(
    'SELECT * FROM users WHERE tenant_id = $1',
    [req.tenantId]
  );
  
  res.json(users);
});
```

**3. Row-Level Security (Database-Enforced)**
```sql
-- Postgres RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::text);

-- Application sets tenant context
await db.query("SET app.current_tenant = $1", [tenantId]);

-- All queries automatically filtered
SELECT * FROM users; -- Only returns current tenant's rows
```

### Feature Flagging Per Tenant

**Tier-Based Features**:
```javascript
const tenantTiers = {
  'acme-corp': {
    tier: 'enterprise',
    features: {
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      sso: true,
      auditLogs: true,
      userLimit: null // Unlimited
    }
  },
  
  'startup-inc': {
    tier: 'pro',
    features: {
      advancedAnalytics: true,
      customReports: false,
      apiAccess: true,
      sso: false,
      auditLogs: false,
      userLimit: 25
    }
  }
};

// Component conditional rendering
function Dashboard() {
  const { features } = useTenant();
  
  return (
    <div>
      <StandardDashboard />
      
      {features.advancedAnalytics && (
        <AdvancedAnalytics />
      )}
      
      {features.customReports ? (
        <ReportBuilder />
      ) : (
        <UpgradePrompt feature="Custom Reports" />
      )}
    </div>
  );
}
```

### Performance Isolation

**1. Rate Limiting Per Tenant**
```javascript
const tenantRateLimits = new Map();

function rateLimitMiddleware(req, res, next) {
  const tenantId = req.tenantId;
  const key = `${tenantId}:${Date.now() / 60000 | 0}`; // Per minute
  
  const current = tenantRateLimits.get(key) || 0;
  
  // Limit based on tier
  const limit = getTenantLimit(tenantId);
  
  if (current >= limit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit,
      retryAfter: 60
    });
  }
  
  tenantRateLimits.set(key, current + 1);
  next();
}

function getTenantLimit(tenantId) {
  const tenant = getTenantConfig(tenantId);
  
  switch (tenant.tier) {
    case 'enterprise': return 10000; // 10K req/min
    case 'pro': return 1000;
    case 'basic': return 100;
    default: return 10;
  }
}
```

**2. Resource Quotas**
```javascript
// Storage quota per tenant
const tenantQuotas = {
  'acme-corp': { storage: 1000000000000 }, // 1TB
  'startup-inc': { storage: 10000000000 }  // 10GB
};

async function checkStorageQuota(tenantId, fileSize) {
  const usage = await getTenantStorageUsage(tenantId);
  const quota = tenantQuotas[tenantId].storage;
  
  if (usage + fileSize > quota) {
    throw new Error('Storage quota exceeded. Please upgrade.');
  }
}
```

### Tenant Onboarding Flow

```javascript
// Automated tenant provisioning
async function provisionTenant(config) {
  const tenantId = generateTenantId(config.companyName);
  
  // 1. Create database schema/database
  await createTenantDatabase(tenantId);
  
  // 2. Run migrations
  await runMigrations(tenantId);
  
  // 3. Seed initial data
  await seedTenantData(tenantId, {
    adminUser: config.adminEmail,
    companyName: config.companyName
  });
  
  // 4. Configure subdomain/domain
  await configureDomain(tenantId, config.subdomain);
  
  // 5. Set up billing
  await createStripeCustomer(tenantId, config);
  
  // 6. Send welcome email
  await sendWelcomeEmail(config.adminEmail, {
    tenantId,
    loginUrl: `https://${config.subdomain}.example.com`
  });
  
  return { tenantId, loginUrl };
}

// Usage
const tenant = await provisionTenant({
  companyName: 'Acme Corp',
  adminEmail: 'admin@acme.com',
  subdomain: 'acme',
  tier: 'pro'
});
```

### What NOT to Do

- ❌ **Client-side tenant filtering** (security risk)
- ❌ **Shared state between tenants** (data leakage)
- ❌ **No tenant validation** (URL manipulation attacks)
- ❌ **Tenant ID in URLs** (exposes tenant structure)
- ❌ **No resource isolation** (noisy neighbor problem)

---

## 3. Clear Real-World Examples

### Example 1: Slack Workspaces

**Architecture**:
```javascript
// Subdomain-based: acme.slack.com, globex.slack.com
const workspace = {
  id: 'T01234ABC',
  domain: 'acme',
  name: 'Acme Corp',
  
  // Workspace-specific settings
  settings: {
    messageRetention: 90, // days
    fileStorageLimit: 10000000000, // 10GB
    allowGuestAccess: true,
    ssoEnabled: true
  },
  
  // Per-workspace features
  features: {
    huddles: true,
    canvas: true,
    workflowBuilder: true
  }
};

// Data isolation: All messages, files scoped to workspace
SELECT * FROM messages WHERE workspace_id = 'T01234ABC';
```

**Scale**: 10M+ workspaces, each isolated.

### Example 2: Salesforce Orgs

**Multi-Tenant Database**:
```sql
-- 150,000+ orgs on shared infrastructure
-- Each org gets virtual database (logically isolated)

-- Metadata stored per org
SELECT * FROM custom_objects 
WHERE org_id = '00D1234567890ABC';

-- Row-level security
SELECT * FROM accounts 
WHERE org_id = current_org_id();
```

**Custom Objects**: Each org can create custom schema—stored as metadata, interpreted at runtime.

### Example 3: Shopify Stores

**Database Per Tenant** (Large Stores):
```javascript
// High-volume stores get dedicated databases
const storeDatabases = {
  'store-123': { 
    host: 'db-store-123.shopify.com',
    database: 'shop_123'
  }
};

// Small stores share databases (shard by store ID)
const shardedStores = {
  'store-456': { shard: 'shard-01', partition: 456 % 1000 }
};
```

**Scale**: 2M+ stores, tiered architecture based on size.

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you design a multi-tenant SaaS application?"

**Answer**:

"I'd architect a **hybrid multi-tenant system** balancing isolation with cost efficiency:

**1. Tenant Model**:

Use **single database, shared schema** for small-medium tenants (cost-effective), **database per tenant** for large enterprise clients (isolation, compliance).

All tables have `tenant_id`:
```sql
CREATE TABLE users (
  id SERIAL,
  tenant_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  INDEX (tenant_id)
);
```

**Row-Level Security** in Postgres enforces isolation:
```sql
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant'));
```

**2. Tenant Detection**:

**Subdomain-based**: `acme.example.com`, `globex.example.com`. Parse subdomain, resolve to tenant ID (cached in Redis).

**Custom domains**: Support `portal.acme.com` via domain mapping table. Check custom domain first, fallback to subdomain.

**3. Context Management**:

**React Context** provides tenant globally:
```jsx
<TenantProvider>
  <App />
</TenantProvider>

// Components access via hook
const tenant = useTenant();
```

Tenant loaded on app init, stored in context + localStorage for offline.

**4. Data Isolation**:

**Server-enforced**: Every API sets tenant context:
```javascript
app.use((req, res, next) => {
  req.tenantId = extractFromJWT(req.headers.authorization);
  db.query('SET app.current_tenant = $1', [req.tenantId]);
  next();
});
```

All queries automatically filtered by RLS.

**5. Feature Gating**:

Tenants have tier (basic/pro/enterprise):
```javascript
{
  tier: 'enterprise',
  features: {
    advancedAnalytics: true,
    apiAccess: true,
    sso: true
  }
}
```

Components conditionally render:
```jsx
{tenant.features.sso && <SSOSettings />}
```

**6. Performance Isolation**:

**Rate limiting** per tenant (prevent one tenant overwhelming system). **Resource quotas** (storage, API calls) based on tier. **Database connection pools** per tenant to prevent connection exhaustion.

**7. Tenant Provisioning**:

Automated flow: Company signs up → Create tenant record → Run migrations → Seed data → Configure domain → Activate billing. < 30 seconds end-to-end.

**8. Monitoring**:

Per-tenant metrics: error rate, response time, resource usage. Alert if single tenant causing issues (noisy neighbor).

**Trade-offs**:

Shared database cheaper but riskier (data leakage, noisy neighbor). Database per tenant safer but expensive (manage 1000s of databases). I'd use hybrid: shared by default, dedicated for enterprise tier.

**Real-World**: Salesforce uses multi-tenant database for 150K+ orgs. Slack uses subdomain-based workspaces. Shopify shards stores across databases based on size."

---

## 6. Why & How Summary

### Why It Matters

**Business**: Cost efficiency (single infrastructure), faster feature delivery (deploy once), easier maintenance  
**Technical**: Scalability (serve 10K+ tenants on same infra), isolation (tenants independent), customization (per-tenant config)

### How It Works

**1. Detect**: Subdomain/domain → Tenant ID  
**2. Load**: Fetch tenant config (theme, features, settings)  
**3. Context**: Provide tenant to all components  
**4. Isolate**: Server filters all queries by tenant_id  
**5. Customize**: Apply tenant-specific theme, features  
**6. Monitor**: Per-tenant metrics, quotas

**FAANG**: Support 10K+ tenants, < 50ms tenant switching, zero data leakage, automated provisioning, per-tenant monitoring
