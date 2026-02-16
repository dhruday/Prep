# 125. Secure API Design

## 📌 Overview

**Secure API design** protects against common attacks and vulnerabilities.

**OWASP API Security Top 10** (2023):
1. Broken Object Level Authorization
2. Broken Authentication
3. Broken Object Property Level Authorization
4. Unrestricted Resource Consumption
5. Broken Function Level Authorization
6. Unrestricted Access to Sensitive Business Flows
7. Server Side Request Forgery (SSRF)
8. Security Misconfiguration
9. Improper Inventory Management
10. Unsafe Consumption of APIs

---

## 🎯 Input Validation

### **1. Validate All Inputs**

```python
from flask import request, jsonify
from marshmallow import Schema, fields, ValidationError

class UserSchema(Schema):
    username = fields.Str(required=True, validate=lambda s: 3 <= len(s) <= 20)
    email = fields.Email(required=True)
    age = fields.Int(required=True, validate=lambda n: 0 <= n <= 120)
    role = fields.Str(validate=lambda s: s in ['admin', 'user', 'guest'])

@app.route('/api/users', methods=['POST'])
def create_user():
    schema = UserSchema()
    try:
        data = schema.load(request.json)
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 400
    
    # Data validated ✓
    user = User(**data)
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201
```

**Validation rules**:
- **Length**: Username 3-20 chars
- **Format**: Email valid format
- **Range**: Age 0-120
- **Whitelist**: Role in ['admin', 'user', 'guest']

---

### **2. SQL Injection Prevention** ⭐

**Attack**:

```python
# Vulnerable code ❌
username = request.args.get('username')
query = f"SELECT * FROM users WHERE username = '{username}'"
db.execute(query)

# Attacker input:
username = "admin' OR '1'='1"

# Resulting query:
SELECT * FROM users WHERE username = 'admin' OR '1'='1'
# Returns all users! ❌
```

**Prevention: Parameterized Queries** ✓

```python
# Using SQLAlchemy ORM ✓
username = request.args.get('username')
user = User.query.filter_by(username=username).first()

# Using raw SQL with parameters ✓
from sqlalchemy import text
username = request.args.get('username')
query = text("SELECT * FROM users WHERE username = :username")
result = db.session.execute(query, {'username': username})

# Using psycopg2 (PostgreSQL) ✓
cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
```

**Why safe?**
- Parameters **escaped** by database driver
- SQL structure **separated** from data

---

### **3. NoSQL Injection Prevention**

**Attack** (MongoDB):

```python
# Vulnerable code ❌
username = request.json.get('username')
password = request.json.get('password')

user = db.users.find_one({'username': username, 'password': password})

# Attacker input:
{
  "username": {"$ne": null},
  "password": {"$ne": null}
}

# Resulting query:
db.users.find_one({'username': {'$ne': null}, 'password': {'$ne': null}})
# Returns first user (bypasses authentication)! ❌
```

**Prevention**:

```python
# Validate input types ✓
username = str(request.json.get('username'))
password = str(request.json.get('password'))

# Use query operators safely ✓
user = db.users.find_one({'username': {'$eq': username}})

# Better: Hash password, don't query by plaintext
user = db.users.find_one({'username': username})
if user and bcrypt.checkpw(password.encode(), user['password_hash']):
    # Authenticated ✓
```

---

### **4. Command Injection Prevention**

**Attack**:

```python
# Vulnerable code ❌
filename = request.args.get('filename')
os.system(f'cat {filename}')

# Attacker input:
filename = "file.txt; rm -rf /"

# Resulting command:
cat file.txt; rm -rf /
# Deletes entire filesystem! ❌
```

**Prevention**:

```python
# Use subprocess with args list (not shell) ✓
import subprocess

filename = request.args.get('filename')

# Validate filename
if not re.match(r'^[a-zA-Z0-9_.-]+$', filename):
    return 'Invalid filename', 400

# Use args list (not shell=True)
result = subprocess.run(['cat', filename], capture_output=True, text=True)
return result.stdout
```

**Or avoid shell commands**:

```python
# Read file directly in Python ✓
with open(filename, 'r') as f:
    content = f.read()
return content
```

---

## 🎯 XSS (Cross-Site Scripting) Prevention

**Attack**:

```python
# Vulnerable code ❌
comment = request.form.get('comment')
return f'<div>{comment}</div>'

# Attacker input:
comment = "<script>alert('XSS')</script>"

# Rendered HTML:
<div><script>alert('XSS')</script></div>
# Executes JavaScript! ❌
```

**Prevention: Escape Output** ✓

```python
from flask import escape

# Escape HTML ✓
comment = request.form.get('comment')
return f'<div>{escape(comment)}</div>'

# Result:
<div>&lt;script&gt;alert('XSS')&lt;/script&gt;</div>
# Displayed as text, not executed ✓
```

**Or use templating engine** (auto-escapes):

```html
<!-- Jinja2 template (Flask) -->
<div>{{ comment }}</div>  <!-- Auto-escaped ✓ -->
```

**Content Security Policy** (CSP) header:

```python
@app.after_request
def set_csp(response):
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'"
    return response
```

---

## 🎯 CSRF (Cross-Site Request Forgery) Prevention

**Attack**:

```html
<!-- Attacker's website -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account">
  <input type="hidden" name="amount" value="1000">
</form>
<script>document.forms[0].submit();</script>

<!-- User visits attacker site while logged into bank.com
     → Request sent with user's cookies → Money transferred! ❌ -->
```

**Prevention: CSRF Tokens** ✓

```python
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.secret_key = 'your-secret-key'
csrf = CSRFProtect(app)

# Form includes CSRF token
@app.route('/transfer', methods=['GET'])
def transfer_form():
    return '''
        <form method="POST">
            <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
            <input name="to" placeholder="Recipient">
            <input name="amount" placeholder="Amount">
            <button>Transfer</button>
        </form>
    '''

# Verify token on submission
@app.route('/transfer', methods=['POST'])
def transfer():
    # Flask-WTF automatically validates csrf_token
    to = request.form.get('to')
    amount = request.form.get('amount')
    
    # Process transfer ✓
    return 'Transfer successful'
```

**SameSite Cookie Attribute**:

```python
@app.route('/login', methods=['POST'])
def login():
    # Set session cookie
    response = make_response('Logged in')
    response.set_cookie('session', session_id, samesite='Strict', httponly=True, secure=True)
    return response
```

**SameSite values**:
- **Strict**: Cookie never sent cross-site
- **Lax**: Cookie sent on top-level navigation (GET links)
- **None**: Cookie always sent (requires Secure flag)

---

## 🎯 CORS (Cross-Origin Resource Sharing)

**Problem**: Browser blocks cross-origin requests

```javascript
// Frontend: example.com
fetch('https://api.other.com/data')
// Browser blocks (different origin) ❌
```

**Solution: CORS Headers**

```python
from flask_cors import CORS

# Allow specific origin ✓
CORS(app, origins=['https://example.com'])

# Allow credentials (cookies)
CORS(app, origins=['https://example.com'], supports_credentials=True)

# Custom configuration
@app.route('/api/data')
def get_data():
    response = jsonify({'data': 'value'})
    response.headers['Access-Control-Allow-Origin'] = 'https://example.com'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response
```

**Security**:
```python
# ❌ Dangerous: Allow all origins with credentials
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

# ✓ Safe: Whitelist specific origins
allowed_origins = ['https://example.com', 'https://app.example.com']
origin = request.headers.get('Origin')
if origin in allowed_origins:
    response.headers['Access-Control-Allow-Origin'] = origin
```

---

## 🎯 HTTPS / TLS

**Why needed**: Encrypt data in transit (prevent MITM attacks)

```python
# HTTP (unencrypted) ❌
http://api.example.com/login
# Attacker can see username/password in plaintext ❌

# HTTPS (encrypted) ✓
https://api.example.com/login
# Attacker sees encrypted data ✓
```

**Implementation**:

```python
# Flask with TLS certificate
if __name__ == '__main__':
    app.run(ssl_context=('cert.pem', 'key.pem'))
```

**Or use reverse proxy** (nginx, Caddy):

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
    }
}
```

**HSTS Header** (force HTTPS):

```python
@app.after_request
def set_hsts(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
```

---

## 🎯 Security Headers

### **1. Content-Security-Policy (CSP)**

```python
# Restrict script sources (XSS prevention)
response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' https://cdn.example.com"
```

### **2. X-Content-Type-Options**

```python
# Prevent MIME sniffing
response.headers['X-Content-Type-Options'] = 'nosniff'
```

### **3. X-Frame-Options**

```python
# Prevent clickjacking (iframe embedding)
response.headers['X-Frame-Options'] = 'DENY'
# Or: 'SAMEORIGIN' (allow same origin)
```

### **4. X-XSS-Protection**

```python
# Enable browser XSS filter
response.headers['X-XSS-Protection'] = '1; mode=block'
```

### **5. Referrer-Policy**

```python
# Limit referrer information
response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
```

### **6. Permissions-Policy**

```python
# Disable unnecessary features
response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
```

**Flask implementation**:

```python
@app.after_request
def set_security_headers(response):
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

---

## 🎯 API Key Security

### **1. Rotate Keys Regularly**

```python
# Generate new API key
def generate_api_key():
    return secrets.token_urlsafe(32)

# Store hashed key
api_key = generate_api_key()
api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
db.store(user_id, api_key_hash)

# Return key to user (only time it's visible)
return {'api_key': api_key}
```

### **2. Rate Limit Per Key**

```python
@app.route('/api/data')
@rate_limit_by_api_key(limit=100, window=3600)
def get_data():
    pass
```

### **3. Restrict by IP**

```python
# Whitelist IPs for API key
api_key_config = {
    'sk_live_abc123': {
        'allowed_ips': ['192.168.1.1', '10.0.0.1']
    }
}

@app.before_request
def check_ip():
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    client_ip = request.remote_addr
    
    config = api_key_config.get(api_key)
    if config and client_ip not in config['allowed_ips']:
        return jsonify({'error': 'IP not allowed'}), 403
```

### **4. Audit Logging**

```python
import logging

logger = logging.getLogger(__name__)

@app.before_request
def log_request():
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    logger.info(f'API call: {request.method} {request.path} | Key: {api_key[:8]}... | IP: {request.remote_addr}')
```

---

## 🎯 Broken Object Level Authorization (BOLA)

**Attack**:

```python
# User A tries to access User B's data
GET /api/users/123/orders/456

# Server only checks authentication (user logged in)
# Doesn't check if user 123 == current user ❌
```

**Prevention**:

```python
@app.route('/api/users/<int:user_id>/orders/<int:order_id>')
@require_auth
def get_order(user_id, order_id):
    current_user_id = request.user['user_id']
    
    # Check authorization ✓
    if current_user_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
    
    order = Order.query.filter_by(id=order_id, user_id=user_id).first_or_404()
    return jsonify(order.to_dict())
```

**Better: Use current user ID from token**:

```python
@app.route('/api/orders/<int:order_id>')
@require_auth
def get_order(order_id):
    # Get user ID from authenticated token
    current_user_id = request.user['user_id']
    
    # Fetch order for current user only ✓
    order = Order.query.filter_by(id=order_id, user_id=current_user_id).first_or_404()
    return jsonify(order.to_dict())
```

---

## 🎯 Broken Function Level Authorization

**Attack**:

```python
# Regular user calls admin endpoint
DELETE /api/users/123

# Server doesn't check if user is admin ❌
```

**Prevention**:

```python
def require_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_role = request.user.get('role')
            if user_role != required_role:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@require_auth
@require_role('admin')  # Only admins can delete users ✓
def delete_user(user_id):
    User.query.filter_by(id=user_id).delete()
    db.session.commit()
    return '', 204
```

---

## 🎯 SSRF (Server-Side Request Forgery) Prevention

**Attack**:

```python
# Vulnerable code ❌
url = request.args.get('url')
response = requests.get(url)
return response.text

# Attacker input:
url = "http://169.254.169.254/latest/meta-data/iam/security-credentials"
# Accesses AWS instance metadata (steal credentials) ❌
```

**Prevention**:

```python
import ipaddress

def is_safe_url(url):
    # Parse URL
    parsed = urllib.parse.urlparse(url)
    
    # Allow only HTTP/HTTPS
    if parsed.scheme not in ['http', 'https']:
        return False
    
    # Resolve hostname to IP
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
    except:
        return False
    
    # Block private IPs
    if ip.is_private or ip.is_loopback:
        return False
    
    return True

@app.route('/fetch')
def fetch_url():
    url = request.args.get('url')
    
    if not is_safe_url(url):
        return 'Invalid URL', 400
    
    response = requests.get(url, timeout=5)
    return response.text
```

---

## 🎯 Real-World: OWASP API Security Top 10

### **1. Broken Object Level Authorization (BOLA)**
- Check if user owns resource
- Example: `/api/users/123/orders` - verify user_id == current_user_id

### **2. Broken Authentication**
- Use strong passwords (bcrypt)
- Implement rate limiting (prevent brute force)
- Use MFA

### **3. Broken Object Property Level Authorization**
- Don't expose sensitive fields
- Example: Don't return `password_hash`, `ssn` in API response

### **4. Unrestricted Resource Consumption**
- Rate limiting (prevent DoS)
- Pagination (limit page size)
- Timeouts

### **5. Broken Function Level Authorization**
- Check user role/permissions
- Example: Only admin can delete users

### **6. Unrestricted Access to Sensitive Business Flows**
- Implement captcha (prevent bots)
- Rate limit sensitive actions (password reset, purchase)

### **7. Server Side Request Forgery (SSRF)**
- Validate URLs (block private IPs)
- Whitelist allowed domains

### **8. Security Misconfiguration**
- Remove debug mode in production
- Use security headers
- Keep dependencies updated

### **9. Improper Inventory Management**
- Document all API endpoints
- Deprecate old versions
- Monitor usage

### **10. Unsafe Consumption of APIs**
- Validate third-party API responses
- Use timeouts
- Handle errors gracefully

---

## ✅ Best Practices Summary

1. **Input Validation**: Validate all inputs (length, format, whitelist)
2. **SQL Injection**: Use parameterized queries (never concatenate)
3. **XSS**: Escape output, use CSP header
4. **CSRF**: Use tokens, SameSite cookies
5. **HTTPS**: Encrypt in transit, HSTS header
6. **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
7. **Authorization**: Check user owns resource (BOLA prevention)
8. **Rate Limiting**: Prevent abuse, DoS protection
9. **API Keys**: Hash, rotate, rate limit
10. **Logging**: Audit all security events

---

## 🎓 Interview Tips

**Q: "How do you prevent SQL injection?"**

A: "Use **parameterized queries** (prepared statements):

```python
# ❌ Vulnerable (string concatenation)
query = f"SELECT * FROM users WHERE username = '{username}'"

# ✓ Safe (parameterized)
user = User.query.filter_by(username=username).first()
# Or raw SQL:
cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
```

**Why safe?**
- Database driver **escapes** parameters
- SQL structure **separated** from data
- Attacker can't inject SQL syntax

**Real-world**: All modern ORMs (SQLAlchemy, Django ORM) use parameterized queries by default"

**Q: "How do you prevent XSS attacks?"**

A: "**Escape output** before rendering:

```python
from flask import escape
comment = '<script>alert("XSS")</script>'
return f'<div>{escape(comment)}</div>'
# Result: &lt;script&gt;alert("XSS")&lt;/script&gt; (displayed as text)
```

**Content Security Policy** header:
```python
response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'"
```

**Best practices**:
- Use templating engines (auto-escape: Jinja2, React)
- Validate inputs (whitelist allowed HTML tags)
- HttpOnly cookies (prevent JavaScript access)"

**Q: "What are security headers and why are they important?"**

A: "Security headers instruct browser to enable security features:

**Key headers**:
1. **Content-Security-Policy**: Restrict script sources (XSS prevention)
2. **Strict-Transport-Security**: Force HTTPS (MITM prevention)
3. **X-Frame-Options**: Prevent clickjacking (iframe embedding)
4. **X-Content-Type-Options**: Prevent MIME sniffing
5. **Referrer-Policy**: Limit referrer information

**Implementation**:
```python
@app.after_request
def set_headers(response):
    response.headers['Content-Security-Policy'] = \"default-src 'self'\"
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response
```

Real-world: All major websites use security headers (check with SecurityHeaders.com)"

---

## 📚 Summary

**Secure API Design**: Protect against OWASP Top 10 vulnerabilities

**Input Validation**: Validate length, format, whitelist (prevent injection)

**SQL Injection**: Parameterized queries (escape user input)

**XSS**: Escape output, CSP header

**CSRF**: Tokens, SameSite cookies

**HTTPS**: Encrypt in transit, HSTS header, TLS 1.3

**Authorization**: Check user owns resource (BOLA/BFLA prevention)

**Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options 🚀

