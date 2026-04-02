# 340 – Conventional Commits & Semantic Versioning

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Conventional Commits**: standardized commit message format (`type(scope): description`) that enables automated changelogs and versioning. **Semantic Versioning** (semver): MAJOR.MINOR.PATCH — breaking.feature.fix. Together they automate release workflows.

## 2. 🔬 DEEP-DIVE EXPLANATION

### Conventional Commits Format
```
<type>(<scope>): <description>

[optional body]

[optional footer: BREAKING CHANGE: ...]
```

| Type | Meaning | Version Bump |
|---|---|---|
| **feat** | New feature | MINOR (1.x.0) |
| **fix** | Bug fix | PATCH (1.0.x) |
| **docs** | Documentation only | None |
| **style** | Formatting, whitespace | None |
| **refactor** | Code change, no feature/fix | None |
| **perf** | Performance improvement | PATCH |
| **test** | Adding/fixing tests | None |
| **chore** | Build, CI, deps | None |
| **ci** | CI config changes | None |
| **BREAKING CHANGE** | In footer | MAJOR (x.0.0) |

```bash
# Examples
feat(cart): add quantity selector to cart items
fix(auth): handle expired refresh tokens gracefully
perf(images): lazy load below-fold images
refactor(api): extract fetch logic into useApi hook

feat(checkout)!: redesign payment flow
BREAKING CHANGE: PaymentForm props interface changed
```

### Semantic Versioning
```
v2.4.1
 │ │ └── PATCH: backwards-compatible bug fix
 │ └──── MINOR: backwards-compatible new feature  
 └────── MAJOR: breaking change
```

### Automation Tools
```json
// package.json — semantic-release
{
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/npm",
      "@semantic-release/github"
    ]
  }
}
// Reads commits → determines version bump → generates changelog → publishes
```

```json
// commitlint.config.js — enforce format
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci']],
    'subject-max-length': [2, 'always', 72],
  },
};
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Conventional commits give structure to git history: feat for features, fix for bugs, with scope for context. Combined with semantic-release, this automates version bumps, changelogs, and npm publishing. I enforce it with commitlint + Husky pre-commit hooks."*

## 4. 🧠 MEMORY AID
**"type(scope): description. feat → MINOR, fix → PATCH, BREAKING CHANGE → MAJOR. semantic-release automates everything."**

## 5. 🎯 KEY INSIGHT
Conventional commits transform your git log from noise into a searchable, automated release pipeline.
