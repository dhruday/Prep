# 45. Monorepo Architecture (Nx, Turborepo) ★

## 1. High-Level Explanation (Frontend Interview Level)

A **Monorepo** is a single version-controlled repository that contains the source code for multiple projects, applications, and shared libraries, as opposed to a **polyrepo** where each project has its own repository. In frontend engineering, monorepos are the dominant architecture at scale — used by Google, Meta, Microsoft, and most FAANG teams — because they solve the hardest long-term problems in multi-team codebases: **shared code versioning, cross-project refactoring, consistent tooling, and atomic commits across boundaries**. The two dominant build orchestration tools for JavaScript monorepos are **Nx** (comprehensive, with a plugin ecosystem and project graph) and **Turborepo** (lightweight, focused purely on caching and task pipelines). The distinction from a **monolith** is critical: a monorepo contains multiple independently deployable units; a monolith is a single deployable unit. You can have a monolith in a monorepo.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Core Monorepo Concepts

```
Monorepo Structure (Nx example):
apps/
  web-app/         → Deployed React SPA
  admin-portal/    → Separate React app, deployed independently
  mobile/          → React Native app
libs/
  ui/              → Shared component library (Atomic Design atoms/molecules)
  utils/           → Shared utility functions
  auth/            → Shared authentication logic
  data-access/     → API clients, React Query hooks
  feature-orders/  → Feature-specific library (organisms + pages for Orders)
  feature-billing/ → Feature-specific library (organisms + pages for Billing)

Key rules:
- apps/ contain ONLY wiring: routing, env config, app shell
- libs/ contain ALL reusable code
- apps import from libs; libs never import from apps
```

### Dependency Graph — The Core Value Proposition

The monorepo build tool maintains a **dependency graph** across all packages. When you change a single file, the tool knows exactly which apps and libraries are affected and runs tests/builds ONLY for those:

```
Dependency Graph (who imports whom):
  web-app ─────────────────────────────┐
  admin-portal ────────────→ feature-orders ──→ ui ──→ (no deps)
                           └──────────→ data-access ──→ utils
  
Change in `libs/ui/Button.tsx`:
  Affected: ui, feature-orders (imports Button), web-app, admin-portal
  NOT affected: mobile (doesn't import ui), utils, auth
  
Result: Only 4 of 8 packages need rebuild/retest → 50% CI time saved
```

### Nx vs Turborepo — Decision Framework

| Dimension | Nx | Turborepo |
|---|---|---|
| **Philosophy** | Full-stack monorepo platform (plugins, generators, executors) | Focused build pipeline cache layer |
| **Project graph** | Rich graph with visualisation, affected analysis | Task dependency graph for caching only |
| **Generators/Scaffolding** | Yes — `nx generate @nx/react:component` creates properly configured components | No built-in generators |
| **Remote caching** | Nx Cloud (paid, or self-hosted) | Vercel Remote Cache (paid) |
| **Plugin ecosystem** | Large: `@nx/react`, `@nx/angular`, `@nx/node`, `@nx/next`, `@nx/storybook` | Minimal — Turbo orchestrates, tools (Vite, tsc, Jest) provide the actual functionality |
| **Learning curve** | Higher — nx.json, project.json, executors, generators | Lower — turbo.json is simple config |
| **Best for** | Large enterprise monorepos with many apps and a platform team | Small-to-medium monorepos; Vercel deployments; teams that want minimal tooling overhead |
| **Migration cost** | High — nx executors wrap your build tools | Low — Turbo just calls your existing npm scripts |

### Build Caching — The Most Important Feature

Both tools implement **computation caching**: if the inputs to a task haven't changed (source files, env vars, task config), the output is served from cache rather than recomputed.

```json
// turbo.json — pipeline definition
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],     // ^ = build all deps before building this
      "outputs": [".next/**", "dist/**"],  // what to cache
      "env": ["NODE_ENV", "API_URL"]       // env vars that bust the cache
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"]
    },
    "lint": {
      "outputs": []  // lint has no output artifacts — just pass/fail
    }
  }
}
```

```
Full pipeline execution (1st run, no cache):
  Time: 12 min (build 3 apps + 8 libs in parallel where deps allow)

Same pipeline (2nd run, only Button.tsx changed):
  Changed: ui → feature-orders → web-app, admin-portal
  Remote cache HIT for: mobile, utils, auth, data-access, feature-billing
  Time: 3.2 min → 73% reduction
```

### Enforced Module Boundaries (Nx)

Nx's `@nx/enforce-module-boundaries` ESLint rule prevents illegal imports in the dependency graph:

```json
// nx module boundary rules in .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "allow": [],
      "depConstraints": [
        {
          "sourceTag": "scope:app",
          "onlyDependOnLibsWithTags": ["scope:lib", "scope:shared"]
        },
        {
          "sourceTag": "type:ui",     // Atomic Design primitives
          "onlyDependOnLibsWithTags": ["type:util"]  // Cannot import feature libs
        },
        {
          "sourceTag": "type:feature",
          "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"]
        }
      ]
    }]
  }
}
```

This enforces the Atomic Design ownership model at the code level — UI primitive libraries cannot accidentally import feature libraries, creating circular dependencies.

### Performance Implications

| Strategy | Impact |
|---|---|
| Remote caching | 60–90% CI time reduction for unchanged packages |
| Affected analysis (`nx affected --base=main`) | Runs tests only for changed packages and their dependents |
| Parallel task execution | Build all independent packages simultaneously |
| Distributed task execution | Nx Enterprise / Turborepo distributed cache across many CI agents |
| Incremental TypeScript builds | `tsc --incremental` — only re-type-checks changed files and dependents |

### Trade-offs

**Monorepo advantages:**
- Atomic commits across package boundaries (change shared lib + all consuming apps in one commit)
- Single version of every dependency (no version drift between packages)
- Easy cross-team code sharing without npm publish cycle
- Unified CI pipeline with caching
- Consistent lint, test, and build tooling

**Monorepo disadvantages:**
- Repository size — git operations slow as history grows; tooling like `git sparse-checkout` becomes necessary at Google/Meta scale
- CI setup complexity — requires a competent platform/devops team to maintain the caching pipeline
- Increased build tool complexity — Nx in particular has a steep learning curve
- Teams must coordinate on tooling changes (updating Nx/Turbo version affects all teams)
- "Noisy" pull requests — changes to a shared utility create large-surface-area PR reviews

### Anti-Patterns & Pitfalls

1. **Putting business logic in apps/** — apps should only wire up routing and providers; all logic belongs in libs/; common in early monorepos that weren't properly planned
2. **Not tagging libraries** — without Nx tags, module boundary rules can't be enforced and circular dependency silently accumulates
3. **One giant lib/shared** — creates a highly-coupled library that forces rebuilds of everything; break into focused libs (ui/, utils/, auth/, etc.)
4. **Including deployable artifacts in the repo** — dist/ and build/ folders committed to the monorepo defeat caching and balloon git history
5. **Nx/Turbo cold cache in CI** — if remote caching isn't configured, CI always runs all tasks; remote caching is mandatory for monorepo CI to be fast

---

## 3. Real-World Examples

**At Hruday's level (SAP):**
SAP uses a Nx-style monorepo for the SAP UI5 Web Components and SAP Fiori components ecosystem. Shared component libraries are in libs/, with multiple app shells (Launchpad, BTP Cockpit, Analytics Studio) consuming them. Enforced module boundaries via ESLint ensure that no app-specific logic leaks into the shared UI primitives. At the SAP BI Launchpad micro-frontend shell, the Turborepo approach would be equivalent to how each MFE exposes its own build artifacts while consuming shared libraries from the central workspace — same caching principle, different physical topology.

**FAANG Scale:**
- **Meta (Facebook):** Entire frontend codebase in one monorepo; uses custom Buck2 build system with the same affected analysis + caching principles
- **Google:** Blaze/Bazel monorepo; same paradigm at enormous scale — billions of lines in one repo
- **Microsoft:** Rushstack (Rush) monorepo tooling; used across Office, Teams, Azure Portal; Haste module system in React Native
- **Vercel:** Full Turborepo users internally (they built it); recommended stack for Next.js multi-app monorepos deployed on Vercel

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "A monorepo is a single git repository containing multiple apps and shared libraries. The core value isn't just code sharing — it's atomic commits (a change to a shared library and all its consumers lands in one commit), consistent tooling, and build caching. With Nx or Turborepo, the build system maintains a dependency graph of all packages. When I change one file, it knows exactly which apps and libraries are affected and only rebuilds those — in large monorepos this reduces CI time by 60–90%. Nx is the heavier, more opinionated option with generators, executors, and a rich plugin ecosystem; I'd choose Nx for an enterprise-scale monorepo with 10+ apps and a dedicated platform team. Turborepo is minimal — it just adds caching and task pipelines on top of your existing npm scripts; I'd choose it for smaller setups or when the team doesn't want the Nx learning curve. The two most important architectural rules are: apps/ should only contain wiring (routing, env, providers), and library dependencies must flow in one direction enforced by module boundary rules to prevent circular dependencies."

**Likely Follow-up Questions:**
1. How does Nx remote caching work? → Hashes all inputs (source files + env vars + task config) → if hash matches a cached artifact on Nx Cloud, downloads it instead of rebuilding → deterministic hash ensures correctness
2. When would you NOT use a monorepo? → When teams are fully independent with no shared code, when the repo is starting small and monorepo tooling overhead isn't justified, when different repos need different security/access controls (e.g., open-source alongside proprietary code)
3. How do you handle a library that needs a breaking change when 10 apps depend on it? → Atomic commit updating the library AND all 10 consumers in one PR; the monorepo enables this safely; contrast with polyrepo where you'd publish a new major version and chase down 10 separate repos
4. How does Turborepo/Nx work with Docker / containerised builds? → Use `--filter` to build only specific apps into their own Docker images; Turbo's caching still works at the layer level; Nx provides custom Docker support

**Comparison With Alternatives:**
- **Polyrepo**: Each project in its own repo; simpler per-repo but requires npm publish for sharing, version drift accumulates, cross-repo refactoring is painful
- **Git submodules**: Shared code in a submodule; fragile (detached HEAD issues, manual sync), not scalable
- **npm workspaces (no build orchestration)**: Good for small setups; loses caching and affected analysis which are the main performance benefits at scale

---

## 5. Code Example

```typescript
// nx.json — workspace config (Nx monorepo)
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "affected": {
    "defaultBase": "main"        // compare against main branch for affected analysis
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "remoteCache": {
          "enabled": true,
          "url": "https://api.nx.app",  // Nx Cloud remote cache
          "accessToken": "$NX_CLOUD_ACCESS_TOKEN"
        }
      }
    }
  },
  "defaultProject": "web-app"
}

// project.json (per-library config)
{
  "name": "ui",
  "projectType": "library",
  "tags": ["type:ui", "scope:shared"],    // used by module boundary rules
  "targets": {
    "build": {
      "executor": "@nx/vite:build",
      "options": {
        "configFile": "libs/ui/vite.config.ts",
        "outputPath": "dist/libs/ui"
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": { "config": "libs/ui/vite.config.ts" }
    }
  }
}

// CI: only test/build affected packages
// nx affected --target=build --base=main --head=HEAD
// nx affected --target=test --base=main --head=HEAD --parallel=3
```

---

## 6. Memory Aid

**Mental Model:** A monorepo is like a **campus** — multiple buildings (apps) sharing common utilities (electricity, plumbing, security), all managed by one campus operations team. Each building deploys independently but benefits from shared infrastructure. The build tool is the campus map that knows the pipe network — change one pipe, and it knows exactly which buildings need inspection.

**Key sentence if you go blank:** "Monorepo = one repo, many deployable apps, shared libs, and a build tool that caches outputs and only rebuilds what changed."

**Nx vs Turbo:** Nx = full monorepo platform (generators + executors + graph UI). Turbo = thin caching layer over existing scripts. Choose Nx when you need scaffolding and enforcement; Turbo when you want minimal overhead.

---

## 7. Why & How Summary

**Why it matters:**
→ UX: Faster iteration cycles; shared UI changes propagate to all apps in one commit, eliminating version drift that causes visual inconsistency
→ Performance (CI): 60–90% CI time reduction via affected analysis + remote caching → faster PR cycle → faster product delivery
→ Architecture: Module boundary enforcement prevents the accidental dependency entanglement that makes large codebases unmaintainable

**How it works (3 sentences):**
A Monorepo tool (Nx or Turborepo) builds a dependency graph of all packages in the repository; when code changes, it performs affected analysis to identify only the packages that import (directly or transitively) the changed package, then runs tasks only for those affected packages. Task outputs are hashed and cached locally and remotely, so unchanged packages fetch their artifacts from cache rather than rebuilding, reducing CI time dramatically. Deployment remains per-app (each app in apps/ builds and deploys independently), preserving the operational benefits of independent services while enabling the developer-experience benefits of shared code and atomic cross-boundary changes.

**Company relevance:**
- Microsoft: Azure Portal, Teams, Office Online — all large-scale monorepos using Rush or Nx; senior engineers are expected to understand monorepo build systems
- Adobe: Experience Cloud (AEM, Analytics, Target, Campaign) — shared component libraries across many apps; monorepo + Nx architecture or equivalent
- Salesforce: Experience Cloud and Commerce Cloud frontends — monorepo with shared LWC (Lightning Web Components) libraries across product teams
- Cisco: Webex suite — multiple web apps (calling, messaging, meetings) sharing UI and business logic libraries; monorepo architecture is the standard at this scale
