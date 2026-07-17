---
name: Docksy Marketing
description: The official marketing site explaining Docksy and hosting setup downloads.
colors:
  primary: "#1f62ff"
  accent: "#e61d3b"
  neutral-bg: "#ffffff"
  neutral-ink: "#191c1f"
  surface: "#f7f9fc"
  muted: "#656d78"
  border: "#e1e4e8"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
---

# Design System: Docksy Marketing

## 1. Overview

**Creative North Star: "Precision Instrument"**

This system represents a clean, high-contrast, and professional aesthetic designed to mirror the raw utility and technical excellence of a native desktop application. It rejects soft, cloudy SaaS gradients and generic cream/beige backgrounds, committing to a crisp white canvas with heavy black ink and stark, vivid accents. Every element is aligned to a grid, expressing confidence, speed, and accuracy.

**Key Characteristics:**

- Stark white layouts with clean structural borders.
- Bold, high-contrast typography with balanced readability.
- Sharp primary colors (Vivid Cobalt Blue) and secondary accents (Vivid Crimson Red) reserved for action elements.
- Strict layout rhythm and container structures that look like a technical blueprint or native application interface.

## 2. Colors

The palette is anchored in high-contrast light values to ensure instant legibility, structural clarity, and a modern utility aesthetic.

### Primary

- **Vivid Cobalt Blue** (#1f62ff / oklch(0.550 0.180 240.0)): Used for primary CTA buttons, active state indicators, and focal points. Represents action and security.

### Secondary

- **Vivid Crimson Red** (#e61d3b / oklch(0.580 0.200 20.0)): Used for highlights, live states, and notification accents.

### Neutral

- **Pure White Background** (#ffffff / oklch(1.000 0.000 0.0)): The default background of all screens.
- **Stark Ink** (#191c1f / oklch(0.120 0.010 230.0)): Body text and header color. High contrast and highly readable.
- **Soft Tint Surface** (#f7f9fc / oklch(0.980 0.005 230.0)): Used for table headers, code blocks, and minor secondary panels.
- **Slate Muted** (#656d78 / oklch(0.450 0.015 230.0)): Used for secondary descriptions and helper text.
- **Light Border** (#e1e4e8 / oklch(0.900 0.010 230.0)): Thin 1px borders separating layouts and components.

### Named Rules

**The Rarity Rule.** Saturated primary and secondary accents must cover ≤10% of any given viewport. The stark white and black should do the talking; colors are reserved for intent.
**The White-on-Color Rule.** Any text sitting on a filled brand color (such as a primary button or active state badge) must be Pure White (#ffffff) to ensure clean perceptual contrast.

## 3. Typography

**Display Font:** Geist Sans (var(--font-geist-sans))
**Body Font:** Geist Sans (var(--font-geist-sans))
**Label/Mono Font:** Geist Mono (var(--font-geist-mono))

The typography is optimized for maximum readability, technical clarity, and structure.

### Hierarchy

- **Display** (800, clamp(2.5rem, 5vw, 4.5rem), 1.1): Main marketing headers. Uses tight negative letter-spacing (-0.03em) to feel cohesive and punchy.
- **Headline** (700, 1.875rem, 1.2): Section headings.
- **Title** (600, 1.25rem, 1.3): Subsection card titles.
- **Body** (400, 1rem, 1.6): Paragraph prose. Max line length clamped to 65ch to reduce visual eye-strain.
- **Label** (500, 0.875rem, 1.4): Code snippets, small descriptions, tags.

### Named Rules

**The No-Orphan Rule.** Display and headline typography must always use `text-wrap: balance` to prevent orphaned words at the end of lines.
**The Line-Limit Rule.** Body paragraphs must never stretch wider than 65ch.

## 4. Elevation

Docksy's web presence is flat by default. It utilizes thin structural borders (`border: 1px solid var(--border)`) and subtle tonal shifts (`var(--surface)`) rather than deep shadows to organize information and group content.

### Shadow Vocabulary

- **Active state shadow** (`box-shadow: 0 2px 8px rgba(25, 28, 31, 0.06)`): Used solely to give feedback when clicking or hovering on interactive panels.

### Named Rules

**The Border-Only Rule.** Do not pair borders with soft, wide shadows. Rely on sharp 1px borders to separate content; shadows are strictly reserved for temporary interactions.

## 5. Components

### Buttons

- **Shape:** Softly rounded edges (4px radius / `var(--radius-sm)`).
- **Primary:** Background `#1f62ff`, text `#ffffff`, padding `12px 24px`.
- **Hover:** Background `#0048eb`, transition `background 0.15s ease-out-quart`.
- **Secondary:** Background `#ffffff`, border `1px solid #e1e4e8`, text `#191c1f`, padding `12px 24px`.

### Cards / Containers

- **Corner Style:** Rounded edges (8px radius / `var(--radius-md)`).
- **Background:** Pure White (#ffffff) or Soft Tint Surface (#f7f9fc).
- **Border:** 1px solid #e1e4e8.
- **Internal Padding:** 24px.

### Inputs / Fields

- **Style:** Background `#ffffff`, border `1px solid #e1e4e8`, radius `4px`.
- **Focus:** Border color changes to `#1f62ff` with a subtle `outline: 2px solid rgba(31, 98, 255, 0.2)`.

### Navigation

- **Style:** Flat top nav bar, height `64px`, border-bottom `1px solid #e1e4e8`. Clean links with Slate Muted `#656d78` color, transition to Stark Ink `#191c1f` on hover.

## 6. Do's and Don'ts

### Do:

- **Do** use strict WCAG AA contrast ratios (>=4.5:1) for all body copy and metadata.
- **Do** align all layouts to a clean 8px grid system.
- **Do** use monospace layouts for code blocks and setup instructions.

### Don't:

- **Don't** use warm-beige, cream, sand, or linen backgrounds (avoid AI cream defaults).
- **Don't** use side-stripe borders (e.g. `border-left: 4px solid var(--primary)`) as decoration.
- **Don't** use gradient text under any circumstances.
- **Don't** use glassmorphic blur effects or card layouts decoratively.
- **Don't** use over-rounded card corners (keep radii under 12px; do not use 32px or 40px).
