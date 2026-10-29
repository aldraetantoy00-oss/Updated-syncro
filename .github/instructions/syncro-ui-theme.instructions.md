---
description: "Use when changing Syncro Ionic page UI, layouts, headers, typography, colors, buttons, or responsive styles. Preserve the established Syncro visual theme."
applyTo: ["src/app/**/*.html", "src/app/**/*.scss", "src/global.scss", "src/theme/**/*.scss"]
---

# Syncro UI Theme

- Preserve the existing Syncro visual identity: green primary palette, light neutral page backgrounds, and clean, readable typography.
- Show the circular Syncro mark immediately before the existing “Syncro” wordmark in branded headers. Use the existing sync icon with inherited `currentColor`; never alter the logo, text, or page colors just to add the mark.
- Reuse theme variables from `src/theme/variables.scss` and shared UI classes from `src/global.scss`; avoid introducing competing colors, fonts, button treatments, or header dimensions.
- Keep page headers, navigation controls, and primary buttons visually consistent with the existing non-dashboard pages.
- Do not redesign the organization dashboard; its current design is intentional. Change it only when the user explicitly asks.
- Match the established Ionic patterns and responsive behavior. Keep touch targets accessible, provide accessible names for icon-only controls, and preserve keyboard focus visibility.
- Keep page-specific styles local unless a rule is genuinely shared. Avoid broad global selectors that unintentionally alter unrelated pages.
- When a requested design change conflicts with the established theme, make the smallest focused adjustment that satisfies the request while retaining the theme.
