# 119. REST API Design Principles

## 📌 Overview

**REST (Representational State Transfer)** is an architectural style for designing networked applications using HTTP.

**Key principles**: Resources, HTTP verbs, stateless, uniform interface.

```
RESTful API: URL represents resource, HTTP method represents action
Non-RESTful: URL contains action (e.g., /getUser?id=123)
```

---

## 🎯 Core Principles

### **1. Resource-Based URLs**

```
✓ Good (RESTful):
GET    /users/123           # Get user 123
POST   /users               # Create new user
PUT    /users/123           # Update user 123
DELETE /users/123           # Delete user 123

✗ Bad (Not RESTful):
GET    /getUser?id=123      # Action in URL
POST   /createUser          # Action in URL
POST   /deleteUser/123      # Wrong HTTP method
```

**Rule**: URL identifies the **resource**, HTTP method specifies the **action**.

### **2. HTTP Methods (Verbs)**

```
GET     - Retrieve resource (Safe, Idempotent)
POST    - Create resource (Not Idempotent)
PUT     - Update/Replace resource (Idempotent)
PATCH   - Partial update (Not Idempotent)
DELETE  - Delete resource (Idempotent)
HEAD    - Get headers only (no body)
OPTIONS - Get supported methods
```

**Idempotent**: Multiple identical requests have same effect as one request.

```python
# Idempotent (PUT)
PUT /users/123
{"name": "John"}
# Call 10 times → same result ✓

# Not Idempotent (POST)
POST /users
{"name": "John"}
# Call 10 times → 10 users created ✗
```

### **3. Stateless**

```
Each request contains ALL information needed to process it.
Server does NOT store client state between requests.

✓ Good (Stateless):
GET /users/123
Authorization: Bearer token123

# Token sent with EVERY request
# Server doesn't remember previous request

✗ Bad (Stateful):
GET /login (server stores session)
GET /users/123 (server uses stored session)
```

**Benefits**:
- Scalability (no session affinity needed)
- Reliability (server crash doesn't lose state)
- Simplicity (easier to cache, load balance)

### **4. Uniform Interface**

```
Consistent patterns across ALL endpoints

Resources:
/users           # Collection
/users/123       # Single resource
/users/123/posts # Nested resource

Consistent responses:
{
  "id": 123,
  "name": "John",
  "email": "john@example.com"
}
```

---

## 🛠️ REST API Design

### **Resource Naming**

```python
# Collections (plural nouns)
GET    /users               # List all users
POST   /users               # Create user
GET    /users/123           # Get user 123
PUT    /users/123           # Update user 123
PATCH  /users/123           # Partial update
DELETE /users/123           # Delete user 123

# Nested resources
GET    /users/123/posts     # User's posts
POST   /users/123/posts     # Create post for user
GET    /users/123/posts/456 # Specific post

# Filters (query parameters)
GET /users?role=admin&status=active
GET /posts?author=123&published=true

# Sorting
GET /users?sort=created_at:desc

# Pagination
GET /users?page=2&limit=50
```

### **HTTP Status Codes**

```python
# Success (2xx)
200 OK               # GET, PUT, PATCH success
201 Created          # POST success
204 No Content       # DELETE success (no body)

# Client Errors (4xx)
400 Bad Request      # Invalid input
401 Unauthorized     # Not authenticated
403 Forbidden        # Authenticated but not authorized
404 Not Found        # Resource doesn't exist
409 Conflict         # Duplicate resource
422 Unprocessable    # Validation error
429 Too Many Requests # Rate limit

# Server Errors (5xx)
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
```

### **Request/Response Format**

```python
# Request
POST /users
Content-Type: application/json
Authorization: Bearer token123

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin"
}

# Response (Success)
HTTP/1.1 201 Created
Content-Type: application/json
Location: /users/123

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}

# Response (Error)
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email format is invalid",
    "field": "email",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🎯 Advanced Patterns

### **HATEOAS (Hypermedia)**

```python
# Include links to related resources
GET /users/123

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "_links": {
    "self": {"href": "/users/123"},
    "posts": {"href": "/users/123/posts"},
    "followers": {"href": "/users/123/followers"},
    "update": {"href": "/users/123", "method": "PUT"},
    "delete": {"href": "/users/123", "method": "DELETE"}
  }
}
```

### **Batch Operations**

```python
# Create multiple resources
POST /users/batch
[
  {"name": "John", "email": "john@example.com"},
  {"name": "Jane", "email": "jane@example.com"}
]

# Response
201 Created
[
  {"id": 123, "name": "John", ...},
  {"id": 124, "name": "Jane", ...}
]

# Delete multiple
DELETE /users?ids=123,124,125
```

### **Bulk Updates**

```python
# Update multiple users
PATCH /users
[
  {"id": 123, "status": "active"},
  {"id": 124, "status": "inactive"}
]
```

### **Actions (Non-CRUD)**

```python
# When operation doesn't map to CRUD:
POST /users/123/activate    # Activate user
POST /users/123/deactivate  # Deactivate user
POST /users/123/reset-password
POST /orders/456/cancel
POST /invoices/789/send

# Alternative: Use status field
PATCH /users/123
{"status": "active"}
```

---

## 🎯 Versioning

```python
# URL versioning (most common)
GET /v1/users/123
GET /v2/users/123

# Header versioning
GET /users/123
Accept: application/vnd.myapi.v1+json

# Query parameter
GET /users/123?version=1
```

---

## 🎯 Real-World Example: GitHub API

```python
# List repositories
GET https://api.github.com/users/torvalds/repos

# Get specific repo
GET https://api.github.com/repos/torvalds/linux

# Create issue
POST https://api.github.com/repos/torvalds/linux/issues
{
  "title": "Bug report",
  "body": "Description",
  "labels": ["bug"]
}

# Response includes links
{
  "id": 1,
  "title": "Bug report",
  "url": "https://api.github.com/repos/torvalds/linux/issues/1",
  "html_url": "https://github.com/torvalds/linux/issues/1",
  "user": {
    "login": "octocat",
    "url": "https://api.github.com/users/octocat"
  }
}
```

---

## 🎯 Implementation Example

### **Flask REST API**

```python
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# In-memory storage
users = {}
user_id_counter = 1

# List users
@app.route('/users', methods=['GET'])
def list_users():
    """GET /users?role=admin&limit=10"""
    role = request.args.get('role')
    limit = int(request.args.get('limit', 100))
    
    filtered_users = users.values()
    if role:
        filtered_users = [u for u in filtered_users if u['role'] == role]
    
    return jsonify({
        'users': list(filtered_users)[:limit],
        'total': len(filtered_users)
    }), 200

# Get single user
@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """GET /users/123"""
    user = users.get(user_id)
    if not user:
        return jsonify({
            'error': {
                'code': 'USER_NOT_FOUND',
                'message': f'User {user_id} not found'
            }
        }), 404
    
    return jsonify(user), 200

# Create user
@app.route('/users', methods=['POST'])
def create_user():
    """POST /users"""
    global user_id_counter
    
    data = request.get_json()
    
    # Validate
    if not data.get('email'):
        return jsonify({
            'error': {
                'code': 'MISSING_EMAIL',
                'message': 'Email is required',
                'field': 'email'
            }
        }), 400
    
    # Check duplicate
    if any(u['email'] == data['email'] for u in users.values()):
        return jsonify({
            'error': {
                'code': 'DUPLICATE_EMAIL',
                'message': 'Email already exists'
            }
        }), 409
    
    # Create user
    user = {
        'id': user_id_counter,
        'name': data.get('name'),
        'email': data['email'],
        'role': data.get('role', 'user'),
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'updated_at': datetime.utcnow().isoformat() + 'Z'
    }
    
    users[user_id_counter] = user
    user_id_counter += 1
    
    return jsonify(user), 201, {'Location': f'/users/{user["id"]}'}

# Update user (full replace)
@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """PUT /users/123"""
    if user_id not in users:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    users[user_id] = {
        'id': user_id,
        'name': data.get('name'),
        'email': data['email'],
        'role': data.get('role', 'user'),
        'created_at': users[user_id]['created_at'],
        'updated_at': datetime.utcnow().isoformat() + 'Z'
    }
    
    return jsonify(users[user_id]), 200

# Partial update
@app.route('/users/<int:user_id>', methods=['PATCH'])
def patch_user(user_id):
    """PATCH /users/123"""
    if user_id not in users:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update only provided fields
    for key in ['name', 'email', 'role']:
        if key in data:
            users[user_id][key] = data[key]
    
    users[user_id]['updated_at'] = datetime.utcnow().isoformat() + 'Z'
    
    return jsonify(users[user_id]), 200

# Delete user
@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """DELETE /users/123"""
    if user_id not in users:
        return jsonify({'error': 'User not found'}), 404
    
    del users[user_id]
    return '', 204  # No content

if __name__ == '__main__':
    app.run(debug=True)
```

---

## ✅ Best Practices

### **1. Use Nouns, Not Verbs**

```python
✗ Bad:
GET /getUsers
POST /createUser
DELETE /deleteUser/123

✓ Good:
GET /users
POST /users
DELETE /users/123
```

### **2. Consistent Naming**

```python
✗ Bad:
/users
/user-posts
/userComments

✓ Good:
/users
/users/123/posts
/users/123/comments
```

### **3. Return Appropriate Status Codes**

```python
✗ Bad:
# Always return 200, even for errors
return jsonify({'success': False, 'error': 'Not found'}), 200

✓ Good:
return jsonify({'error': 'Not found'}), 404
```

### **4. Include Metadata**

```python
GET /users?page=2

{
  "data": [...],
  "meta": {
    "page": 2,
    "per_page": 50,
    "total": 1000,
    "total_pages": 20
  },
  "links": {
    "first": "/users?page=1",
    "prev": "/users?page=1",
    "next": "/users?page=3",
    "last": "/users?page=20"
  }
}
```

### **5. Handle Errors Consistently**

```python
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {"field": "email", "error": "Invalid format"},
      {"field": "age", "error": "Must be positive"}
    ],
    "timestamp": "2024-01-15T10:00:00Z",
    "request_id": "abc-123"
  }
}
```

---

## 🎓 Interview Tips

**Q: "What is REST and its key principles?"**

A: "REST is architectural style for APIs using HTTP.

Key principles:
1. **Resource-based**: URLs identify resources (/users/123)
2. **HTTP methods**: Verbs specify actions (GET, POST, PUT, DELETE)
3. **Stateless**: Each request self-contained, no server-side session
4. **Uniform interface**: Consistent patterns across all endpoints

Example:
- GET /users → List users
- POST /users → Create user
- PUT /users/123 → Update user
- DELETE /users/123 → Delete user

Benefits:
- Scalable (stateless)
- Cacheable (GET requests)
- Simple (standard HTTP)
- Decoupled (client/server independent)"

**Q: "What's difference between PUT and PATCH?"**

A: "Both update resources, different scope:

**PUT** (Full replacement):
- Replaces entire resource
- Idempotent (multiple calls same result)
- Must send all fields
```python
PUT /users/123
{\"name\": \"John\", \"email\": \"john@example.com\", \"role\": \"admin\"}
# All fields required
```

**PATCH** (Partial update):
- Updates specific fields only
- Not guaranteed idempotent
- Send only changed fields
```python
PATCH /users/123
{\"email\": \"newemail@example.com\"}
# Only update email
```

In practice:
- PUT: Full form submission (replace everything)
- PATCH: Partial update (toggle status, update single field)"

**Q: "How do you design RESTful API for complex operations?"**

A: "Complex operations don't always map to CRUD. Approaches:

1. **Sub-resources** (preferred):
```python
POST /users/123/activate
POST /orders/456/cancel
```

2. **Status field**:
```python
PATCH /users/123
{\"status\": \"active\"}
```

3. **Batch operations**:
```python
POST /users/batch
[{\"id\": 123, \"action\": \"activate\"}, ...]
```

4. **RPC-style endpoint** (last resort):
```python
POST /rpc
{\"method\": \"process_payment\", \"params\": {...}}
```

Prefer option 1 (sub-resources) for clarity and RESTful consistency."

---

## 📚 Summary

**REST**: Resource-based API using HTTP methods

**Principles**: Resources (nouns), HTTP verbs (actions), stateless, uniform interface

**Key Methods**: GET (retrieve), POST (create), PUT (replace), PATCH (update), DELETE (remove)

**Best Practice**: Consistent naming, proper status codes, error handling, pagination/filtering 🚀
