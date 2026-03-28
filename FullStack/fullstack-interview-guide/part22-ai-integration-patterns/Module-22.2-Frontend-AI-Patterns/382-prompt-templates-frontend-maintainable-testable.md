# Prompt Templates in Frontend — Keeping Them Maintainable and Testable
> Part 22 — AI Integration Patterns · Frontend AI Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The templating problem**: as AI features grow, prompt strings scatter across components and hooks; they become untestable, inconsistent, and impossible to iterate on; three months in you have 20 different phrasings for the same intent and no way to measure which works
- **Rule: prompts belong on the backend, not in frontend code** — system prompts contain your product logic, tone, and constraints; they must be versioned, tested, and change-controlled; frontend passes feature identifiers (e.g., `"support_chat"`), not raw prompt strings; backend resolves the matching prompt; this eliminates prompt drift and security exposure
- **When frontend does need templates** (user-visible instructions): use a dedicated `promptTemplates.ts` file; use tagged template literal functions, not string concatenation; write unit tests for every template; version with a comment — who changed it, when, and why
- **Template testing strategy**: unit test each template function with typed parameters; snapshot test the output string; integration test against the LLM API with a golden question set that has expected-form answers; this catches prompt drift before users do
- **Storing prompts in config / CMS instead of code**: for non-technical teams (marketing, support, legal) to update prompts without a deployment, store system prompts in a CMS or a DB table with version history; UI for editing prompts + approval workflow before publishing; this is the correct architecture at scale
- **Never interpolate raw user input into system prompts** — topic 361 (prompt injection); only structured, validated values belong in a template; always pass user content via the user message role, never by interpolating into a system prompt template

---

## 1. One-Line Definition
Prompt templates are typed, tested, versioned functions in a dedicated module that build LLM prompts from typed parameters — replacing scattered ad-hoc string building with maintainable, testable prompt construction.

---

## 2. Layered Prompt Architecture

```
PROMPT OWNERSHIP BY LAYER

Backend (Spring AI)
  ↳ System prompts (feature logic, tone, constraints)
     kept in PromptRegistry, versioned, never in frontend
  ↳ RAG context injection
  ↳ Structured output schema

Frontend (React)
  ↳ User intention framing (what the user wants done)
     e.g., "Summarise selection for a 5-year-old" — user-initiated
  ↳ Mode/format instructions (if user-selected)
     e.g., "Format as bullet points"
  ↳ Context-augmented user messages
     e.g., user's selected text prepended to their question

Frontend should NOT own:
  ↳ System-level constraints ("Never reveal pricing")
  ↳ Brand tone instructions ("Reply in our company voice")
  ↳ Safety/guardrail instructions
```

---

## 3. Template Module Pattern

```typescript
// lib/promptTemplates.ts — centralized, one file, versioned

/**
 * Prompt templates for frontend-assembled user messages.
 * System prompts live in the backend PromptRegistry (Java).
 * 
 * Version: v2.3 (2025-01-15)
 * v2.3: Added selectionContext parameter; deprecated legacy summariseText
 * v2.2: Added formality parameter to summariseForAudience
 */

// Typed parameter interfaces — compile-time safety on template inputs
interface SummariseForAudienceParams {
  selectedText: string;     // The text to summarise (from user's document)
  audience: 'beginner' | 'expert' | 'executive';
  maxWords?: number;         // Optional constraint
}

interface ExplainCodeParams {
  codeSnippet: string;
  language: string;          // Java, TypeScript, Python, etc.
  focusArea?: 'what' | 'how' | 'why';
}

interface DraftEmailParams {
  intent: string;            // "request a meeting", "follow up on proposal"
  recipient: string;         // "engineering manager", "customer"
  tone: 'formal' | 'friendly' | 'brief';
  context?: string;          // Optional: prior email thread for context
}

// Template functions — pure functions, no side effects
export const promptTemplates = {
  summariseForAudience: (params: SummariseForAudienceParams): string => {
    const maxWordsInstruction = params.maxWords 
      ? ` Keep it under ${params.maxWords} words.` 
      : '';
    
    const audienceDescription = {
      beginner: 'someone with no technical background',
      expert: 'a senior engineer familiar with the domain',
      executive: 'a non-technical executive who needs the key business impact',
    }[params.audience];
    
    return `Summarise the following for ${audienceDescription}.${maxWordsInstruction}

Text to summarise:
---
${params.selectedText}
---`;
  },
  
  explainCode: (params: ExplainCodeParams): string => {
    const focusMap = {
      what: 'Explain WHAT this code does (ignore the how).',
      how: 'Explain HOW this code works step by step.',
      why: 'Explain WHY this design was chosen and what alternatives exist.',
    };
    const focus = params.focusArea ? focusMap[params.focusArea] : 'Explain this code clearly.';
    
    return `${focus}

Language: ${params.language}

Code:
\`\`\`${params.language}
${params.codeSnippet}
\`\`\``;
  },
  
  draftEmail: (params: DraftEmailParams): string => {
    const contextSection = params.context 
      ? `\n\nContext (prior thread):\n${params.context}` 
      : '';
    
    return `Draft a ${params.tone} email to a ${params.recipient}.
Intent: ${params.intent}${contextSection}

Return only the email body, no subject line.`;
  },
} as const;
```

---

## 4. Unit Testing Prompt Templates

```typescript
// lib/__tests__/promptTemplates.test.ts
import { promptTemplates } from '../promptTemplates';

describe('promptTemplates.summariseForAudience', () => {
  it('includes audience description for beginner', () => {
    const result = promptTemplates.summariseForAudience({
      selectedText: 'React uses virtual DOM for efficient updates.',
      audience: 'beginner',
    });
    expect(result).toContain('no technical background');
    expect(result).toContain('React uses virtual DOM');
  });
  
  it('includes maxWords instruction when provided', () => {
    const result = promptTemplates.summariseForAudience({
      selectedText: 'Some text.',
      audience: 'executive',
      maxWords: 50,
    });
    expect(result).toContain('under 50 words');
  });
  
  it('does not include maxWords when omitted', () => {
    const result = promptTemplates.summariseForAudience({
      selectedText: 'Some text.',
      audience: 'expert',
    });
    expect(result).not.toContain('words');
  });
});

describe('promptTemplates.explainCode', () => {
  it('sets correct code block language', () => {
    const result = promptTemplates.explainCode({
      codeSnippet: 'public void process() {}',
      language: 'Java',
      focusArea: 'what',
    });
    expect(result).toContain('```Java');
    expect(result).toContain('WHAT this code does');
  });
});
```

---

## 5. Wrong Way vs Right Way

```typescript
// ❌ Prompt strings scattered across components (ungoverned, untestable)

// DocumentEditor.tsx
const prompt = `Summarise this for a beginner: ${selectedText}`;

// SupportWidget.tsx  
const prompt = `Help user understand: ${selectedText} Keep it simple.`;

// CodeViewer.tsx
const prompt = `What does this do? ${code}. Explain simply.`;

// → Three variants of the same intent; no tests; inconsistent quality
// → "for a beginner" vs "Keep it simple" vs "Explain simply" — which is best?
```

```typescript
// ✅ Centralised, typed, tested templates
import { promptTemplates } from '@/lib/promptTemplates';

// DocumentEditor.tsx
const userMessage = promptTemplates.summariseForAudience({ selectedText, audience: 'beginner' });

// CodeViewer.tsx
const userMessage = promptTemplates.explainCode({ codeSnippet: code, language: 'Java', focusArea: 'what' });

// → Same template function used everywhere; typed parameters; tested
```

---

## 6. Scale Evolution

**Prototype →** `promptTemplates.ts` with typed functions; unit tests for each template.

**Production →** Backend PromptRegistry for system prompts; frontend only assembles user messages; version comments on template changes; snapshot tests to catch accidental regressions.

**High scale →** Prompt CMS (admin UI) for non-engineering teams to manage user-facing instructions; approval workflow before prompt changes go live; A/B routing based on prompt version; prompt analytics (which version has higher quality signals).

---

## 7. Company Relevance

| Company | Template context | Interview signal |
|---------|----------------|-----------------|
| Razorpay / PhonePe | Payment support — prompt quality directly impacts dispute resolution accuracy | Backend-owned system prompts; security around prompt injection |
| Swiggy / Meesho | Product copywriting prompt — marketing team wants to change tone | CMS-managed prompts; approval workflow; A/B on prompt variants |
| Adobe / Microsoft | Power user tools with user-configurable modes | User-facing tone/format options; typed parameters prevent injection |
| SAP Labs | ERP AI suggestions — technical system prompts must be auditable | Backend PromptRegistry with version history; change audit log |

---

## 8. Interview Questions & Model Answers

### Q1 — How do you manage prompts in a large React + Spring Boot AI application?
**Hruday:**
> "I draw a clear boundary between system prompts and user messages. System prompts — the instructions that define the AI's behaviour, tone, and constraints — belong on the backend in a PromptRegistry service. They're versioned, tested, and change-controlled. The frontend never sends raw system prompts; it sends a feature identifier like 'support_chat' or 'doc_summarise', and the backend resolves the matching versioned prompt. For user messages that need to be constructed in the frontend — like 'Summarise this selected text for a beginner' — I have a dedicated `promptTemplates.ts` file with typed parameter interfaces and pure template functions. These are unit-tested to verify that the correct instructions appear in the output for each input combination. No prompt strings scattered across components; one file, typed, tested. This also enforces the injection defence rule: user-controlled content goes into template parameters (which appear in the user message), never interpolated into the system prompt."

---

*Part 22 · Prompt Templates in Frontend — Keeping Them Maintainable and Testable · Full Stack Interview Guide · Hruday D · 2026*
