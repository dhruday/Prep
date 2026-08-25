# PART 2️⃣ — Browser & Web Platform Internals

> **Target Audience:** Senior / Staff Frontend Engineers preparing for FAANG-level system design interviews.
> **Depth:** Production-grade understanding of how the browser works from the inside out.

---

## Why This Part Matters

You cannot design high-performance, scalable frontend systems without understanding the platform you ship on. The browser is your runtime — every architectural decision (rendering strategy, state management, asset loading) ultimately gets executed by it. FAANG interviewers expect you to reason about **why** things work, not just **how** to use them.

---

## Modules

| Module | Topics | Core Question Answered |
|--------|--------|----------------------|
| [2.1 — Browser Architecture](./Module%202.1%20—%20Browser%20Architecture/README.md) | 9–11 | How does the browser turn bytes into pixels? |
| [2.2 — JavaScript Execution](./Module%202.2%20—%20JavaScript%20Execution/README.md) | 12–15 | How does JS run, what blocks it, and how do we escape the main thread? |
| [2.3 — Rendering Pipeline](./Module%202.3%20—%20Rendering%20Pipeline/README.md) | 16–18 | What triggers expensive repaints, and how do GPUs help? |
| [2.4 — Memory & Storage](./Module%202.4%20—%20Memory%20&%20Storage/README.md) | 19–20 | How does the browser manage memory and what storage mechanisms exist? |
| [2.5 — Network Layer](./Module%202.5%20—%20Network%20Layer/README.md) | 21–23 | How does the network stack work and what does HTTP/3 fix? |

---

## Topics Covered

### 🏗️ Module 2.1: Browser Architecture
- **09.** [How the Browser Works (High Level)](./Module%202.1%20—%20Browser%20Architecture/09_How_the_Browser_Works.md)
- **10.** [Critical Rendering Path (CRP)](./Module%202.1%20—%20Browser%20Architecture/10_Critical_Rendering_Path.md)
- **11.** [HTML Parsing, CSSOM, Render Tree](./Module%202.1%20—%20Browser%20Architecture/11_HTML_Parsing_CSSOM_Render_Tree.md)

### ⚙️ Module 2.2: JavaScript Execution
- **12.** [JavaScript Execution Model](./Module%202.2%20—%20JavaScript%20Execution/12_JavaScript_Execution_Model.md)
- **13.** [Event Loop (Microtasks vs Macrotasks)](./Module%202.2%20—%20JavaScript%20Execution/13_Event_Loop_Microtasks_vs_Macrotasks.md)
- **14.** [Main Thread vs Worker Threads](./Module%202.2%20—%20JavaScript%20Execution/14_Main_Thread_vs_Worker_Threads.md)
- **15.** [Web Workers, Service Workers, Worklets](./Module%202.2%20—%20JavaScript%20Execution/15_Web_Workers_Service_Workers_Worklets.md)

### 🎨 Module 2.3: Rendering Pipeline
- **16.** [Reflows vs Repaints](./Module%202.3%20—%20Rendering%20Pipeline/16_Reflows_vs_Repaints.md)
- **17.** [GPU vs CPU Rendering](./Module%202.3%20—%20Rendering%20Pipeline/17_GPU_vs_CPU_Rendering.md)
- **18.** [Browser Resource Prioritization](./Module%202.3%20—%20Rendering%20Pipeline/18_Browser_Resource_Prioritization.md)

### 💾 Module 2.4: Memory & Storage
- **19.** [Memory Management in Browser](./Module%202.4%20—%20Memory%20&%20Storage/19_Memory_Management_in_Browser.md)
- **20.** [Browser Storage Options Overview](./Module%202.4%20—%20Memory%20&%20Storage/20_Browser_Storage_Options_Overview.md)

### 🌐 Module 2.5: Network Layer
- **21.** [Network Stack Basics](./Module%202.5%20—%20Network%20Layer/21_Network_Stack_Basics.md)
- **22.** [HTTP/1.1 vs HTTP/2 vs HTTP/3](./Module%202.5%20—%20Network%20Layer/22_HTTP_1.1_vs_HTTP_2_vs_HTTP_3.md)
- **23.** [Connection Reuse & Head-of-Line Blocking](./Module%202.5%20—%20Network%20Layer/23_Connection_Reuse_and_Head_of_Line_Blocking.md)

---

## Key Interview Themes from This Part

1. **"Walk me through what happens when a user types a URL and hits Enter"** → Topics 9, 10, 11, 21, 22
2. **"Why does JavaScript block rendering, and how do you mitigate that?"** → Topics 12, 13, 14, 15
3. **"What causes jank in animations and how do you fix it?"** → Topics 16, 17, 18
4. **"How would you design an offline-capable app?"** → Topics 15, 19, 20
5. **"Why did we need HTTP/2 and HTTP/3?"** → Topics 22, 23

---

## How to Study This Part

1. Read each topic's **High-Level Explanation** to build intuition.
2. Study the **Deep-Dive** to understand the "why" behind browser behavior.
3. Use **Real-World Examples** to connect concepts to production systems.
4. Practice the **Interview-Oriented** sample answers out loud.
5. Run the **Code Examples** in browser DevTools to observe the effects.

> The browser is the most complex piece of software most engineers will ever interact with. Understanding it deeply is what separates senior engineers from staff engineers.
