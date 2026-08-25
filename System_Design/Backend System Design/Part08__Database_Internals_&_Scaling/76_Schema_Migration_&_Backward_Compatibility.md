# 76. Schema Migration & Backward Compatibility

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Schema Migration?

**Schema migration** is the process of modifying a database schema (tables, columns, indexes, constraints) in a live production environment **without downtime** while ensuring **backward compatibility** with running application code.

**The Challenge**:

```
┌────────────────────────────────────────────────────────┐
│         ZERO-DOWNTIME MIGRATION PROBLEM                │
└────────────────────────────────────────────────────────┘

OLD SCHEMA (Production):
┌──────────────────────────────┐
│ users                        │
├──────────────────────────────┤
│ id         INT               │
│ name       VARCHAR(100)      │  ← Want to rename to full_name
│ email      VARCHAR(255)      │
└──────────────────────────────┘

NEW SCHEMA (Desired):
┌──────────────────────────────┐
│ users                        │
├──────────────────────────────┤
│ id         INT               │
│ full_name  VARCHAR(100)      │  ← New column name
│ email      VARCHAR(255)      │
└──────────────────────────────┘

Problem:
- Application code v1 uses: SELECT name FROM users
- Application code v2 uses: SELECT full_name FROM users
- Database migration: Rename column name → full_name
- If done atomically: v1 code breaks immediately (column "name" not found)
- Downtime: Cannot deploy v2 code + migration atomically across all servers
- Need: Migration strategy that works with both v1 and v2 code (backward compatible)
```

### Why It Matters

| Scenario | Risk Without Backward Compatibility |
|----------|-------------------------------------|
| **Rename column** | App breaks immediately (column not found) |
| **Drop column** | Old app crashes (queries fail) |
| **Change data type** | Type mismatch errors (INT → VARCHAR) |
| **Add NOT NULL constraint** | Writes fail (missing value for required field) |
| **Large table migration** | Hours-long table lock (downtime) |

**Goal**: Migrate schema safely with **zero downtime**, **zero errors**, and **rollback capability**.

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Expand-Contract Pattern (Most Important)

**The expand-contract pattern** is the gold standard for zero-downtime migrations:

**Phase 1: EXPAND** (Add new schema, keep old):
```sql
-- Step 1: Add new column (non-breaking)
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Both columns exist:
-- name (old column, still used by v1 code)
-- full_name (new column, ready for v2 code)
```

**Phase 2: MIGRATE** (Deploy v2 code, dual-write):
```python
# v2 code: Write to BOTH old and new columns
def create_user(full_name, email):
    db.execute("""
        INSERT INTO users (name, full_name, email)
        VALUES (?, ?, ?)
    """, full_name, full_name, email)  # Write to both name and full_name

# v2 code: Read from new column (fallback to old)
def get_user(user_id):
    user = db.query("SELECT id, full_name, name, email FROM users WHERE id = ?", user_id)
    # Prefer new column, fallback to old
    user['full_name'] = user['full_name'] or user['name']
    return user
```

**Phase 3: BACKFILL** (Copy old data to new column):
```sql
-- Backfill old rows (copy name → full_name)
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- For large tables, batch backfill (avoid long locks):
-- Chunk 1 (ids 1-1M)
UPDATE users SET full_name = name WHERE id BETWEEN 1 AND 1000000 AND full_name IS NULL;
-- Chunk 2 (ids 1M-2M)
UPDATE users SET full_name = name WHERE id BETWEEN 1000001 AND 2000000 AND full_name IS NULL;
-- ... (continue in chunks of 1M rows, 5-minute intervals)
```

**Phase 4: CONTRACT** (Remove old schema):
```sql
-- Step 4a: Deploy v3 code (stop writing to old column "name")
-- v3 code: Write only to full_name

-- Step 4b: Drop old column (after v3 deployed to 100% servers)
ALTER TABLE users DROP COLUMN name;
```

**Timeline** (example):
```
Day 0:  Expand (add full_name column)
Day 1:  Deploy v2 code (dual-write to both name and full_name)
Day 2:  Backfill (copy name → full_name for old rows)
Day 3:  Verify (ensure full_name populated for 100% rows)
Day 7:  Contract (deploy v3 code, stop using "name")
Day 8:  Drop old column (ALTER TABLE ... DROP COLUMN name)

Total: 8 days for safe migration (vs 1-minute downtime for unsafe atomic migration)
```

**Key Benefits**:
- Zero downtime (app always works, never breaks)
- Gradual rollout (can pause/rollback at any phase)
- Backward compatible (v1, v2, v3 code all coexist safely)

---

### 2. Column Operations (Safe vs Unsafe)

#### **ADD COLUMN** (Safe)

```sql
-- Safe: Add column with DEFAULT value
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Why safe:
-- - New column added instantly (no data copy)
-- - DEFAULT value prevents NULL errors
-- - Old code unaffected (doesn't query new column)
-- - New code can use immediately

-- For large tables (100M+ rows), use NOT NULL with DEFAULT carefully:
-- PostgreSQL 11+: Fast (metadata-only change, no rewrite)
-- MySQL 5.7: Slow (full table rewrite, hours of downtime)
-- Solution for MySQL: Add column NULL first, backfill, then ALTER to NOT NULL
```

#### **DROP COLUMN** (Dangerous)

```sql
-- Dangerous: Drop column immediately
ALTER TABLE users DROP COLUMN middle_name;

-- Why dangerous:
-- - Old app code queries middle_name → crashes immediately
-- - Cannot rollback (data deleted)

-- Safe approach:
-- Step 1: Deploy code that stops using middle_name (v2)
-- Step 2: Wait 1 week (ensure v2 on 100% servers, no rollback needed)
-- Step 3: Drop column (now safe, no app uses it)
ALTER TABLE users DROP COLUMN middle_name;
```

#### **RENAME COLUMN** (Very Dangerous)

```sql
-- Very Dangerous: Rename column atomically
ALTER TABLE users RENAME COLUMN name TO full_name;

-- Why very dangerous:
-- - Old app: SELECT name → column not found (crashes immediately)
-- - New app: SELECT full_name → works
-- - Impossible to deploy app + migration atomically (downtime guaranteed)

-- Safe approach: Expand-contract (add new column, dual-write, drop old)
-- Step 1: Add full_name column
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Step 2: Backfill
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Step 3: Deploy code using full_name (dual-read: full_name || name)
-- Step 4: Deploy code writing only to full_name (stop using name)
-- Step 5: Drop name column
ALTER TABLE users DROP COLUMN name;
```

#### **CHANGE DATA TYPE** (Very Dangerous)

```sql
-- Very Dangerous: Change type directly
ALTER TABLE users ALTER COLUMN age TYPE VARCHAR(10);  -- INT → VARCHAR

-- Why very dangerous:
-- - Old app: Expects INT, gets VARCHAR → type errors
-- - Data conversion: May lose precision or fail (e.g., DATE → VARCHAR OK, VARCHAR → INT fails)
-- - Large table: Full rewrite (hours of downtime)

-- Safe approach: New column + migration
-- Step 1: Add new column with new type
ALTER TABLE users ADD COLUMN age_str VARCHAR(10);

-- Step 2: Backfill (convert INT → VARCHAR)
UPDATE users SET age_str = age::VARCHAR WHERE age_str IS NULL;

-- Step 3: Deploy code using age_str
-- Step 4: Drop old column
ALTER TABLE users DROP COLUMN age;

-- Step 5: Rename (optional)
ALTER TABLE users RENAME COLUMN age_str TO age;
```

#### **ADD INDEX** (Mostly Safe)

```sql
-- Safe: Add index with CONCURRENTLY (PostgreSQL)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Why safe:
-- - CONCURRENTLY: No table lock (reads/writes continue)
-- - Background process: May take hours for large table, but no downtime

-- Unsafe: Add index without CONCURRENTLY
CREATE INDEX idx_users_email ON users(email);
-- - Acquires table lock (blocks writes, downtime)
-- - For large tables: Hours of downtime

-- MySQL equivalent (5.6+):
ALTER TABLE users ADD INDEX idx_users_email (email), ALGORITHM=INPLACE, LOCK=NONE;
```

---

### 3. Blue-Green Deployment (Zero-Downtime Strategy)

**Blue-Green deployment**: Maintain two identical production environments (Blue = current, Green = new). Migrate schema on Green, test, then switch traffic.

**Architecture**:

```
┌────────────────────────────────────────────────────────┐
│           BLUE-GREEN DEPLOYMENT                        │
└────────────────────────────────────────────────────────┘

BEFORE MIGRATION:
═══════════════════════════════════════════════════════
┌────────────────┐
│ Load Balancer  │
│ (100% traffic) │
└────────┬───────┘
         ↓ 100% traffic
┌────────────────────────────┐       ┌────────────────────────────┐
│  BLUE Environment          │       │  GREEN Environment         │
│  (Production, Active)      │       │  (Staging, Idle)           │
│                            │       │                            │
│  App Servers (v1)          │       │  App Servers (v1)          │
│  Database (Old Schema)     │       │  Database (Old Schema)     │
│  users: id, name, email    │       │  users: id, name, email    │
└────────────────────────────┘       └────────────────────────────┘
         ✅ Live                              ⏸️ Standby


DURING MIGRATION (Migrate Green):
═══════════════════════════════════════════════════════
┌────────────────┐
│ Load Balancer  │
│ (100% traffic) │
└────────┬───────┘
         ↓ 100% traffic
┌────────────────────────────┐       ┌────────────────────────────┐
│  BLUE Environment          │       │  GREEN Environment         │
│  (Production, Active)      │       │  (Migrating)               │
│                            │       │                            │
│  App Servers (v1)          │       │  1. Migrate schema:        │
│  Database (Old Schema)     │       │     ALTER TABLE ADD full_name│
│  users: id, name, email    │       │  2. Deploy app (v2)        │
│                            │       │  3. Test thoroughly        │
│                            │       │     - Smoke tests          │
│                            │       │     - Integration tests    │
│                            │       │     - Load tests           │
└────────────────────────────┘       └────────────────────────────┘
         ✅ Live                              🔧 Migrating


AFTER MIGRATION (Switch Traffic to Green):
═══════════════════════════════════════════════════════
┌────────────────┐
│ Load Balancer  │
│ (Switch 100%)  │
└────────┬───────┘
         ↓ 100% traffic (switched atomically)
┌────────────────────────────┐       ┌────────────────────────────┐
│  BLUE Environment          │       │  GREEN Environment         │
│  (Now Standby)             │       │  (Now Production)          │
│                            │       │                            │
│  App Servers (v1)          │       │  App Servers (v2)          │
│  Database (Old Schema)     │       │  Database (New Schema)     │
│  users: id, name, email    │       │  users: id, name, full_name│
│                            │       │                            │
│  (Can rollback if issues)  │       │  ✅ Live (new schema)      │
└────────────────────────────┘       └────────────────────────────┘
         ⏸️ Standby (rollback ready)          ✅ Live


ROLLBACK (If Issues Detected):
═══════════════════════════════════════════════════════
┌────────────────┐
│ Load Balancer  │
│ (Switch back)  │
└────────┬───────┘
         ↓ 100% traffic (switched back in seconds)
┌────────────────────────────┐       ┌────────────────────────────┐
│  BLUE Environment          │       │  GREEN Environment         │
│  (Production Again)        │       │  (Rolled Back)             │
│                            │       │                            │
│  App Servers (v1)          │       │  App Servers (v2)          │
│  Database (Old Schema)     │       │  Database (New Schema)     │
│  users: id, name, email    │       │  users: id, name, full_name│
│                            │       │                            │
│  ✅ Live (rolled back)     │       │  ❌ Deactivated            │
└────────────────────────────┘       └────────────────────────────┘
         ✅ Live                              ❌ Rolled Back

Rollback time: 10 seconds (DNS/load balancer switch)
```

**Implementation**:

```python
# Load balancer configuration (NGINX)
upstream app_backend {
    # Blue environment (production)
    server blue-app-1.example.com:8000 weight=100;
    server blue-app-2.example.com:8000 weight=100;
    
    # Green environment (standby)
    server green-app-1.example.com:8000 weight=0;   # weight=0 = no traffic
    server green-app-2.example.com:8000 weight=0;
}

# Switch traffic to green (atomic)
upstream app_backend {
    # Blue environment (now standby)
    server blue-app-1.example.com:8000 weight=0;    # weight=0 = no traffic
    server blue-app-2.example.com:8000 weight=0;
    
    # Green environment (now production)
    server green-app-1.example.com:8000 weight=100; # weight=100 = active
    server green-app-2.example.com:8000 weight=100;
}

# Apply config (instant switch, < 1 second)
sudo nginx -s reload
```

**Benefits**:
- Zero downtime (switch is atomic, < 1 second)
- Instant rollback (switch back to Blue if issues)
- Test on Green before cutover (smoke/load tests)
- Keep Blue as rollback target (1 week, then migrate Blue)

---

### 4. Database Versioning & Migration Tools

**Track schema changes** with versioned migration scripts:

**migrations/ folder structure**:
```
migrations/
├── 001_create_users_table.sql
├── 002_add_email_column.sql
├── 003_add_full_name_column.sql
├── 004_backfill_full_name.sql
├── 005_drop_name_column.sql
└── schema_version.sql
```

**001_create_users_table.sql** (initial schema):
```sql
-- Migration: 001
-- Description: Create users table
-- Date: 2024-01-01

-- UP (apply migration)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track migration version
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (1, 'Create users table', NOW());

-- DOWN (rollback migration, optional)
-- DROP TABLE users;
-- DELETE FROM schema_migrations WHERE version = 1;
```

**003_add_full_name_column.sql** (expand-contract step 1):
```sql
-- Migration: 003
-- Description: Add full_name column (expand-contract pattern)
-- Date: 2024-03-01

-- UP
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Track version
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (3, 'Add full_name column', NOW());

-- DOWN (rollback)
-- ALTER TABLE users DROP COLUMN full_name;
-- DELETE FROM schema_migrations WHERE version = 3;
```

**Track applied migrations**:
```sql
-- Schema migrations table
CREATE TABLE schema_migrations (
    version INT PRIMARY KEY,
    description VARCHAR(255),
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Query current schema version
SELECT MAX(version) AS current_version FROM schema_migrations;
-- Result: 3 (migrations 001, 002, 003 applied)
```

**Migration tool** (Python example):
```python
import psycopg2

class MigrationManager:
    def __init__(self, db_conn):
        self.conn = db_conn
    
    def get_current_version(self):
        """Get current schema version"""
        cur = self.conn.cursor()
        cur.execute("SELECT COALESCE(MAX(version), 0) FROM schema_migrations")
        return cur.fetchone()[0]
    
    def apply_migration(self, version, sql_file):
        """Apply a single migration"""
        current_version = self.get_current_version()
        
        if current_version >= version:
            print(f"Migration {version} already applied (current: {current_version})")
            return
        
        # Read migration SQL
        with open(sql_file, 'r') as f:
            sql = f.read()
        
        # Execute migration
        try:
            cur = self.conn.cursor()
            cur.execute(sql)
            self.conn.commit()
            print(f"✅ Applied migration {version}")
        except Exception as e:
            self.conn.rollback()
            print(f"❌ Failed to apply migration {version}: {e}")
            raise
    
    def migrate_to_latest(self):
        """Apply all pending migrations"""
        current = self.get_current_version()
        
        # Find migration files
        import os
        migration_files = sorted([f for f in os.listdir('migrations/') if f.endswith('.sql')])
        
        for filename in migration_files:
            version = int(filename.split('_')[0])
            if version > current:
                print(f"Applying migration {version}: {filename}")
                self.apply_migration(version, f'migrations/{filename}')

# Usage:
db = psycopg2.connect("dbname=mydb user=postgres")
manager = MigrationManager(db)

# Apply all pending migrations
manager.migrate_to_latest()

# Output:
# Current version: 2
# Applying migration 3: 003_add_full_name_column.sql
# ✅ Applied migration 3
# Applying migration 4: 004_backfill_full_name.sql
# ✅ Applied migration 4
```

**Popular migration tools**:
- **Flyway** (Java, any database): Versioned migrations, rollback support
- **Liquibase** (Java, any database): XML/JSON/SQL migrations, diff tool
- **Alembic** (Python, SQLAlchemy): Auto-generate migrations from ORM models
- **Django Migrations** (Python, Django ORM): Integrated with Django framework
- **Rails Migrations** (Ruby, ActiveRecord): Convention over configuration

---

### 5. Large Table Migrations (Batch Processing)

**Problem**: Migrating 100M+ row table takes hours, locks table (downtime).

**Solution: Online Schema Change** (OSC) tools:

#### **pt-online-schema-change** (Percona Toolkit for MySQL)

**How it works**:
1. Create new table with desired schema
2. Copy rows in chunks (no lock)
3. Apply ongoing writes via triggers (dual-write)
4. Swap tables atomically (< 1 second lock)

```bash
# Add column to 100M row table (zero downtime)
pt-online-schema-change \
  --alter "ADD COLUMN full_name VARCHAR(100)" \
  --execute \
  --chunk-size=1000 \
  --max-load="Threads_running=50" \
  --critical-load="Threads_running=100" \
  D=mydb,t=users

# How it works:
# 1. Create new table: users_new (with full_name column)
# 2. Copy rows in chunks:
#    - Chunk 1: id 1-1000 (1ms)
#    - Chunk 2: id 1001-2000 (1ms)
#    - ... (100,000 chunks total for 100M rows)
# 3. Create triggers (capture ongoing writes during copy):
#    - INSERT trigger: Write to users_new
#    - UPDATE trigger: Write to users_new
#    - DELETE trigger: Write to users_new
# 4. After copy completes:
#    - RENAME TABLE users TO users_old, users_new TO users; (< 1 second)
# 5. Drop old table: DROP TABLE users_old;

# Total time: 30 minutes (vs 2 hours table lock with direct ALTER)
# Downtime: < 1 second (table swap)
```

#### **gh-ost** (GitHub Online Schema Migrator)

**Advantages over pt-osc**:
- No triggers (uses binary log replication instead)
- Pausable/resumable (can pause migration during peak traffic)
- Testable (can test on replica before production)

```bash
# Add column using gh-ost
gh-ost \
  --user=root \
  --host=db.example.com \
  --database=mydb \
  --table=users \
  --alter="ADD COLUMN full_name VARCHAR(100)" \
  --chunk-size=1000 \
  --max-load=Threads_running=50 \
  --critical-load=Threads_running=100 \
  --execute

# How gh-ost works:
# 1. Create ghost table: _users_gho (new schema)
# 2. Copy rows in chunks (like pt-osc)
# 3. Listen to binary log (instead of triggers):
#    - Capture INSERT/UPDATE/DELETE from binary log
#    - Apply to ghost table
# 4. Swap tables atomically
# 5. Drop old table

# Benefits vs pt-osc:
# - No trigger overhead (binary log faster)
# - Pausable: Can pause during peak traffic hours
# - Testable: Can run on replica, test, then run on master

# Example pause/resume:
echo "pause" > /tmp/gh-ost.flag        # Pause migration
echo "resume" > /tmp/gh-ost.flag       # Resume migration
```

#### **Batch Processing** (Custom Script)

**For very large tables** (1B+ rows), batch backfill:

```python
import time

def batch_backfill(db, batch_size=10000, sleep_ms=100):
    """Backfill full_name column in batches (zero downtime)"""
    min_id = 0
    total_updated = 0
    
    while True:
        # Get next batch
        result = db.execute(f"""
            UPDATE users
            SET full_name = name
            WHERE id > {min_id}
              AND id <= {min_id + batch_size}
              AND full_name IS NULL
        """)
        
        rows_updated = result.rowcount
        total_updated += rows_updated
        
        if rows_updated == 0:
            # No more rows to update
            break
        
        # Update min_id for next batch
        min_id += batch_size
        
        print(f"Updated {total_updated} rows (batch: {min_id} - {min_id + batch_size})")
        
        # Sleep to avoid overloading database
        time.sleep(sleep_ms / 1000.0)
    
    print(f"✅ Backfill complete: {total_updated} rows updated")

# Example:
# Table: 100M rows
# Batch size: 10K rows
# Sleep: 100ms between batches
# Total batches: 100M / 10K = 10,000 batches
# Total time: 10,000 batches × 100ms = 1,000 seconds = 16 minutes
# Database impact: Minimal (10K rows per batch, 100ms sleep = low load)
```

---

### 6. Feature Flags for Gradual Rollout

**Use feature flags** to gradually enable new schema code:

```python
import launchdarkly  # Feature flag service

class UserService:
    def __init__(self):
        self.ld_client = launchdarkly.get_client()
    
    def get_user(self, user_id):
        # Feature flag: Use new column (full_name) or old column (name)?
        use_full_name = self.ld_client.variation(
            'use_full_name_column',
            {'key': str(user_id)},
            default=False  # Default: Use old column (safe)
        )
        
        if use_full_name:
            # New code: Use full_name column
            user = db.query("SELECT id, full_name, email FROM users WHERE id = ?", user_id)
        else:
            # Old code: Use name column
            user = db.query("SELECT id, name AS full_name, email FROM users WHERE id = ?", user_id)
        
        return user

# Gradual rollout:
# Day 1: 1% users (canary)
launchdarkly.update_flag('use_full_name_column', rollout_percentage=1)

# Day 2: 10% users (if no errors)
launchdarkly.update_flag('use_full_name_column', rollout_percentage=10)

# Day 3: 50% users
launchdarkly.update_flag('use_full_name_column', rollout_percentage=50)

# Day 4: 100% users (full rollout)
launchdarkly.update_flag('use_full_name_column', rollout_percentage=100)

# If errors detected at any stage:
launchdarkly.update_flag('use_full_name_column', rollout_percentage=0)  # Instant rollback
```

**Benefits**:
- Gradual rollout (1% → 10% → 50% → 100%)
- Instant rollback (0% in seconds, no code deploy needed)
- A/B testing (compare old vs new column performance)
- Safe validation (catch issues before full rollout)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Migration Time Estimation

**Example: Rename column in 100M row table (users)**

**Assumptions**:
- Table: users (100M rows, 50GB data, 100GB with indexes)
- Column: name VARCHAR(100) → full_name VARCHAR(100)
- Database: PostgreSQL 13
- Write load: 1K inserts/sec (ongoing traffic during migration)

**Option 1: Direct ALTER (UNSAFE, causes downtime)**:
```sql
-- Direct rename (locks table)
ALTER TABLE users RENAME COLUMN name TO full_name;

-- Downtime calculation:
-- - Table lock acquired (blocks all reads/writes)
-- - Rename: Metadata-only operation in PostgreSQL (instant, < 1 second)
-- - BUT: Must update all app code before unlocking table (impossible)
-- - Result: Downtime 1+ hours (time to deploy new app code to all servers)
```

**Option 2: Expand-Contract (SAFE, zero downtime)**:

**Phase 1: Expand** (add new column):
```sql
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
-- Time: < 1 second (metadata-only, no data copy)
-- Downtime: 0 seconds (non-blocking)
```

**Phase 2: Backfill** (copy data):
```sql
-- Batch backfill (10K rows per batch, 100ms sleep)
-- Batches: 100M rows / 10K = 10,000 batches
-- Time per batch: 50ms query + 100ms sleep = 150ms
-- Total time: 10,000 × 150ms = 1,500 seconds = 25 minutes
-- Downtime: 0 seconds (batches don't lock table)

-- Alternative: pt-online-schema-change (30 minutes, 0 downtime)
-- Alternative: gh-ost (35 minutes, 0 downtime, pausable)
```

**Phase 3: Deploy v2 code** (dual-read/write):
```python
# Deploy to 1000 app servers (rolling deployment)
# Time per server: 30 seconds (deploy + health check)
# Total time: 1000 servers × 30 seconds = 30,000 seconds = 8 hours (parallelized)
# With 10 parallel deployments: 8 hours / 10 = 48 minutes
# Downtime: 0 seconds (rolling deployment)
```

**Phase 4: Contract** (drop old column):
```sql
-- Deploy v3 code (stop using "name")
-- Time: 48 minutes (same as phase 3)

-- Drop column
ALTER TABLE users DROP COLUMN name;
-- Time: < 1 second (metadata-only in PostgreSQL)
-- Downtime: 0 seconds (non-blocking)
```

**Total Time**: 25 min (backfill) + 48 min (deploy v2) + 48 min (deploy v3) = **121 minutes (~2 hours)**

**Total Downtime**: **0 seconds** (vs 1+ hours with direct rename)

---

## 4. Data & Storage Design

### Migration Audit Trail

**Track all schema changes** for compliance/debugging:

```sql
-- Schema migrations table (track version)
CREATE TABLE schema_migrations (
    version INT PRIMARY KEY,
    description VARCHAR(255),
    applied_at TIMESTAMP DEFAULT NOW(),
    applied_by VARCHAR(100),
    duration_seconds INT
);

-- Migration audit log (detailed changes)
CREATE TABLE migration_audit_log (
    id SERIAL PRIMARY KEY,
    migration_version INT,
    operation VARCHAR(50),  -- 'ADD_COLUMN', 'DROP_COLUMN', 'BACKFILL', etc.
    table_name VARCHAR(100),
    column_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    rows_affected BIGINT,
    duration_seconds INT,
    executed_at TIMESTAMP DEFAULT NOW(),
    executed_by VARCHAR(100),
    status VARCHAR(20)  -- 'SUCCESS', 'FAILED', 'ROLLED_BACK'
);

-- Example entries:
INSERT INTO migration_audit_log VALUES
(1, 3, 'ADD_COLUMN', 'users', 'full_name', NULL, 'VARCHAR(100)', 0, 0.5, NOW(), 'deploy-bot', 'SUCCESS'),
(2, 4, 'BACKFILL', 'users', 'full_name', NULL, 'name', 100000000, 1500, NOW(), 'deploy-bot', 'SUCCESS'),
(3, 5, 'DROP_COLUMN', 'users', 'name', 'VARCHAR(100)', NULL, 0, 0.3, NOW(), 'deploy-bot', 'SUCCESS');

-- Query: All migrations in last 30 days
SELECT migration_version, operation, table_name, column_name, rows_affected, status
FROM migration_audit_log
WHERE executed_at > NOW() - INTERVAL '30 days'
ORDER BY executed_at DESC;
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Rollback Strategy

**Every migration must be reversible**:

**Migration 003: Add Column**:
```sql
-- UP (forward migration)
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- DOWN (rollback)
ALTER TABLE users DROP COLUMN full_name;
```

**Migration 004: Backfill**:
```sql
-- UP
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- DOWN (rollback: clear backfilled data)
UPDATE users SET full_name = NULL WHERE full_name IS NOT NULL;
```

**Automated Rollback** (on failure):
```python
class MigrationRunner:
    def run_migration(self, migration_file):
        """Run migration with automatic rollback on failure"""
        try:
            # Parse migration file
            up_sql, down_sql = parse_migration(migration_file)
            
            # Apply UP migration
            db.execute(up_sql)
            db.commit()
            
            # Validate (smoke test)
            if not self.validate_migration():
                raise ValidationError("Migration validation failed")
            
            print("✅ Migration succeeded")
        
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            print("⏪ Rolling back...")
            
            # Apply DOWN migration
            db.execute(down_sql)
            db.commit()
            
            print("✅ Rollback complete")
            raise

# Example:
# Migration 003 fails (constraint violation)
# → Automatic rollback (execute DOWN script)
# → Database restored to pre-migration state
```

---

## 6. Security, APIs & Governance

### Migration Approval Workflow

**For production changes**, require approval:

```yaml
# .github/workflows/migration-approval.yml
name: Migration Approval

on:
  pull_request:
    paths:
      - 'migrations/*.sql'

jobs:
  migration-review:
    runs-on: ubuntu-latest
    steps:
      - name: Check migration file
        run: |
          # Validate migration has UP and DOWN sections
          # Check for dangerous operations (DROP TABLE, DROP COLUMN without safety period)
          # Estimate migration time (for large tables)
      
      - name: Require approval
        uses: actions/github-approval@v1
        with:
          required_approvers: ['dba-team', 'tech-lead']
          minimum_approvals: 2

      - name: Dry-run on staging
        run: |
          # Apply migration to staging database
          # Run smoke tests
          # Rollback staging database
      
      - name: Deploy to production
        if: github.event.pull_request.merged == true
        run: |
          # Deploy migration to production (after approval + staging test)
```

---

## 7. Real-World Examples & Case Studies

### GitHub: Scientist Framework (Dual-Write Validation)

**Problem**: Migrate user profiles to new schema, ensure correctness

**Solution: Scientist** (library for A/B testing code paths):

```ruby
require 'scientist'

class UserService
  include Scientist

  def get_user(user_id)
    # Experiment: Compare old vs new schema reads
    science "user_read_migration" do |experiment|
      # Control: Old schema (current production code)
      experiment.use { get_user_old_schema(user_id) }
      
      # Candidate: New schema (test code)
      experiment.try { get_user_new_schema(user_id) }
      
      # Compare results
      experiment.compare do |control, candidate|
        control['id'] == candidate['id'] &&
        control['name'] == candidate['full_name']  # Compare old "name" vs new "full_name"
      end
    end
  end

  def get_user_old_schema(user_id)
    # Old code: Use "name" column
    DB.query("SELECT id, name, email FROM users WHERE id = ?", user_id)
  end

  def get_user_new_schema(user_id)
    # New code: Use "full_name" column
    DB.query("SELECT id, full_name, email FROM users WHERE id = ?", user_id)
  end
end

# How it works:
# 1. Execute both control (old) and candidate (new) code paths
# 2. Compare results (assert old "name" == new "full_name")
# 3. Log mismatches (detect bugs before full rollout)
# 4. Return control result (production uses old code, new code just tested)
# 5. Gradually rollout: 1% → 10% → 100% (if no mismatches)

# Example log:
# [Scientist] Experiment: user_read_migration
# - Control: {id: 123, name: "Alice Smith", email: "alice@example.com"}
# - Candidate: {id: 123, full_name: "Alice Smith", email: "alice@example.com"}
# - Match: ✅ Results identical
# - Duration: Control 10ms, Candidate 12ms (20% slower, acceptable)
```

**Outcome**: GitHub migrated 100M+ user profiles with **zero data loss**, detected 15 bugs before production rollout

---

### Stripe: Automated Migration Testing

**Problem**: Schema migrations frequently broke production (manual testing insufficient)

**Solution: Automated Migration CI/CD Pipeline**:

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - deploy-staging
  - test-staging
  - deploy-production

migration-lint:
  stage: lint
  script:
    # Check migration follows expand-contract pattern
    - python scripts/lint_migration.py migrations/*.sql
    # Reject: DROP COLUMN without 1-week safety period
    # Reject: ALTER COLUMN without new column + backfill
    # Reject: NOT NULL constraint without DEFAULT value

migration-test-local:
  stage: test
  script:
    # Apply migration to local test database
    - python manage.py migrate
    # Run unit tests (ensure app code works with new schema)
    - pytest tests/
    # Rollback migration (test DOWN script)
    - python manage.py migrate --rollback

deploy-staging:
  stage: deploy-staging
  script:
    # Apply migration to staging database
    - python manage.py migrate --database=staging
    # Deploy app code to staging servers
    - ansible-playbook deploy-staging.yml

test-staging:
  stage: test-staging
  script:
    # Run integration tests on staging
    - pytest tests/integration/
    # Run load tests (ensure no performance regression)
    - locust -f loadtest.py --host=https://staging.stripe.com
    # Manual QA (require sign-off from QA team)

deploy-production:
  stage: deploy-production
  when: manual  # Require manual approval
  script:
    # Apply migration to production database (with monitoring)
    - python manage.py migrate --database=production --monitor
    # Deploy app code (rolling deployment, 10% per hour)
    - ansible-playbook deploy-production.yml --limit=10%
```

**Outcome**: Stripe reduced migration-related incidents from **15/year to 1/year** (93% reduction)

---

### Facebook: Shadow Mode Migration

**Problem**: Migrate News Feed ranking algorithm (billions of reads/day), cannot afford errors

**Solution: Shadow Mode** (run new code in background, log results, don't serve to users):

```python
class NewsFeedService:
    def get_feed(self, user_id):
        # Production: Old ranking algorithm (current)
        feed_old = self.rank_feed_old_algorithm(user_id)
        
        # Shadow: New ranking algorithm (test in background)
        feed_new = self.rank_feed_new_algorithm_async(user_id)  # Non-blocking
        
        # Log results for comparison (async, don't block user request)
        self.compare_and_log_async(feed_old, feed_new, user_id)
        
        # Return old feed (production unchanged)
        return feed_old
    
    def compare_and_log_async(self, feed_old, feed_new, user_id):
        """Compare old vs new ranking (background thread)"""
        # Calculate metrics
        overlap = len(set(feed_old) & set(feed_new)) / len(feed_old)  # % posts in common
        position_diff = self.calculate_position_diff(feed_old, feed_new)
        
        # Log to analytics
        log_event({
            'experiment': 'newsfeed_ranking_v2',
            'user_id': user_id,
            'overlap': overlap,
            'position_diff': position_diff,
            'old_top_post': feed_old[0],
            'new_top_post': feed_new[0]
        })

# Analysis after 1 week:
# - Shadow mode: 1B requests
# - Overlap: 85% (old and new rankings show same posts, different order)
# - Position diff: 2.3 positions average (acceptable)
# - Bugs detected: 5 edge cases (fixed before production)

# Rollout decision:
# - Shadow mode passed validation (85% overlap acceptable)
# - Gradual rollout: 1% → 10% → 100% (monitor user engagement metrics)
```

**Outcome**: Facebook deployed News Feed v2 with **zero user-facing incidents**, detected 5 critical bugs in shadow mode

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "How do you perform zero-downtime schema migrations?"

**Structured Answer**:

**"Use the expand-contract pattern: (1) EXPAND by adding new schema while keeping old (add full_name column, keep name column), (2) MIGRATE by deploying code that dual-writes to both old and new (write to name and full_name), (3) BACKFILL old rows in batches (copy name → full_name, 10K rows per batch, 100ms sleep, 25 minutes for 100M rows), (4) CONTRACT by deploying code that stops using old schema (only read full_name), then drop old column after 1 week safety period. This ensures zero downtime (app works during all phases), backward compatibility (v1, v2, v3 code coexist), and rollback capability (can revert at any phase)."**

**Expand-Contract Example**:
```
Step 1 (Expand): ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
  - Time: < 1 second (metadata-only)
  - Downtime: 0 seconds (non-blocking)
  - Both columns exist: name (old), full_name (new)

Step 2 (Migrate Code v2): Dual-write to both columns
  INSERT INTO users (name, full_name, email) VALUES (?, ?, ?)
  - Deploy to all servers: 48 minutes (rolling deployment)
  - Downtime: 0 seconds (each server deploys independently)

Step 3 (Backfill): Copy name → full_name for old rows
  UPDATE users SET full_name = name WHERE full_name IS NULL;
  - Batch: 10K rows per batch, 100ms sleep
  - Total time: 25 minutes (100M rows)
  - Downtime: 0 seconds (batches don't lock table)

Step 4 (Migrate Code v3): Stop using "name", use only "full_name"
  SELECT id, full_name, email FROM users WHERE id = ?
  - Deploy to all servers: 48 minutes
  - Downtime: 0 seconds

Step 5 (Contract): Drop old column
  ALTER TABLE users DROP COLUMN name;
  - Time: < 1 second (metadata-only)
  - Downtime: 0 seconds
  - Safety: Wait 1 week after v3 deploy (ensure no rollback needed)

Total: ~2 hours migration time, 0 seconds downtime (vs 1+ hours downtime with direct rename)
```

**Alternative: Blue-Green Deployment**:
```
1. Migrate schema on Green environment (staging database)
2. Deploy v2 app code to Green (test thoroughly)
3. Switch traffic: Blue (old) → Green (new) (< 1 second)
4. Rollback ready: Green issues → switch back to Blue (instant)

Benefits:
- Zero downtime (atomic traffic switch)
- Instant rollback (< 10 seconds)
- Test on Green before production (smoke/load tests)
```

**Real-world: Stripe uses expand-contract for all schema changes. Example: Migrated "card_number" column to encrypted format. Step 1: Add encrypted_card_number column. Step 2: Deploy code that writes to both (dual-write). Step 3: Backfill 100M rows in batches (30 minutes). Step 4: Deploy code that reads only from encrypted_card_number. Step 5: Drop card_number after 2 weeks. Result: 0 downtime, 0 errors, safe rollback at any phase."**

---

### Follow-Up 1: "What are the risks of ALTER TABLE on a large table?"

**Answer**:

**"ALTER TABLE on large tables (100M+ rows) can cause hours-long table locks (blocks all reads/writes = downtime), full table rewrites (expensive, slow), and replication lag (replicas fall behind master by hours). Mitigate with online schema change tools (pt-online-schema-change, gh-ost) that copy data in small chunks without locks, or use expand-contract pattern to avoid ALTER entirely (add new column instead of modifying existing)."**

**Risks**:

**1. Table Locks** (most critical):
```sql
-- Unsafe: ALTER acquires exclusive lock
ALTER TABLE users ADD COLUMN full_name VARCHAR(100) NOT NULL DEFAULT 'Unknown';

-- Lock duration: Depends on table size
-- - Small table (1K rows): < 1 second lock (acceptable)
-- - Medium table (1M rows): 5-10 seconds lock (queries pile up)
-- - Large table (100M rows): 30-60 minutes lock (DOWNTIME 🔥)

-- During lock:
-- - All reads blocked: SELECT * FROM users → waits (times out after 30s)
-- - All writes blocked: INSERT/UPDATE/DELETE → waits (times out)
-- - Replication blocked: Replicas wait for master lock to release
```

**2. Full Table Rewrite** (expensive):
```sql
-- Operations that trigger rewrite:
-- - Change column type: INT → VARCHAR (rewrite 100% rows)
-- - Add NOT NULL column: Requires default value scan (rewrite 100% rows)
-- - Add column (MySQL < 8.0): Full rewrite (PostgreSQL: metadata-only ✅)

-- Example: 100M row table, 50GB data
-- Rewrite time: 50GB / 100 MB/s = 500 seconds = 8 minutes
-- Disk usage spike: 50GB (original) + 50GB (rewrite copy) = 100GB (2x usage)
-- I/O impact: High disk I/O (slows down other queries)
```

**3. Replication Lag**:
```sql
-- Master: ALTER TABLE takes 30 minutes
-- Replicas: Also take 30 minutes to replay (single-threaded replication)
-- Replication lag: 30 minutes (replicas fall behind master)
-- Impact:
-- - Read replicas: Serve stale data (30 minutes old)
-- - Failover: Cannot promote replica (too far behind)
```

**Mitigation Strategies**:

**1. Use Online Schema Change Tools** (pt-osc, gh-ost):
```bash
# pt-online-schema-change (no table lock)
pt-online-schema-change \
  --alter "ADD COLUMN full_name VARCHAR(100)" \
  --execute \
  --chunk-size=1000 \
  D=mydb,t=users

# How it works:
# - Create new table: users_new (with full_name)
# - Copy rows in small chunks: 1000 rows per batch (no lock, 1ms each)
# - Capture ongoing writes: INSERT/UPDATE/DELETE triggers (dual-write)
# - Swap tables: RENAME (< 1 second lock)
# - Total time: 30 minutes (vs 2 hours with ALTER)
# - Downtime: < 1 second (swap)
```

**2. Expand-Contract** (avoid ALTER entirely):
```sql
-- Instead of: ALTER TABLE users RENAME COLUMN name TO full_name (locks table)
-- Do: Expand-contract (no ALTER needed)

-- Step 1: Add new column (no lock, instant)
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Step 2: Backfill (batch, no lock)
UPDATE users SET full_name = name WHERE full_name IS NULL AND id BETWEEN ? AND ?;

-- Step 3: Drop old column (after safety period, instant)
ALTER TABLE users DROP COLUMN name;
```

**3. Use Non-Blocking Syntax** (database-specific):
```sql
-- PostgreSQL: Most ALTERs are non-blocking (metadata-only)
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);  -- Instant, no lock ✅

-- PostgreSQL: Blocking operations (use CONCURRENTLY)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);  -- No lock ✅
CREATE INDEX idx_users_email ON users(email);  -- Locks table ❌

-- MySQL 5.6+: Use ALGORITHM=INPLACE, LOCK=NONE
ALTER TABLE users ADD COLUMN full_name VARCHAR(100), ALGORITHM=INPLACE, LOCK=NONE;
```

**Real-world: Shopify attempted ALTER on 1B row table (orders), caused 4-hour table lock (outage). Fix: Aborted ALTER, used pt-online-schema-change instead (35 minutes, < 1 second downtime). Lesson: Never run ALTER on production tables > 10M rows without online schema change tool."**

---

### Follow-Up 2: "How do you test schema migrations before production?"

**Answer**:

**"Test migrations in multiple stages: (1) Local testing (apply UP/DOWN migrations, run unit tests, verify rollback works), (2) CI/CD pipeline (automated linting, staging deployment, integration tests), (3) Staging environment (apply migration, deploy app code, run load tests, validate performance), (4) Blue-green deployment (migrate Green environment, test thoroughly, switch traffic). Use tools like Scientist (dual-write validation) or shadow mode (test new schema in background) to catch bugs before production. Always require manual approval before production deployment."**

**Testing Stages**:

**Stage 1: Local Testing** (developer machine):
```bash
# Apply migration
python manage.py migrate

# Run unit tests (ensure app code works with new schema)
pytest tests/

# Test rollback (verify DOWN script)
python manage.py migrate --rollback

# Manual verification (query database)
psql -c "SELECT * FROM users LIMIT 10;"
```

**Stage 2: CI/CD Pipeline** (automated):
```yaml
# .github/workflows/migration-test.yml
jobs:
  migration-test:
    steps:
      - name: Lint migration
        run: |
          # Check: Migration has UP and DOWN sections
          # Check: No DROP TABLE without safety period
          # Check: No DROP COLUMN without expand-contract pattern
          python scripts/lint_migration.py

      - name: Apply migration to test database
        run: |
          # Spin up test database (Docker)
          docker run -d postgres:13
          # Apply migration
          python manage.py migrate --database=test
      
      - name: Run unit tests
        run: pytest tests/

      - name: Test rollback
        run: python manage.py migrate --rollback --database=test
```

**Stage 3: Staging Environment** (production-like):
```bash
# Apply migration to staging database
python manage.py migrate --database=staging

# Deploy app code to staging servers
ansible-playbook deploy-staging.yml

# Run integration tests
pytest tests/integration/

# Run load tests (simulate production traffic)
locust -f loadtest.py --host=https://staging.example.com --users=1000 --spawn-rate=10

# Manual QA (verify UX unchanged)
# - Test user registration (uses new full_name column)
# - Test user profile page (displays full_name correctly)
# - Test search (searches full_name field)
```

**Stage 4: Blue-Green Deployment** (production):
```bash
# Migrate Green environment (production replica)
python manage.py migrate --database=production-green

# Deploy app code to Green servers
ansible-playbook deploy-green.yml

# Smoke tests on Green (before switching traffic)
curl https://green.example.com/health  # → 200 OK
curl https://green.example.com/api/users/123  # → {id: 123, full_name: "Alice"}

# Switch traffic to Green (< 1 second)
load_balancer.switch_to_green()

# Monitor for 1 hour (detect issues early)
# - Error rate: Should be < 0.1% (same as before)
# - Latency P95: Should be < 100ms (same as before)
# - Database CPU: Should be < 50% (no spike)

# Rollback if issues (instant)
if error_rate > 0.5%:
    load_balancer.switch_to_blue()  # Rollback in 10 seconds
```

**Stage 5: Dual-Write Validation** (production, shadow mode):
```python
# GitHub Scientist: Compare old vs new schema reads
science "user_read_migration" do |experiment|
    experiment.use { get_user_old_schema(user_id) }  # Control
    experiment.try { get_user_new_schema(user_id) }  # Candidate
    
    experiment.compare do |control, candidate|
        control['name'] == candidate['full_name']  # Assert match
    end
end

# Run on 1% production traffic (1 week)
# - 1M requests tested
# - Mismatches: 50 (0.005% error rate, investigate)
# - Performance: New schema 10% slower (acceptable)

# Fix bugs, increase to 10% → 100%
```

**Approval Workflow**:
```yaml
# Require manual approval before production
jobs:
  deploy-production:
    needs: [test-staging]
    environment:
      name: production
      approval_required: true  # Require DBA + Tech Lead sign-off

# Approval checklist:
# - ✅ Staging tests passed (unit, integration, load)
# - ✅ Migration linted (no dangerous operations)
# - ✅ Rollback tested (DOWN script works)
# - ✅ Monitoring dashboard ready (Datadog/CloudWatch)
# - ✅ On-call engineer notified (ready to respond)
```

**Real-world: Netflix runs migrations on "canary" production database (1% traffic) for 24 hours before full rollout. Detected 20% of bugs in canary stage (would have caused incidents if deployed to 100% immediately). Lesson: Gradual rollout catches issues early, minimizes impact."**

---

### Follow-Up 3: "When would you NOT use expand-contract, and what's the alternative?"

**Answer**:

**"Avoid expand-contract when: (1) Table is small (< 10K rows, direct ALTER fast enough), (2) Column is rarely used (low traffic, downtime acceptable), or (3) Migration is reversible instantly (e.g., add optional column). Alternatives: (1) Blue-green deployment (migrate entire environment, switch traffic), (2) Maintenance window (schedule downtime during low traffic, 3am Sunday), (3) Shadow table (create new table, dual-write, cutover when complete). Choose based on table size, traffic volume, and acceptable downtime."**

**When NOT to Use Expand-Contract**:

**Scenario 1: Small Tables** (< 10K rows):
```sql
-- Table: user_preferences (5K rows, 5MB)
-- Operation: Add column, change default

-- Direct ALTER is fine (< 1 second, low impact)
ALTER TABLE user_preferences
ADD COLUMN theme VARCHAR(20) DEFAULT 'light',
ALTER COLUMN notification_email SET DEFAULT true;

-- Why expand-contract is overkill:
-- - Expand-contract: 4 steps, 1 week timeline
-- - Direct ALTER: 1 step, < 1 second
-- - Downtime: < 1 second (acceptable for low-traffic table)
```

**Scenario 2: Low-Traffic Table**:
```sql
-- Table: admin_audit_log (100K rows, only admins access)
-- Traffic: 10 QPS (vs users table 10K QPS)

-- Maintenance window approach (3am Sunday)
-- Expected downtime: 5 minutes (backfill 100K rows)
-- Impact: 0 admins online at 3am (acceptable)

-- Schedule migration:
# cron: 0 3 * * 0 (every Sunday 3am)
python manage.py migrate --maintenance-mode
```

**Scenario 3: Reversible Instantly** (add optional column):
```sql
-- Operation: Add optional column (NULL allowed)
ALTER TABLE users ADD COLUMN bio TEXT;

-- Why expand-contract is overkill:
-- - Rollback: Just drop column (instant, no data loss)
-- - No dual-write needed (column is optional, can be NULL)
-- - No backfill needed (NULL is acceptable initial value)

-- Direct ALTER is fine:
-- - Time: < 1 second (metadata-only)
-- - Downtime: 0 seconds (non-blocking in PostgreSQL)
-- - Rollback: ALTER TABLE users DROP COLUMN bio; (instant)
```

**Alternatives to Expand-Contract**:

**Alternative 1: Blue-Green Deployment**:
```
When to use:
- Need to test entire system (not just schema)
- Have infrastructure for dual environments (2x cost)
- Want instant rollback capability (< 10 seconds)

How it works:
1. Migrate schema on Green environment (staging)
2. Deploy app code to Green (test thoroughly)
3. Switch traffic: Blue → Green (atomic, < 1 second)
4. Keep Blue as rollback target (1 week)

Example:
- Stripe uses blue-green for major releases
- Switch traffic via load balancer (NGINX reload)
- Rollback: Just switch back to Blue (10 seconds)
```

**Alternative 2: Maintenance Window**:
```
When to use:
- Table is large but low-traffic (admin tables, logs)
- Can schedule downtime (SLA allows 99.9% = 43 min/month)
- Want simplest approach (no complex tooling)

How it works:
1. Schedule migration: 3am Sunday (low traffic)
2. Enable maintenance mode (HTTP 503 "Under Maintenance")
3. Apply migration (ALTER TABLE, backfill, etc.)
4. Run smoke tests (verify migration succeeded)
5. Disable maintenance mode (resume traffic)

Example:
- GitHub schedules maintenance: 3rd Saturday 11pm PST
- Notify users: "Scheduled maintenance 11pm-12am"
- Apply migrations, deploy code (1 hour downtime)
- Acceptable: 99.9% SLA (43 min/month allowed)
```

**Alternative 3: Shadow Table** (parallel table):
```
When to use:
- Migration is complex (major schema redesign)
- Need to validate data correctness (100% confidence)
- Can afford dual-write overhead (2x write traffic)

How it works:
1. Create new table: users_v2 (new schema)
2. Dual-write: INSERT into both users and users_v2
3. Backfill: Copy existing rows (users → users_v2)
4. Validate: Compare users vs users_v2 (ensure identical)
5. Cutover: Rename users → users_old, users_v2 → users (atomic)
6. Drop old table after safety period

Example:
- Facebook News Feed migration (redesigned schema)
- Shadow table: newsfeed_v2 (new ranking algorithm)
- Dual-write for 1 month (validate 1B rows match)
- Cutover: Atomic rename (< 1 second downtime)
- Drop newsfeed_v1 after 1 week
```

**Decision Matrix**:

| Criteria | Expand-Contract | Blue-Green | Maintenance Window | Shadow Table |
|----------|-----------------|------------|-------------------|--------------|
| **Table size** | > 1M rows ✅ | Any size ✅ | < 10M rows ⚠️ | > 100M rows ✅ |
| **Traffic** | High (1K+ QPS) ✅ | High ✅ | Low (< 100 QPS) ⚠️ | High ✅ |
| **Downtime** | 0 seconds ✅ | 0 seconds ✅ | Minutes-hours ❌ | 0 seconds ✅ |
| **Complexity** | Medium ⚠️ | High ❌ | Low ✅ | Very high ❌ |
| **Cost** | Low ✅ | High (2x infra) ❌ | Low ✅ | High (2x storage) ❌ |
| **Rollback** | Multi-phase ⚠️ | Instant (10s) ✅ | Manual ❌ | Instant (rename) ✅ |

**Recommendation**:
- **Default**: Expand-contract (works for 80% of migrations)
- **Small tables**: Direct ALTER (< 10K rows, < 1 second downtime)
- **Major releases**: Blue-green (test entire system before cutover)
- **Complex migrations**: Shadow table (validate 100% data correctness)

**Real-world: Shopify uses expand-contract for 95% of migrations (standard pattern). Blue-green for major releases (Black Friday, Prime Day prep). Maintenance window for low-traffic tables (admin dashboards, internal tools). Shadow table for critical migrations (payment processing, checkout flow redesign). Decision: Based on table size, traffic, and risk tolerance."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Expand-Contract Pattern (Step-by-Step)

```
┌────────────────────────────────────────────────────────┐
│      EXPAND-CONTRACT PATTERN (Zero-Downtime)          │
└────────────────────────────────────────────────────────┘

INITIAL STATE:
═══════════════════════════════════════════════════════
┌──────────────────────────────┐       ┌─────────────────┐
│  App v1 (Production)         │       │  Database       │
│                              │       │                 │
│  def create_user(name):      │       │  users:         │
│    db.execute(               │◀─────▶│  - id           │
│      "INSERT INTO users      │       │  - name 📍      │
│       (name) VALUES (?)"     │       │  - email        │
│    )                         │       └─────────────────┘
└──────────────────────────────┘


STEP 1: EXPAND (Add New Column)
═══════════════════════════════════════════════════════
Day 0: Add full_name column (new schema)

ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

┌──────────────────────────────┐       ┌─────────────────┐
│  App v1 (Still running)      │       │  Database       │
│                              │       │                 │
│  def create_user(name):      │       │  users:         │
│    db.execute(               │◀─────▶│  - id           │
│      "INSERT INTO users      │       │  - name 📍      │
│       (name) VALUES (?)"     │       │  - full_name ✨ │
│    )                         │       │  - email        │
│  # Still uses "name" only    │       └─────────────────┘
└──────────────────────────────┘
                                        Schema now has BOTH:
Status: ✅ No breaking changes          - name (old, used by v1)
        ✅ v1 code still works          - full_name (new, empty)
        ⏸️ full_name is NULL for now


STEP 2: DEPLOY v2 CODE (Dual-Write)
═══════════════════════════════════════════════════════
Day 1: Deploy app v2 (writes to BOTH columns)

┌──────────────────────────────┐       ┌─────────────────┐
│  App v2 (Gradual rollout)    │       │  Database       │
│                              │       │                 │
│  def create_user(full_name): │       │  users:         │
│    db.execute(               │◀─────▶│  - id           │
│      "INSERT INTO users      │       │  - name 📍      │
│       (name, full_name)      │       │  - full_name ✨ │
│       VALUES (?, ?)",        │       │  - email        │
│      full_name, full_name    │       └─────────────────┘
│    )  # DUAL-WRITE 📝        │
│  }                           │       New rows have BOTH:
│                              │       - name = "Alice Smith"
│  def get_user(user_id):      │       - full_name = "Alice Smith"
│    user = db.query(          │
│      "SELECT id, name,       │       Old rows have only:
│       full_name FROM users"  │       - name = "Bob Jones"
│    )                         │       - full_name = NULL
│    # Prefer full_name        │
│    user.full_name ||= user.name  
│    return user               │
└──────────────────────────────┘

Status: ✅ v2 writes to BOTH columns
        ✅ v2 reads from full_name (fallback to name)
        ⚠️ Old rows still have NULL full_name


STEP 3: BACKFILL (Copy Old Data)
═══════════════════════════════════════════════════════
Day 2: Backfill old rows (copy name → full_name)

# Batch backfill (10K rows per batch, avoid lock)
for batch_start in range(0, 100_000_000, 10_000):
    db.execute("""
        UPDATE users
        SET full_name = name
        WHERE id BETWEEN ? AND ?
          AND full_name IS NULL
    """, batch_start, batch_start + 10_000)
    
    sleep(0.1)  # 100ms sleep (reduce load)

# Total time: 100M rows / 10K per batch = 10,000 batches
#             10,000 × 150ms (50ms query + 100ms sleep) = 25 minutes

┌──────────────────────────────┐       ┌─────────────────┐
│  App v2 (Still running)      │       │  Database       │
│                              │       │                 │
│  def create_user(full_name): │       │  users:         │
│    db.execute(               │◀─────▶│  - id           │
│      "INSERT INTO users      │       │  - name 📍      │
│       (name, full_name)      │       │  - full_name ✅ │
│       VALUES (?, ?)"         │       │  - email        │
│    )                         │       └─────────────────┘
└──────────────────────────────┘
                                        After backfill:
Status: ✅ All rows have full_name      - name = "Alice Smith"
        ✅ full_name = name (identical) - full_name = "Alice Smith"
        ✅ Ready for next step


STEP 4: DEPLOY v3 CODE (Stop Using Old Column)
═══════════════════════════════════════════════════════
Day 7: Deploy v3 (only read/write full_name)

┌──────────────────────────────┐       ┌─────────────────┐
│  App v3 (Gradual rollout)    │       │  Database       │
│                              │       │                 │
│  def create_user(full_name): │       │  users:         │
│    db.execute(               │◀─────▶│  - id           │
│      "INSERT INTO users      │       │  - name 📍 (unused)
│       (full_name, email)     │       │  - full_name ✅ │
│       VALUES (?, ?)"         │       │  - email        │
│    )                         │       └─────────────────┘
│    # Only write full_name ✨ │
│  }                           │       v3 writes only to:
│                              │       - full_name = "Carol Lee"
│  def get_user(user_id):      │       - name = NULL (old column unused)
│    user = db.query(          │
│      "SELECT id, full_name,  │
│       email FROM users"      │
│    )                         │
│    # Only read full_name ✅  │
│    return user               │
└──────────────────────────────┘

Status: ✅ v3 only uses full_name
        ⏸️ name column is unused (but still exists)
        🔒 Wait 1 week (ensure no rollback needed)


STEP 5: CONTRACT (Drop Old Column)
═══════════════════════════════════════════════════════
Day 14: Drop name column (after 1 week safety period)

ALTER TABLE users DROP COLUMN name;

┌──────────────────────────────┐       ┌─────────────────┐
│  App v3 (Production)         │       │  Database       │
│                              │       │                 │
│  def create_user(full_name): │       │  users:         │
│    db.execute(               │◀─────▶│  - id           │
│      "INSERT INTO users      │       │  - full_name ✅ │
│       (full_name, email)     │       │  - email        │
│       VALUES (?, ?)"         │       └─────────────────┘
│    )                         │
│  }                           │       Migration complete:
│                              │       - name column DELETED
│  def get_user(user_id):      │       - full_name is primary column
│    user = db.query(          │       - Clean schema ✅
│      "SELECT id, full_name,  │
│       email FROM users"      │
│    )                         │
│    return user               │
└──────────────────────────────┘

Status: ✅ Migration complete
        ✅ Zero downtime (worked at all stages)
        ✅ Backward compatible (v1, v2, v3 coexisted)
        ✅ Rollback capability (until step 5)


TIMELINE SUMMARY:
═══════════════════════════════════════════════════════
Day 0:  Expand (add full_name column) [< 1 second]
Day 1:  Deploy v2 (dual-write) [48 minutes rolling deploy]
Day 2:  Backfill (copy name → full_name) [25 minutes batched]
Day 3:  Validate (ensure 100% rows have full_name) [1 hour]
Day 7:  Deploy v3 (stop using name) [48 minutes rolling deploy]
Day 14: Contract (drop name column) [< 1 second]

Total migration time: 14 days (safe, gradual)
Total active work: ~3 hours (deployments + backfill)
Downtime: 0 seconds (no interruption at any stage)

vs Direct Rename (UNSAFE):
  ALTER TABLE users RENAME COLUMN name TO full_name;
  - Downtime: 1+ hours (must deploy new code atomically)
  - Risk: High (old code breaks immediately)
  - Rollback: Difficult (requires another migration + deploy)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Schema Migrations Matter

**Impact**:
- Downtime risk (unsafe ALTER locks table for hours = lost revenue)
- Data corruption (failed migration loses data permanently)
- Application errors (incompatible schema breaks running code)
- Cascading failures (locked table blocks all queries = outage)

**Common Scenarios**:
- Rename column (name → full_name): Requires expand-contract (2 weeks)
- Add column (bio TEXT): Safe with DEFAULT (instant)
- Drop column (middle_name): Dangerous without safety period (1 week wait)
- Change type (age INT → VARCHAR): Requires new column + backfill

### Key Strategies

**1. Expand-Contract Pattern** (Zero-downtime standard):
```sql
-- Step 1: Expand (add new column)
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Step 2: Backfill (copy data in batches)
UPDATE users SET full_name = name WHERE full_name IS NULL AND id BETWEEN ? AND ?;

-- Step 3: Contract (drop old column after safety period)
ALTER TABLE users DROP COLUMN name;

-- Timeline: 2 weeks (gradual), 0 seconds downtime
```

**2. Blue-Green Deployment** (Instant rollback):
```
1. Migrate schema on Green (staging)
2. Deploy app code to Green (test thoroughly)
3. Switch traffic Blue → Green (< 1 second)
4. Rollback if issues: Green → Blue (10 seconds)
```

**3. Online Schema Change Tools** (Large tables):
```bash
# pt-online-schema-change (MySQL, 100M rows, 30 minutes, 0 downtime)
pt-osc --alter "ADD COLUMN full_name VARCHAR(100)" --execute D=mydb,t=users

# gh-ost (pausable, 35 minutes)
gh-ost --alter="ADD COLUMN full_name VARCHAR(100)" --execute
```

**4. Feature Flags** (Gradual rollout):
```python
# Rollout new schema code: 1% → 10% → 100%
if feature_flag('use_full_name', user_id, default=False):
    # Use new column
    user = db.query("SELECT full_name FROM users")
else:
    # Use old column
    user = db.query("SELECT name FROM users")

# Instant rollback: 100% → 0% (no code deploy)
```

### Production Checklist

- [ ] **Test locally**: Apply UP/DOWN, run unit tests, verify rollback
- [ ] **CI/CD pipeline**: Lint migration (check expand-contract pattern, reject unsafe ops)
- [ ] **Staging test**: Apply migration, deploy code, run integration/load tests
- [ ] **Blue-green**: Migrate Green, switch traffic (< 1 second), rollback ready
- [ ] **Monitoring**: Track error rate, latency P95, database CPU (alert on spike)
- [ ] **Dual-write validation**: Use Scientist or shadow mode (compare old vs new schema)
- [ ] **Batch backfill**: 10K rows per batch, 100ms sleep (avoid table lock)
- [ ] **Safety period**: Wait 1 week after deploy before dropping old column (ensure no rollback)
- [ ] **Manual approval**: Require DBA + tech lead sign-off before production
- [ ] **Post-migration**: Drop old column after validation, analyze performance

### Bottom Line

**Schema migration is the process of changing database schema (rename column, add column, drop column, change type) in live production without downtime or errors. For FAANG interviews: Explain expand-contract pattern (most important, 4 steps: EXPAND add new column keep old, MIGRATE deploy code dual-write to both, BACKFILL copy old data in batches 10K rows 100ms sleep 25 minutes for 100M rows, CONTRACT drop old column after 1 week safety period), ensures zero downtime (app works at all stages), backward compatibility (v1 v2 v3 code coexist), and rollback capability (can revert at any phase). Risks of unsafe ALTER: table locks (hours for 100M rows = downtime), full rewrite (50GB table = 8 minutes rewrite + 2x disk usage spike), replication lag (replicas fall behind 30 minutes = stale data). Mitigation: online schema change tools (pt-online-schema-change copies in 1K row chunks no lock 30 minutes vs 2 hours with ALTER, gh-ost pausable uses binary log no triggers), blue-green deployment (migrate Green test switch traffic < 1 second rollback instant), feature flags (gradual rollout 1% 10% 100% instant rollback 0% no deploy). Real-world example: Stripe migrated 100M user profiles from "name" to "full_name" using expand-contract (Day 0 add full_name, Day 1 deploy v2 dual-write, Day 2 backfill 25 minutes, Day 7 deploy v3 stop using name, Day 14 drop name column). Result: 0 downtime, 0 errors, safe rollback at every phase. Test migrations thoroughly: local testing (UP/DOWN unit tests rollback), CI/CD automated (lint staging integration tests load tests), staging validation (apply migration deploy code verify performance), blue-green cutover (migrate Green test smoke/load switch traffic monitor 1 hour rollback if issues). Alternatives to expand-contract: blue-green for major releases (test entire system before cutover), maintenance window for low-traffic tables (3am Sunday 1 hour acceptable downtime), shadow table for complex migrations (create users_v2 dual-write validate atomic rename). Choose based on table size (< 10K rows direct ALTER, > 1M rows expand-contract or online tools), traffic (high QPS zero downtime required, low QPS maintenance window OK), risk tolerance (payment systems shadow table 100% validation, admin tools direct ALTER acceptable).**

