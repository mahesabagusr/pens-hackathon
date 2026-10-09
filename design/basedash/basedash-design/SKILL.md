---
name: basedash-design
description: Design system skill for basedash. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# basedash Design System

You are building UI for **basedash**. Light-themed, cool palette, sans-serif typography (Iowan Old Style), compact density on a 4px grid, expressive motion.

## Visual Reference

**IMPORTANT**: Study ALL screenshots below before writing any UI. Match colors, typography, spacing, layout, and motion exactly as shown.

### Homepage

![basedash Homepage](screenshots/homepage.png)

> Read `references/DESIGN.md` for full token details.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **Type pairing** — Iowan Old Style for body/UI text, Basedash Glitch for headings/display. Never introduce a third typeface.
- **compact density** — 4px base grid. Every dimension is a multiple of 4.
- **cool palette** — the color temperature runs cool, matching the sans-serif typography.
- **Restrained accent** — `#00c758` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#ffffff` | Page/app background |
| Surface | `--surface` | `#131316` | Cards, panels, modals |
| Text Primary | `--text-primary` | `#000000` | Headings, body text |
| Accent | `--accent` | `#00c758` | CTAs, links, focus rings |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Success | `#2fa86b` | Confirmations, positive trends |
| Warning | `#f59e0b` | Caution states, pending items |
| Danger | `#e8792f` | Errors, destructive actions |

### Extended Palette

- `#4679f2`
- `#4ebcfc`
- **color-chart-member-5:** `#f84747` — Warm accent — hover glow or decorative highlight
- **color-chart-member-3:** `#ea863f`
- `#e8e8e8` — Light surface or highlight color
- **color-theme-1:** `#d67a3b`
- `#a369ea`
- **color-success:** `#23764b` — Confirmations, positive trend indicators

### CSS Variable Tokens

```css
--color-background-1: #0c0b0a;
--color-background-2: #171513;
--color-background-1: #080706;
--mock-muted-bar-start: #fffcf847;
--mock-muted-bar-end: #fffcf81f;
--mock-muted-bar-end-strong: #fffcf824;
--color-background-1: #fff;
--color-background-2: #fafafa;
--mock-muted-bar-start: #1717173d;
--mock-muted-bar-end: #1717171a;
--mock-muted-bar-end-strong: #17171724;
--color-background-1: #0c0b0a;
--color-background-2: #171513;
--color-background-1: #080706;
--mock-muted-bar-start: #fffcf847;
--mock-muted-bar-end: #fffcf81f;
--mock-muted-bar-end-strong: #fffcf824;
--color-background-1: #fff;
--color-background-2: #fafafa;
--mock-muted-bar-start: #1717173d;
```

## Typography

### Font Stack

- **Iowan Old Style** — Heading 1, Heading 2, Heading 3
- **Basedash Glitch** — Body, Caption
- **SFMono-Regular** — Code

### Font Sources

```css
@font-face {
  font-family: "Basedash Glitch";
  src: url("fonts/BasedashGlitch-500.woff2") format("woff2");
  font-weight: 500;
}
```

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | Iowan Old Style | 3.625rem | 700 |
| Heading 2 | Iowan Old Style | 3.25rem | 700 |
| Heading 3 | Iowan Old Style | 2.75rem | 700 |
| Body | Basedash Glitch | .75rem | 400 |
| Caption | Basedash Glitch | 20px | 400 |
| Code | SFMono-Regular | 14px | 400 |

### Typography Rules

- Body/UI: **Iowan Old Style**, Headings: **Basedash Glitch** — these are the only display fonts
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 4px

Every dimension (margin, padding, gap, width, height) must be a multiple of **4px**.

### Spacing Scale

`2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 4-8px | Tight: related items (icon + label, avatar + name) |
| 12-16px | Medium: between groups within a section |
| 24-32px | Wide: between distinct sections |
| 48px+ | Vast: major page section breaks |

### Border Radius

Scale: `1rem, 1.4rem, 1.75rem, 2px, 3px, 4px, 5px, 6px, 7.5px, 10px, 12px, 14px, 15px, 20px`
Default: `6px`

### Container

Max-width: `96rem`, centered with auto margins.

## Component Patterns

### Card

```css
.card {
  background: #131316;
  border-radius: 6px;
  padding: 16px;
  box-shadow: 0 1px 2px #11111114;
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #00c758;
  color: #000000;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #cccccc;
  color: #000000;
  border-radius: 6px;
  padding: 8px 16px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #ffffff;
  border: 1px solid #cccccc;
  border-radius: 6px;
  padding: 8px 12px;
  color: #000000;
  font-size: 14px;
}
.input:focus { border-color: #00c758; outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #131316;
  color: #000000;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #131316;
  border-radius: 20px;
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px;
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  font-size: 12px;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #cccccc;
}
.table td {
  padding: 12px;
  border-bottom: 1px solid #cccccc;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}
.nav-link {
  color: #000000;
  padding: 8px 12px;
  border-radius: 6px;
  transition: color 150ms;
}
.nav-link:hover { color: #000000; }
.nav-link.active { color: #00c758; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**Button** (`html`)

**Input** (`html`)

**Navigation** (`html`)

## Page Structure

The following page sections were detected:

- **Navigation** — Top navigation bar (16 items)
- **Hero** — Hero/banner section with headline and CTAs
- **Features** — Feature/benefit cards grid
- **Faq** — FAQ/accordion section
- **Footer** — Page footer with links and info (55 items)

When building pages, follow this section order and structure.

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### CSS Animations

- `hero-chat-dot`
- `spin`
- `pulse`
- `cursor-blink`
- `marquee-track-left`

### Motion Tokens

- **Duration scale:** `.1s`, `75ms`, `100ms`, `150ms`, `200ms`
- **Easing functions:** `ease-out`, `ease`
- **Animated properties:** `opacity`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (.1s) for micro-interactions, long (200ms) for page transitions
- **Easing:** Use `ease-out` as the default easing curve
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

### Shadow Tokens

- Subtle: `0 1px 2px #11111114`
- Floating (dropdowns, popovers): `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px`
- Overlay (modals, dialogs): `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px`

### Z-Index Scale

`0, 1, 2, 10, 20, 30, 40, 50`

Use these exact values — never invent z-index values.

## Anti-Patterns (Never Do)

- **No blur effects** — no backdrop-blur, no filter: blur()
- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 4px
- **No extra fonts** — only Iowan Old Style and Basedash Glitch and SFMono-Regular are allowed
- **No arbitrary border-radius** — use the scale: 1rem, 1.4rem, 1.75rem, 2px, 3px, 4px, 5px, 6px, 7.5px, 10px
- **No opacity for disabled states** — use muted colors instead
- **No pill shapes** — this design doesn't use rounded-full / 9999px radius

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — Iowan Old Style, Basedash Glitch, SFMono-Regular only, using the type scale
4. **Build layout** on the 4px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Favicon:** `/favicon.ico`
- **Site URL:** `https://www.basedash.com/`
- **Brand color:** `#00c758`
- **Brand typeface:** Iowan Old Style

## Quick Reference

```
Background:     #ffffff
Surface:        #131316
Text:           #000000 / (not extracted)
Accent:         #00c758
Border:         (not extracted)
Font:           Iowan Old Style
Spacing:        4px grid
Radius:         6px
Components:     8 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for basedash
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "basedash" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# basedash DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 20 · Fonts: 3 · Components: 8
> Icon library: not detected · State: not detected
> Primary theme: light · Dark mode toggle: no · Motion: expressive

## Visual Reference

**Match this design exactly** — study colors, fonts, spacing, and component shapes before writing any UI code.

![basedash Homepage](../screenshots/homepage.png)

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a cool, approachable feel. The light background emphasizes content clarity. Typography pairs **Basedash Glitch** for display/headings with **Iowan Old Style** for body text, creating clear visual hierarchy through type contrast. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. The accent color **#00c758** anchors interactive elements (buttons, links, focus rings). Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| theme-color | `#ffffff` | background | Page background, darkest surface |
| hero-chat-surface | `#131316` | surface | Card and panel backgrounds |
| hero-table-surface | `#08080a` | surface | Card and panel backgrounds |
| tile-color | `#000000` | text-primary | Headings and body text |
| accent | `#00c758` | accent | CTAs, links, focus rings, active states |
| danger | `#e8792f` | danger | Error states, destructive actions |
| color-chart-member-7 | `#2fa86b` | success | Success states, positive indicators |
| warning | `#f59e0b` | warning | Warning states, caution indicators |
| info | `#4679f2` | info | Informational highlights |
| unknown | `#4ebcfc` | unknown | Palette color |
| color-chart-member-5 | `#f84747` | unknown | Palette color |
| color-chart-member-3 | `#ea863f` | unknown | Palette color |
| unknown | `#e8e8e8` | unknown | Palette color |
| color-theme-1 | `#d67a3b` | unknown | Palette color |
| unknown | `#a369ea` | unknown | Palette color |
| color-success | `#23764b` | unknown | Palette color |
| unknown | `#fb2c36` | unknown | Palette color |
| unknown | `#22c55e` | unknown | Palette color |
| color-theme-1 | `#f49556` | unknown | Palette color |
| color-success | `#65c995` | unknown | Palette color |

### CSS Variable Tokens

```css
--tw-border-style: solid;
--color-background-1: #0c0b0a;
--color-background-2: #171513;
--tw-border-style: dashed;
--color-background-1: #080706;
--mock-muted-bar-start: #fffcf847;
--mock-muted-bar-end: #fffcf81f;
--mock-muted-bar-end-strong: #fffcf824;
--color-background-1: #fff;
--color-background-2: #fafafa;
--mock-muted-bar-start: #1717173d;
--mock-muted-bar-end: #1717171a;
--mock-muted-bar-end-strong: #17171724;
--tw-border-style: solid;
--color-background-1: #0c0b0a;
--color-background-2: #171513;
--tw-border-style: dashed;
--color-background-1: #080706;
--mock-muted-bar-start: #fffcf847;
--mock-muted-bar-end: #fffcf81f;
```


---

## 3. Typography Rules

**Font Stack:**
- **Iowan Old Style** — Heading 1, Heading 2, Heading 3
- **Basedash Glitch** — Body, Caption
- **SFMono-Regular** — Code

**Font Sources:**

```css
@font-face {
  font-family: "Basedash Glitch";
  src: url("fonts/BasedashGlitch-500.woff2") format("woff2");
  font-weight: 500;
}
```

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Iowan Old Style | 3.625rem | 700 |
| Heading 2 | Iowan Old Style | 3.25rem | 700 |
| Heading 3 | Iowan Old Style | 2.75rem | 700 |
| Body | Basedash Glitch | .75rem | 400 |
| Caption | Basedash Glitch | 20px | 400 |
| Code | SFMono-Regular | 14px | 400 |

**Typographic Rules:**
- Limit to 3 font families max per screen
- Use **Iowan Old Style** for body/UI text, **Basedash Glitch** for display/headings
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Layout (1)

**Footer** — `html`

### Navigation (1)

**Navigation** — `html`

### Data Display (1)

**List** — `html`

### Data Input (2)

**Button** — `html`
- Animation: 

**Input** — `html`
- State: :focus, :placeholder

### Media (3)

**Image** — `html`

**Icon** — `html`

**Map/Canvas** — `html`



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 32
- **Border radius:** 1rem, 1.4rem, 1.75rem, 2px, 3px, 4px, 5px, 6px, 7.5px, 10px, 12px, 14px, 15px, 20px
- **Max content width:** 96rem

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `0 1px 2px #11111114`

### Floating — dropdowns, popovers, modals

- `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px`

### Overlay — full-screen overlays, top-level dialogs

- `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px`

### Z-Index Scale

`0, 1, 2, 10, 20, 30, 40, 50`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes hero-chat-dot`
- `@keyframes spin`
- `@keyframes pulse`
- `@keyframes cursor-blink`
- `@keyframes marquee-track-left`
- `@keyframes marquee-track-right`

### Animated Components

- **Button**: 

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#00c758` for interactive elements (buttons, links, focus rings)
- Use `#ffffff` as the primary page background
- Pair **Iowan Old Style** (body) with **Basedash Glitch** (display) — these are the only allowed fonts
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 1rem, 1.4rem, 1.75rem, 2px, 3px
- Reuse existing components from Section 4 before creating new ones

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't introduce additional font families beyond Iowan Old Style and Basedash Glitch and SFMono-Regular
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

No breakpoints detected. Consider adding responsive breakpoints to the design system.

---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #131316
Border: 1px solid var(--border)
Radius: 6px
Padding: 16px
Font: Iowan Old Style
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #00c758, text white
Ghost: bg transparent, border var(--border)
Padding: 8px 16px
Radius: 6px
Hover: opacity 0.9 or lighter shade
Focus: ring with #00c758
```

### Build a Page Layout

```
Background: #ffffff
Max-width: 96rem, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #131316
Label: var(--text-muted) (muted, 12px, uppercase)
Value: #000000 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #ffffff
Input border: 1px solid var(--border)
Focus: border-color #00c758
Label: var(--text-muted) 12px
Spacing: 16px between fields
Radius: 6px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: Iowan Old Style, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

## Bundled Fonts (fonts/)

The following font files are bundled in the `fonts/` directory:

- `fonts/BasedashGlitch-500.woff2`

Use these local font files in `@font-face` declarations instead of fetching from Google Fonts.

## Homepage Screenshots (screenshots/)

![homepage.png](screenshots/homepage.png)

