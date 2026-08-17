# 64. Global State Management

## 1. High-Level Explanation (Frontend Interview Level)

**Global state** is application state that is accessible and mutable from multiple components across the component tree, regardless of their position or parent-child relationship. It solves the problem of **state that is genuinely shared** — authentication status, theme preference, shopping cart, notification count, active user data — where the same piece of state needs to be read or updated from components that are too far apart in the tree for prop-drilling to be practical. Global state is managed by a **store** (Redux, Zustand, Pinia, NgRx) that holds the state outside the component tree, allowing any component to subscribe to and update it. The critical architectural discipline is: **use global state only when local state and state-lifting are insufficient** — over-globalising state is one of the most common and expensive architectural mistakes in large React applications.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### What Qualifies for Global State

```
Criteria (ALL should be true to justify global state):
  1. Multiple unrelated components in different subtrees need the same data
  2. Lifting to the lowest common ancestor would require passing through many layers
  3. The data changes and all consumers must react to those changes synchronously

Examples:
  ✅ currentUser: { id, name, role, permissions } — used in Header, Sidebar, permissions checks, profile pages
  ✅ cart: { items[], count, total } — used in Header badge, Cart page, Checkout, mini-cart
  ✅ notifications: Notification[] — used in NotificationBell, NotificationPanel, toast system
  ✅ theme: 'light' | 'dark' | 'high-contrast' — used in every styled component
  ✅ websocket connection state — used across many real-time components

  ❌ pagination.currentPage for a single table — local state
  ❌ isFilterPanelOpen — local to the filter panel
  ❌ hover state — always local
  ❌ form field values not shared across pages — local to the form
```

### Global State Architecture Comparison

```
Library      Style           Bundle Size  DevTools  Learning Curve
──────────────────────────────────────────────────────────────────
Redux + RTK  Flux (one-way)  ~11KB        Excellent  High
Zustand      hooks-based     ~1KB         Good       Low
Jotai        Atomic          ~3KB         Good       Low
Recoil       Atomic          ~20KB        Fair       Medium
Valtio       Proxy-based     ~3KB         Fair       Low
Context API  React built-in  0KB          Fair       Low
NgRx         Redux-like      ~30KB+       Excellent  Very High
Pinia        Options/Setup   ~2KB         Excellent  Low
```

### Zustand — Modern Minimal Global State

```typescript
// store/userStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  loginLoading: boolean;
  loginError: string | null;
  
  // Actions co-located with state
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      user: null,
      isAuthenticated: false,
      loginLoading: false,
      loginError: null,
      
      login: async (credentials) => {
        set((state) => { state.loginLoading = true; state.loginError = null; });
        try {
          const user = await authService.login(credentials);
          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
            state.loginLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.loginError = error.message;
            state.loginLoading = false;
          });
        }
      },
      
      logout: () => {
        authService.logout();
        set({ user: null, isAuthenticated: false });
      },
      
      updateProfile: (updates) => {
        set((state) => {
          if (state.user) Object.assign(state.user, updates);
        });
      },
    }))
  )
);

// Selective subscriptions — CRITICAL for performance
// Each component only re-renders when its specific slice changes

// Component A: only re-renders when isAuthenticated changes
const isAuthed = useUserStore((state) => state.isAuthenticated);

// Component B: only re-renders when user.name changes
const userName = useUserStore((state) => state.user?.name);

// Component C: subscribes to the login action (stable reference — never re-renders)
const login = useUserStore((state) => state.login);
```

### Redux Toolkit — Enterprise Pattern

```typescript
// store/slices/cartSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

interface CartState {
  items: CartItem[];
  status: 'idle' | 'loading' | 'failed';
}

export const fetchCartFromServer = createAsyncThunk(
  'cart/fetchFromServer',
  async (userId: string) => {
    const response = await api.get(`/users/${userId}/cart`);
    return response.data as CartItem[];
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], status: 'idle' } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((i) => i.productId === action.payload.productId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCartFromServer.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCartFromServer.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(fetchCartFromServer.rejected, (state) => { state.status = 'failed'; });
  },
});

// Typed selectors (memoised where needed)
export const selectCartCount = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartTotal = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
```

### Performance: Preventing Unnecessary Re-Renders

The most expensive global state mistake is subscribing an entire component to a large state slice when it only needs one field:

```typescript
// ❌ Re-renders whenever ANY property of user changes
const user = useSelector((state: RootState) => state.user);
return <div>{user.name}</div>;  // re-renders on permission change, avatar change, etc.

// ✅ Re-renders only when user.name changes
const userName = useSelector((state: RootState) => state.user.name);

// ✅ Memoised selector for derived/computed values
import { createSelector } from '@reduxjs/toolkit';
const selectAdminMenuItems = createSelector(
  [(state: RootState) => state.user.permissions, (state: RootState) => state.menuItems.items],
  (permissions, menuItems) => menuItems.filter((item) => permissions.includes(item.requiredPermission))
  // Only recomputes when permissions or menuItems change
);
```

---

## 3. Real-World Examples

At SAP BI Launchpad, the authenticated user object (SAP user, tenant, feature flags, analytics permissions) was global state — accessible to every micro-frontend through a shared store exposed via the shell's API. Each MFE subscribed selectively to only the slice it needed, preventing unnecessary re-renders when other MFEs updated their own portions of state.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "Global state is for data that is genuinely shared across disconnected parts of the component tree — authentication, shopping cart, theme, notifications. The key discipline is resisting the temptation to globalise state that isn't actually shared — doing so creates unnecessary coupling and makes components harder to test in isolation. For global state management, my choice depends on scale: Zustand for most applications — it's small (1KB), simple, and supports selective subscription natively. Redux + RTK for enterprise codebases where the time-travel debugging, strict unidirectional data flow, and mature middleware ecosystem justify the overhead. The most important performance practice with any global state is selective subscription — subscribing only to the exact field you need, not the entire store slice, so components only re-render when their specific data changes."

**Likely Follow-up Questions:**
1. Context API vs Zustand — which do you prefer? → Context API forces all consumers to re-render when any value changes; Zustand allows selective subscriptions. Context is fine for rarely-changing values (theme, locale); for frequently-changing state (cart, auth status), Zustand or Redux prevents expensive re-renders.
2. How do you initialise global state from server data (SSR)? → Redux: `configureStore({ preloadedState: serverSideState })`; Zustand: initialise store in a per-request context and hydrate on the client via `useHydrateAtoms` (Jotai) or Zustand's hydration pattern; key requirement is preventing state mismatch between server and client renders
3. How do you handle optimistic updates in global state? → Immediately update the store with the expected post-mutation state; on API success, nothing changes; on API failure, revert to the previous state — Redux Toolkit handles this cleanly with the `extraReducers` rejected case

---

## 5. Code Example

```typescript
// Minimal Zustand store with persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    {
      name: 'theme-preference',  // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

---

## 6. Memory Aid

**Mental Model:** Global state is a **city bulletin board** — anyone can post notices (update state) and anyone can read them. Local state is your personal notebook — only you see it. The discipline: don't post on the bulletin board unless multiple people genuinely need to see it.

**Rule of thumb:** Lift state when two components need to share it. Globalise state when lifting would require passing through 3+ component layers.

---

## 7. Why & How Summary

**Why it matters:** Without global state management, deeply nested components either resort to prop drilling (coupling every intermediate component to data it doesn't use) or communicate via complex event call chains. Global state provides a single source of truth for shared data with controlled, predictable mutation patterns.

**How it works:** A global store holds state outside the React component tree (in a JS closure or module-level variable). Components subscribe to slices of that state using selectors; the store notifies subscribers when their subscribed slice changes; each subscribing component re-renders with the new data. Mutations go through actions/reducers (Redux) or direct state-setting functions (Zustand), ensuring a predictable and debuggable update path.

**Company relevance:**
- Microsoft: Office web apps use Redux-based global state for document state, collaboration cursors, and user settings across deeply nested component trees
- Adobe: Creative Cloud uses global state for current user, active subscription, and asset library shared across tool panels
- Salesforce: Salesforce Platform uses LWC Wire Service and Lightning Message Service as their equivalent global state mechanisms
- Cisco: Webex uses NgRx for Angular apps — global state for call state, contacts, meeting info shared across all screen regions
