# Accessibility Regression Strategy

## Problem Statement

Define how a frontend team prevents accessibility regressions while shipping quickly across a component library and product surfaces.

## Solution

- Build semantic HTML and keyboard behavior into component primitives. Define focus, name, role, state, and error-message contracts in component documentation.
- Add automated linting and accessibility checks to unit/integration tests, but treat them as a safety net rather than complete proof.
- Include keyboard-only and screen-reader smoke tests for critical flows: sign-in, navigation, search, forms, checkout/submission, modal/popover flows, and errors.
- Use visual regression tests for focus indicators, contrast-sensitive themes, and layout changes. Test at zoom and narrow widths.
- Make manual accessibility review part of design and release criteria, track defects by severity, and involve users with disabilities for important workflows.
