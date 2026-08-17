# 339 – PR Strategy – Size, Review Checklists, Branch Protection

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Good PR practices: keep PRs small (< 400 lines), use review checklists, enforce branch protection rules (required reviews, CI passing, no force-push). Small PRs get reviewed faster, have fewer bugs, and merge sooner.

## 2. 🔬 DEEP-DIVE EXPLANATION

### PR Size Guidelines
| Size | Lines Changed | Review Time | Bug Risk |
|---|---|---|---|
| **XS** | < 50 | 5 min | Very low |
| **S** | 50-200 | 15 min | Low |
| **M** | 200-400 | 30 min | Medium |
| **L** | 400-1000 | 60+ min | High |
| **XL** | 1000+ | Often rubber-stamped | Very high |

### Review Checklist
```markdown
## PR Review Checklist
- [ ] Code is correct and handles edge cases
- [ ] No security vulnerabilities (XSS, injection, exposed secrets)
- [ ] Performance: no unnecessary re-renders, large bundle imports
- [ ] Accessibility: ARIA labels, keyboard navigation, contrast
- [ ] Tests: new/changed code has tests, all tests pass
- [ ] TypeScript: no `any` types, proper error handling
- [ ] Documentation: complex logic has comments
- [ ] Mobile: responsive behavior verified
```

### Branch Protection Rules
```yaml
# GitHub branch protection
main:
  required_reviews: 2
  require_codeowner_review: true
  dismiss_stale_reviews: true
  required_status_checks:
    - lint
    - type-check  
    - unit-tests
    - e2e-tests
    - bundle-size
  no_force_push: true
  require_linear_history: true  # squash merge only
```

### Stacked PRs
```
# For large features, stack small PRs:
PR1: Add data model + API types (100 lines)
PR2: Add API service layer (150 lines)  
PR3: Add UI component (200 lines)
PR4: Wire together + integration tests (250 lines)
# Total: 700 lines but each PR is reviewable in 15 min
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I enforce small PRs (< 400 lines), use review checklists for security/a11y/performance, and require 2 approvals + all CI checks for main. Large features get stacked as a series of small PRs. At SAP, this halved our review turnaround from 2 days to 4 hours."*

## 4. 🧠 MEMORY AID
**"Small PRs = fast reviews = fewer bugs. Checklist: security, a11y, perf, tests. Branch protection: 2 reviews + CI green + no force-push."**

## 5. 🎯 KEY INSIGHT
The easiest way to improve code quality is to reduce PR size. A reviewer's attention drops significantly after 400 lines.
