# 360 – Salesforce Lightning Design System (SLDS)

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
SLDS is Salesforce's design system — CSS framework, component blueprints, design tokens, icons, and accessibility guidelines. LWC components use SLDS classes directly. It provides consistent look-and-feel across the Salesforce ecosystem. Key concepts: BEM naming, design tokens for theming, and base Lightning components.

## 2. 🔬 DEEP-DIVE EXPLANATION

```html
<!-- ──── USING SLDS IN LWC ──── -->
<template>
  <!-- SLDS Card -->
  <div class="slds-card">
    <div class="slds-card__header slds-grid">
      <header class="slds-media slds-media_center slds-has-flexi-truncate">
        <div class="slds-media__body">
          <h2 class="slds-card__header-title">
            <span>Account Details</span>
          </h2>
        </div>
      </header>
    </div>
    <div class="slds-card__body slds-card__body_inner">
      <!-- Content -->
    </div>
  </div>

  <!-- SLDS Grid (12-column) -->
  <div class="slds-grid slds-wrap">
    <div class="slds-col slds-size_1-of-2 slds-medium-size_1-of-3">
      Column 1
    </div>
    <div class="slds-col slds-size_1-of-2 slds-medium-size_2-of-3">
      Column 2
    </div>
  </div>

  <!-- Base Lightning Components (use SLDS internally) -->
  <lightning-card title="Contacts" icon-name="standard:contact">
    <lightning-datatable
      key-field="id"
      data={contacts}
      columns={columns}>
    </lightning-datatable>
  </lightning-card>

  <lightning-button 
    label="Save" 
    variant="brand" 
    onclick={handleSave}>
  </lightning-button>
</template>
```

```javascript
// ──── DESIGN TOKENS ────
// Access SLDS tokens in JS
// Custom property: var(--lwc-colorBrand)

// In CSS:
// .my-element {
//   color: var(--lwc-colorTextDefault);
//   background: var(--lwc-colorBackground);
//   border-radius: var(--lwc-borderRadiusMedium);
//   font-size: var(--lwc-fontSize3);
// }

// ──── BASE COMPONENTS vs SLDS CLASSES ────
// Prefer base components when available:
// <lightning-button> over <button class="slds-button">
// <lightning-input> over <input class="slds-input">
// <lightning-card> over <div class="slds-card">
// Base components handle accessibility automatically
```

### SLDS vs Other Design Systems
| Feature | SLDS | Material UI | Ant Design |
|---|---|---|---|
| **Platform** | Salesforce | Google | Alibaba |
| **CSS Framework** | BEM + utility | CSS-in-JS | Less/CSS |
| **Components** | Lightning Base | React | React |
| **Theming** | Design tokens | Theme provider | ConfigProvider |
| **Accessibility** | Built-in, enforced | Manual | Partial |
| **Grid** | 12-column | Flex/Grid | 24-column |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"SLDS provides consistent Salesforce UI with BEM CSS classes, design tokens for theming, and base Lightning components. I prefer base components (lightning-button, lightning-datatable) over raw SLDS classes because they handle accessibility and responsive behavior automatically. At SAP, I applied similar design system principles."*

## 4. 🧠 MEMORY AID
**"SLDS = Salesforce CSS + tokens + base components. Use lightning-* base components first. slds-grid for layout. Design tokens for theming."**

## 5. 🎯 KEY INSIGHT
When interviewing at Salesforce, demonstrate that you understand how design systems enforce consistency at scale — SLDS is their answer to this challenge.
