# V.A.P.O.R Brand Style Guide

**Vehicle Analytics, Processing & Real-time**

This document defines the visual identity of the V.A.P.O.R platform. All developers and designers must follow these guidelines to ensure a consistent and professional appearance across all interfaces.

---

## Table of Contents

- [Logo and Iconography](#logo-and-iconography)
- [Color Palette](#color-palette)
- [Typography](#typography)
- [Design Principles](#design-principles)
- [UI Component Styling](#ui-component-styling)
- [Shadow and Elevation](#shadow-and-elevation)
- [Motion and Animation](#motion-and-animation)
- [Responsive Breakpoints](#responsive-breakpoints)
- [Accessibility](#accessibility)

---

## Logo and Iconography

### Primary Logo

The V.A.P.O.R logo consists of the wordmark "V.A.P.O.R." with the tagline "Vehicle Analytics, Processing & Real-time" beneath it. The O in the wordmark incorporates a smoke graphic element representing smoke (vapor) from the tire braking.

![V.A.P.O.R Logo](./assets/logo.png)

### Logo Usage Rules

| Rule | Guideline |
|---|---|
| Minimum size | 120px wide |
| Clear space | Maintain padding equal to the height of the "V" on all sides |
| Backgrounds | Use on white, light grey, or the primary green background only |
| Do not | Stretch, rotate, recolor, or add effects to the logo |
| Do not | Place on busy or low-contrast backgrounds |

### Iconography

The platform uses **Lucide React** as the primary icon library. Icons must:

- Be used at consistent sizes: `16px` (inline), `20px` (buttons), `24px` (feature icons)
- Use `currentColor` for stroke so they inherit the surrounding text color
- Maintain a `strokeWidth` of `2` across all usage
- Never be filled unless the Lucide icon is explicitly a filled variant

---

## Color Palette

### Primary Colors

| Token | Name | HEX | Usage |
|---|---|---|---|
| `fleet-green` | Primary Green | `#4D7C5F` | Buttons, links, sidebar, active states |
| `fleet-surface` | Surface White | `#FFFFFF` | Cards, modals, form panels |

### Background Colors

| Token | Name | HEX | Usage |
|---|---|---|---|
| `fleet-bg` | App Background | `#F4F3EF` | Main application background |
| `fleet-panel` | Panel Background | `#EAE9E3` | Secondary panels, muted sections |

### Text Colors

| Token | Name | HEX | Usage |
|---|---|---|---|
| `fleet-text` | Primary Text | `#2B2D26` | Headings and body text |
| `fleet-secondary` | Secondary Text | `#6B6B63` | Subtitles, placeholders, captions |

### Border Colors

| Token | Name | HEX | Usage |
|---|---|---|---|
| `fleet-border` | Border | `#D9D8D2` | Component borders, dividers, input borders |

### Semantic Colors

| Token | Name | HEX | Usage |
|---|---|---|---|
| `fleet-alert` | Alert / Error | `#C0392B` | Error messages, destructive actions |
| `fleet-warning` | Warning | `#E67E22` | Warning indicators, caution states |
| `fleet-idle` | Idle / Inactive | `#9E9E9E` | Offline vehicles, inactive elements |

### Color Swatches

```
Primary Green   ████  #4D7C5F
App Background  ████  #F4F3EF
Surface White   ████  #FFFFFF
Panel           ████  #EAE9E3
Primary Text    ████  #2B2D26
Secondary Text  ████  #6B6B63
Border          ████  #D9D8D2
Alert           ████  #C0392B
Warning         ████  #E67E22
Idle            ████  #9E9E9E
```

---

## Typography

### Font Families

| Role | Font | Usage |
|---|---|---|
| Sans (Primary) | **Inter** | Body text, UI labels, form inputs, general content |
| Display | **DM Sans** | Headings, hero text, prominent titles |
| Mono | **JetBrains Mono** | Code snippets, telemetry values, technical data |

```css
/* Sans - body text and UI labels */
font-family: 'Inter', sans-serif;

/* Display - headings and titles */
font-family: 'DM Sans', sans-serif;

/* Mono - telemetry values and code */
font-family: 'JetBrains Mono', monospace;
```

### Type Scale

| Level | Size | Weight | Font | Usage |
|---|---|---|---|---|
| Display | 32px / 2rem | 700 | DM Sans | Page hero, landing headings |
| Heading 1 | 24px / 1.5rem | 700 | DM Sans | Page titles |
| Heading 2 | 20px / 1.25rem | 600 | DM Sans | Section headings, card titles |
| Heading 3 | 16px / 1rem | 600 | DM Sans | Sub-section headings |
| Body | 14px / 0.875rem | 400 | Inter | General body text, form content |
| Small | 12px / 0.75rem | 400 | Inter | Captions, helper text, badges |
| Micro | 10px / 0.625rem | 600 | Inter | Status labels, uppercase tags |
| Mono | 13px / 0.8125rem | 400 | JetBrains Mono | Telemetry values, data displays |

### Letter Spacing

- Headings: `-0.4px` to `-0.5px` (tight)
- Body: `0` (default)
- Uppercase labels: `+0.5px` to `+1px` (wide)

### Line Height

- Headings: `1.2` to `1.3`
- Body text: `1.5`
- Small/micro: `1.4`

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | `calc(var(--radius) - 4px)` | Small elements, badges |
| `md` | `calc(var(--radius) - 2px)` | Inputs, small buttons |
| `lg` | `var(--radius)` = `0.75rem` | Cards, modals, large buttons |

---

## Design Principles

### Consistency

All UI elements must follow the defined color tokens, typography scale and spacing system. Components built by different team members must be visually indistinguishable.

### Simplicity

The interface should surface only what the fleet manager needs at any given moment. Avoid visual clutter, excessive decoration and unnecessary UI elements. Data should speak for itself.

### Responsiveness

All screens must be functional across desktop, tablet and mobile viewports. Use Tailwind responsive prefixes (`sm:`, `lg:`) consistently throughout the codebase.

### Real-time First

The platform processes live vehicle data. The UI must communicate data freshness clearly at all times. Loading states, live indicators and timestamps are required on all data-driven components.

### Accessibility

The interface must be usable by individuals with diverse abilities. Color alone must never be the only way to communicate status or meaning.

---

## UI Component Styling

### Buttons

| Variant | Background | Text | Usage |
|---|---|---|---|
| Primary | `#4D7C5F` | `#FFFFFF` | Main actions (Sign in, Create account, Save) |
| Secondary | `#EAE9E3` | `#2B2D26` | Secondary actions |
| Destructive | `#C0392B` | `#FFFFFF` | Delete, deactivate, irreversible actions |
| Ghost | Transparent | `#2B2D26` | Tertiary actions, icon-only buttons |

Button specifications:
- Border radius: `0.75rem`
- Padding: `10px 16px`
- Font: Inter, `13px`, weight `600`
- Letter spacing: `0.5px`
- Hover: darken background by 8%
- Disabled: `#9E9E9E` background, `not-allowed` cursor

### Form Inputs

- Border: `1px solid #D9D8D2`
- Border radius: `6px`
- Padding: `10px 12px`
- Font: Inter, `13px`, weight `400`
- Background: `#FFFFFF`
- Focus border: `#4D7C5F`
- Focus ring: `0 0 0 3px rgba(77, 124, 95, 0.1)`
- Error border: `#C0392B`

### Cards

- Background: `#FFFFFF`
- Border: `1px solid #D9D8D2`
- Border radius: `0.75rem`
- Padding: `16px` to `24px`
- Shadow: `0 1px 3px rgba(0,0,0,0.05)`

### Navigation / Sidebar

- Background: `#4D7C5F`
- Text: `#FFFFFF`
- Active item: lighter green with left border accent
- Width: `240px` (desktop)

### Modals

- Overlay: `rgba(0, 0, 0, 0.4)`
- Background: `#FFFFFF`
- Border radius: `0.75rem`
- Max width: `480px`
- Padding: `24px`

### Status Indicators

| Status | Token | HEX |
|---|---|---|
| Active / Online | `fleet-green` | `#4D7C5F` |
| Idle | `fleet-idle` | `#9E9E9E` |
| Warning | `fleet-warning` | `#E67E22` |
| Offline / Error | `fleet-alert` | `#C0392B` |

### Spacing System

| Size | Value | Usage |
|---|---|---|
| xs | `4px` | Icon gaps, tight padding |
| sm | `8px` | Component internal spacing |
| md | `16px` | Card padding, section gaps |
| lg | `24px` | Page section spacing |
| xl | `32px` | Major layout gaps |
| 2xl | `48px` | Page-level spacing |

---

## Shadow and Elevation

Shadows communicate depth and hierarchy. Keep them subtle as the interface is data-dense and shadows should never overpower content.

| Level | CSS Value | Usage |
|---|---|---|
| None | `none` | Flat surfaces, dividers, inline elements |
| Low | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Default cards, stat tiles |
| Medium | `0 4px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)` | Modals, dropdowns, popovers |
| High | `0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.06)` | Floating overlays, toasts |

**Rules:**
- Never stack multiple shadows on the same element
- Cards always use Low elevation
- Modals always use Medium elevation
- Never use shadows on buttons — use background color changes for hover states instead

---

## Motion and Animation

All transitions must feel deliberate and consistent. Fast enough not to feel sluggish, slow enough not to feel jarring.

### Duration Tokens

| Token | Value | Usage |
|---|---|---|
| Fast | `150ms` | Hover states, icon swaps, button feedback |
| Normal | `250ms` | Panel opens, tab switches, dropdown reveals |
| Slow | `400ms` | Page-level transitions, modal enter/exit |

### Easing

All transitions use `ease-in-out` for consistency:

```css
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```

### Motion Rules

- Hover feedback always uses the Fast token (`150ms`)
- Never animate layout-affecting properties like `width`, `height` or `padding` — animate `opacity` and `transform` only
- Loading spinners use a continuous `360deg` rotation at `600ms` linear
- Always respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## Responsive Breakpoints

V.A.P.O.R is a desktop-primary application — fleet managers typically work on large screens. All views must still reflow correctly at smaller widths.

| Breakpoint | Width | Layout Behaviour |
|---|---|---|
| Mobile | `< 640px` | Single column. Sidebar collapses to bottom nav. Cards stack full-width. |
| Tablet | `640px – 1024px` | 2-column card grid. Sidebar collapses to icon-only rail. Map fills width. |
| Desktop | `> 1024px` | Full layout with expanded sidebar. Default design target. |
| Wide | `> 1280px` | Max-width `1280px` centered. Extra whitespace on sides. |

Use Tailwind CSS breakpoint prefixes consistently: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px).

**Rules:**
- Design mobile-last — desktop is the primary target but mobile must not break
- The map component must always fill its container width at all breakpoints
- Tables must scroll horizontally on mobile rather than truncating data
- Minimum touch target size on mobile: `44x44px`

---

## Accessibility

### Color Contrast

All text must meet WCAG 2.1 AA contrast requirements:

| Combination | Ratio | Standard |
|---|---|---|
| `#FFFFFF` on `#4D7C5F` | 4.8:1 | Passes AA |
| `#2B2D26` on `#F4F3EF` | 12.4:1 | Passes AAA |
| `#2B2D26` on `#FFFFFF` | 15.1:1 | Passes AAA |
| `#FFFFFF` on `#C0392B` | 4.7:1 | Passes AA |
| `#6B6B63` on `#FFFFFF` | 5.7:1 | Passes AA |

### Keyboard Navigation

- All interactive elements must be reachable via `Tab`
- Focus states must be clearly visible using the `fleet-green` ring color
- Modal dialogs must trap focus while open and return focus on close
- Dropdowns must be dismissible via `Escape`

### Screen Reader Compatibility

- All images must have descriptive `alt` attributes
- Icon-only buttons must have `aria-label` attributes
- Form inputs must have associated `<label>` elements
- Loading states must use `aria-live` regions
- Status changes must be announced via `aria-live="polite"`

### WCAG 2.1 AA Compliance Checklist

- Minimum text size: `12px`
- Color is never the only means of conveying information
- Interactive elements have a minimum touch target of `44x44px`
- Error messages are descriptive and suggest corrective action
- Form validation errors are associated with their input fields