# 🌐 How the Web Works: In-Depth Explanation (FAANG Interview)

Understanding what happens when you type a URL into your browser is a **classic frontend interview question**. Below is a detailed, step-by-step explanation you can use in interviews or presentations.

---

## 🚀 What Happens When You Type a URL in the Browser?

1. **URL Parsing**  
   - The browser splits the URL into:
     - **Protocol** (http/https)  
     - **Domain** (`www.example.com`)  
     - **Path** (`/about`)  
     - **Query parameters** (`?id=123`)  

2. **DNS Resolution**  
   - Browser checks:
     - Local cache  
     - OS cache  
     - Router cache  
     - ISP DNS cache  
   - If not found, a recursive query is made to DNS servers until the IP address is found.

3. **TCP Connection**  
   - The browser initiates a **TCP handshake** (SYN → SYN-ACK → ACK).  
   - For **HTTPS**, a **TLS/SSL handshake** follows to establish encryption.

4. **HTTP Request**  
   - The browser sends a request to the server:  
     ```
     GET /index.html HTTP/1.1
     Host: www.example.com
     User-Agent: Chrome/95.0
     Accept: text/html
     ```
   - Includes **headers** (cookies, user agent, accept types) and optionally a **body** (e.g., POST data).

5. **Server Processing**  
   - The server:
     - Parses the request.  
     - Authenticates the user if needed.  
     - Runs business logic.  
     - May query databases, call APIs, or serve cached content.  

6. **HTTP Response**  
   - The server replies with:  
     ```
     HTTP/1.1 200 OK
     Content-Type: text/html
     Content-Length: 1024
     
     <html>...</html>
     ```
   - Includes:
     - **Status code** (200, 404, 500)  
     - **Headers** (Content-Type, Set-Cookie, Cache-Control)  
     - **Body** (HTML, JSON, images, etc.)  

7. **Browser Rendering**  
   - **Parse HTML** → Build **DOM Tree**  
   - **Parse CSS** → Build **CSSOM Tree**  
   - **Execute JS** → Modify DOM/CSSOM, fetch data  
   - **Combine DOM + CSSOM** → Render Tree  
   - **Layout** → Calculate size & position of elements  
   - **Paint** → Draw pixels on the screen  

---

## 🖼️ Diagram (Request/Response Cycle)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant D as DNS Server
    participant S as Web Server
    participant DB as Database/API/CDN

    U->>U: 1. Parse URL
    U->>D: 2. DNS Lookup
    D-->>U: Return IP Address
    U->>S: 3. TCP Handshake (+TLS for HTTPS)
    U->>S: 4. HTTP Request (GET/POST)
    S->>DB: 5. Process Logic (DB/API/CDN)
    DB-->>S: Return Data
    S-->>U: 6. HTTP Response (HTML, JSON, etc.)
    U->>U: 7. Rendering (DOM, CSSOM, JS, Paint)
