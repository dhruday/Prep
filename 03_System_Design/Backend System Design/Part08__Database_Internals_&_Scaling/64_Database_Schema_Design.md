# 64. Database Schema Design

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Database Schema Design?

**Database Schema Design** is the process of defining the structure, relationships, and constraints of data in a database to support application requirements efficiently.

**Schema = Blueprint of your database**

```
Without Schema Design:
- Unstructured data (hard to query)
- Data duplication (wasted storage)
- Inconsistent data (integrity issues)
- Poor performance (no optimization)

With Good Schema Design:
- Structured data (easy to query)
- Minimal duplication (efficient storage)
- Data integrity (constraints, foreign keys)
- Optimized performance (indexes, partitioning)
```

### Core Components

**Tables (Entities)**:
```sql
-- Users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Relationships**:
```
One-to-One:   User ←→ Profile
One-to-Many:  User → Orders (one user, many orders)
Many-to-Many: Students ←→ Courses (via enrollment table)
```

**Constraints**:
```sql
PRIMARY KEY: Unique identifier (user_id)
FOREIGN KEY: References another table (order.user_id → users.user_id)
UNIQUE: No duplicates (email)
NOT NULL: Required field (username)
CHECK: Custom validation (age > 0)
```

### Real-World Analogy

Think of a library:
- **Tables**: Book catalog, Member catalog, Loan records
- **Relationships**: Member borrows Book (many-to-many via Loan)
- **Constraints**: ISBN must be unique, Member must exist before borrowing

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Entity-Relationship (ER) Modeling

**Step 1: Identify Entities**

For an e-commerce system:
```
Entities:
- User (customers)
- Product (items for sale)
- Order (purchase records)
- Payment (transaction records)
- Review (product feedback)
```

**Step 2: Define Attributes**

```sql
-- User entity
user_id (PK)
username
email
password_hash
first_name
last_name
phone
created_at
updated_at

-- Product entity
product_id (PK)
name
description
price
stock_quantity
category_id (FK)
seller_id (FK)
created_at

-- Order entity
order_id (PK)
user_id (FK)
total_amount
status (pending, confirmed, shipped, delivered)
created_at
shipped_at
delivered_at
```

**Step 3: Define Relationships**

```
User → Orders: One-to-Many
  - One user can have many orders
  - order.user_id references users.user_id

Product → Reviews: One-to-Many
  - One product can have many reviews
  - review.product_id references products.product_id

Order ← OrderItems → Product: Many-to-Many
  - One order contains many products
  - One product can be in many orders
  - Resolved via OrderItems join table
```

**Complete E-Commerce Schema**:

```sql
-- Users table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id INTEGER REFERENCES categories(category_id),
    seller_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_timestamps CHECK (
        (shipped_at IS NULL OR shipped_at >= created_at) AND
        (delivered_at IS NULL OR delivered_at >= shipped_at)
    )
);

-- Order Items (join table for Order-Product many-to-many)
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(10, 2) NOT NULL,  -- Store price at time of purchase
    
    UNIQUE(order_id, product_id)  -- Prevent duplicate products in same order
);

-- Reviews table
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_id, user_id)  -- One review per user per product
);

-- Payments table
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_category_id INTEGER REFERENCES categories(category_id),  -- Self-referencing for hierarchy
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_seller_id ON products(seller_id);
```

---

### 2. Relationship Cardinality Deep Dive

**One-to-One (1:1)**:

```sql
-- User has one Profile (extended info)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE user_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id),  -- UNIQUE ensures 1:1
    bio TEXT,
    avatar_url VARCHAR(255),
    date_of_birth DATE
);

-- Alternative: Combine into single table (better for 1:1)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    date_of_birth DATE
);
```

**When to use separate tables (1:1)**:
- Large TEXT/BLOB columns (slow down queries if in main table)
- Optional data (most users don't have profile, save space)
- Security (separate permissions for profile vs user)

**One-to-Many (1:N)**:

```sql
-- One author, many books
CREATE TABLE authors (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    author_id INTEGER NOT NULL REFERENCES authors(author_id),  -- FK in "many" side
    published_year INTEGER
);

-- Query: Get all books by author
SELECT b.title, b.published_year
FROM books b
WHERE b.author_id = 123;
```

**Many-to-Many (M:N)**:

```sql
-- Students enroll in Courses
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Join table (enrollment)
CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id),
    course_id INTEGER NOT NULL REFERENCES courses(course_id),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    grade VARCHAR(2),  -- Additional attributes on relationship
    
    UNIQUE(student_id, course_id)  -- Prevent duplicate enrollments
);

-- Query: Get all courses for student
SELECT c.name, e.enrolled_at, e.grade
FROM enrollments e
JOIN courses c ON e.course_id = c.course_id
WHERE e.student_id = 456;

-- Query: Get all students in course
SELECT s.name, e.grade
FROM enrollments e
JOIN students s ON e.student_id = s.student_id
WHERE e.course_id = 789;
```

---

### 3. Schema Design Patterns

**Pattern 1: Polymorphic Associations (Anti-Pattern)**

```sql
-- BAD: Generic foreign key (type + id)
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    commentable_type VARCHAR(50),  -- 'Post', 'Video', 'Photo'
    commentable_id INTEGER,        -- ID of Post, Video, or Photo
    content TEXT
);

-- Problems:
-- ❌ Can't enforce foreign key constraints
-- ❌ No referential integrity (commentable_id=999 might not exist)
-- ❌ Hard to query (need UNION for each type)
```

**Better: Explicit Foreign Keys**

```sql
-- GOOD: Separate nullable foreign keys
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id),
    video_id INTEGER REFERENCES videos(video_id),
    photo_id INTEGER REFERENCES photos(photo_id),
    content TEXT,
    
    CHECK (
        (post_id IS NOT NULL AND video_id IS NULL AND photo_id IS NULL) OR
        (post_id IS NULL AND video_id IS NOT NULL AND photo_id IS NULL) OR
        (post_id IS NULL AND video_id IS NULL AND photo_id IS NOT NULL)
    )  -- Exactly one FK must be non-null
);
```

**Pattern 2: Multi-Tenant Schema**

```sql
-- Option 1: Shared schema with tenant_id (most common)
CREATE TABLE tenants (
    tenant_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    
    UNIQUE(tenant_id, username),  -- Username unique per tenant
    UNIQUE(tenant_id, email)
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    total_amount DECIMAL(10, 2),
    
    -- Ensure user belongs to same tenant
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, user_id)
);

-- Row-Level Security (PostgreSQL)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant_id')::INTEGER);
```

**Pattern 3: Soft Deletes**

```sql
-- Keep deleted records (for audit, undo)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMP,  -- NULL = active, non-NULL = deleted
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance (filter out deleted)
CREATE INDEX idx_users_active ON users(user_id) WHERE deleted_at IS NULL;

-- Query active users only
SELECT * FROM users WHERE deleted_at IS NULL;

-- "Delete" user (soft delete)
UPDATE users SET deleted_at = NOW() WHERE user_id = 123;

-- Restore user
UPDATE users SET deleted_at = NULL WHERE user_id = 123;
```

**Pattern 4: Audit Logging**

```sql
-- Track all changes to users table
CREATE TABLE users_audit (
    audit_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,  -- Previous state
    new_values JSONB,  -- New state
    changed_by INTEGER REFERENCES users(user_id),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to auto-populate audit table
CREATE OR REPLACE FUNCTION audit_users()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO users_audit (user_id, action, new_values)
        VALUES (NEW.user_id, 'INSERT', row_to_json(NEW)::JSONB);
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO users_audit (user_id, action, old_values, new_values)
        VALUES (OLD.user_id, 'UPDATE', row_to_json(OLD)::JSONB, row_to_json(NEW)::JSONB);
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO users_audit (user_id, action, old_values)
        VALUES (OLD.user_id, 'DELETE', row_to_json(OLD)::JSONB);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_users();
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Storage Estimation

**E-Commerce System (1M users)**:

```
Users:
- 1M rows
- Per row: user_id (4 bytes) + username (50 bytes) + email (100 bytes) + password_hash (255 bytes) + timestamps (16 bytes) = 425 bytes
- Total: 1M × 425 bytes = 425 MB

Products:
- 100K rows
- Per row: 500 bytes (name, description, price, etc.)
- Total: 100K × 500 = 50 MB

Orders:
- 10M rows (10 orders per user on average)
- Per row: 200 bytes
- Total: 10M × 200 = 2 GB

Order Items:
- 30M rows (3 items per order on average)
- Per row: 100 bytes
- Total: 30M × 100 = 3 GB

Reviews:
- 500K rows (50% of products have reviews)
- Per row: 500 bytes
- Total: 500K × 500 = 250 MB

Payments:
- 10M rows (one per order)
- Per row: 150 bytes
- Total: 10M × 150 = 1.5 GB

Indexes (30% overhead):
- Data: 7.225 GB
- Indexes: 7.225 × 0.3 = 2.17 GB

Total: 7.225 + 2.17 = 9.4 GB

With 3x safety margin: 9.4 × 3 = 28.2 GB
```

**Growth Rate**:
```
Users grow 20% per year: 1M → 1.2M (additional 85 MB)
Orders grow 30% per year: 10M → 13M (additional 600 MB)

Annual growth: ~700 MB/year
Plan for 5 years: 28.2 + (0.7 × 5) = 31.7 GB
```

---

## 4. Data & Storage Design

### Data Types Selection

**Integers**:
```sql
-- Choose size based on max value
SMALLINT: -32,768 to 32,767 (2 bytes)
INTEGER: -2B to 2B (4 bytes)
BIGINT: -9 quintillion to 9 quintillion (8 bytes)

-- Example:
age SMALLINT  -- Max 32K (enough for age)
user_id INTEGER  -- Max 2B users (likely enough)
order_count BIGINT  -- If potentially > 2B orders
```

**Strings**:
```sql
-- Fixed length (faster, but wastes space if shorter)
CHAR(10): Always 10 bytes (padded with spaces)
  Use for: Fixed-length codes (country code 'US', state 'CA')

-- Variable length (most common)
VARCHAR(100): Up to 100 bytes (only uses actual length)
  Use for: Names, emails, addresses

-- Unlimited length (stored externally if > 2KB)
TEXT: No limit
  Use for: Descriptions, comments, articles
```

**Decimals**:
```sql
-- DECIMAL(precision, scale)
DECIMAL(10, 2): 10 total digits, 2 after decimal (e.g., 12345678.90)
  Use for: Prices ($99,999,999.99 max)

DECIMAL(15, 4): For currencies requiring more precision
  Use for: Cryptocurrency (0.00001234 BTC)

-- DON'T use FLOAT for money (floating-point precision errors)
-- BAD: 0.1 + 0.2 = 0.30000000000000004
```

**Dates & Times**:
```sql
DATE: Date only (2000-01-01)
TIME: Time only (14:30:00)
TIMESTAMP: Date + time (2000-01-01 14:30:00)
TIMESTAMPTZ: Date + time with timezone (recommended)

-- Always use TIMESTAMPTZ for user-facing times
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Schema Design for Scale

**Avoid JOINs for High-Scale Reads**:

```sql
-- Denormalize frequently accessed data

-- Normalized (requires JOIN):
SELECT u.username, o.order_id, o.total_amount
FROM orders o
JOIN users u ON o.user_id = u.user_id
WHERE o.order_id = 123;

-- Denormalized (no JOIN, faster):
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username VARCHAR(50),  -- Denormalized from users table
    total_amount DECIMAL(10, 2)
);

SELECT username, order_id, total_amount
FROM orders
WHERE order_id = 123;

-- Trade-off: Username changes require updating all orders
-- Solution: If username rarely changes, denormalization worth it
```

**Partitioning Strategy**:

```sql
-- Partition orders by created_at (range partitioning)
CREATE TABLE orders (
    order_id BIGINT,
    user_id INTEGER,
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Query optimizer automatically uses correct partition
SELECT * FROM orders WHERE created_at >= '2024-01-15';
-- Only scans orders_2024_01 partition
```

---

## 6. Security, APIs & Governance

### Data Security in Schema

**Encryption at Rest**:
```sql
-- Encrypt sensitive columns (PostgreSQL pgcrypto)
CREATE EXTENSION pgcrypto;

-- Store encrypted SSN
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(100),
    ssn_encrypted BYTEA  -- Encrypted social security number
);

-- Insert with encryption
INSERT INTO users (email, ssn_encrypted)
VALUES ('user@example.com', pgp_sym_encrypt('123-45-6789', 'encryption_key'));

-- Decrypt on read
SELECT email, pgp_sym_decrypt(ssn_encrypted, 'encryption_key') AS ssn
FROM users
WHERE user_id = 123;
```

**Row-Level Security**:
```sql
-- Users can only see their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_orders ON orders
    FOR SELECT
    USING (user_id = current_user_id());  -- Custom function returning current user

-- Admin can see all orders
CREATE POLICY admin_orders ON orders
    FOR ALL
    USING (is_admin());  -- Custom function checking admin role
```

---

## 7. Real-World Examples & Case Studies

### Instagram Schema Design

**Problem**: Store billions of photos, users, likes, comments

**Schema** (simplified):
```sql
-- Users (1B+ rows)
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(30) UNIQUE,
    email VARCHAR(100),
    created_at TIMESTAMP
);

-- Photos (50B+ rows)
CREATE TABLE photos (
    photo_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    image_url VARCHAR(255),
    caption TEXT,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);  -- Partition by time

-- Likes (500B+ rows)
-- Many-to-many: Users ←→ Photos
CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    photo_id BIGINT NOT NULL,
    created_at TIMESTAMP,
    
    PRIMARY KEY (user_id, photo_id)  -- Composite PK (prevents duplicate likes)
) PARTITION BY HASH (photo_id);  -- Partition by photo_id for even distribution

-- Comments (10B+ rows)
CREATE TABLE comments (
    comment_id BIGINT PRIMARY KEY,
    photo_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT,
    created_at TIMESTAMP
) PARTITION BY HASH (photo_id);

-- Indexes
CREATE INDEX idx_photos_user_id ON photos(user_id);  -- Get user's photos
CREATE INDEX idx_likes_photo_id ON likes(photo_id);  -- Count likes on photo
CREATE INDEX idx_comments_photo_id ON comments(photo_id);  -- Get photo's comments
```

**Key Decisions**:
1. **Composite PK on likes**: `(user_id, photo_id)` prevents duplicate likes, no separate `like_id` needed
2. **Partitioning**: Photos by time (recent photos accessed more), Likes/Comments by hash (even distribution)
3. **Denormalization**: Store `username` in photos table for fast display (avoid JOIN)

---

### Uber Schema Design

**Problem**: Track millions of trips, drivers, riders in real-time

**Schema**:
```sql
-- Riders
CREATE TABLE riders (
    rider_id BIGINT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    rating DECIMAL(3, 2)  -- 4.85
);

-- Drivers
CREATE TABLE drivers (
    driver_id BIGINT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    license_number VARCHAR(50),
    rating DECIMAL(3, 2),
    current_lat DECIMAL(10, 8),  -- Real-time location
    current_lng DECIMAL(11, 8),
    status VARCHAR(20)  -- 'available', 'on_trip', 'offline'
);

-- Trips
CREATE TABLE trips (
    trip_id BIGINT PRIMARY KEY,
    rider_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    dropoff_lat DECIMAL(10, 8),
    dropoff_lng DECIMAL(11, 8),
    status VARCHAR(20),  -- 'requested', 'accepted', 'in_progress', 'completed', 'cancelled'
    fare DECIMAL(10, 2),
    distance_km DECIMAL(10, 2),
    duration_minutes INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
) PARTITION BY RANGE (created_at);  -- Partition by time (old trips archived)

-- Payments
CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY,
    trip_id BIGINT UNIQUE NOT NULL,  -- One payment per trip
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_drivers_location ON drivers(current_lat, current_lng) WHERE status = 'available';  -- Spatial query
CREATE INDEX idx_trips_rider_id ON trips(rider_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
```

**Key Decisions**:
1. **Driver location in drivers table**: Updated every 5 seconds (not in trips table)
2. **Spatial index**: For finding nearby available drivers (`WHERE status = 'available'`)
3. **Trip partitioning**: By time (hot data: last 7 days, cold data: > 30 days archived)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Design a database schema for Twitter"

**Structured Answer**:

**"I'll design schema for core features: Users, Tweets, Follows, Likes, Retweets."**

**Step 1: Identify Entities**:
```
- Users (profiles)
- Tweets (posts)
- Follows (user relationships)
- Likes (engagement)
- Retweets (sharing)
```

**Step 2: Define Schema**:
```sql
-- Users (500M rows)
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    bio VARCHAR(160),
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP
);

-- Tweets (500B rows, heavily partitioned)
CREATE TABLE tweets (
    tweet_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content VARCHAR(280) NOT NULL,
    like_count INTEGER DEFAULT 0,
    retweet_count INTEGER DEFAULT 0,
    reply_to_tweet_id BIGINT,  -- For threading
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Follows (many-to-many: users ←→ users)
CREATE TABLE follows (
    follower_id BIGINT NOT NULL,
    following_id BIGINT NOT NULL,
    created_at TIMESTAMP,
    
    PRIMARY KEY (follower_id, following_id)
);

-- Likes (many-to-many: users ←→ tweets)
CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    tweet_id BIGINT NOT NULL,
    created_at TIMESTAMP,
    
    PRIMARY KEY (user_id, tweet_id)
) PARTITION BY HASH (tweet_id);

-- Indexes
CREATE INDEX idx_tweets_user_id ON tweets(user_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_likes_tweet_id ON likes(tweet_id);
```

**Step 3: Key Decisions**:
1. **Composite PK on follows/likes**: No need for separate ID, prevents duplicates
2. **Denormalized counts**: `like_count`, `retweet_count` in tweets (avoid COUNT(*) queries)
3. **Partitioning**: Tweets by time (hot: last 7 days, cold: archived), Likes by hash (even distribution)
4. **Self-referencing FK**: `reply_to_tweet_id` for tweet threads

**Trade-offs**:
- ✅ Fast reads (no JOINs for counts)
- ❌ Update complexity (increment `like_count` when like added)
- Solution: Use triggers or application logic to maintain counts

---

### Follow-Up 1: "How do you handle schema changes without downtime?"

**Answer**:

**"Use backward-compatible migrations with multi-phase deployment."**

**Scenario: Add `phone` column to users**

**Phase 1: Additive change (backward compatible)**:
```sql
-- Add nullable column (safe, no downtime)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Deploy application v2 (writes phone if present, reads work with/without)
```

**Phase 2: Backfill data**:
```sql
-- Populate phone for existing users (batched, not during peak hours)
UPDATE users SET phone = get_phone_from_external_service(user_id)
WHERE phone IS NULL
LIMIT 1000;  -- Batch of 1000, repeat until complete
```

**Phase 3: Add constraint**:
```sql
-- After all rows backfilled, make NOT NULL (if required)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

**Scenario: Rename column `username` → `display_name`**

**Phase 1: Add new column**:
```sql
ALTER TABLE users ADD COLUMN display_name VARCHAR(50);
UPDATE users SET display_name = username;  -- Backfill
```

**Phase 2: Dual writes**:
```python
# Application writes to both columns
user.username = "john_doe"
user.display_name = "john_doe"
```

**Phase 3: Deprecate old column**:
```sql
-- After all code uses display_name
ALTER TABLE users DROP COLUMN username;
```

**Best practices**:
- Never DROP or ALTER in single migration (breaking change)
- Always ADD new, BACKFILL, then DROP old
- Use feature flags to control rollout

---

### Follow-Up 2: "How do you design schema for multi-tenant SaaS?"

**Answer**:

**"Three approaches: Shared schema with tenant_id, separate schemas, separate databases."**

**Option 1: Shared Schema (Most Common)**:
```sql
-- Single database, tenant_id in every table
CREATE TABLE tenants (
    tenant_id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    plan VARCHAR(20)  -- 'free', 'pro', 'enterprise'
);

CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    username VARCHAR(50),
    
    UNIQUE(tenant_id, username)  -- Username unique per tenant
);

CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    user_id BIGINT NOT NULL,
    
    FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, user_id)
);

-- Row-Level Security (PostgreSQL)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant')::INTEGER);

-- Set tenant context per request
SET app.current_tenant = 123;
SELECT * FROM users;  -- Only sees tenant 123's users
```

**Pros**: Easy to manage, cost-effective, efficient resource usage
**Cons**: Risk of data leakage (if RLS misconfigured), noisy neighbors (one tenant's query slows others)

**Option 2: Separate Schemas**:
```sql
-- One schema per tenant in same database
CREATE SCHEMA tenant_123;
CREATE SCHEMA tenant_456;

CREATE TABLE tenant_123.users (...);
CREATE TABLE tenant_456.users (...);

-- Query with schema prefix
SELECT * FROM tenant_123.users;
```

**Pros**: Better isolation, easier backup per tenant
**Cons**: Schema management overhead (1000+ schemas if 1000+ tenants), limited scalability

**Option 3: Separate Databases**:
```
tenant_123_db
tenant_456_db
tenant_789_db
```

**Pros**: Complete isolation, can scale tenants independently
**Cons**: Expensive (separate DB per tenant), hard to manage (1000+ databases)

**Recommendation**: Start with **shared schema + RLS** (Option 1). Upgrade large tenants to separate database (Option 3) when they reach scale (e.g., > 1M rows).

---

### Follow-Up 3: "How do you design schema for time-series data?"

**Answer**:

**"Use time-based partitioning + specialized time-series databases (TimescaleDB, InfluxDB)."**

**Scenario: IoT sensor data (1M sensors, reading every 10 seconds)**

```sql
-- TimescaleDB (PostgreSQL extension)
CREATE TABLE sensor_readings (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL,
    temperature DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    battery_level INTEGER,
    
    PRIMARY KEY (time, sensor_id)
);

-- Convert to hypertable (automatic time partitioning)
SELECT create_hypertable('sensor_readings', 'time');

-- Automatically creates partitions:
-- sensor_readings_2024_01_01
-- sensor_readings_2024_01_02
-- ...

-- Insert data (partition auto-selected)
INSERT INTO sensor_readings (time, sensor_id, temperature, humidity, battery_level)
VALUES (NOW(), 12345, 23.5, 65.2, 87);

-- Query recent data (fast, only scans recent partition)
SELECT * FROM sensor_readings
WHERE time > NOW() - INTERVAL '1 hour'
  AND sensor_id = 12345;

-- Aggregate historical data (rollup)
CREATE MATERIALIZED VIEW sensor_daily_avg AS
SELECT time_bucket('1 day', time) AS day,
       sensor_id,
       AVG(temperature) AS avg_temp,
       AVG(humidity) AS avg_humidity
FROM sensor_readings
GROUP BY day, sensor_id;

-- Continuous aggregation (auto-updates)
SELECT add_continuous_aggregate_policy('sensor_daily_avg',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour');

-- Retention policy (auto-delete old data)
SELECT add_retention_policy('sensor_readings', INTERVAL '90 days');
-- Keeps last 90 days, deletes older partitions
```

**Characteristics**:
- Write-heavy (1M sensors × 6 readings/minute = 6M writes/min)
- Time-range queries (last hour, last day)
- Aggregations (average temperature per day)
- Old data rarely accessed (archive/delete)

**Best practices**:
- Partition by time (day or week)
- Index on (time, sensor_id) for fast lookups
- Pre-aggregate data (hourly/daily averages) for dashboards
- Auto-delete old data (retention policy)

---

## 9. Pseudocode / Diagrams (When Applicable)

### E-Commerce Schema Diagram

```
┌────────────────────────────────────────────────────────────┐
│               E-COMMERCE DATABASE SCHEMA                   │
└────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Users     │
│─────────────│
│ user_id (PK)│◄──────┐
│ username    │       │
│ email       │       │ 1
│ password    │       │
│ created_at  │       │
└─────────────┘       │
       │              │
       │ 1            │
       │              │
       │              │ N
       ↓              │
┌─────────────┐       │
│   Orders    │       │
│─────────────│       │
│ order_id(PK)│       │
│*user_id (FK)│───────┘
│ total_amount│
│ status      │
│ created_at  │
└─────────────┘
       │ 1
       │
       │
       │ N
       ↓
┌─────────────────┐         N        ┌─────────────┐
│  Order_Items    │◄─────────────────►│  Products   │
│─────────────────│                   │─────────────│
│ order_item_id   │                   │ product_id  │
│*order_id (FK)   │                   │ name        │
│*product_id (FK) │                   │ description │
│ quantity        │                   │ price       │
│ price_at_purchase│                  │ stock_qty   │
└─────────────────┘                   │ created_at  │
                                      └─────────────┘
                                            │ 1
                                            │
                                            │
                                            │ N
                                            ↓
                                      ┌─────────────┐
                                      │   Reviews   │
                                      │─────────────│
                                      │ review_id   │
                                      │*product_id  │
                                      │*user_id     │
                                      │ rating      │
                                      │ comment     │
                                      │ created_at  │
                                      └─────────────┘


RELATIONSHIP TYPES:

1:N (One-to-Many)
═══════════════════
User → Orders: One user, many orders
Order → OrderItems: One order, many items
Product → Reviews: One product, many reviews

N:M (Many-to-Many)
══════════════════
Orders ←→ Products: Resolved via OrderItems join table
  - Order can have many products
  - Product can be in many orders


CONSTRAINTS:
═══════════════
✓ user_id (FK): orders.user_id REFERENCES users.user_id
✓ product_id (FK): order_items.product_id REFERENCES products.product_id
✓ UNIQUE: users.email, users.username
✓ CHECK: products.price >= 0, reviews.rating BETWEEN 1 AND 5
✓ CASCADE: DELETE order → DELETE all order_items
```

### Schema Evolution Timeline

```
┌──────────────────────────────────────────────────────────┐
│          SCHEMA EVOLUTION (Zero Downtime)                │
└──────────────────────────────────────────────────────────┘

WEEK 1: Add Column (Backward Compatible)
═══════════════════════════════════════════
┌─────────────────┐
│ users (v1)      │
├─────────────────┤
│ user_id         │
│ username        │
│ email           │
│ created_at      │
└─────────────────┘
         ↓
  ALTER TABLE ADD
         ↓
┌─────────────────┐
│ users (v2)      │
├─────────────────┤
│ user_id         │
│ username        │
│ email           │
│ phone (NULL)    │ ← New column (nullable)
│ created_at      │
└─────────────────┘

✓ Old app: Works (ignores phone)
✓ New app: Writes phone if available


WEEK 2: Backfill Data (Non-blocking)
════════════════════════════════════════
UPDATE users SET phone = get_phone(user_id)
WHERE phone IS NULL
LIMIT 1000;  -- Batched updates

Progress: 0% → 25% → 50% → 75% → 100%


WEEK 3: Add Constraint (After Backfill)
═══════════════════════════════════════════
ALTER TABLE users
ALTER COLUMN phone SET NOT NULL;

✓ Now phone required for all users


RENAME COLUMN (Multi-Phase)
═══════════════════════════════

Phase 1: Add New Column
─────────────────────────
ALTER TABLE users ADD COLUMN display_name VARCHAR(50);
UPDATE users SET display_name = username;

Phase 2: Dual Writes (App v2)
──────────────────────────────
app.write(username=x, display_name=x)  -- Both columns

Phase 3: Switch Reads (App v3)
───────────────────────────────
app.read(display_name)  -- Only new column

Phase 4: Drop Old Column (App v4)
──────────────────────────────────
ALTER TABLE users DROP COLUMN username;

Timeline: 4 weeks (1 week per phase)
Downtime: 0 minutes
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Schema Design Matters

**Bad Schema**:
```
- Slow queries (no indexes, many JOINs)
- Data inconsistency (no constraints)
- Hard to scale (no partitioning strategy)
- Data loss (no referential integrity)
```

**Good Schema**:
```
- Fast queries (proper indexes, minimal JOINs)
- Data integrity (foreign keys, constraints)
- Scalable (partitioning, denormalization where needed)
- Maintainable (clear relationships, documentation)
```

### Key Principles

1. **Normalize first, denormalize later**: Start with 3NF, denormalize for performance if needed
2. **Choose right data types**: INTEGER not BIGINT if max is 2B, VARCHAR(100) not TEXT for names
3. **Add constraints**: Foreign keys prevent orphaned records, CHECK constraints validate data
4. **Index strategically**: Index foreign keys, columns in WHERE clauses
5. **Plan for growth**: Partition large tables, archive old data

### When to Apply

**Always**:
- Define primary keys (every table needs unique identifier)
- Use foreign keys (enforce referential integrity)
- Add NOT NULL for required fields

**Scale-Dependent**:
- Partitioning: When table > 100M rows
- Denormalization: When JOINs cause performance issues (> 100ms queries)
- Archival: When old data (> 1 year) rarely accessed

### Production Checklist

- [ ] **Primary keys defined**: Every table has PK (prefer SERIAL or BIGINT)
- [ ] **Foreign keys enforced**: All references have FK constraints
- [ ] **Indexes created**: Index foreign keys + columns in WHERE/ORDER BY
- [ ] **Constraints added**: NOT NULL, UNIQUE, CHECK for data validation
- [ ] **Data types optimized**: INTEGER not BIGINT, VARCHAR not TEXT where possible
- [ ] **Partitioning planned**: For tables expected to exceed 100M rows
- [ ] **Timestamps included**: created_at, updated_at for audit trail
- [ ] **Soft deletes considered**: For user-facing data that might need recovery
- [ ] **Schema versioned**: Use migration tools (Flyway, Liquibase, Alembic)
- [ ] **Documentation created**: ER diagrams, table descriptions, relationship explanations

### Bottom Line

**Good schema design is 80% of database performance. Spend time upfront designing relationships, choosing data types, adding constraints. Changing schema later (with millions of rows) is expensive and risky. For FAANG interviews: Explain your entity relationships clearly, justify denormalization decisions, and show awareness of scale (partitioning, indexing strategies).**

**Real-world lesson from Instagram**: "Our schema for likes uses composite PK (user_id, photo_id) instead of separate like_id. This saves 8 bytes per row. With 500 billion likes, that's 4 TB saved. Small decisions compound at scale."

