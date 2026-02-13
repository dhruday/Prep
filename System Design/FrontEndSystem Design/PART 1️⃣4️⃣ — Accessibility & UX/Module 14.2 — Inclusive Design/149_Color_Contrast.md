# 149. Color Contrast

## 1. High-Level Explanation (Frontend Interview Level)

**Color Contrast** is the ratio between foreground (text) and background colors—ensuring sufficient visual distinction for users with low vision, color blindness, or viewing in bright sunlight—measured by WCAG contrast ratios (4.5:1 for normal text, 3:1 for large text at Level AA).

- **What**: Contrast ratio between text/background colors (formula: (L1 + 0.05) / (L2 + 0.05) where L = relative luminance)
- **Why**: 8% of men, 0.5% of women have color blindness; low vision affects 253M people; sunlight reduces perceived contrast
- **When**: All text, icons, UI controls must meet WCAG AA (4.5:1 normal text, 3:1 large text/graphics)
- **Role**: Ensures readability for vision-impaired users

**Key Principle**: "Never rely on color alone"—use color + text/icons/patterns for status, not color-only differentiation.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### WCAG Contrast Requirements

**1. Contrast Ratios**:
```typescript
// WCAG 2.1 Contrast Requirements
const contrastLevels = {
  // Level AA (Standard)
  AA: {
    normalText: {
      ratio: 4.5,              // < 18pt or < 14pt bold
      example: '#767676 on #FFFFFF'  // Pass (4.54:1)
    },
    largeText: {
      ratio: 3.0,              // ≥ 18pt or ≥ 14pt bold
      example: '#949494 on #FFFFFF'  // Pass (3.01:1)
    },
    graphicsAndUI: {
      ratio: 3.0,              // Icons, borders, focus indicators
      example: '#949494 on #FFFFFF'  // Pass (3.01:1)
    }
  },
  
  // Level AAA (Enhanced)
  AAA: {
    normalText: {
      ratio: 7.0,              // Higher bar
      example: '#595959 on #FFFFFF'  // Pass (7.0:1)
    },
    largeText: {
      ratio: 4.5,
      example: '#767676 on #FFFFFF'  // Pass (4.54:1)
    }
  }
};

// Calculate contrast ratio
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: string): number {
  // Convert hex to RGB
  const rgb = hexToRgb(color);
  
  // Convert to sRGB
  const [r, g, b] = rgb.map(val => {
    val = val / 255;
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0];
}

// Example usage
const ratio = getContrastRatio('#FFFFFF', '#767676');
console.log(ratio); // 4.54:1 (Pass AA for normal text)
```

**2. Color Palette Design**:
```typescript
// Accessible color palette
const colorPalette = {
  // Gray scale (ensure sufficient contrast)
  gray: {
    50: '#FAFAFA',   // Background
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',  // 5.74:1 on white (AA large text)
    900: '#212121'   // 16.1:1 on white (AAA normal text)
  },
  
  // Primary brand color variants
  primary: {
    light: '#64B5F6',  // 3.05:1 on white (AA large text)
    main: '#2196F3',   // 3.06:1 on white (AA large text)
    dark: '#1976D2',   // 4.53:1 on white (AA normal text)
    darker: '#0D47A1'  // 8.59:1 on white (AAA normal text)
  },
  
  // Semantic colors (meet contrast requirements)
  semantic: {
    success: '#2E7D32',   // 4.53:1 on white
    warning: '#F57C00',   // 3.96:1 on white (use darker for text)
    error: '#C62828',     // 5.89:1 on white
    info: '#0277BD'       // 5.89:1 on white
  },
  
  // Text colors
  text: {
    primary: '#212121',     // 16.1:1 on white (AAA)
    secondary: '#757575',   // 4.61:1 on white (AA)
    disabled: '#BDBDBD'     // 2.85:1 (decorative only, not text)
  }
};
```

### Accessible Color Usage

**1. Text Contrast**:
```css
/* ❌ BAD: Insufficient contrast */
.low-contrast {
  color: #999999;          /* 2.85:1 on white - FAIL */
  background: #FFFFFF;
}

/* ✅ GOOD: Sufficient contrast (AA) */
.good-contrast {
  color: #767676;          /* 4.54:1 on white - PASS */
  background: #FFFFFF;
}

/* ✅ BETTER: High contrast (AAA) */
.high-contrast {
  color: #595959;          /* 7.0:1 on white - PASS */
  background: #FFFFFF;
}

/* Large text (18pt+ or 14pt+ bold) needs only 3:1 */
.large-text {
  font-size: 18pt;
  color: #949494;          /* 3.01:1 - PASS AA large text */
  background: #FFFFFF;
}
```

**2. Link Contrast**:
```css
/* Links must meet 4.5:1 against background AND 3:1 against surrounding text */

/* ❌ BAD: Links blend with text */
p {
  color: #000000;
}
a {
  color: #333333;  /* Not enough contrast with surrounding text */
  text-decoration: underline; /* Underline helps but not sufficient */
}

/* ✅ GOOD: Links visually distinct */
p {
  color: #212121;
}
a {
  color: #1976D2;  /* 4.53:1 on white, distinct from #212121 */
  text-decoration: underline;
}

a:hover, a:focus {
  color: #0D47A1;  /* Darker on interaction */
  text-decoration: underline;
  outline: 3px solid #1976D2; /* Focus indicator */
}
```

**3. Button Contrast**:
```css
/* Buttons need contrast for text AND border */

/* ❌ BAD: Low contrast button */
.bad-button {
  background: #E0E0E0;  /* Light gray */
  color: #BDBDBD;       /* Light text - FAIL */
  border: 1px solid #F5F5F5; /* Invisible border - FAIL */
}

/* ✅ GOOD: High contrast button */
.good-button {
  background: #1976D2;  /* Blue background */
  color: #FFFFFF;       /* White text: 6.26:1 - PASS */
  border: 2px solid #0D47A1; /* Darker border: 3.5:1 with bg - PASS */
}

/* Focus state */
.good-button:focus {
  outline: 3px solid #000000; /* High contrast focus indicator */
  outline-offset: 2px;
}

/* Disabled state (decorative, doesn't need to meet contrast) */
.good-button:disabled {
  background: #E0E0E0;
  color: #BDBDBD;
  cursor: not-allowed;
}
```

### Color Blindness Considerations

**1. Types of Color Blindness**:
```typescript
const colorBlindnessTypes = {
  protanopia: {
    prevalence: '1% of males',
    issue: 'Red color blindness',
    confuses: 'Red and green appear similar',
    solution: 'Use blue/yellow, or patterns + color'
  },
  
  deuteranopia: {
    prevalence: '1% of males',
    issue: 'Green color blindness',
    confuses: 'Green and red appear similar',
    solution: 'Most common type, test with simulator'
  },
  
  tritanopia: {
    prevalence: 'Very rare',
    issue: 'Blue color blindness',
    confuses: 'Blue and yellow appear similar',
    solution: 'Rare, but avoid blue/yellow alone'
  },
  
  achromatopsia: {
    prevalence: '0.003%',
    issue: 'Total color blindness (grayscale vision)',
    confuses: 'All colors appear as shades of gray',
    solution: 'Contrast + patterns essential'
  }
};
```

**2. Accessible Status Indicators**:
```tsx
// ❌ BAD: Color-only status
function BadStatus({ status }: { status: 'success' | 'error' | 'warning' }) {
  const colors = {
    success: '#2E7D32',
    error: '#C62828',
    warning: '#F57C00'
  };
  
  return (
    <div style={{ color: colors[status] }}>
      {status}
    </div>
  );
}
// Problem: Color blind users can't distinguish red from green

// ✅ GOOD: Color + icon + text
function GoodStatus({ status }: { status: 'success' | 'error' | 'warning' }) {
  const config = {
    success: { icon: '✓', text: 'Success', color: '#2E7D32' },
    error: { icon: '✗', text: 'Error', color: '#C62828' },
    warning: { icon: '⚠', text: 'Warning', color: '#F57C00' }
  };
  
  const { icon, text, color } = config[status];
  
  return (
    <div style={{ color }} role="status">
      <span aria-hidden="true">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
```

**3. Accessible Charts**:
```tsx
// ❌ BAD: Color-only chart (red/green lines)
function BadChart() {
  return (
    <LineChart>
      <Line dataKey="revenue" stroke="#2E7D32" />  {/* Green */}
      <Line dataKey="expenses" stroke="#C62828" /> {/* Red */}
    </LineChart>
  );
}
// Color blind users can't distinguish lines

// ✅ GOOD: Color + patterns + labels
function GoodChart() {
  return (
    <LineChart>
      <Line 
        dataKey="revenue" 
        stroke="#2E7D32" 
        strokeDasharray="5 5"    // Dashed
        name="Revenue"
      />
      <Line 
        dataKey="expenses" 
        stroke="#C62828" 
        strokeDasharray="1 3"    // Dotted
        name="Expenses"
      />
      <Legend />  {/* Text labels */}
    </LineChart>
  );
}
```

### Contrast Checker Tools

**1. Automated Testing**:
```typescript
// Jest test for contrast
import { getContrastRatio } from './contrast';

describe('Color contrast', () => {
  it('should meet WCAG AA for normal text', () => {
    const ratio = getContrastRatio('#FFFFFF', '#767676');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
  
  it('should meet WCAG AA for large text', () => {
    const ratio = getContrastRatio('#FFFFFF', '#949494');
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });
});

// ESLint plugin
// eslint-plugin-jsx-a11y checks color contrast in JSX
<div style={{ color: '#999', background: '#fff' }}>  
  {/* Warning: Color contrast ratio is too low */}
</div>
```

**2. Browser DevTools**:
```typescript
// Chrome DevTools: Inspect element → Styles → Color picker
// Shows contrast ratio: "4.54 (AA)" or "2.85 (FAIL)"

// Firefox: Accessibility inspector → Check for issues
// Flags low contrast elements automatically

// Lighthouse audit: "Background and foreground colors have sufficient contrast"
```

### What NOT to Do

- ❌ **Color-only differentiation** (1.4.1) - Use color + text/icon/pattern
- ❌ **Low contrast text** (1.4.3) - Minimum 4.5:1 for normal text
- ❌ **Invisible focus indicators** (2.4.7) - Must be 3:1 against adjacent colors
- ❌ **Assume your monitor** - Test on multiple devices, brightness levels
- ❌ **Ignore large text exception** - 18pt+/14pt+ bold only needs 3:1

---

## 3. Clear Real-World Examples

### Example 1: Material Design Color System

```typescript
// Material Design 3 ensures all color combinations meet WCAG AA
const materialColors = {
  primary: {
    main: '#6200EE',      // 8.59:1 on white (AAA)
    light: '#9C47FC',     // 3.79:1 on white (AA large text)
    dark: '#3700B3'       // 12.63:1 on white (AAA)
  },
  
  // Surface colors with appropriate text colors
  surfaces: [
    { bg: '#FFFFFF', text: '#000000' },  // Light theme: 21:1
    { bg: '#121212', text: '#FFFFFF' }   // Dark theme: 15.8:1
  ],
  
  // Error colors (red) with sufficient contrast
  error: {
    main: '#B00020',      // 7.32:1 on white (AAA)
    light: '#CF6679',     // 3.45:1 on white (AA large text)
    dark: '#8E0000'       // 11.47:1 on white (AAA)
  }
};
```

### Example 2: GitHub Dark Mode

```css
/* GitHub dark mode: high contrast */
body {
  background-color: #0d1117;  /* Dark background */
  color: #c9d1d9;             /* Light text: 12.58:1 - AAA */
}

/* Links */
a {
  color: #58a6ff;  /* Blue: 8.59:1 on dark bg - AAA */
}

/* Code blocks */
pre {
  background-color: #161b22;  /* Slightly lighter than body */
  color: #c9d1d9;             /* Same text color */
  border: 1px solid #30363d;  /* Subtle border: 3.94:1 */
}

/* Success button */
.btn-primary {
  background-color: #238636;  /* Green */
  color: #ffffff;             /* White text: 4.54:1 - AA */
  border: 1px solid rgba(240, 246, 252, 0.1);
}
```

### Example 3: Accessible Error Messages

```tsx
function AccessibleErrorMessage({ message }: { message: string }) {
  return (
    <div 
      role="alert" 
      className="error-message"
      style={{
        backgroundColor: '#FEE',      // Light pink bg
        color: '#C62828',             // Dark red text: 5.89:1 on white
        border: '2px solid #C62828',  // Dark red border
        padding: '12px',
        borderRadius: '4px'
      }}
    >
      {/* Icon + text (not color alone) */}
      <span aria-hidden="true" style={{ marginRight: '8px' }}>
        ✗
      </span>
      <span>{message}</span>
    </div>
  );
}
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How do you ensure sufficient color contrast?"

**Answer**:

"I ensure contrast meets **WCAG AA** (4.5:1 normal text, 3:1 large text):

**1. WCAG Contrast Ratios**

Formula: (L1 + 0.05) / (L2 + 0.05) where L = relative luminance

**Thresholds**:
- Normal text (< 18pt): **4.5:1** (AA), 7:1 (AAA)
- Large text (≥ 18pt / ≥ 14pt bold): **3:1** (AA), 4.5:1 (AAA)
- UI components (borders, icons): **3:1** (AA)

**2. Color Palette Design**

Build palette with contrast in mind:
```typescript
const colors = {
  // Primary brand color
  primary: '#1976D2',    // 4.53:1 on white (AA normal text)
  
  // Text colors
  textPrimary: '#212121',   // 16.1:1 (AAA)
  textSecondary: '#757575', // 4.61:1 (AA)
  
  // Semantic colors
  success: '#2E7D32',  // 4.53:1 (AA)
  error: '#C62828'     // 5.89:1 (AA+)
};
```

**3. Never Color Alone (WCAG 1.4.1)**

Use color + icon + text:
```tsx
// ❌ Color only
<div style={{ color: 'red' }}>Error</div>

// ✅ Color + icon + text
<div style={{ color: '#C62828' }}>
  <span aria-hidden="true">✗</span>
  Error: Invalid input
</div>
```

**4. Color Blindness**

8% of men have red-green color blindness. Use:
- Blue/yellow (safe)
- Patterns (dashed/dotted lines)
- Icons + text
- Test with simulator (Chrome DevTools)

**5. Links Contrast**

Links need:
1. 4.5:1 vs background
2. 3:1 vs surrounding text

```css
p { color: #212121; }
a { 
  color: #1976D2;  /* Distinct from black */
  text-decoration: underline; 
}
```

**6. Focus Indicators**

Must be 3:1 against adjacent colors:
```css
button:focus-visible {
  outline: 3px solid #000000;  /* High contrast */
  outline-offset: 2px;
}
```

**7. Dark Mode**

Maintain contrast in both themes:
```css
/* Light theme */
body { background: #FFF; color: #212121; /* 16.1:1 */ }

/* Dark theme */
body { background: #121212; color: #E0E0E0; /* 13.8:1 */ }
```

**8. Automated Testing**

- **Lighthouse**: Flags low contrast
- **axe DevTools**: Contrast checker
- **eslint-plugin-jsx-a11y**: Catches in code
- **Color contrast checker**: WebAIM, Figma plugins

**9. Large Text Exception**

Text ≥ 18pt or ≥ 14pt bold only needs 3:1:
```css
.heading {
  font-size: 24pt;
  color: #949494;  /* 3.01:1 - PASS */
}
```

**10. Real-World Examples**

**GitHub**: Dark mode with 12.58:1 contrast (AAA).

**Material Design**: All color combinations tested for WCAG AA.

**GOV.UK**: Strict contrast requirements (AAA target).

**Trade-offs**:

Some brand colors may not meet contrast (pastel logos). Solution:
- Use darker variant for text
- Logos are decorative (exempt from contrast)
- Interactive elements must meet 3:1

Calculate once in design phase, enforce with linting. Retrofitting contrast is expensive—build accessible from start."

---

## 6. Why & How Summary

### Why It Matters

**Vision Impairment**: 253M people with low vision, 8% of men color blind  
**Compliance**: WCAG 1.4.3 Level AA (4.5:1 normal text, 3:1 large text)  
**Usability**: Sunlight reduces contrast, benefits all users

### How It Works

**1. Measure**: Contrast ratio = (L1 + 0.05) / (L2 + 0.05)  
**2. Thresholds**: 4.5:1 normal text (AA), 3:1 large text/UI (AA)  
**3. Never Color Alone**: Use color + icon + text for status  
**4. Test**: Lighthouse, axe DevTools, WebAIM contrast checker  
**5. Color Blindness**: Use patterns, avoid red-green only

**FAANG**: Accessible color palettes (4.5:1+ for text), color + icon + text for status, dark mode contrast, automated testing (Lighthouse, axe), color blindness simulators
