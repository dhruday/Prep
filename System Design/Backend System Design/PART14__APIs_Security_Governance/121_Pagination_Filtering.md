# 121. Pagination & Filtering

## 📌 Overview

**Pagination** splits large result sets into smaller pages. **Filtering** narrows results by criteria.

**Why needed**: Avoid returning millions of records in one response (performance, memory, UX).

```
Without pagination:
GET /users → Returns 1M users (timeout, OOM) ❌

With pagination:
GET /users?page=1&limit=50 → Returns 50 users ✓
```

---

## 🎯 Pagination Strategies

### **1. Offset-Based Pagination** (Page Number)

```python
GET /users?page=2&limit=50

# Returns:
# - Skip 50 records (page 1)
# - Return next 50 records (page 2)

# SQL:
SELECT * FROM users
LIMIT 50 OFFSET 50  # Page 2
```

**Implementation:**

```python
from flask import Flask, request, jsonify

@app.route('/users')
def list_users():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    
    # Validate
    if page < 1:
        return jsonify({'error': 'Page must be >= 1'}), 400
    if limit > 100:
        return jsonify({'error': 'Limit max 100'}), 400
    
    # Calculate offset
    offset = (page - 1) * limit
    
    # Query database
    users = User.query.offset(offset).limit(limit).all()
    total = User.query.count()
    
    return jsonify({
        'data': [u.to_dict() for u in users],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'total_pages': (total + limit - 1) // limit,
            'has_next': offset + limit < total,
            'has_prev': page > 1
        },
        'links': {
            'first': f'/users?page=1&limit={limit}',
            'prev': f'/users?page={page-1}&limit={limit}' if page > 1 else None,
            'next': f'/users?page={page+1}&limit={limit}' if offset + limit < total else None,
            'last': f'/users?page={(total + limit - 1) // limit}&limit={limit}'
        }
    })
```

**Pros**:
- Simple, intuitive
- Jump to any page
- Total count available

**Cons**:
- Performance degrades with large offsets (scan + skip many rows)
- Inconsistent if data changes (duplicates/missing items)

```sql
-- Slow for large offsets
SELECT * FROM users
LIMIT 50 OFFSET 1000000;  -- Must scan 1M rows then skip ❌
```

### **2. Cursor-Based Pagination** ⭐ (Recommended)

```python
GET /users?cursor=abc123&limit=50

# Returns:
# - Records after cursor "abc123"
# - Next cursor for pagination

# SQL:
SELECT * FROM users
WHERE id > 'abc123'
ORDER BY id
LIMIT 50
```

**Implementation:**

```python
import base64

@app.route('/users')
def list_users_cursor():
    cursor = request.args.get('cursor')
    limit = int(request.args.get('limit', 50))
    
    query = User.query.order_by(User.id)
    
    # Apply cursor
    if cursor:
        # Decode cursor (base64 encoded ID)
        last_id = int(base64.b64decode(cursor))
        query = query.filter(User.id > last_id)
    
    users = query.limit(limit + 1).all()  # +1 to check if has_next
    
    has_next = len(users) > limit
    if has_next:
        users = users[:limit]
    
    # Generate next cursor
    next_cursor = None
    if has_next and users:
        next_cursor = base64.b64encode(str(users[-1].id).encode()).decode()
    
    return jsonify({
        'data': [u.to_dict() for u in users],
        'pagination': {
            'limit': limit,
            'next_cursor': next_cursor,
            'has_next': has_next
        }
    })
```

**Pros**:
- **Fast** (indexed lookup, no OFFSET)
- **Consistent** (no duplicates/missing if data changes)
- Scales to billions of records

**Cons**:
- Can't jump to page N
- No total count (expensive to compute)

**When to use**: Large datasets, real-time feeds, infinite scroll

### **3. Keyset Pagination**

```python
# Like cursor, but uses last value instead of ID
GET /users?after_id=123&limit=50

# SQL:
SELECT * FROM users
WHERE id > 123
ORDER BY id
LIMIT 50
```

**Composite cursor** (multiple sort fields):

```python
# Sort by created_at + id (for uniqueness)
GET /posts?after_date=2024-01-15T10:00:00Z&after_id=456&limit=50

# SQL:
SELECT * FROM posts
WHERE (created_at, id) > ('2024-01-15T10:00:00Z', 456)
ORDER BY created_at, id
LIMIT 50
```

---

## 🎯 Filtering

### **Simple Filters**

```python
# Single filter
GET /users?status=active

# Multiple filters
GET /users?status=active&role=admin&country=US

# Range filters
GET /products?min_price=10&max_price=100

# Date range
GET /orders?start_date=2024-01-01&end_date=2024-01-31
```

**Implementation:**

```python
@app.route('/users')
def list_users_filtered():
    query = User.query
    
    # Status filter
    status = request.args.get('status')
    if status:
        query = query.filter(User.status == status)
    
    # Role filter
    role = request.args.get('role')
    if role:
        query = query.filter(User.role == role)
    
    # Country filter
    country = request.args.get('country')
    if country:
        query = query.filter(User.country == country)
    
    # Date range
    start_date = request.args.get('start_date')
    if start_date:
        query = query.filter(User.created_at >= start_date)
    
    end_date = request.args.get('end_date')
    if end_date:
        query = query.filter(User.created_at <= end_date)
    
    users = query.all()
    return jsonify([u.to_dict() for u in users])
```

### **Complex Filters (Operators)**

```python
# Operators in query string
GET /products?price[gte]=10&price[lte]=100  # Greater/less than
GET /users?name[like]=John%                  # Starts with "John"
GET /posts?tags[in]=tech,python,api          # In list

# Alternative syntax
GET /products?filter[price][gte]=10
GET /users?filter[name][like]=John%
```

**Implementation:**

```python
@app.route('/products')
def list_products():
    query = Product.query
    
    # Price range
    price_gte = request.args.get('price[gte]')
    if price_gte:
        query = query.filter(Product.price >= float(price_gte))
    
    price_lte = request.args.get('price[lte]')
    if price_lte:
        query = query.filter(Product.price <= float(price_lte))
    
    # Name like
    name_like = request.args.get('name[like]')
    if name_like:
        query = query.filter(Product.name.like(f'{name_like}%'))
    
    # Tags in
    tags_in = request.args.get('tags[in]')
    if tags_in:
        tags = tags_in.split(',')
        query = query.filter(Product.tags.overlap(tags))  # PostgreSQL array
    
    products = query.all()
    return jsonify([p.to_dict() for p in products])
```

### **Search (Full-Text)**

```python
GET /posts?search=distributed+systems

# PostgreSQL full-text search
SELECT * FROM posts
WHERE to_tsvector('english', title || ' ' || body)
      @@ to_tsquery('english', 'distributed & systems')
```

**Implementation:**

```python
from sqlalchemy import func

@app.route('/posts')
def search_posts():
    search = request.args.get('search')
    
    if search:
        # PostgreSQL full-text search
        search_vector = func.to_tsvector('english', Post.title + ' ' + Post.body)
        search_query = func.to_tsquery('english', search)
        posts = Post.query.filter(search_vector.op('@@')(search_query)).all()
    else:
        posts = Post.query.all()
    
    return jsonify([p.to_dict() for p in posts])
```

---

## 🎯 Sorting

```python
# Single field
GET /users?sort=created_at

# Descending
GET /users?sort=-created_at  # "-" prefix = descending

# Multiple fields
GET /users?sort=role,-created_at  # Sort by role asc, then created_at desc
```

**Implementation:**

```python
@app.route('/users')
def list_users_sorted():
    sort = request.args.get('sort', 'id')
    
    query = User.query
    
    # Parse sort fields
    for field in sort.split(','):
        if field.startswith('-'):
            # Descending
            field_name = field[1:]
            query = query.order_by(getattr(User, field_name).desc())
        else:
            # Ascending
            query = query.order_by(getattr(User, field).asc())
    
    users = query.all()
    return jsonify([u.to_dict() for u in users])
```

---

## 🎯 Combined Example

```python
# Pagination + Filtering + Sorting
GET /products?category=electronics&min_price=100&sort=-rating&page=2&limit=20

# Returns:
# - Electronics products
# - Price >= $100
# - Sorted by rating (high to low)
# - Page 2, 20 items per page
```

**Full implementation:**

```python
@app.route('/products')
def list_products_full():
    # Pagination
    page = int(request.args.get('page', 1))
    limit = min(int(request.args.get('limit', 50)), 100)
    
    # Start query
    query = Product.query
    
    # Filtering
    category = request.args.get('category')
    if category:
        query = query.filter(Product.category == category)
    
    min_price = request.args.get('min_price')
    if min_price:
        query = query.filter(Product.price >= float(min_price))
    
    max_price = request.args.get('max_price')
    if max_price:
        query = query.filter(Product.price <= float(max_price))
    
    # Sorting
    sort = request.args.get('sort', 'id')
    for field in sort.split(','):
        if field.startswith('-'):
            query = query.order_by(getattr(Product, field[1:]).desc())
        else:
            query = query.order_by(getattr(Product, field).asc())
    
    # Execute
    total = query.count()
    offset = (page - 1) * limit
    products = query.offset(offset).limit(limit).all()
    
    return jsonify({
        'data': [p.to_dict() for p in products],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'total_pages': (total + limit - 1) // limit
        }
    })
```

---

## 🎯 Real-World Examples

### **1. GitHub API**

```python
# Pagination (Link header)
GET /repos/torvalds/linux/commits

# Response headers:
Link: <https://api.github.com/repos/torvalds/linux/commits?page=2>; rel="next",
      <https://api.github.com/repos/torvalds/linux/commits?page=10>; rel="last"

# Filtering
GET /search/repositories?q=language:python+stars:>1000
```

### **2. Stripe API**

```python
# Cursor-based pagination
GET /v1/charges?limit=10&starting_after=ch_abc123

# Response:
{
  "data": [...],
  "has_more": true,
  "url": "/v1/charges"
}

# Filtering
GET /v1/charges?customer=cus_123&created[gte]=1609459200
```

### **3. Twitter API**

```python
# Cursor-based (max_id)
GET /statuses/home_timeline.json?count=20&max_id=1234567890

# Filtering by date
GET /tweets/search/recent?query=python&start_time=2024-01-01T00:00:00Z
```

---

## ✅ Best Practices

### **1. Limit Maximum Page Size**

```python
limit = min(int(request.args.get('limit', 50)), 100)  # Max 100 ✓

# Prevent:
GET /users?limit=1000000  # DoS attack ❌
```

### **2. Use Cursor for Large Datasets**

```python
# Bad: Offset for billions of rows
GET /logs?page=1000000  # Scans millions of rows ❌

# Good: Cursor pagination
GET /logs?cursor=abc123  # Indexed lookup ✓
```

### **3. Return Pagination Metadata**

```python
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 1000,
    "total_pages": 20,
    "has_next": true,
    "has_prev": true
  },
  "links": {
    "first": "/users?page=1",
    "prev": "/users?page=1",
    "next": "/users?page=3",
    "last": "/users?page=20"
  }
}
```

### **4. Index Filter Fields**

```sql
-- Slow: No index
SELECT * FROM users WHERE country = 'US';  -- Full table scan ❌

-- Fast: With index
CREATE INDEX idx_users_country ON users(country);  ✓
```

### **5. Validate Inputs**

```python
# Prevent SQL injection
sort = request.args.get('sort')
allowed_fields = ['id', 'name', 'created_at']
if sort not in allowed_fields:
    return jsonify({'error': 'Invalid sort field'}), 400
```

---

## 🎓 Interview Tips

**Q: "How do you implement pagination?"**

A: "Two main strategies:

1. **Offset-based** (page number):
```python
GET /users?page=2&limit=50
SQL: LIMIT 50 OFFSET 50
```
   - Pros: Simple, jump to any page, total count
   - Cons: Slow for large offsets (scan + skip), inconsistent if data changes

2. **Cursor-based** (keyset):
```python
GET /users?cursor=abc123&limit=50
SQL: WHERE id > 123 LIMIT 50
```
   - Pros: Fast (indexed), consistent, scales to billions
   - Cons: Can't jump to page N, no total count

Choose cursor for:
- Large datasets (>10M rows)
- Real-time feeds (Twitter timeline)
- Infinite scroll

Choose offset for:
- Small datasets (<1M rows)
- Need page numbers (1, 2, 3...)
- Need total count"

**Q: "What are performance considerations for pagination?"**

A: "Key issues:

1. **Large OFFSET slow**:
```sql
LIMIT 50 OFFSET 1000000;  -- Scans 1M rows ❌
```
   - Solution: Use cursor pagination (indexed WHERE)

2. **COUNT(*) expensive**:
```sql
SELECT COUNT(*) FROM users;  -- Scans entire table ❌
```
   - Solution: Cache count, update incrementally, or skip total

3. **Deep pagination**:
   - Offset 1M = scan 1M rows
   - Solution: Limit max page (page <= 10,000), use cursor for deep

4. **Filter without index**:
```sql
WHERE country = 'US';  -- Full scan if no index ❌
```
   - Solution: Index filter fields

Best practices:
- Limit max page size (limit <= 100)
- Use cursor for large datasets
- Index filter + sort fields
- Cache expensive counts"

**Q: "How do you handle filtering and sorting?"**

A: "Approach:

1. **Simple filters** (query params):
```python
GET /users?status=active&role=admin
WHERE status = 'active' AND role = 'admin'
```

2. **Range filters**:
```python
GET /products?min_price=10&max_price=100
WHERE price >= 10 AND price <= 100
```

3. **Complex operators**:
```python
GET /users?name[like]=John%
WHERE name LIKE 'John%'
```

4. **Sorting**:
```python
GET /users?sort=-created_at,name
ORDER BY created_at DESC, name ASC
```

Performance:
- Index filtered fields: `CREATE INDEX idx_status ON users(status)`
- Index sort fields: `CREATE INDEX idx_created ON users(created_at DESC)`
- Composite index: `CREATE INDEX idx_filter_sort ON users(status, created_at DESC)`
- Validate inputs (prevent SQL injection)

Real-world: GitHub search uses Elasticsearch for complex filters + sorting."

---

## 📚 Summary

**Pagination**: Split large results into pages

**Strategies**: Offset (page number) vs Cursor (keyset) - use cursor for large datasets

**Filtering**: Query params (?status=active), operators (?price[gte]=10)

**Sorting**: ?sort=-created_at (descending), ?sort=role,name (multiple)

**Best Practice**: Limit max page size, use cursor for billions of rows, index filters, return metadata 🚀
