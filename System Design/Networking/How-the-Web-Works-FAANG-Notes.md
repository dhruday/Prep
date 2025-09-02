# How the Web Works: FAANG Interview Preparation

## 1. Basic Flow
- **User Action:** User enters a URL or clicks a link in the browser.
- **DNS Resolution:** Browser queries DNS to resolve the domain name to an IP address.
- **TCP Connection:** Browser establishes a TCP connection (port 80 for HTTP, 443 for HTTPS) with the server.
- **HTTP Request:** Browser sends an HTTP request (GET, POST, etc.) to the server.
- **Server Processing:** Server processes the request, may query databases or other services.
- **HTTP Response:** Server sends back an HTTP response (status code, headers, body).
- **Rendering:** Browser parses HTML, CSS, JS, and renders the page for the user.

## 2. Key Components
- **Client:** User's browser or app.
- **Server:** Hosts web content and handles requests.
- **DNS:** Translates domain names to IP addresses.
- **CDN:** Distributes static content closer to users for faster access.
- **Load Balancer:** Distributes incoming traffic across multiple servers.

## 3. Protocols
- **HTTP/HTTPS:** Application layer protocols for communication.
- **TCP/IP:** Underlying transport and network protocols.
- **TLS/SSL:** Security protocols for encrypted communication (HTTPS).

## 4. Request/Response Cycle
- **Request:** Contains method, headers, and optional body.
- **Response:** Contains status code, headers, and body (HTML, JSON, etc.).

## 5. Browser Rendering
- **HTML Parsing:** Builds the DOM tree.
- **CSS Parsing:** Builds the CSSOM tree.
- **JS Execution:** Manipulates DOM/CSSOM, handles events.
- **Layout & Paint:** Combines DOM and CSSOM, renders pixels.

## 6. Performance & Optimization
- **Caching:** Reduces server load and latency.
- **Minification & Compression:** Reduces file sizes.
- **Lazy Loading:** Loads resources as needed.
- **Async Requests:** Improves responsiveness.

## 7. Security
- **HTTPS:** Encrypts data in transit.
- **CORS:** Controls cross-origin requests.
- **Cookies & Sessions:** Manages user authentication and state.

## 8. Modern Web Features
- **SPAs:** Single Page Applications use AJAX/fetch for dynamic updates.
- **WebSockets:** Enables real-time, bidirectional communication.
- **Service Workers:** Enables offline capabilities and caching.

---

These notes summarize the essential concepts for understanding how the web works, especially for FAANG interviews. For deeper explanations or diagrams, expand each section as needed.


