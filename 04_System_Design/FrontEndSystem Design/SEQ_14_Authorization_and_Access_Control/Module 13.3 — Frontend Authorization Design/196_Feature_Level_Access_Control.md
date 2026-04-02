# 196 – Feature-Level Access Control

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Feature-level access control means showing or hiding individual UI features — buttons, tabs, form fields, menu items — based on a user's permissions, plan tier, or role. Unlike route guards (which protect entire pages), feature-level control is granular: the same page renders differently for a viewer vs an editor vs an admin. The implementation uses permission directives in Angular (`*appHasPermission`), conditional rendering in React (`ability.can()`), or feature flags combined with permissions. The key engineering challenge is **consistency**: every conditional must be driven by a single source of truth (an ability/permission service), not scattered `if (role === 'admin')` checks.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Decision Spectrum

```
Route Guard       Feature Gate         Field-Level Control
(page access)    (button/tab visible)  (form field editable)
    |                   |                      |
CanActivate      *appHasPermission      ability.can('update')
                 LaunchDarkly flag      [readonly] binding
```

### Pattern 1: Permission Directive (Angular)

```typescript
@Directive({ selector: '[appCan]' })
export class CanDirective implements OnInit {
  @Input('appCan') permission!: string;
  constructor(private tpl: TemplateRef<any>, private vcr: ViewContainerRef,
              private auth: AuthService) {}
  ngOnInit() {
    this.auth.hasPermission(this.permission)
      ? this.vcr.createEmbeddedView(this.tpl)
      : this.vcr.clear();
  }
}
// Usage: <button *appCan="'invoice:approve'">Approve</button>
```

### Pattern 2: Ability Hook (React)

```tsx
const { can } = useAbility(AbilityContext);
return (
  <div>
    {can('read', 'Invoice') && <InvoiceList />}
    {can('approve', 'Invoice') && <ApproveButton />}
    {can('delete', 'Invoice') && <DeleteButton />}
  </div>
);
```

### Pattern 3: Feature Flags + Permissions (LaunchDarkly model)

Feature flags control *feature availability* (A/B, gradual rollout), while permissions control *who can use it*. The correct pattern combines both:

```typescript
const canUseFeature = featureFlags.isEnabled('new-approval-workflow')
                   && ability.can('approve', 'Invoice');
```

### Granularity Levels

| Level | Example | Pattern |
|---|---|---|
| Page | `/admin` visible | Route guard |
| Section | "Finance" tab | `*ngIf="canViewFinance"` |
| Button | "Approve" button | `*appCan="'invoice:approve'"` |
| Field | Salary field editable | `[disabled]="!canEdit"` |
| Data | Credit card masked | Backend field-stripping |

### Anti-Patterns

- ❌ `if (user.role === 'admin')` scattered through templates — impossible to maintain
- ❌ CSS `display:none` to hide sensitive elements (visible in DevTools DOM)
- ❌ Checking permissions with a network call inside `*ngIf` (causes flickering)
- ❌ Feature control without backend enforcement (UI bypass = data exposure)

### Disable vs Hide

- **Hide**: Remove from DOM (`*ngIf`, not `[hidden]`) — prevents tab-navigation access
- **Disable**: Show but non-interactive — better UX for "upgrade to access" scenarios
- Best practice: when permission is permanently denied → hide; when it's a plan/tier gate → disable + tooltip

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Salesforce Platform

Salesforce's entire UI adapts per permission set. A Sales Rep sees the Account page without the "Edit Credit Limit" field — it's not disabled, it's simply absent from the rendered DOM. This is enforced by the metadata-driven UI framework that consults Salesforce permission sets at render time. The backend (SOQL) additionally enforces FLS (Field-Level Security), so even a direct API call returns null for that field.

### Hruday @ SAP Labs — SAP Fiori Analytical Apps

At SAP, I built a permission directive (`*fioriCan`) that integrated with XSUAA JWT authorities. Template expressions like `*fioriCan="'FinanceModule:approve'"` removed Approve buttons from the DOM for non-finance roles. The directive read from a pre-loaded `AuthoritySet` in a singleton service, so zero network calls at render time. This consistent approach replaced ~200 scattered `*ngIf="user.role === '...'"` checks across 40 components.

### Hruday @ Oracle — Angular ERP Dashboard

At Oracle, complex form fields (like GL account mappings) were conditionally rendered based on `user.authorities`. Senior consultants saw configuration panels that junior users didn't. We additionally used `[readonly]` bindings for fields where the user could *see* but not *edit* values — important for audit review scenarios where the data visibility was required but changes were restricted.

### Scaling context:

At 1M users, the same feature-gating logic serves everyone via a single `AbilityService`. Permission policies are evaluated client-side from the JWT payload. For dynamic, real-time permission changes, a WebSocket subscription re-evaluated the ability on permission-change events without requiring a page reload.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Feature-level access control is about making the UI accurately reflect what a user can do — not just what pages they can visit. I differentiate between route guards (page access) and feature gates (element visibility). In Angular, I implement a structural directive `*appCan` that integrates with an AuthService holding a pre-loaded permission set from the JWT. This replaces scattered role checks throughout templates with a single, consistent API.*

*At SAP, I replaced over 200 scattered `*ngIf` role checks with a unified `*fioriCan` directive. This single change made permission auditing trivial — you could grep for `*fioriCan` to find every permission-gated element. I always pair UI feature gates with backend enforcement: the button hiding is UX, the API rejection is security. I also distinguish hide vs disable — permanently unavailable features are hidden; plan-upgrade scenarios show a disabled element with an upgrade tooltip."*

### Follow-up Questions

1. **"What's the difference between `*ngIf` and `[hidden]` for feature gating?"** — `*ngIf` removes from DOM (secure, inaccessible via keyboard nav). `[hidden]` keeps in DOM (visible via DevTools, keyboard scannable).
2. **"How do you avoid flickering when permissions load async?"** — Pre-load permissions at app bootstrap before routing. Use `APP_INITIALIZER` (Angular) or a suspense boundary (React) to block rendering until permissions are ready.
3. **"How do you combine feature flags with permissions?"** — Feature flags control availability (LaunchDarkly/FF); permissions control authorization. Check both: `flag.enabled('feature') && ability.can('action', 'Subject')`.
4. **"How do you test feature-level access control?"** — Component-level unit tests with mocked AbilityService returning `can = true/false`. Verify DOM presence/absence. E2E tests login as different roles and assert element visibility.
5. **"What's the CSP implication of hiding elements?"** — None from CSP. The real concern is DOM visibility in DevTools. Sensitive data should never reach the DOM for unauthorized users — enforce backend field-stripping.

### Comparison Table

| Approach | Pros | Cons |
|---|---|---|
| Structural directive (`*appCan`) | Reusable, consistent, auditable | Requires directive setup |
| Inline `ability.can()` | Simple, no ceremony | Logic scattered in templates |
| Feature flags (LaunchDarkly) | A/B, gradual rollout | Cost, no fine-grained RBAC |
| CSS hide | Simple | Security risk — DOM exposed |

### Trade-offs

- Directive approach adds an abstraction layer; worth it at scale (>50 gated elements)
- `APP_INITIALIZER` delays app start but prevents permission flicker — good trade
- Feature flags add operational cost (flag service dependency) but enable canary releases

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Angular — CanDirective (structural — removes from DOM)
@Directive({
  selector: '[appCan]',
  standalone: true
})
export class CanDirective implements OnInit, OnDestroy {
  @Input('appCan') permission!: string;
  private sub?: Subscription;

  constructor(
    private tpl: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Re-evaluate when permissions change mid-session
    this.sub = this.auth.permissions$.subscribe(permissions => {
      this.vcr.clear();
      if (permissions.has(this.permission)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}

// HTML usage — clean, auditable
// <button *appCan="'invoice:approve'" (click)="approve()">Approve</button>
// <section *appCan="'finance:view'">...</section>

// React — CanGuard component
export const Can: React.FC<{
  action: string;
  subject: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ action, subject, children, fallback = null }) => {
  const ability = useAbility(AbilityContext);
  return ability.can(action as any, subject as any)
    ? <>{children}</>
    : <>{fallback}</>;
};

// Usage:
<Can action="approve" subject="Invoice">
  <ApproveButton />
</Can>

<Can action="edit" subject="Invoice" fallback={
  <Tooltip content="Upgrade to Pro to edit">
    <Button disabled>Edit</Button>
  </Tooltip>
}>
  <EditButton />
</Can>

// AuthService — pre-loaded, synchronous
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _permissions$ = new BehaviorSubject<Set<string>>(new Set());
  readonly permissions$ = this._permissions$.asObservable();

  loadFromToken(jwt: string): void {
    const claims = this.decodeJwt(jwt);
    this._permissions$.next(new Set(claims.permissions ?? []));
  }

  hasPermission(permission: string): boolean {
    return this._permissions$.value.has(permission)
        || this._permissions$.value.has('*');
  }
}
```

**Why this structure:**
- `BehaviorSubject` enables reactive re-evaluation when permissions change
- Directive uses `OnDestroy` to prevent memory leaks
- `fallback` prop in React `<Can>` handles upgrade/plan-gate UX cleanly
- Backend enforcement is always separate — frontend is UX only

**Interviewer focus:** Structural directive vs `[hidden]`, `APP_INITIALIZER` pattern, reactive permission updates

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Feature gates are DOM surgery, not CSS bandages."** `*ngIf` removes the element entirely (safe); `[hidden]` just hides it (DevTools visible). Angular uses structural directives (`*appCan`) for reuse; React uses `<Can>` wrapper components. Both read from a single **pre-loaded permission set** — never network calls inside render. Combine with feature flags for A/B and plan gating. Always ask: "Would I be comfortable if a user opened DevTools and saw this HTML?" If no → feature gate + backend enforcement.

*If you go blank*: "Feature-level access control = conditional rendering driven by a centralized permission service. Angular structural directive or React `<Can>` wrapper. Remove from DOM, not just hide."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
- Scattered `role === 'admin'` checks become unmaintainable at scale — a centralized directive/component makes every permission-gated element auditable via a single grep
- DOM security: `display:none` exposes sensitive UI structure to all users via DevTools; `*ngIf` removal is the correct approach
- UX correctness: showing a user buttons they can't use (forbidden result) is a worse experience than cleanly hiding them

**How it works:**
The auth service pre-loads the user's permission set from their JWT at login, storing it in a reactive store. Angular structural directives or React `<Can>` components subscribe to this store and conditionally create or clear DOM elements. When permissions change mid-session (role change, re-login), the reactive subscription automatically re-renders all gated elements.

**Company-specific relevance:**
- **Microsoft**: Office 365's adaptive toolbar (shows/hides edit controls by license tier) is a production example of feature-level access at scale
- **Adobe**: Creative Cloud shows "Upgrade" state for premium features (disabled + tooltip) — the disable-vs-hide distinction is critical for monetization UX
- **Salesforce**: Field-Level Security (FLS) removes fields from UI and API response — feature gating is baked into the Salesforce platform metadata model
- **Cisco**: Network device management UI hides configure/write operations from read-only operators using directive-based gating
