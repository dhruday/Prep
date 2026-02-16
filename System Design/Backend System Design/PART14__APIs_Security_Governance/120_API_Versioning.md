# 120. API Versioning

## 📌 Overview

**API Versioning** allows you to make breaking changes to your API while maintaining backward compatibility for existing clients.

**Why needed**: Update API without breaking existing clients.

```
Without versioning:
Change API → All clients break ❌

With versioning:
v1 (old) → Existing clients work ✓
v2 (new) → New clients use new features ✓
```

---

## 🎯 Why Versioning?

### **Breaking Changes**

```python
# v1: Returns user object
GET /users/123
{
  "id": 123,
  "name": "John Doe"
}

# v2: Returns user with nested address (BREAKING)
GET /users/123
{
  "id": 123,
  "full_name": "John Doe",  # Changed field name
  "address": {              # New structure
    "street": "123 Main St",
    "city": "NYC"
  }
}

# Without versioning:
# v1 clients break (expect "name", got "full_name") ❌

# With versioning:
# v1 clients → /v1/users/123 (still works) ✓
# v2 clients → /v2/users/123 (new format) ✓
```

### **Examples of Breaking Changes**

```
Breaking:
- Rename field: "name" → "full_name"
- Remove field: Delete "phone"
- Change type: "age": 25 → "age": "25"
- Change structure: Flat → nested
- Change semantics: "amount" in cents → dollars
- Required field: Add required field

Non-breaking:
- Add optional field: "middle_name": "Robert"
- Add new endpoint: POST /users/bulk
- Deprecate field: Keep "name", add "full_name"
```

---

## 🎯 Versioning Strategies

### **1. URL Versioning** ⭐ (Most Common)

```python
# Version in URL path
GET /v1/users/123
GET /v2/users/123

Pros:
- Simple, explicit
- Easy to route
- Visible in logs
- Browser-friendly

Cons:
- Pollutes URL space
- Less "RESTful"

Usage: Stripe, Twitter, GitHub
```

**Implementation:**

```python
from flask import Flask, jsonify

app = Flask(__name__)

# v1: Simple response
@app.route('/v1/users/<int:user_id>')
def get_user_v1(user_id):
    return jsonify({
        'id': user_id,
        'name': 'John Doe',
        'email': 'john@example.com'
    })

# v2: Nested structure
@app.route('/v2/users/<int:user_id>')
def get_user_v2(user_id):
    return jsonify({
        'id': user_id,
        'full_name': 'John Doe',
        'contact': {
            'email': 'john@example.com',
            'phone': '+1-555-0100'
        },
        'address': {
            'street': '123 Main St',
            'city': 'NYC'
        }
    })
```

### **2. Header Versioning**

```python
# Version in Accept header
GET /users/123
Accept: application/vnd.myapi.v1+json

GET /users/123
Accept: application/vnd.myapi.v2+json

Pros:
- Clean URLs
- More "RESTful"
- Flexible content negotiation

Cons:
- Less visible
- Harder to test (can't just paste URL)
- Browser testing requires tools

Usage: GitHub (also supports URL)
```

**Implementation:**

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/users/<int:user_id>')
def get_user(user_id):
    # Parse Accept header
    accept = request.headers.get('Accept', '')
    
    if 'vnd.myapi.v2+json' in accept:
        # v2 format
        return jsonify({
            'id': user_id,
            'full_name': 'John Doe',
            'contact': {'email': 'john@example.com'}
        })
    else:
        # v1 format (default)
        return jsonify({
            'id': user_id,
            'name': 'John Doe',
            'email': 'john@example.com'
        })
```

### **3. Query Parameter Versioning**

```python
GET /users/123?version=1
GET /users/123?v=2

Pros:
- Simple
- Easy to test

Cons:
- Ugly URLs
- Version optional (default needed)
- Caching issues (query params often bypass cache)

Usage: Less common
```

**Implementation:**

```python
@app.route('/users/<int:user_id>')
def get_user(user_id):
    version = request.args.get('version', '1')
    
    if version == '2':
        return jsonify({'id': user_id, 'full_name': 'John Doe'})
    else:
        return jsonify({'id': user_id, 'name': 'John Doe'})
```

### **4. Custom Header Versioning**

```python
GET /users/123
X-API-Version: 2

Pros:
- Clean URLs
- Explicit versioning

Cons:
- Custom header (not standard)
- Less discoverable

Usage: Microsoft Azure
```

---

## 🎯 Versioning in Practice

### **Semantic Versioning**

```
v1.2.3
│ │ │
│ │ └─ PATCH: Bug fixes (backward compatible)
│ └─── MINOR: New features (backward compatible)
└───── MAJOR: Breaking changes

Examples:
v1.0.0 → v1.1.0: Added new endpoint (compatible)
v1.1.0 → v1.1.1: Fixed bug (compatible)
v1.1.1 → v2.0.0: Changed response format (BREAKING)
```

### **Version Lifecycle**

```
Phase 1: Active Development
- v2: Current version (active)
- v1: Previous version (supported)

Phase 2: Deprecation Notice (6 months)
- v2: Current
- v1: Deprecated (still works, show warning)

Phase 3: Sunset (12 months)
- v2: Current
- v1: Disabled (return 410 Gone)
```

**Implementation:**

```python
from datetime import datetime

DEPRECATED_VERSIONS = {
    'v1': {
        'deprecated_date': '2024-01-01',
        'sunset_date': '2024-06-01',
        'migration_guide': 'https://docs.example.com/v1-to-v2'
    }
}

@app.route('/v1/users/<int:user_id>')
def get_user_v1(user_id):
    # Check if version sunsetted
    sunset_date = datetime.fromisoformat(
        DEPRECATED_VERSIONS['v1']['sunset_date']
    )
    
    if datetime.now() > sunset_date:
        return jsonify({
            'error': 'API_VERSION_SUNSET',
            'message': 'v1 API has been sunset',
            'sunset_date': '2024-06-01',
            'migration_guide': DEPRECATED_VERSIONS['v1']['migration_guide']
        }), 410  # 410 Gone
    
    # Return data with deprecation warning
    response = jsonify({
        'id': user_id,
        'name': 'John Doe'
    })
    
    response.headers['Warning'] = '299 - "v1 API deprecated, migrate to v2"'
    response.headers['X-API-Deprecated'] = 'true'
    response.headers['X-API-Sunset-Date'] = '2024-06-01'
    response.headers['Link'] = '<https://docs.example.com/v1-to-v2>; rel="sunset"'
    
    return response
```

---

## 🎯 Real-World Examples

### **1. Stripe API Versioning**

```python
# URL versioning
GET https://api.stripe.com/v1/charges

# Also supports header versioning
GET https://api.stripe.com/charges
Stripe-Version: 2023-10-16

# Version changes:
# 2020-08-27: Added "payment_method" field
# 2019-12-03: Changed "source" structure
# 2019-02-19: Removed "card" (use "payment_method")

# Gradual migration
# Set account default version in dashboard
# Override per-request with header
```

### **2. GitHub API Versioning**

```python
# URL versioning
GET https://api.github.com/v3/users/octocat

# Header versioning
GET https://api.github.com/users/octocat
Accept: application/vnd.github.v3+json

# Preview features (unstable)
Accept: application/vnd.github.squirrel-girl-preview+json
```

### **3. Twitter API Versioning**

```python
# v1.1 (deprecated)
GET https://api.twitter.com/1.1/statuses/home_timeline.json

# v2 (current)
GET https://api.twitter.com/2/tweets

# Major differences:
# - v1.1: "text" field
# - v2: "text" + "entities" (nested)
```

---

## 🎯 Migration Strategies

### **1. Parallel Run**

```python
# Support both versions simultaneously
@app.route('/v1/users/<int:user_id>')
def get_user_v1(user_id):
    user = get_user_from_db(user_id)
    return jsonify(transform_to_v1(user))

@app.route('/v2/users/<int:user_id>')
def get_user_v2(user_id):
    user = get_user_from_db(user_id)  # Same data source
    return jsonify(transform_to_v2(user))

# Shared logic, different transformations
```

### **2. Adapter Pattern**

```python
class UserAdapter:
    """Adapt internal model to API version"""
    
    @staticmethod
    def to_v1(user):
        """Transform to v1 format"""
        return {
            'id': user.id,
            'name': user.full_name,
            'email': user.email
        }
    
    @staticmethod
    def to_v2(user):
        """Transform to v2 format"""
        return {
            'id': user.id,
            'full_name': user.full_name,
            'contact': {
                'email': user.email,
                'phone': user.phone
            },
            'address': {
                'street': user.street,
                'city': user.city
            }
        }

# Usage
@app.route('/v1/users/<int:user_id>')
def get_user_v1(user_id):
    user = User.query.get(user_id)
    return jsonify(UserAdapter.to_v1(user))

@app.route('/v2/users/<int:user_id>')
def get_user_v2(user_id):
    user = User.query.get(user_id)
    return jsonify(UserAdapter.to_v2(user))
```

### **3. Feature Flags**

```python
class FeatureFlags:
    """Gradual rollout of v2 features"""
    
    @staticmethod
    def is_v2_enabled_for_user(user_id):
        """Check if user in v2 rollout"""
        # Roll out to 10% of users
        return user_id % 10 == 0

@app.route('/users/<int:user_id>')
def get_user(user_id):
    # Gradual migration: Some users get v2, others v1
    if FeatureFlags.is_v2_enabled_for_user(user_id):
        return get_user_v2_format(user_id)
    else:
        return get_user_v1_format(user_id)
```

---

## ✅ Best Practices

### **1. Start with v1**

```python
✗ Bad:
GET /users/123  # No version

✓ Good:
GET /v1/users/123  # Explicit v1
```

### **2. Document Breaking Changes**

```markdown
# Changelog

## v2.0.0 (2024-01-15) - BREAKING
- Changed: `name` → `full_name`
- Added: `address` object
- Removed: `phone` (moved to `contact.phone`)
- Migration guide: https://docs.example.com/v1-to-v2

## v1.2.0 (2023-12-01)
- Added: `profile_image` field (backward compatible)
```

### **3. Deprecation Warnings**

```python
@app.route('/v1/users/<int:user_id>')
def get_user_v1(user_id):
    response = jsonify({...})
    
    # Add deprecation headers
    response.headers['Sunset'] = 'Wed, 01 Jun 2024 00:00:00 GMT'
    response.headers['Deprecation'] = 'true'
    response.headers['Link'] = '<https://docs.example.com/v2>; rel="successor-version"'
    
    return response
```

### **4. Default to Latest Stable**

```python
# If no version specified, use latest stable
@app.route('/users/<int:user_id>')
def get_user_default(user_id):
    # Default to v2 (latest stable)
    return get_user_v2(user_id)

# Explicit versions still work
@app.route('/v1/users/<int:user_id>')
def get_user_v1(user_id):
    return get_user_v1_format(user_id)
```

### **5. Version Your Client SDKs**

```python
# Python SDK
from myapi import Client

# v1 client
client_v1 = Client(api_version='v1')
user = client_v1.users.get(123)
print(user.name)  # v1 field

# v2 client
client_v2 = Client(api_version='v2')
user = client_v2.users.get(123)
print(user.full_name)  # v2 field
```

---

## 🎓 Interview Tips

**Q: "How do you version APIs?"**

A: "Three main strategies:

1. **URL versioning** (most common):
   - `/v1/users`, `/v2/users`
   - Pros: Explicit, easy to test, visible in logs
   - Cons: Pollutes URL space
   - Used by: Stripe, Twitter, most APIs

2. **Header versioning**:
   - `Accept: application/vnd.myapi.v1+json`
   - Pros: Clean URLs, more RESTful
   - Cons: Less visible, harder to test
   - Used by: GitHub

3. **Query parameter**:
   - `/users?version=1`
   - Pros: Simple
   - Cons: Ugly, caching issues

I prefer **URL versioning** for simplicity and visibility. Start with v1 explicitly, make breaking changes in v2, support both during migration period."

**Q: "When should you version APIs?"**

A: "Version when making **breaking changes**:

Breaking:
- Rename field: `name` → `full_name`
- Remove field: Delete `phone`
- Change type: String → Integer
- Change structure: Flat → nested
- Add required field

Non-breaking (no version needed):
- Add optional field
- Add new endpoint
- Deprecate field (keep + add new)

Example:
- v1: `{\"name\": \"John\"}`
- v2: `{\"full_name\": \"John\"}` (BREAKING: clients expect `name`)

Process:
1. Release v2 with breaking changes
2. Support v1 + v2 for 6-12 months (migration period)
3. Deprecate v1 (add warnings)
4. Sunset v1 (return 410 Gone)"

**Q: "How do you manage multiple API versions?"**

A: "Strategies:

1. **Shared business logic**:
```python
# Shared
user = get_user_from_db(user_id)

# Different transformations
v1: transform_to_v1(user)
v2: transform_to_v2(user)
```

2. **Adapter pattern**:
```python
class UserAdapter:
    def to_v1(user): {...}
    def to_v2(user): {...}
```

3. **Version lifecycle**:
   - Active: v2 (current)
   - Supported: v1 (6 months)
   - Deprecated: v1 warnings (12 months)
   - Sunset: v1 disabled

4. **Monitoring**:
   - Track v1 vs v2 usage
   - Alert when v1 usage spikes (someone didn't migrate)
   - Show deprecation warnings in responses

Avoid maintaining >2 versions (complexity explodes)."

---

## 📚 Summary

**API Versioning**: Support multiple API versions for backward compatibility

**Strategies**: URL (/v1/users), Header (Accept: v1+json), Query (?version=1)

**When**: Breaking changes (rename field, change type, remove field)

**Lifecycle**: Active → Deprecated (warnings) → Sunset (410 Gone)

**Best Practice**: URL versioning, start with v1, document changes, support 2 versions max 🚀
