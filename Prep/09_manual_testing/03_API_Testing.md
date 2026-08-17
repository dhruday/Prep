# API Testing - Interview Question Bank

## Table of Contents
1. [API Fundamentals](#api-fundamentals)
2. [REST API Concepts](#rest-api-concepts)
3. [HTTP Methods and Status Codes](#http-methods-and-status-codes)
4. [API Testing Techniques](#api-testing-techniques)
5. [API Testing Tools](#api-testing-tools)
6. [Authentication and Security](#authentication-and-security)

---

## API Fundamentals

### Beginner Questions

#### Q1: What is an API?
**Answer:**

**API (Application Programming Interface)** is a set of rules that allows different software applications to communicate with each other.

**Simple Explanation:**
Think of a waiter in a restaurant:
- You (client) tell the waiter (API) what you want
- Waiter takes your order to the kitchen (server)
- Kitchen prepares the food (processes request)
- Waiter brings your food back (response)

**Real Example:**
When you use a weather app:
1. App sends request to weather API
2. API contacts weather database
3. Database returns weather data
4. API sends data back to app
5. App displays weather to you

---

#### Q2: What is API Testing?
**Answer:**

API Testing validates that APIs work correctly, return expected data, handle errors, and perform efficiently.

**What we test:**
- Functionality (correct response)
- Reliability (consistent behavior)
- Performance (response time)
- Security (authentication, authorization)
- Error handling (proper error messages)

**Why API Testing?**
- Faster than UI testing
- Tests business logic directly
- Catches bugs early
- Independent of UI changes

---

#### Q3: What is the difference between API Testing and UI Testing?
**Answer:**

| Aspect | API Testing | UI Testing |
|--------|-------------|------------|
| Layer | Backend | Frontend |
| Speed | Fast | Slow |
| Stability | More stable | Can be flaky |
| Coverage | Business logic | User experience |
| Tools | Postman, RestAssured | Selenium, Cypress |
| Skills | HTTP, JSON, coding | DOM, selectors |

**Test Pyramid Application:**
- More API tests (middle layer)
- Fewer UI tests (top layer)

---

#### Q4: What is REST?
**Answer:**

**REST (Representational State Transfer)** is an architectural style for designing networked applications.

**REST Principles:**
1. **Client-Server** - Separation of concerns
2. **Stateless** - Each request contains all info needed
3. **Cacheable** - Responses can be cached
4. **Uniform Interface** - Consistent way to interact
5. **Layered System** - Can have intermediary servers

**RESTful API Example:**
```
GET /users         → List all users
GET /users/123     → Get user with ID 123
POST /users        → Create new user
PUT /users/123     → Update user 123
DELETE /users/123  → Delete user 123
```

---

#### Q5: What is JSON?
**Answer:**

**JSON (JavaScript Object Notation)** is a lightweight data format used for API communication.

**Example:**
```json
{
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true,
    "roles": ["admin", "user"],
    "address": {
      "city": "New York",
      "zip": "10001"
    }
  }
}
```

**Data Types in JSON:**
- String: `"Hello"`
- Number: `42`, `3.14`
- Boolean: `true`, `false`
- Array: `[1, 2, 3]`
- Object: `{"key": "value"}`
- Null: `null`

---

### Intermediate Questions

#### Q6: Explain HTTP Methods (CRUD Operations)
**Answer:**

| Method | Action | CRUD | Request Body | Idempotent |
|--------|--------|------|--------------|------------|
| GET | Retrieve data | Read | No | Yes |
| POST | Create new resource | Create | Yes | No |
| PUT | Update/Replace resource | Update | Yes | Yes |
| PATCH | Partial update | Update | Yes | No |
| DELETE | Remove resource | Delete | No | Yes |

**Idempotent:** Multiple identical requests have same effect as single request.

**Examples:**

```http
# GET - Retrieve user
GET /api/users/123

# POST - Create user
POST /api/users
Content-Type: application/json
{
  "name": "John",
  "email": "john@test.com"
}

# PUT - Replace entire user
PUT /api/users/123
{
  "name": "John Smith",
  "email": "john.smith@test.com"
}

# PATCH - Update email only
PATCH /api/users/123
{
  "email": "newemail@test.com"
}

# DELETE - Remove user
DELETE /api/users/123
```

---

#### Q7: Explain HTTP Status Codes
**Answer:**

**1xx - Informational**
- 100 Continue
- 101 Switching Protocols

**2xx - Success**
| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |

**3xx - Redirection**
| Code | Meaning | Use Case |
|------|---------|----------|
| 301 | Moved Permanently | URL changed forever |
| 302 | Found | Temporary redirect |
| 304 | Not Modified | Cached content valid |

**4xx - Client Errors**
| Code | Meaning | Use Case |
|------|---------|----------|
| 400 | Bad Request | Invalid syntax |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |

**5xx - Server Errors**
| Code | Meaning | Use Case |
|------|---------|----------|
| 500 | Internal Server Error | Server bug |
| 502 | Bad Gateway | Invalid upstream response |
| 503 | Service Unavailable | Server overloaded |
| 504 | Gateway Timeout | Upstream timeout |

---

#### Q8: What are Headers in API requests?
**Answer:**

Headers provide metadata about the request/response.

**Common Request Headers:**

| Header | Purpose | Example |
|--------|---------|---------|
| Content-Type | Format of request body | `application/json` |
| Accept | Expected response format | `application/json` |
| Authorization | Authentication credentials | `Bearer token123` |
| User-Agent | Client information | `Mozilla/5.0...` |
| Cache-Control | Caching directives | `no-cache` |

**Common Response Headers:**

| Header | Purpose | Example |
|--------|---------|---------|
| Content-Type | Format of response | `application/json` |
| Content-Length | Size of response | `1234` |
| Cache-Control | Caching rules | `max-age=3600` |
| Set-Cookie | Set cookies | `session=abc123` |

**Example Request:**
```http
POST /api/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Accept: application/json

{
  "name": "John"
}
```

---

#### Q9: What is the difference between PUT and PATCH?
**Answer:**

| Aspect | PUT | PATCH |
|--------|-----|-------|
| Update Type | Full replace | Partial update |
| Required Data | Complete resource | Only changed fields |
| Idempotent | Yes | Not always |

**Example:**

Current user:
```json
{
  "id": 1,
  "name": "John",
  "email": "john@test.com",
  "age": 25
}
```

**PUT request** (must send ALL fields):
```json
PUT /users/1
{
  "name": "John Smith",
  "email": "john@test.com",
  "age": 25
}
```

**PATCH request** (only changed field):
```json
PATCH /users/1
{
  "name": "John Smith"
}
```

**What Interviewer Expects:**
- Clear understanding of full vs partial update
- Know when to use each

---

#### Q10: What is Query Parameter vs Path Parameter?
**Answer:**

**Path Parameter:** Part of the URL path
```
GET /users/{id}
GET /users/123

GET /orders/{orderId}/items/{itemId}
GET /orders/456/items/789
```

**Query Parameter:** After `?` in URL
```
GET /users?status=active
GET /users?status=active&role=admin&page=2
```

**When to use:**

| Use Case | Parameter Type | Example |
|----------|---------------|---------|
| Identify specific resource | Path | `/users/123` |
| Filter results | Query | `/users?status=active` |
| Pagination | Query | `/users?page=2&limit=10` |
| Sorting | Query | `/users?sort=name&order=asc` |
| Search | Query | `/users?search=john` |

---

### Advanced Questions

#### Q11: What is API Versioning?
**Answer:**

API versioning allows multiple versions of an API to coexist.

**Versioning Strategies:**

**1. URL Path Versioning:**
```
GET /api/v1/users
GET /api/v2/users
```

**2. Query Parameter:**
```
GET /api/users?version=1
GET /api/users?version=2
```

**3. Header Versioning:**
```
GET /api/users
Accept-Version: v1

GET /api/users
Accept-Version: v2
```

**4. Accept Header:**
```
GET /api/users
Accept: application/vnd.company.api+json;version=1
```

**Best Practice:** URL path versioning is most common and visible.

---

#### Q12: What is Pagination in APIs?
**Answer:**

Pagination returns data in chunks instead of all at once.

**Types:**

**1. Offset-Based:**
```
GET /users?offset=0&limit=10   # First 10 users
GET /users?offset=10&limit=10  # Next 10 users
GET /users?page=1&size=10      # Alternative syntax
```

**2. Cursor-Based:**
```
GET /users?cursor=abc123&limit=10
```

**Response Example:**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

**Testing Pagination:**
- First page, last page, middle page
- Invalid page numbers
- Edge cases (0, negative, beyond total)
- Page size limits

---

#### Q13: What is Rate Limiting?
**Answer:**

Rate limiting restricts how many API requests a client can make in a time period.

**Headers:**
```
X-RateLimit-Limit: 100        # Max requests allowed
X-RateLimit-Remaining: 45     # Requests remaining
X-RateLimit-Reset: 1609459200 # When limit resets
```

**Response when exceeded:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

**Testing Rate Limiting:**
- Send requests up to limit
- Verify 429 response
- Wait for reset
- Test retry-after behavior

---

## API Testing Techniques

### Q14: How do you test an API?
**Answer:**

**Test Categories:**

**1. Functional Testing:**
- Valid inputs → correct response
- Invalid inputs → proper error
- Boundary values
- Data types

**2. Validation Testing:**
- Required fields
- Field formats (email, phone)
- Data constraints
- Business rules

**3. Error Handling:**
- Missing parameters
- Invalid data types
- Authentication failures
- Server errors

**4. Performance Testing:**
- Response time
- Load handling
- Concurrent requests

**5. Security Testing:**
- Authentication
- Authorization
- SQL injection
- XSS

**Test Case Example:**

| Test Case | Endpoint | Input | Expected |
|-----------|----------|-------|----------|
| Valid user creation | POST /users | Valid JSON | 201, user object |
| Missing required field | POST /users | No email | 400, error message |
| Invalid email format | POST /users | bad-email | 422, validation error |
| Unauthorized access | GET /admin/users | No token | 401, unauthorized |
| Non-existent resource | GET /users/999 | Invalid ID | 404, not found |

---

#### Q15: What is API Contract Testing?
**Answer:**

Contract testing verifies that API provider and consumer agree on the API structure.

**What it validates:**
- Endpoint URLs
- Request/response format
- Data types
- Required fields
- Status codes

**Tools:**
- Pact
- Spring Cloud Contract
- Postman Schema Validation

**Example Contract:**
```json
{
  "description": "Get user by ID",
  "request": {
    "method": "GET",
    "path": "/users/123"
  },
  "response": {
    "status": 200,
    "body": {
      "id": 123,
      "name": "string",
      "email": "string"
    }
  }
}
```

---

#### Q16: How do you validate API Response?
**Answer:**

**Validation Checklist:**

1. **Status Code**
   - Correct code for the operation
   - `200` for success, `201` for creation

2. **Response Body**
   - All expected fields present
   - Correct data types
   - Data matches request

3. **Response Headers**
   - Content-Type is correct
   - Custom headers present

4. **Response Time**
   - Within acceptable limit

5. **Data Integrity**
   - Database reflects changes
   - Related entities updated

**Postman Tests Example:**
```javascript
// Status code
pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
});

// Response body
pm.test("Response has user data", function() {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData.name).to.eql('John');
    pm.expect(jsonData.email).to.include('@');
});

// Response time
pm.test("Response time < 500ms", function() {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Header
pm.test("Content-Type is JSON", function() {
    pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');
});
```

---

## Authentication and Security

### Q17: What is API Authentication?
**Answer:**

Authentication verifies the identity of the client making the request.

**Types:**

**1. API Key:**
```
GET /api/users
X-API-Key: abc123xyz
```

**2. Basic Authentication:**
```
GET /api/users
Authorization: Basic base64(username:password)
```

**3. Bearer Token (JWT):**
```
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**4. OAuth 2.0:**
- Access token obtained through authorization flow
- Used for third-party API access

---

#### Q18: What is JWT (JSON Web Token)?
**Answer:**

JWT is a self-contained token for secure information transmission.

**Structure:**
```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Parts:**
1. **Header:** Algorithm and token type
2. **Payload:** User data (claims)
3. **Signature:** Verification

**Decoded Payload:**
```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "role": "admin",
  "exp": 1609459200
}
```

**Testing JWT:**
- Valid token → access granted
- Expired token → 401 error
- Invalid signature → 401 error
- Missing claims → appropriate error

---

#### Q19: What is the difference between Authentication and Authorization?
**Answer:**

| Aspect | Authentication | Authorization |
|--------|----------------|---------------|
| Question | Who are you? | What can you do? |
| Purpose | Verify identity | Verify permissions |
| When | First | After authentication |
| Response | 401 Unauthorized | 403 Forbidden |

**Example:**
1. User logs in with credentials (Authentication)
2. System verifies user exists (Authentication passes)
3. User tries to access admin panel (Authorization check)
4. System checks user role (Authorization)
5. If not admin → 403 Forbidden

---

### Q20: What are common API Security Tests?
**Answer:**

**1. SQL Injection:**
```
GET /users?id=1' OR '1'='1
GET /users?id=1; DROP TABLE users--
```

**2. Cross-Site Scripting (XSS):**
```
POST /comments
{
  "text": "<script>alert('XSS')</script>"
}
```

**3. Broken Authentication:**
- Weak passwords accepted
- No brute force protection
- Token doesn't expire

**4. Authorization Testing:**
- Access other users' data
- Access admin endpoints as regular user
- Horizontal privilege escalation

**5. Data Exposure:**
- Sensitive data in response (passwords, tokens)
- Error messages revealing system info

**6. Rate Limiting:**
- No limits on login attempts
- No protection against DDoS

---

## API Testing Tools

### Q21: What is Postman and how do you use it?
**Answer:**

Postman is a popular API testing tool for sending requests and validating responses.

**Features:**
- Send HTTP requests
- Collections for organizing tests
- Environment variables
- Pre-request scripts
- Test scripts
- Newman (CLI) for automation

**Basic Usage:**
1. Enter URL and method
2. Add headers and body
3. Send request
4. View response
5. Write tests

**Environment Variables:**
```javascript
// Set variable
pm.environment.set("userId", 123);

// Use variable
GET {{baseUrl}}/users/{{userId}}

// Access in script
var userId = pm.environment.get("userId");
```

**Collection Runner:**
- Run multiple requests in sequence
- Use data files for data-driven testing
- Generate reports

---

#### Q22: How do you chain API requests in Postman?
**Answer:**

Chaining means using response from one request in another.

**Example Flow:**
1. Login → Get token
2. Use token for subsequent requests

**Request 1 - Login (Tests tab):**
```javascript
var response = pm.response.json();
pm.environment.set("authToken", response.token);
pm.environment.set("userId", response.user.id);
```

**Request 2 - Get User (Headers):**
```
Authorization: Bearer {{authToken}}
```

**Request 2 - URL:**
```
GET {{baseUrl}}/users/{{userId}}
```

---

### Q23: What is RestAssured?
**Answer:**

RestAssured is a Java library for API testing.

**Example:**
```java
import io.restassured.RestAssured;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

public class APITest {
    
    @Test
    public void testGetUser() {
        given()
            .baseUri("https://api.example.com")
            .header("Authorization", "Bearer " + token)
        .when()
            .get("/users/123")
        .then()
            .statusCode(200)
            .body("name", equalTo("John"))
            .body("email", containsString("@"))
            .time(lessThan(2000L));
    }
    
    @Test
    public void testCreateUser() {
        String requestBody = "{ \"name\": \"John\", \"email\": \"john@test.com\" }";
        
        given()
            .contentType("application/json")
            .body(requestBody)
        .when()
            .post("/users")
        .then()
            .statusCode(201)
            .body("id", notNullValue());
    }
}
```

---

## Real Interview Scenario Questions

### Scenario 1: API returns 500 error. How do you troubleshoot?
**Answer:**

1. **Check Request:**
   - Is URL correct?
   - Are headers correct?
   - Is body format valid?

2. **Check Logs:**
   - Server error logs
   - Application logs

3. **Isolate the Issue:**
   - Does it work in other environments?
   - Does it work with different data?
   - Is it a specific endpoint?

4. **Check Dependencies:**
   - Database connection
   - Third-party services
   - Service availability

5. **Test Simpler Cases:**
   - Remove optional parameters
   - Use minimal data

6. **Report with Details:**
   - Full request (URL, headers, body)
   - Response received
   - Steps to reproduce
   - Environment details

---

### Scenario 2: How would you test a Login API?
**Answer:**

**Positive Tests:**
| Test | Input | Expected |
|------|-------|----------|
| Valid credentials | Correct email/password | 200, token returned |
| Case sensitivity | lowercase email | Should work |

**Negative Tests:**
| Test | Input | Expected |
|------|-------|----------|
| Invalid password | Wrong password | 401, error message |
| Invalid email | Non-existent email | 401, error message |
| Empty fields | Missing email/password | 400, validation error |
| Invalid format | Malformed email | 400/422, format error |
| SQL injection | `' OR '1'='1` | 401, no SQL error |
| Locked account | Valid but locked | 403, account locked |
| Inactive user | Valid but inactive | 403, account inactive |

**Security Tests:**
- Brute force (rate limiting)
- Token expiration
- Token in response only (not URL)
- HTTPS required

**Performance Tests:**
- Response time < 2 seconds
- Multiple concurrent logins

---

### Scenario 3: API works in Postman but fails in automation. Why?
**Answer:**

**Common Reasons:**

1. **Environment Variables:**
   - Not set correctly in automation
   - Different base URL

2. **Headers:**
   - Missing Content-Type
   - Missing Authorization

3. **SSL/TLS:**
   - Certificate issues
   - Need to disable SSL verification

4. **Cookies:**
   - Session cookies not maintained

5. **Request Body:**
   - Encoding differences
   - Special characters

6. **Timing:**
   - Need delays between requests
   - Async operations not complete

**Debugging:**
- Print actual request being sent
- Compare with Postman request
- Check headers, body, URL carefully

---

## API Test Checklist

### For Every Endpoint:
- [ ] Valid request → correct response
- [ ] Invalid data → proper error
- [ ] Missing required fields → 400
- [ ] Invalid data types → 400/422
- [ ] Unauthorized access → 401
- [ ] Forbidden access → 403
- [ ] Not found → 404
- [ ] Response time acceptable
- [ ] Response structure correct
- [ ] Data types correct

### For CRUD Operations:
- [ ] CREATE: Resource created, 201 returned
- [ ] READ: Correct data returned
- [ ] UPDATE: Changes persisted
- [ ] DELETE: Resource removed

### For Security:
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] SQL injection blocked
- [ ] XSS prevented
- [ ] Sensitive data not exposed

---

Continue to [04_Database_Testing.md](04_Database_Testing.md) for Database Testing and SQL questions.
