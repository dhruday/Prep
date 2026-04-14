# SAP Labs — Senior Developer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Developer |
| **Level** | T4 (Senior) |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Technical + System Design + Managerial)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 2: Coding — Multi-Tenant Configuration Manager

### Problem
Design a multi-tenant configuration management system:
1. Hierarchical configs: global → tenant → user (override priority)
2. Type-safe config values (string, int, boolean, JSON)
3. Change history (audit log) with rollback
4. Bulk config import/export
5. Computed configs (derived from other configs)
6. Thread-safe concurrent access

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.*;
import java.util.function.*;

public class MultiTenantConfigManager {

    enum ConfigType { STRING, INTEGER, BOOLEAN, JSON }

    static class ConfigValue {
        final String key;
        final String rawValue;
        final ConfigType type;
        final long timestamp;
        final String changedBy;

        ConfigValue(String key, String rawValue, ConfigType type, String changedBy) {
            this.key = key;
            this.rawValue = rawValue;
            this.type = type;
            this.timestamp = System.currentTimeMillis();
            this.changedBy = changedBy;
        }

        Object typed() {
            return switch (type) {
                case STRING -> rawValue;
                case INTEGER -> Integer.parseInt(rawValue);
                case BOOLEAN -> Boolean.parseBoolean(rawValue);
                case JSON -> rawValue; // In production, parse to JsonNode
            };
        }

        @Override
        public String toString() {
            return String.format("%s=%s [%s] by %s", key, rawValue, type, changedBy);
        }
    }

    enum Scope { GLOBAL, TENANT, USER }

    static class ScopeKey {
        final Scope scope;
        final String tenantId;
        final String userId;

        ScopeKey(Scope scope, String tenantId, String userId) {
            this.scope = scope;
            this.tenantId = tenantId;
            this.userId = userId;
        }

        static ScopeKey global() { return new ScopeKey(Scope.GLOBAL, null, null); }
        static ScopeKey tenant(String tid) { return new ScopeKey(Scope.TENANT, tid, null); }
        static ScopeKey user(String tid, String uid) { return new ScopeKey(Scope.USER, tid, uid); }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ScopeKey k)) return false;
            return scope == k.scope && Objects.equals(tenantId, k.tenantId) && Objects.equals(userId, k.userId);
        }

        @Override
        public int hashCode() { return Objects.hash(scope, tenantId, userId); }

        @Override
        public String toString() {
            return switch (scope) {
                case GLOBAL -> "GLOBAL";
                case TENANT -> "TENANT:" + tenantId;
                case USER -> "USER:" + tenantId + "/" + userId;
            };
        }
    }

    // scope -> (configKey -> current value)
    private final ConcurrentHashMap<ScopeKey, ConcurrentHashMap<String, ConfigValue>> configs = new ConcurrentHashMap<>();
    // scope -> (configKey -> version history)
    private final ConcurrentHashMap<ScopeKey, ConcurrentHashMap<String, List<ConfigValue>>> history = new ConcurrentHashMap<>();
    // Computed config definitions
    private final Map<String, Function<MultiTenantConfigManager, Object>> computedConfigs = new ConcurrentHashMap<>();

    private final ReadWriteLock lock = new ReentrantReadWriteLock();

    // --- Set config ---
    public void setConfig(ScopeKey scope, String key, String value, ConfigType type, String changedBy) {
        lock.writeLock().lock();
        try {
            ConfigValue cv = new ConfigValue(key, value, type, changedBy);
            configs.computeIfAbsent(scope, k -> new ConcurrentHashMap<>()).put(key, cv);
            history.computeIfAbsent(scope, k -> new ConcurrentHashMap<>())
                .computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(cv);
        } finally {
            lock.writeLock().unlock();
        }
    }

    // --- Get config with scope resolution (user → tenant → global) ---
    public Object getConfig(String tenantId, String userId, String key) {
        lock.readLock().lock();
        try {
            // Check computed configs first
            if (computedConfigs.containsKey(key)) {
                return computedConfigs.get(key).apply(this);
            }

            // Resolution order: user → tenant → global
            ConfigValue val = getFromScope(ScopeKey.user(tenantId, userId), key);
            if (val != null) return val.typed();

            val = getFromScope(ScopeKey.tenant(tenantId), key);
            if (val != null) return val.typed();

            val = getFromScope(ScopeKey.global(), key);
            if (val != null) return val.typed();

            return null;
        } finally {
            lock.readLock().unlock();
        }
    }

    private ConfigValue getFromScope(ScopeKey scope, String key) {
        var scopeMap = configs.get(scope);
        return scopeMap != null ? scopeMap.get(key) : null;
    }

    // --- Get with resolution info (shows which scope provided the value) ---
    public String getConfigWithSource(String tenantId, String userId, String key) {
        lock.readLock().lock();
        try {
            ScopeKey[] scopes = {
                ScopeKey.user(tenantId, userId),
                ScopeKey.tenant(tenantId),
                ScopeKey.global()
            };
            for (ScopeKey scope : scopes) {
                ConfigValue val = getFromScope(scope, key);
                if (val != null) return String.format("%s (from %s)", val.typed(), scope);
            }
            return "NOT SET";
        } finally {
            lock.readLock().unlock();
        }
    }

    // --- Register computed config ---
    public void registerComputed(String key, Function<MultiTenantConfigManager, Object> fn) {
        computedConfigs.put(key, fn);
    }

    // --- Rollback to previous version ---
    public boolean rollback(ScopeKey scope, String key) {
        lock.writeLock().lock();
        try {
            var keyHistory = history.getOrDefault(scope, new ConcurrentHashMap<>()).get(key);
            if (keyHistory == null || keyHistory.size() < 2) return false;

            keyHistory.remove(keyHistory.size() - 1); // Remove current
            ConfigValue prev = keyHistory.get(keyHistory.size() - 1);
            configs.get(scope).put(key, prev);
            return true;
        } finally {
            lock.writeLock().unlock();
        }
    }

    // --- Audit log ---
    public List<ConfigValue> getHistory(ScopeKey scope, String key) {
        lock.readLock().lock();
        try {
            return List.copyOf(
                history.getOrDefault(scope, new ConcurrentHashMap<>())
                    .getOrDefault(key, List.of()));
        } finally {
            lock.readLock().unlock();
        }
    }

    // --- Bulk export ---
    public Map<String, String> exportConfigs(ScopeKey scope) {
        lock.readLock().lock();
        try {
            var scopeMap = configs.get(scope);
            if (scopeMap == null) return Map.of();
            Map<String, String> result = new LinkedHashMap<>();
            scopeMap.forEach((k, v) -> result.put(k, v.rawValue));
            return result;
        } finally {
            lock.readLock().unlock();
        }
    }

    // --- Bulk import ---
    public int importConfigs(ScopeKey scope, Map<String, String> data, ConfigType defaultType, String changedBy) {
        int count = 0;
        for (var entry : data.entrySet()) {
            setConfig(scope, entry.getKey(), entry.getValue(), defaultType, changedBy);
            count++;
        }
        return count;
    }

    // --- Get all effective configs for a user ---
    public Map<String, Object> getEffectiveConfigs(String tenantId, String userId) {
        lock.readLock().lock();
        try {
            Map<String, Object> effective = new LinkedHashMap<>();
            // Start with global
            var globalMap = configs.get(ScopeKey.global());
            if (globalMap != null) globalMap.forEach((k, v) -> effective.put(k, v.typed()));
            // Override with tenant
            var tenantMap = configs.get(ScopeKey.tenant(tenantId));
            if (tenantMap != null) tenantMap.forEach((k, v) -> effective.put(k, v.typed()));
            // Override with user
            var userMap = configs.get(ScopeKey.user(tenantId, userId));
            if (userMap != null) userMap.forEach((k, v) -> effective.put(k, v.typed()));
            // Add computed
            computedConfigs.forEach((k, fn) -> effective.put(k, fn.apply(this)));
            return effective;
        } finally {
            lock.readLock().unlock();
        }
    }

    public static void main(String[] args) {
        MultiTenantConfigManager mgr = new MultiTenantConfigManager();

        // Global defaults
        mgr.setConfig(ScopeKey.global(), "max_upload_mb", "10", ConfigType.INTEGER, "admin");
        mgr.setConfig(ScopeKey.global(), "dark_mode", "false", ConfigType.BOOLEAN, "admin");
        mgr.setConfig(ScopeKey.global(), "language", "en", ConfigType.STRING, "admin");
        mgr.setConfig(ScopeKey.global(), "feature_flags", "{\"beta\":false}", ConfigType.JSON, "admin");

        // Tenant overrides
        mgr.setConfig(ScopeKey.tenant("acme"), "max_upload_mb", "50", ConfigType.INTEGER, "acme_admin");
        mgr.setConfig(ScopeKey.tenant("acme"), "language", "de", ConfigType.STRING, "acme_admin");

        // User override
        mgr.setConfig(ScopeKey.user("acme", "u1"), "dark_mode", "true", ConfigType.BOOLEAN, "user1");

        // Computed config
        mgr.registerComputed("upload_limit_bytes", m -> {
            Object mb = m.getConfig("acme", "u1", "max_upload_mb");
            return mb != null ? (int) mb * 1024 * 1024 : 10 * 1024 * 1024;
        });

        // Resolution demo
        System.out.println("=== Config Resolution for acme/u1 ===");
        for (String key : List.of("max_upload_mb", "dark_mode", "language", "feature_flags", "upload_limit_bytes")) {
            System.out.printf("  %-20s = %s%n", key, mgr.getConfigWithSource("acme", "u1", key));
        }

        // Effective configs
        System.out.println("\n=== Effective Configs ===");
        mgr.getEffectiveConfigs("acme", "u1").forEach((k, v) ->
            System.out.printf("  %-20s = %s%n", k, v));

        // History and rollback
        mgr.setConfig(ScopeKey.tenant("acme"), "max_upload_mb", "100", ConfigType.INTEGER, "acme_admin");
        System.out.println("\n=== History for acme/max_upload_mb ===");
        mgr.getHistory(ScopeKey.tenant("acme"), "max_upload_mb").forEach(h ->
            System.out.println("  " + h));

        System.out.println("\nRollback max_upload_mb...");
        mgr.rollback(ScopeKey.tenant("acme"), "max_upload_mb");
        System.out.println("After rollback: " + mgr.getConfig("acme", "u1", "max_upload_mb"));

        // Export
        System.out.println("\n=== Export Global Configs ===");
        mgr.exportConfigs(ScopeKey.global()).forEach((k, v) ->
            System.out.printf("  %s = %s%n", k, v));
    }
}
```

## 🎯 Key Takeaways
- SAP tests **enterprise patterns** — multi-tenancy, config management, audit trails
- Hierarchical override: user > tenant > global — standard SaaS pattern
- ReadWriteLock for concurrent access: multiple concurrent reads, exclusive writes
- **Audit log** with version history enables compliance requirements
- Computed configs (derived values) via registered functions — flexible extension point
- Bulk import/export for tenant onboarding and migration
- CopyOnWriteArrayList for history: safe iteration during writes to other keys
- `getConfigWithSource()` for debugging — shows which scope resolved the value

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical | Medium-Hard | Multi-Tenancy, Config Management, Concurrency |
| System Design | Hard | Multi-Tenant SaaS Platform |
| Managerial | Medium | Leadership, Communication |
