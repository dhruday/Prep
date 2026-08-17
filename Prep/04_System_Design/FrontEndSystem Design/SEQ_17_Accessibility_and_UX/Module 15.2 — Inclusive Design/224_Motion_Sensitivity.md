# 224 – Motion Sensitivity — prefers-reduced-motion

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Motion sensitivity affects approximately **35% of the general population** to some degree, with conditions ranging from vestibular disorders to motion sickness to seizure disorders (photosensitive epilepsy). The CSS media query `prefers-reduced-motion` detects when a user has enabled "Reduce motion" in their OS settings and allows frontend applications to **replace or remove animations, transitions, parallax effects, and auto-playing videos**. This isn't about removing all motion — it's about providing **non-triggering alternatives** that preserve functionality without causing physical discomfort. WCAG 2.1 Success Criterion 2.3.3 (AAA) and 2.3.1 (A) address motion and flashing content.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### What Triggers Motion Sensitivity

| Trigger | Effect on Users | Example |
|---------|----------------|---------|
| Parallax scrolling | Nausea, disorientation | Landing page backgrounds that move at different speeds |
| Page transitions | Dizziness | Slide/zoom transitions between routes |
| Auto-playing animations | Distraction, seizures | Animated hero banners, loading spinners |
| Infinite scroll momentum | Vestibular discomfort | Smooth-scrolling feeds |
| Zooming/scaling effects | Nausea | Pinch-to-zoom transitions, modal zoom-in |

### CSS Implementation

```css
/* Default: animations enabled */
.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.2);
}

/* Reduced motion: remove transform, keep visual feedback */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: box-shadow 0.1s ease; /* Keep quick feedback */
  }
  .card:hover {
    transform: none; /* Remove movement */
    box-shadow: 0 0 0 3px #a78bfa; /* Use outline instead */
  }

  /* Remove all animations globally */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### JavaScript Detection

```typescript
// Check preference at runtime
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Listen for changes (user toggles setting while app is open)
prefersReducedMotion.addEventListener('change', (event) => {
  if (event.matches) {
    disableAnimations();
  } else {
    enableAnimations();
  }
});

// Use in animation libraries (Framer Motion, GSAP)
function getAnimationConfig() {
  if (prefersReducedMotion.matches) {
    return { duration: 0, ease: 'none' }; // Instant transitions
  }
  return { duration: 0.3, ease: 'easeOut' };
}
```

### Framework Integration

**React (Framer Motion):**
```tsx
import { motion, useReducedMotion } from 'framer-motion';

function Card({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -8 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

**Angular:**
```typescript
@Component({
  selector: 'app-animated-card',
  animations: [
    trigger('cardHover', [
      state('idle', style({ transform: 'translateY(0)' })),
      state('hovered', style({ transform: 'translateY(-8px)' })),
      transition('* <=> *', [animate('300ms ease')]),
    ]),
  ],
})
export class AnimatedCardComponent implements OnInit {
  prefersReducedMotion = false;

  ngOnInit() {
    this.prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }
}
```

### Trade-offs

- **Remove all motion** → safest for users but may feel "broken" or lose key UX cues
- **Reduce motion duration** → middle ground; 0.1s transitions instead of 0.3s
- **Replace motion with opacity/color** → maintains visual feedback without triggering vestibular issues

### Anti-Patterns

- ❌ **Ignoring `prefers-reduced-motion` entirely** — WCAG violation and causes physical harm
- ❌ **Only reducing, never removing** — some users need zero motion, not slower motion
- ❌ **Marketing refusing to remove parallax** — accessibility is a legal requirement, not a negotiation
- ❌ **Not testing with the OS setting enabled** — toggle it on: Windows Settings → Accessibility → Visual effects → Animation effects
- ❌ **Using `animation: none` without `!important`** — third-party libraries may override

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs — Disabling Fiori Animations

At SAP, the Fiori Launchpad had tile flip animations and page transition effects. During WCAG AA certification, we wrapped all CSS animations with `@media (prefers-reduced-motion: no-preference)` and provided instant alternatives. We also added a user preference toggle in the Fiori settings panel for users who wanted reduced motion but hadn't set the OS preference.

### FAANG: Apple.com

Apple's website is animation-heavy, but every animation respects `prefers-reduced-motion`. With the setting enabled, parallax effects become static images, scroll-triggered reveals become immediately visible, and video backgrounds show a static poster frame.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"Motion sensitivity is a real accessibility concern — about 35% of people experience some form of motion discomfort. The browser provides `prefers-reduced-motion` media query which detects the user's OS-level setting. I use this at two levels: CSS for declarative animations (wrapping transitions and animations in a `prefers-reduced-motion: no-preference` media query so they only run when the user hasn't requested reduced motion), and JavaScript for imperative animations (checking `window.matchMedia` and configuring animation libraries to use duration: 0).*

*The principle isn't to remove all visual feedback — it's to replace motion with non-motion alternatives. Instead of a card sliding up on hover, use a border highlight. Instead of a page transition animation, use an instant swap. At SAP, we wrapped all Fiori Launchpad animations with this media query during our WCAG AA certification.*"

### Likely Follow-up Questions

1. **"Should you remove all animations or just reduce them?"** — The safest approach is to offer both: `reduce` removes motion-triggering animations, replacing with opacity/color changes that provide the same UX cue.
2. **"How do you handle animation libraries?"** — Framer Motion has `useReducedMotion()`. GSAP: check the media query before setting duration. CSS-only: media query handles it.
3. **"What about auto-playing videos?"** — Pause auto-play when `prefers-reduced-motion` is enabled. Show a play button instead.

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Respect the user's body, not just their preferences."** `@media (prefers-reduced-motion: reduce)` is your one-line entry point. Replace motion with opacity/color, never remove visual feedback entirely. Test by toggling OS Accessibility settings. The triad: **CSS media query** for transitions/animations, **JS matchMedia** for imperative animations, **framework hooks** (useReducedMotion) for component libraries.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Motion-triggered vestibular disorders cause nausea, dizziness, and migraines. Photosensitive epilepsy can cause seizures. Ignoring `prefers-reduced-motion` causes physical harm and violates WCAG 2.1 SC 2.3.1 (Level A — the most basic level).

**How it works:**
→ Users enable "Reduce motion" in OS settings (Windows, macOS, iOS, Android). Browsers expose this as the `prefers-reduced-motion: reduce` media feature. CSS and JavaScript can detect this and provide alternative, non-motion interactions.

**Company relevance:**
→ **Microsoft**: Windows 11 has "Animation effects" toggle in Accessibility settings. Microsoft products must respect this at every layer.
→ **Adobe**: Creative Cloud has extensive motion design — all must degrade gracefully. Spectrum React components use `useReducedMotion`.
→ **Salesforce**: Lightning components with animations must respect reduced motion preferences.
→ **Cisco**: Webex animations for reactions, transitions must be disableable for accessibility compliance.
