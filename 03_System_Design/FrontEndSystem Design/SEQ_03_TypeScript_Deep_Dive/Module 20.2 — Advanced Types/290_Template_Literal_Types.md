# 290 – Template Literal Types

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Template literal types combine string literals with type-level string manipulation: `` type Greeting = `Hello ${string}` `` creates a type matching any string starting with "Hello ". Combined with unions, they enable powerful patterns: generating event handler names (`onChange`, `onBlur`), type-safe CSS properties, and route parameter extraction. Built-in utilities `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` transform string types at the type level.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Basic Template Literal Types

```typescript
type EventName = `on${Capitalize<'click' | 'hover' | 'focus'>}`;
// 'onClick' | 'onHover' | 'onFocus'

type CSSProperty = `${string}-${string}`;
// matches 'background-color', 'border-radius', etc.

type ApiUrl = `/api/${'users' | 'posts' | 'comments'}`;
// '/api/users' | '/api/posts' | '/api/comments'
```

### Union Distribution

```typescript
type Color = 'red' | 'blue' | 'green';
type Size = 'sm' | 'md' | 'lg';
type ClassName = `${Color}-${Size}`;
// 'red-sm' | 'red-md' | 'red-lg' | 'blue-sm' | 'blue-md' | 'blue-lg' | 'green-sm' | 'green-md' | 'green-lg'
// 3 × 3 = 9 combinations automatically!
```

### Pattern Matching with infer

```typescript
// Extract route parameters
type ExtractParam<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParam<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractParam<'/users/:userId/posts/:postId'>; // 'userId' | 'postId'

// Parse dot-notation paths
type PathValue<T, P extends string> =
  P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T ? PathValue<T[Key], Rest> : never
    : P extends keyof T ? T[P] : never;

type UserName = PathValue<{ user: { profile: { name: string } } }, 'user.profile.name'>; // string
```

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, template literal types were useful for typing our OData query options: `$expand`, `$filter`, `$select` — ensuring valid property paths at compile time.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"Template literal types bring string manipulation to the type level. I use them for: generating event handler names (`on\${Capitalize<Event>}`), type-safe route parameter extraction, and CSS-in-JS property typing. Combined with unions, they distribute: 3 colors × 3 sizes = 9 class name types automatically. With `infer`, I can extract route params from path strings at compile time."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Type-safe event system
type DomEvents = 'click' | 'focus' | 'blur' | 'change' | 'submit';
type EventHandlerName = `on${Capitalize<DomEvents>}`;
// 'onClick' | 'onFocus' | 'onBlur' | 'onChange' | 'onSubmit'

// Type-safe getter/setter generation
type Accessors<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
} & {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

type UserAccessors = Accessors<{ name: string; age: number }>;
// { getName: () => string; setName: (value: string) => void;
//   getAge: () => number;  setAge: (value: number) => void; }
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Template literals at type level = `` `prefix${Union}suffix` `` → distributed combinations."** Capitalize/Lowercase for case transform. `infer` for pattern extraction. Unions distribute: N × M = N×M type combinations.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Shows advanced TypeScript fluency. Used in library typing, API clients, and design systems.
**How:** Template literal syntax with unions for distribution, `infer` for extraction, Capitalize/Lowercase for transforms.
**Companies:** Microsoft (advanced TS), Adobe (design system typing), all four for library-level TS skills.
