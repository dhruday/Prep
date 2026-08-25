# 338 – Trunk-Based Development vs GitFlow

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Trunk-Based**: All engineers commit to main/trunk, short-lived branches (< 1 day). Requires CI, feature flags. Used by Google, Facebook. **GitFlow**: Long-lived develop/release/feature branches. More ceremony, slower release cadence. Used in enterprise/regulated environments.

## 2. 🔬 DEEP-DIVE EXPLANATION

| Dimension | Trunk-Based | GitFlow |
|---|---|---|
| **Branch lifetime** | Hours-1 day | Days-weeks |
| **Main branch** | Always deployable | develop → release → main |
| **Feature isolation** | Feature flags | Feature branches |
| **Release** | Continuous deployment | Scheduled releases |
| **Merge conflicts** | Rare (small diffs) | Common (large diffs) |
| **CI requirement** | Mandatory | Optional |
| **Team size** | Any (Google: 25K devs) | Small-medium |
| **Best for** | SaaS, web apps | Mobile, versioned software |

```
TRUNK-BASED:
main ──●──●──●──●──●──●──●──●──  (always deployable)
       \  /   \  /      \  /
        \/     \/        \/
      (short feature branches, <1 day)

GITFLOW:
main    ──────────────●──────────●──  (releases only)
                     / \        / \
release         ──●──   ──●────    
               /     \  /    \
develop ──●──●────●──●────●──●────
          \  /    \  /
           \/      \/
         (feature branches, days-weeks)
```

### When to Choose What
- **Trunk-Based**: Web apps, SaaS, CI/CD mature teams, frequent releases
- **GitFlow**: Mobile apps (app store reviews), regulated industries, versioned APIs
- **GitHub Flow**: Simplified — main + feature branches, good middle ground

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I prefer trunk-based development for web applications — short-lived branches, continuous integration, feature flags for incomplete work. At SAP, we used a hybrid: trunk-based for the main product with release branches for enterprise customer hotfixes."*

## 4. 🧠 MEMORY AID
**"Trunk-based = small, frequent merges + feature flags. GitFlow = long branches + scheduled releases. Modern web = trunk-based."**

## 5. 🎯 KEY INSIGHT
Trunk-based development forces you to break work into small, safe increments — this improves code quality and reduces integration risk.
