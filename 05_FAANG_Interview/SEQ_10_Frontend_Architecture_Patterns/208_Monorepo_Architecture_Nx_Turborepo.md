# 208. Monorepo Architecture (Nx, Turborepo) ★
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"A monorepo is a single version-controlled repository that holds multiple related projects — multiple frontend apps, shared libraries, and backend services — all together. Tools like NX and Turborepo make this practical at scale by caching build outputs and running only what changed. At SAP, a monorepo approach would have solved our biggest pain: every team maintained separate package.json files with slightly different dependency versions, causing subtle bugs when modules were composed at runtime. A monorepo enforces one version of every dependency. Microsoft uses monorepos for Office, Adobe for Experience Cloud — it's the industry pattern for multi-team frontend at scale."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

**Polyrepo (alternative):**
Each app/library lives in its own git repository:
```
github.com/myorg/shell-app
github.com/myorg/products-lib
github.com/myorg/cart-app
github.com/myorg/design-system
```
Problem: Cross-repo changes require 4 pull requests, 4 reviews, coordinated releases.

**Monorepo:**
All apps and libraries in one repo:
```
github.com/myorg/frontend-monorepo
  /apps
    /shell
    /admin
  /libs
    /design-system
    /products-feature
    /cart-feature
    /shared-utils
```
One PR can change the design system AND update all apps that consume it.

### How It Works Internally

**NX (maintained by Nrwl):**
NX adds:
1. **Project graph:** Understands which projects depend on which
2. **Affected detection:** Only rebuilds/retests projects affected by a change
3. **Computation cache:** Caches build/test/lint outputs — if nothing changed, it reuses the cache
4. **Boundary enforcement:** ESLint rules that prevent invalid cross-project imports
5. **Code generation:** `nx generate @nx/react:library` scaffolds a new library with proper structure

**Turborepo (maintained by Vercel):**
Similar to NX but simpler, framework-agnostic, and focused entirely on task pipeline optimization.

**How the cache works:**
```
Developer changes libs/design-system/Button.tsx

NX computes:
  - What changed? → libs/design-system
  - What depends on design-system? → apps/shell, apps/admin, libs/products-feature

NX runs:
  ✅ SKIP: libs/shared-utils (not affected)
  ✅ SKIP: libs/cart-feature (not affected)
  🔄 TEST: libs/design-system (changed)
  🔄 TEST: apps/shell (depends on changed)
  🔄 TEST: apps/admin (depends on changed)

Without NX: ALL 6 projects would build/test → 12 min CI
With NX: Only 3 affected projects → 4 min CI
```

### Architecture & Component Boundaries

```
NX Monorepo Structure:

myorg/
├── apps/                     ← Deployable applications
│   ├── shell/                ← Main app (consumes libs)
│   └── admin/                ← Admin app
│
├── libs/                     ← Reusable libraries
│   ├── design-system/        ← @myorg/design-system
│   │   ├── src/
│   │   └── project.json      ← NX project config
│   ├── products-feature/     ← @myorg/products-feature
│   ├── cart-feature/         ← @myorg/cart-feature
│   └── shared-utils/         ← @myorg/shared-utils
│
├── tools/                    ← Custom NX generators, executors
├── nx.json                   ← NX config (cache, affected baseline)
├── workspace.json / project.json
└── package.json              ← ONE package.json for all projects
                              ← ONE node_modules
```

**Project tags for boundary enforcement:**
```json
// libs/products-feature/project.json
{
  "tags": ["scope:products", "type:feature"]
}

// libs/design-system/project.json
{
  "tags": ["scope:shared", "type:ui"]
}

// ESLint rule: scope:products can import scope:shared but not scope:cart
```

### Data Flow & State Flow

**How builds work in a monorepo:**

```
CI Pipeline (on PR):
  1. nx affected --target=lint     → lint only changed + affected
  2. nx affected --target=test     → test only changed + affected
  3. nx affected --target=build    → build only changed + affected
  4. Deploy only affected apps
  
Result: 3-minute CI for a component change
         vs 30-minute CI without NX (builds everything)
```

**Remote cache (NX Cloud / Turborepo Cloud):**
```
Developer A builds → NX uploads result to remote cache
Developer B (or CI) runs same build:
  → NX checks remote cache → hits! → downloads result
  → ZERO compute for Developer B
  → Sub-1-minute CI
```

### Performance Implications
- **CI speed:** NX/Turborepo affectedness analysis reduces CI time from O(N projects) to O(changed + dependencies)
- **Bundle deduplication:** One `node_modules` means every app/lib shares the same dependency versions — no duplicate lodash across projects
- **Local dev:** Hot reload in one app while other apps cache their builds

### Scalability Considerations
- **3 apps, 5 libs:** Monorepo simplifies coordination — one PR for cross-cutting changes
- **10 teams:** NX distributed execution — CI spreads work across multiple machines
- **Microsoft/Google scale:** Internal monorepo tooling (Bazel, Rush, NX Enterprise) — sub-minute CI for 10,000+ projects via aggressive caching and distributed builds

### Trade-offs
| Monorepo (NX) | Polyrepo | When to Choose Monorepo |
|---|---|---|
| Atomic cross-project changes | Independent team repos | Cross-project changes are frequent |
| One dependency version | Each repo pins its own | Dependency consistency is important |
| Shared CI/CD setup | Separate CI per repo | Teams share standards |
| Requires tooling (NX/Turbo) | No extra tooling | Team is large enough to need it |
| Harder new-developer setup | Simple clone and run | Value outweighs setup cost |

### ⚠️ Anti-Patterns & Pitfalls
- **Monorepo without boundary enforcement:** Teams import each other's private internals → implicit dependencies → hard to refactor
- **No cache configuration:** Running NX without setting up caching defeats the purpose — CI is just as slow as without NX
- **Publishing everything as a separate npm package:** If you're already in a monorepo, don't also publish internal libs to npm — defeats the point of co-location
- **One git blame for everything:** At extreme scale, monorepo makes it hard to see "what did my team change" — use CODEOWNERS and per-project tags to maintain team ownership visibility

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, my recommendation for the micro-frontend architecture would have been an NX monorepo. Instead, we had 3 separate repos with separate package.json files. When we discovered that Team B was on Angular 14 while Team C was on Angular 15, it caused subtle Module Federation version negotiation failures. A monorepo would have caught this immediately — one `package.json` means one Angular version.

**At FAANG scale:**
- **Microsoft:** Uses Rush (from the same team that created NX) and Yarn workspaces internally. Office, Teams, and Azure Portal share code in managed monorepos.
- **Adobe:** Experience Cloud monorepo — React Spectrum (design system), Experience Manager, CC Web all in one managed repository
- **Google:** The original monorepo — all of Google's code in one repository with Bazel build system. Billions of lines of code.
- **Salesforce:** Salesforce Platform monorepo — all LWC components, platform libraries, and tools co-located

**How it evolves with scale:**
- 3 apps: Use NX with defaults — significant CI speedup immediately
- 10 teams: Enable distributed caching (NX Cloud) — CI cache hits eliminate redundant builds
- FAANG scale: Distributed build execution (NX Agents) — CI work splits across 50 machines in parallel

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Monorepos solve the cross-project coordination problem in multi-team orgs. When my design system changes, a polyrepo setup requires updating the npm package version in 5 different repos, 5 PRs, 5 reviews, coordinated deploys. In an NX monorepo, one PR touches the design system and the apps that consume it — atomic, reviewable, and testable together. The tooling value of NX specifically is: if I change a Button component in the design system, NX knows exactly which apps and libraries depend on it and runs tests only for those — not for the 20 others. That alone reduced our hypothetical CI time by 60%. The discipline required: enforce boundaries with ESLint rules so teams don't accidentally couple through internal imports."

### Likely Follow-up Questions
1. "What is the difference between NX and Turborepo?" → Both cache and parallelize tasks. NX has a richer feature set (code gen, project graph UI, language plugins). Turborepo is simpler and framework-agnostic. NX is better for large teams; Turborepo for smaller setups.
2. "How does NX determine what is affected?" → Git diff + dependency graph. If file A changed and project B depends on A, B is affected.
3. "How do you prevent over-coupling in a monorepo?" → Tags + ESLint boundary rules. Tag each project with its scope and enforce which scopes can import from which.
4. "Monorepo vs polyrepo — when would you choose polyrepo?" → When teams need complete independence — different deployment pipelines, different technology stacks, different security boundaries.

### vs Alternatives
| NX Monorepo | Turborepo | Yarn/npm Workspaces |
|---|---|---|
| Full toolchain (gen, graph, cache) | Task pipeline focus only | Basic workspace linking |
| Angular/React/Node plugins | Framework agnostic | No build optimization |
| Best for large teams | Best for Vercel/Next.js teams | Good starting point |
| Most features | Lightest weight | No affected detection |

### How to Signal Senior Thinking
> "The value of a monorepo isn't just CI speed — it's enforced consistency. One package.json means one version of every dependency across all teams. That might feel constraining, but at the scale of 10 teams, version drift is what causes subtle runtime bugs. The constraint is the feature."

---

## 💻 5. Code Example

```bash
# Setting up an NX monorepo — key commands

# Create new NX monorepo
npx create-nx-workspace@latest myorg --preset=react

# Add a new React library
nx generate @nx/react:library products-feature --directory=libs/products --tags="scope:products,type:feature"

# Add a shared utility library
nx generate @nx/js:library shared-utils --directory=libs/shared --tags="scope:shared,type:util"

# Run affected tests (only projects touched by your changes)
nx affected --target=test --base=main --head=HEAD

# Visualize the dependency graph
nx graph

# Build all affected apps
nx affected --target=build
```

```json
// nx.json — core monorepo configuration
{
  "affected": {
    "defaultBase": "main"  // compare against main branch for affected detection
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "remoteCache": {
          "account": "myorg"  // NX Cloud for distributed cache
        }
      }
    }
  }
}
```

```json
// .eslintrc.json — boundary enforcement
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "allow": [],
      "depConstraints": [
        {
          "sourceTag": "type:app",
          "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"]
        },
        {
          "sourceTag": "type:feature",
          "onlyDependOnLibsWithTags": ["type:ui", "type:util"]
          // features CANNOT import other features directly
        },
        {
          "sourceTag": "scope:products",
          "onlyDependOnLibsWithTags": ["scope:products", "scope:shared"]
          // products team cannot import cart team's code
        }
      ]
    }]
  }
}
```

**Interview vs Production difference:**
In an interview, explaining affected detection + cache + boundary enforcement is enough. In production, set up NX Cloud for distributed remote caching, add pre-commit hooks to run affected lint, and configure CI to use NX Agents for distributed task execution on large changesets.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "One house, many rooms (apps and libs) — shared walls (dependencies) and common infrastructure (CI/CD) — with rules about which rooms can enter which"
**If you go blank:** "NX monorepo = one repo for all projects, but NX only runs what changed. That's the key — affected = fast."
**Mnemonic:** **CABS** — **C**ache build outputs, **A**ffected detection, **B**oundary enforcement, **S**ingle dependency version

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: No direct UX impact — improves developer velocity and reduces version mismatch bugs
→ Performance: CI build time drops from O(all projects) to O(affected projects) via smart caching
→ Business: Cross-team changes (design system updates, API changes) are atomic — one PR, one review, one deploy

**How it works (3 sentences):**
NX maintains a project dependency graph by analyzing imports across all projects. When a file changes, NX computes which projects are affected (directly or transitively) and only runs tests/builds for those. Build outputs are cached locally and/or remotely so unchanged projects complete instantly using cached results.

**Company relevance:**
- Microsoft: Rush (Microsoft's monorepo tool) is used for Office, Teams — expects senior engineers to understand monorepo trade-offs and tooling
- Adobe: React Spectrum and Experience Cloud use monorepo structure — NX/Lerna familiarity expected for design system contribution
- Salesforce: Salesforce DX (SFDX) projects in a monorepo — platform team expects monorepo knowledge
- Cisco: Webex platform teams use monorepos for shared component libraries — CI speed and boundary enforcement are key requirements

---
**✅ Topic 208/486 complete → continuing to Topic 209: Plugin Architecture in Frontend**
