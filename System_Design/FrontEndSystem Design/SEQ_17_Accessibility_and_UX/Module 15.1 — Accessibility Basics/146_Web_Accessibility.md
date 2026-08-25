# 146. Web Accessibility

## 1. High-Level Explanation (Frontend Interview Level)

**Web Accessibility (a11y)** is the practice of designing and developing websites that can be used by everyone, including people with disabilities (visual, auditory, motor, cognitive)—ensuring equitable access through semantic HTML, keyboard navigation, screen reader compatibility, and WCAG compliance.

- **What**: Build UIs usable by people with disabilities via assistive technologies (screen readers, keyboard-only, voice control)
- **Why**: Legal requirement (ADA, Section 508), ethical responsibility, business benefit (15% of population has disabilities)
- **When**: Essential from day 1 (retrofitting is expensive), required for government/enterprise, critical for public-facing apps
- **Role**: Frontend engineers are primary accessibility implementers

**Key Principle**: "Accessible by default"—semantic HTML + proper ARIA + keyboard support from the start, not as afterthought.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### WCAG Guidelines (Web Content Accessibility Guidelines)

**1. Four Principles (POUR)**:
```typescript
// WCAG 2.1 Principles
const POUR = {
  Perceivable: {
    // Information must be presentable to users in ways they can perceive
    guidelines: [
      '1.1 Text Alternatives',        // Alt text for images
      '1.2 Time-based Media',         // Captions for videos
      '1.3 Adaptable',                // Semantic HTML, programmatic relationships
      '1.4 Distinguishable'           // Color contrast, resize text
    ]
  },
  
  Operable: {
    // UI components must be operable
    guidelines: [
      '2.1 Keyboard Accessible',      // All functionality via keyboard
      '2.2 Enough Time',              // No time limits (or adjustable)
      '2.3 Seizures',                 // No flashing content
      '2.4 Navigable',                // Skip links, page titles, focus order
      '2.5 Input Modalities'          // Touch, voice, mouse alternatives
    ]
  },
  
  Understandable: {
    // Information and operation must be understandable
    guidelines: [
      '3.1 Readable',                 // Language of page, unusual words defined
      '3.2 Predictable',              // Consistent navigation, no surprise changes
      '3.3 Input Assistance'          // Error identification, labels, suggestions
    ]
  },
  
  Robust: {
    // Content must be robust enough for assistive technologies
    guidelines: [
      '4.1 Compatible'                // Valid HTML, name/role/value for custom widgets
    ]
  }
};

// Conformance Levels
const levels = {
  A: 'Minimum (basic)',              // Must meet
  AA: 'Mid-range (target for most)', // Industry standard
  AAA: 'Highest (gold standard)'     // Not always achievable for all content
};
```

**2. Common WCAG Criteria (AA Level)**:
```typescript
// Critical success criteria
const wcagAA = {
  '1.1.1': 'Non-text Content (A) - All images have alt text',
  '1.3.1': 'Info and Relationships (A) - Semantic HTML (headings, lists, tables)',
  '1.4.3': 'Contrast (Minimum) (AA) - 4.5:1 for normal text, 3:1 for large text',
  '1.4.5': 'Images of Text (AA) - Use real text, not images of text',
  '2.1.1': 'Keyboard (A) - All functionality available via keyboard',
  '2.1.2': 'No Keyboard Trap (A) - Focus can move away from component',
  '2.4.1': 'Bypass Blocks (A) - Skip navigation links',
  '2.4.2': 'Page Titled (A) - Descriptive page title',
  '2.4.3': 'Focus Order (A) - Logical focus order',
  '2.4.6': 'Headings and Labels (AA) - Descriptive headings',
  '2.4.7': 'Focus Visible (AA) - Visible focus indicator',
  '3.1.1': 'Language of Page (A) - <html lang="en">',
  '3.2.1': 'On Focus (A) - No context change on focus',
  '3.2.2': 'On Input (A) - No context change on input',
  '3.3.1': 'Error Identification (A) - Errors clearly identified',
  '3.3.2': 'Labels or Instructions (A) - Labels for inputs',
  '4.1.1': 'Parsing (A) - Valid HTML',
  '4.1.2': 'Name, Role, Value (A) - All UI components have accessible names'
};
```

### Semantic HTML Foundation

**1. Proper HTML Elements**:
```html
<!-- ❌ BAD: Div soup (not accessible) -->
<div class="header">
  <div class="nav">
    <div class="nav-item" onclick="navigate('/home')">Home</div>
    <div class="nav-item" onclick="navigate('/about')">About</div>
  </div>
</div>
<div class="main-content">
  <div class="title">Welcome</div>
  <div class="text">This is the homepage.</div>
</div>

<!-- ✅ GOOD: Semantic HTML (accessible by default) -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/home">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
<main>
  <h1>Welcome</h1>
  <p>This is the homepage.</p>
</main>
```

**2. Heading Hierarchy**:
```html
<!-- ❌ BAD: Skipped heading levels -->
<h1>Page Title</h1>
<h3>Section Title</h3> <!-- Skipped h2! -->
<h2>Subsection</h2>

<!-- ✅ GOOD: Logical hierarchy -->
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection</h3>
<h3>Another Subsection</h3>
<h2>Another Section</h2>

<!-- Screen reader navigation:
   - Users jump between headings (h1 → h2 → h3)
   - Skipped levels break mental model
-->
```

**3. Form Labels**:
```html
<!-- ❌ BAD: No label association -->
<div>
  <span>Email</span>
  <input type="email" name="email" />
</div>

<!-- ✅ GOOD: Explicit label -->
<div>
  <label for="email-input">Email</label>
  <input type="email" id="email-input" name="email" />
</div>

<!-- ✅ ALSO GOOD: Implicit label -->
<label>
  Email
  <input type="email" name="email" />
</label>

<!-- ✅ BEST: Explicit + required indicator -->
<label for="email-input">
  Email <span aria-label="required">*</span>
</label>
<input 
  type="email" 
  id="email-input" 
  name="email" 
  required 
  aria-required="true"
  aria-describedby="email-hint"
/>
<span id="email-hint" class="hint">We'll never share your email.</span>
```

### Accessible Interactive Components

**1. Custom Button**:
```typescript
// ❌ BAD: Div as button (not accessible)
function BadButton() {
  return (
    <div className="button" onClick={handleClick}>
      Click me
    </div>
  );
}
// Issues:
// - No keyboard access (can't Tab to it)
// - No Enter/Space activation
// - Screen reader announces as "group" not "button"

// ✅ GOOD: Semantic button
function GoodButton() {
  return (
    <button onClick={handleClick}>
      Click me
    </button>
  );
}
// Automatic:
// - Tab navigation
// - Enter/Space activation
// - "button" role announcement
// - Disabled state handling

// ✅ IF must use div (rare), add full accessibility
function AccessibleDiv() {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };
  
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Custom button"
    >
      Click me
    </div>
  );
}
```

**2. Accessible Modal**:
```typescript
function AccessibleModal({ isOpen, onClose, children }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus first focusable element in modal
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
      
      // Trap focus within modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
        
        if (e.key === 'Tab') {
          trapFocus(e);
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        
        // Restore focus to trigger element
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);
  
  const trapFocus = (e: KeyboardEvent) => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Overlay */}
      <div 
        className="modal-overlay" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
      >
        <h2 id="modal-title">Modal Title</h2>
        
        {children}
        
        <button onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
}
```

**3. Accessible Dropdown**:
```typescript
function AccessibleDropdown({ options, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
        
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => 
            Math.min(prev + 1, options.length - 1)
          );
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
        break;
        
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
        
      case 'End':
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  };
  
  const handleOptionClick = (option: Option) => {
    onChange(option);
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  
  return (
    <div className="dropdown">
      <button
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="dropdown-label"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        {value || 'Select an option'}
      </button>
      
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-labelledby="dropdown-label"
          className="dropdown-list"
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.value === value}
              className={index === focusedIndex ? 'focused' : ''}
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Screen Reader Testing

**1. Screen Reader Announcements**:
```typescript
// Live regions for dynamic content
function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  return (
    <>
      {/* Polite: Announces when user is idle */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {notifications.length > 0 && 
          `${notifications.length} new notifications`
        }
      </div>
      
      {/* Assertive: Announces immediately (use sparingly) */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {notifications.find(n => n.priority === 'high')?.message}
      </div>
      
      {/* Visible notifications */}
      <ul>
        {notifications.map(n => (
          <li key={n.id}>{n.message}</li>
        ))}
      </ul>
    </>
  );
}

// CSS for screen-reader-only content
/*
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
*/
```

**2. Testing Workflow**:
```typescript
// Automated accessibility testing
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// Manual testing checklist
const manualTests = {
  keyboardNavigation: [
    'Tab through all interactive elements',
    'Shift+Tab to go backwards',
    'Enter/Space to activate buttons',
    'Arrow keys for custom widgets',
    'Escape to close modals/dropdowns',
    'No keyboard traps'
  ],
  
  screenReader: [
    'NVDA (Windows, free)',
    'JAWS (Windows, paid)',
    'VoiceOver (macOS/iOS, built-in)',
    'TalkBack (Android, built-in)'
  ],
  
  screenReaderTests: [
    'Navigate by headings (h, 1-6)',
    'Navigate by landmarks (d)',
    'List all links (insert+F7)',
    'List all form fields',
    'Check alt text for images',
    'Verify button labels',
    'Test live regions (dynamic content)'
  ]
};
```

### What NOT to Do

- ❌ **Rely on color alone** (1.4.1) - Use icons + color for status
- ❌ **Auto-play media** (1.4.2) - Provide pause control
- ❌ **Low contrast** (1.4.3) - Minimum 4.5:1 for text
- ❌ **Keyboard traps** (2.1.2) - Always provide escape route
- ❌ **Time limits** (2.2.1) - Make adjustable or removable
- ❌ **Unclear error messages** (3.3.1) - "Invalid input" → "Email must contain @"

---

## 3. Clear Real-World Examples

### Example 1: Accessible Form

```tsx
function AccessibleContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  
  return (
    <form 
      onSubmit={handleSubmit}
      aria-labelledby="form-title"
      noValidate
    >
      <h2 id="form-title">Contact Us</h2>
      
      {/* Error summary (for screen readers) */}
      {Object.keys(errors).length > 0 && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="error-summary"
        >
          <h3>Please fix the following errors:</h3>
          <ul>
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>
                <a href={`#${field}`}>{error}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div role="status" aria-live="polite" className="success">
          Form submitted successfully!
        </div>
      )}
      
      {/* Name field */}
      <div className="form-group">
        <label htmlFor="name">
          Name <span aria-label="required">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" role="alert" className="error">
            {errors.name}
          </span>
        )}
      </div>
      
      {/* Email field */}
      <div className="form-group">
        <label htmlFor="email">
          Email <span aria-label="required">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby="email-hint email-error"
        />
        <span id="email-hint" className="hint">
          We'll never share your email.
        </span>
        {errors.email && (
          <span id="email-error" role="alert" className="error">
            {errors.email}
          </span>
        )}
      </div>
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Example 2: Gov.uk (Gold Standard)

```html
<!-- GOV.UK uses exceptional accessibility -->
<main id="main-content" role="main">
  <div class="govuk-width-container">
    <a href="#main-content" class="govuk-skip-link">Skip to main content</a>
    
    <h1 class="govuk-heading-xl">Apply for a passport</h1>
    
    <form action="/submit" method="post" novalidate>
      <!-- Each input has clear label, hint, error -->
      <div class="govuk-form-group">
        <label class="govuk-label" for="passport-number">
          Passport number
        </label>
        <div id="passport-hint" class="govuk-hint">
          This is the 9-digit number in the top right corner of your passport
        </div>
        <input 
          class="govuk-input" 
          id="passport-number" 
          name="passport-number" 
          type="text"
          aria-describedby="passport-hint"
          spellcheck="false"
        >
      </div>
      
      <button class="govuk-button" data-module="govuk-button">
        Continue
      </button>
    </form>
  </div>
</main>

<!-- Why excellent:
- Skip link for keyboard users
- Clear headings
- Descriptive labels and hints
- Error messages (not shown here) are specific
- Works without JavaScript
- Tested with all major screen readers
-->
```

### Example 3: Accessible Image Gallery

```tsx
function AccessibleGallery({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  return (
    <section aria-label="Image gallery">
      {/* Main image */}
      <figure>
        <img 
          src={images[currentIndex].url} 
          alt={images[currentIndex].alt}
          aria-describedby="image-description"
        />
        <figcaption id="image-description">
          {images[currentIndex].description}
        </figcaption>
      </figure>
      
      {/* Navigation */}
      <nav aria-label="Gallery navigation">
        <button
          onClick={() => setCurrentIndex(prev => prev - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous image"
        >
          ← Previous
        </button>
        
        <span aria-live="polite" aria-atomic="true">
          Image {currentIndex + 1} of {images.length}
        </span>
        
        <button
          onClick={() => setCurrentIndex(prev => prev + 1)}
          disabled={currentIndex === images.length - 1}
          aria-label="Next image"
        >
          Next →
        </button>
      </nav>
      
      {/* Thumbnails */}
      <ul aria-label="Thumbnail images">
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              onClick={() => setCurrentIndex(index)}
              aria-label={`View ${image.alt}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            >
              <img src={image.thumbnail} alt="" role="presentation" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you ensure a complex web application is accessible?"

**Answer**:

"I'd implement **accessibility from foundations up**:

**1. Semantic HTML First**:

Use proper elements:
```html
<!-- Not divs with onclick -->
<button> for actions
<a href> for navigation
<header>, <nav>, <main>, <footer> for structure
<h1>-<h6> in logical hierarchy
<label> with <input>
```

Automatic keyboard support, screen reader announcements.

**2. WCAG AA Compliance**:

Target WCAG 2.1 Level AA (industry standard):
- **1.4.3** Color contrast: 4.5:1 for text, 3:1 for large text
- **2.1.1** Keyboard accessible: All functionality via keyboard
- **2.4.7** Focus visible: Clear focus indicators (never `outline: none`)
- **3.3.1** Error identification: Specific error messages
- **4.1.2** Name, role, value: All components have accessible names

**3. ARIA for Custom Components**:

When semantic HTML insufficient:
```tsx
<div
  role="button"
  tabIndex={0}
  aria-pressed={isPressed}
  aria-label="Toggle menu"
  onKeyDown={handleKeyDown}
>
```

But prefer native elements (they're accessible by default).

**4. Focus Management**:

For modals, dropdowns, side panels:
```typescript
// Open modal
previousFocus.current = document.activeElement;
modalFirstElement.focus();

// Trap focus (Tab cycles within modal)
trapFocus();

// Close modal
previousFocus.current?.focus(); // Restore focus
```

**5. Screen Reader Testing**:

Test with actual screen readers:
- **NVDA** (Windows, free)
- **VoiceOver** (Mac, built-in)
- **JAWS** (Windows, enterprise)

Navigate by:
- Headings (H key)
- Landmarks (D key)
- Links (Insert+F7)
- Forms (F key)

**6. Live Regions for Dynamic Content**:

```tsx
<div aria-live="polite" aria-atomic="true">
  {notifications.length} new messages
</div>

// "polite" = wait for user idle
// "assertive" = announce immediately (errors only)
```

**7. Keyboard Navigation**:

Support:
- **Tab**: Move forward
- **Shift+Tab**: Move backward
- **Enter/Space**: Activate
- **Arrow keys**: Navigate within (custom widgets)
- **Escape**: Close modals/dropdowns

**8. Automated Testing**:

```typescript
// jest-axe
const results = await axe(container);
expect(results).toHaveNoViolations();

// eslint-plugin-jsx-a11y
// Catches common mistakes at dev time
```

But manual testing essential (tools catch ~30-40% of issues).

**9. Skip Links**:

```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<main id="main-content">
  <!-- Content -->
</main>
```

Keyboard users can bypass repetitive navigation.

**10. Real-World Examples**:

- **Gov.uk**: Gold standard (every component accessible, tested rigorously)
- **GitHub**: Excellent keyboard shortcuts, skip links, screen reader support
- **Airbnb**: Filter panel accessible (keyboard + screen reader tested)

**Legal Considerations**:

- **ADA** (US): Required for public-facing sites
- **Section 508** (US Gov): Required for government sites
- **EAA** (EU): European Accessibility Act
- **Lawsuits**: Domino's Pizza lost case (2019) for inaccessible site

**Business Case**:

- 15% of population has disabilities (1B+ people)
- Accessible sites have better SEO (semantic HTML)
- Improved UX for everyone (keyboard shortcuts, clear labels)
- Reduced legal risk

**Trade-offs**:

Some complexity (ARIA patterns), but semantic HTML covers 80%. Cost of retrofitting >> cost of building accessible from start."

---

## 6. Why & How Summary

### Why It Matters

**Legal**: ADA, Section 508 compliance required  
**Ethical**: 15% of population has disabilities (1B+ people)  
**Business**: Better UX for all, SEO benefits, reduced legal risk

### How It Works

**1. Semantic HTML**: Proper elements (button, nav, header, h1-h6)  
**2. ARIA**: Roles, states, properties for custom components  
**3. Keyboard**: Full keyboard navigation (Tab, Enter, Escape)  
**4. Screen Readers**: Test with NVDA, VoiceOver, JAWS  
**5. WCAG**: Target Level AA (4.5:1 contrast, focus visible, error messages)

**FAANG**: Semantic-first approach, ARIA for custom widgets, automated testing (axe, eslint-plugin-jsx-a11y), manual screen reader testing, WCAG AA compliance
