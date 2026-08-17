# 123. Authentication vs Authorization

## 📌 Overview

**Authentication**: **Who are you?** (Verify identity)

**Authorization**: **What can you do?** (Verify permissions)

```
Authentication: "Prove you are John"
→ Username + password, API key, OAuth token

Authorization: "Can John delete this post?"
→ Check if John is admin or post owner
```

**Both required**:
```
1. Authentication: User logs in → Identity verified ✓
2. Authorization: User tries to delete post → Check permissions
```

---

## 🎯 Authentication

### **Purpose**: Verify who the user claims to be

### **Methods**

#### **1. Username + Password**

```python
# User submits credentials
POST /login
{
  "username": "john",
  "password": "secret123"
}

# Server verifies
user = User.query.filter_by(username="john").first()
if user and bcrypt.check_password_hash(user.password_hash, "secret123"):
    # Authenticated ✓
    session['user_id'] = user.id
    return {'token': generate_token(user.id)}
else:
    # Failed ❌
    return {'error': 'Invalid credentials'}, 401
```

**Security**:
- Store hashed passwords (bcrypt, argon2)
- NEVER store plaintext
- Use HTTPS to encrypt transmission

#### **2. API Keys**

```python
# Client includes key in request
GET /api/data
Authorization: Bearer sk_live_1234567890abcdef

# Server validates
api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
user = User.query.filter_by(api_key=api_key).first()
if user:
    # Authenticated ✓
    return {'data': 'value'}
else:
    return {'error': 'Invalid API key'}, 401
```

**Use cases**:
- Server-to-server communication
- Long-lived access (no expiration)
- Simple (no OAuth flow)

#### **3. JWT Tokens** ⭐

```python
# Login returns JWT
POST /login
{
  "username": "john",
  "password": "secret123"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}

# JWT payload (decoded):
{
  "user_id": 123,
  "username": "john",
  "role": "admin",
  "exp": 1704460800,  # Expiration timestamp
  "iat": 1704457200   # Issued at
}
```

**Implementation**:

```python
import jwt
from datetime import datetime, timedelta

SECRET_KEY = 'your-secret-key'

def generate_jwt(user_id, username, role):
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=1),  # 1 hour
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def verify_jwt(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token
```

**Flask decorator**:

```python
from functools import wraps

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        
        payload = verify_jwt(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Attach user info to request
        request.user = payload
        return f(*args, **kwargs)
    return decorated

# Usage
@app.route('/api/profile')
@require_auth
def get_profile():
    return jsonify({'user': request.user})
```

**Pros**:
- Stateless (no server-side storage)
- Contains user info (no DB lookup)
- Scalable (any server can verify)

**Cons**:
- Can't revoke before expiration
- Size (JWT larger than session ID)

#### **4. OAuth 2.0**

```python
# User authorizes app
# Redirect to authorization server (Google, GitHub)
GET https://accounts.google.com/o/oauth2/auth?
    client_id=YOUR_CLIENT_ID&
    redirect_uri=https://yourapp.com/callback&
    response_type=code&
    scope=profile email

# User approves → Redirect with code
GET https://yourapp.com/callback?code=AUTHORIZATION_CODE

# Exchange code for access token
POST https://oauth2.googleapis.com/token
{
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/callback",
  "grant_type": "authorization_code"
}

# Response
{
  "access_token": "ya29.a0AfH6SMB...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "refresh_token": "1//0gKc...",
  "scope": "profile email"
}

# Use access token
GET /api/data
Authorization: Bearer ya29.a0AfH6SMB...
```

**Use cases**:
- Third-party app access (no password sharing)
- Social login (Google, GitHub, Facebook)

---

## 🎯 Session-Based vs Token-Based

### **Session-Based** (Stateful)

```python
# Login creates session
POST /login → Session ID stored in cookie

# Server stores session
sessions = {
    'abc123': {'user_id': 1, 'username': 'john'}
}

# Subsequent requests include cookie
GET /api/data
Cookie: session_id=abc123

# Server looks up session
session = sessions.get('abc123')
if session:
    user_id = session['user_id']  # Authenticated ✓
```

**Pros**:
- Easy to revoke (delete session)
- Small (cookie = session ID only)

**Cons**:
- Requires server-side storage (Redis, DB)
- Session affinity (load balancer must route to same server)

### **Token-Based** (Stateless) ⭐

```python
# Login returns JWT
POST /login → JWT token

# Token contains user info
{
  "user_id": 1,
  "username": "john",
  "exp": 1704460800
}

# Client includes token
GET /api/data
Authorization: Bearer eyJhbG...

# Server verifies signature
payload = jwt.decode(token, SECRET_KEY)
user_id = payload['user_id']  # Authenticated ✓
```

**Pros**:
- Stateless (no server storage)
- Scalable (any server can verify)
- Mobile-friendly (no cookies needed)

**Cons**:
- Can't revoke before expiration
- Larger size (JWT vs session ID)

---

## 🎯 Authorization

### **Purpose**: Verify what the authenticated user can do

### **Models**

#### **1. Role-Based Access Control (RBAC)** ⭐

**Concept**: Users assigned roles, roles have permissions

```python
# Roles
roles = {
    'admin': ['read', 'write', 'delete', 'manage_users'],
    'editor': ['read', 'write'],
    'viewer': ['read']
}

# User has role
user.role = 'editor'

# Check permission
if 'write' in roles[user.role]:
    # Authorized ✓
    update_post()
else:
    # Forbidden ❌
    return 403
```

**Implementation**:

```python
def require_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # User authenticated (from @require_auth)
            user_role = request.user.get('role')
            
            # Check role hierarchy
            role_hierarchy = ['viewer', 'editor', 'admin']
            if role_hierarchy.index(user_role) >= role_hierarchy.index(required_role):
                return f(*args, **kwargs)
            else:
                return jsonify({'error': 'Insufficient permissions'}), 403
        return decorated
    return decorator

# Usage
@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@require_auth
@require_role('admin')
def delete_post(post_id):
    # Only admins can delete
    Post.query.filter_by(id=post_id).delete()
    return '', 204
```

**Pros**:
- Simple (assign role to user)
- Easy to understand

**Cons**:
- Rigid (can't have fine-grained permissions)
- Role explosion (admin_region1, admin_region2, ...)

#### **2. Attribute-Based Access Control (ABAC)**

**Concept**: Authorization based on attributes (user, resource, environment)

```python
# Rule: User can edit post if:
# - User is post owner, OR
# - User is admin, OR
# - User is in same department as post owner

def can_edit_post(user, post):
    if user.id == post.author_id:
        return True  # Owner ✓
    if user.role == 'admin':
        return True  # Admin ✓
    if user.department == post.author.department:
        return True  # Same department ✓
    return False  # Forbidden ❌
```

**Implementation**:

```python
@app.route('/api/posts/<int:post_id>', methods=['PUT'])
@require_auth
def update_post(post_id):
    post = Post.query.get_or_404(post_id)
    user = User.query.get(request.user['user_id'])
    
    # Check authorization
    if not can_edit_post(user, post):
        return jsonify({'error': 'Forbidden'}), 403
    
    # Update post
    post.title = request.json.get('title', post.title)
    post.body = request.json.get('body', post.body)
    db.session.commit()
    
    return jsonify(post.to_dict())
```

**Pros**:
- Flexible (complex rules)
- Fine-grained (attribute-level)

**Cons**:
- Complex to implement
- Performance (evaluate rules on every request)

#### **3. Permissions/Scopes**

**Concept**: Explicit permissions granted to user or API key

```python
# User has scopes
user.scopes = ['read:posts', 'write:posts', 'delete:posts']

# API key has limited scopes
api_key.scopes = ['read:posts']  # Read-only

# Check scope
if 'write:posts' in user.scopes:
    # Authorized ✓
    create_post()
else:
    # Forbidden ❌
    return 403
```

**Implementation**:

```python
def require_scope(required_scope):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Get user scopes (from JWT or DB)
            user_scopes = request.user.get('scopes', [])
            
            if required_scope in user_scopes:
                return f(*args, **kwargs)
            else:
                return jsonify({'error': f'Missing scope: {required_scope}'}), 403
        return decorated
    return decorator

# Usage
@app.route('/api/posts', methods=['POST'])
@require_auth
@require_scope('write:posts')
def create_post():
    # User must have "write:posts" scope
    pass
```

**Use cases**:
- OAuth 2.0 scopes (read:email, write:repo)
- API keys with limited permissions
- Third-party integrations

---

## 🎯 Real-World Examples

### **1. AWS IAM**

**Authentication**: Access keys (access key ID + secret access key)

**Authorization**: Policies (JSON documents)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

**RBAC**: Roles (EC2InstanceRole, LambdaExecutionRole)

### **2. GitHub API**

**Authentication**: Personal access token

```
GET /user
Authorization: Bearer ghp_1234567890abcdef
```

**Authorization**: Scopes

```
repo        # Full repo access
repo:status # Commit status access
user:email  # Email address access
```

### **3. OAuth 2.0 (Google)**

**Authentication**: Access token

```
GET /userinfo
Authorization: Bearer ya29.a0AfH6SMB...
```

**Authorization**: Scopes

```
profile  # Basic profile info
email    # Email address
drive.readonly  # Read-only Google Drive
```

---

## ✅ Best Practices

### **1. Always Use HTTPS**

```python
# Encrypt credentials in transit
# Otherwise: Password sniffed on network ❌
```

### **2. Hash Passwords**

```python
import bcrypt

# Store hashed password
password_hash = bcrypt.hashpw(b'secret123', bcrypt.gensalt())

# Verify
if bcrypt.checkpw(b'secret123', password_hash):
    # Correct password ✓
```

### **3. Use Short-Lived Tokens**

```python
# Access token: 1 hour
# Refresh token: 30 days

# After 1 hour, use refresh token to get new access token
# If refresh token stolen, limited window
```

### **4. Principle of Least Privilege**

```python
# Give minimal permissions
# Read-only API key for reporting service (not write access)
```

### **5. Audit Logging**

```python
# Log authentication/authorization events
log.info(f'User {user_id} accessed resource {resource_id}')
log.warning(f'User {user_id} denied access to {resource_id}')
```

---

## 🎓 Interview Tips

**Q: "What's the difference between authentication and authorization?"**

A: "Authentication: **Who are you?** Verify identity
Authorization: **What can you do?** Verify permissions

**Example**:
1. **Authentication**: User logs in with username + password → Identity verified ✓
2. **Authorization**: User tries to delete post → Check if user is admin or post owner

**Methods**:
- Authentication: Username/password, API keys, JWT tokens, OAuth
- Authorization: RBAC (role-based), ABAC (attribute-based), Scopes

**Order**: Always authenticate first, then authorize

**Real-world**: AWS IAM
- Authentication: Access keys (who are you)
- Authorization: IAM policies (what can you do)"

**Q: "What's the difference between session-based and token-based authentication?"**

A: "**Session-based** (stateful):
- Server stores session (Redis, DB)
- Cookie contains session ID
- Server looks up session on each request
- Pros: Easy to revoke (delete session)
- Cons: Requires storage, session affinity

**Token-based** (stateless) ⭐:
- JWT token contains user info
- No server-side storage
- Server verifies signature on each request
- Pros: Stateless, scalable, mobile-friendly
- Cons: Can't revoke before expiration

**When to use**:
- Session: Traditional web apps, need immediate revocation
- Token: APIs, microservices, mobile apps, scalability

**Hybrid**: Short-lived JWT (1 hour) + Refresh token (30 days) in database (can revoke)"

**Q: "How do you implement authorization?"**

A: "**RBAC** (Role-Based Access Control) ⭐:
```python
roles = {
    'admin': ['read', 'write', 'delete'],
    'editor': ['read', 'write'],
    'viewer': ['read']
}

# Check permission
if 'delete' in roles[user.role]:
    allow()
else:
    return 403 Forbidden
```

**ABAC** (Attribute-Based):
```python
# Rule: Can edit if owner OR admin OR same department
def can_edit(user, post):
    return (user.id == post.author_id or
            user.role == 'admin' or
            user.dept == post.author.dept)
```

**Scopes** (OAuth 2.0):
```python
# JWT contains scopes
token = {
    'user_id': 123,
    'scopes': ['read:posts', 'write:posts']
}

# Check scope
if 'write:posts' in token['scopes']:
    allow()
```

**Best practice**: RBAC for simplicity, ABAC for complex rules, Scopes for third-party access"

---

## 📚 Summary

**Authentication**: Who are you? (Username/password, API keys, JWT, OAuth)

**Authorization**: What can you do? (RBAC, ABAC, Scopes)

**Session vs Token**: Session = stateful (Redis), Token = stateless (JWT)

**RBAC**: Assign roles to users, roles have permissions (simple)

**ABAC**: Authorization based on attributes (flexible, complex)

**Best Practice**: HTTPS, hash passwords, short-lived tokens, least privilege 🚀

