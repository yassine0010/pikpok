# PikPok — UI Design System & Color Palette Reference

> **Notice for AI Agents & Developers:**
> This document translates the visual references located in `docs/ui/` (`colors palette.jpeg`, `ScrollMind login.svg`, `fedd ui.jpeg`, and `stats.jpeg`) into an authoritative, machine-readable design specification.
> 
> *Historical context note (per AGENTS.md § 10):* The concept mockups use the legacy name "ScrollMind" and illustrate out-of-scope features (e.g. Library tab, sharing, multiple-choice buttons). The accepted v1 product name is **PikPok**, navigation uses **Feed / Stats / Profile**, and answer inputs are **short typed text**.

---

## 1. Master Palette Tokens

The visual identity is built on a warm, organic palette: warm cream neutral background, energetic coral primary, deep ink navy secondary, and fresh green tertiary.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIMARY (Warm Coral)         │ #FF6B4A (alt: #FF684A)                       │
│ SECONDARY (Deep Ink Navy)    │ #1A1F36                                      │
│ TERTIARY (Emerald Green)     │ #4CAF50                                      │
│ NEUTRAL / CANVAS (Linen)     │ #FFFBF5                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1. Color Tonal Scales (10-Step Ramps)

#### Primary — Warm Coral (`#FF6B4A` / `#FF684A`)
*Used for:* Primary brand identity, active tabs, streak badges, key action buttons, chart highlight curves.

| Token | Hex | Usage |
|---|---|---|
| `primary.900` | `#4A1208` | Deepest dark rust / text on dark coral |
| `primary.800` | `#7A1E0D` | Dark brick shade |
| `primary.700` | `#A82E18` | Brick red (primary solid button state in palette) |
| `primary.600` | `#D84323` | Deep coral hover / pressed state |
| **`primary.500` (Base)** | **`#FF6B4A`** | **Core primary brand accent & active navigation pill** |
| `primary.400` | `#FF856B` | Light coral highlight |
| `primary.300` | `#FFA38E` | Soft peach tint |
| `primary.200` | `#FFC4B7` | Delicate blush container border |
| `primary.100` | `#FFE4DE` | Pale coral pill background |
| `primary.50` | `#FFF3F0` | Ultra-light coral wash |

---

#### Secondary — Deep Ink Navy (`#1A1F36`)
*Used for:* Primary headings, high-contrast inverted buttons, answer option pills, hint button, default icons.

| Token | Hex | Usage |
|---|---|---|
| `secondary.900` | `#0E111E` | Deepest midnight black |
| **`secondary.800` (Base)** | **`#1A1F36`** | **Core secondary color, headings, dark buttons, text primary** |
| `secondary.700` | `#2A3150` | Dark slate navy |
| `secondary.600` | `#3D476E` | Slate container border / active lines |
| `secondary.500` | `#566290` | Cool slate muted icons |
| `secondary.400` | `#7480B2` | Subtitle text / chart logic legend |
| `secondary.300` | `#9DA7D0` | Lavender slate text ("Your Growth" header) |
| `secondary.200` | `#C7CDE6` | Soft periwinkle divider |
| `secondary.100` | `#E3E2FF` | Lavender badge & insight card surface tint |
| `secondary.50` | `#F2F4FD` | Ultra-light cool surface wash |

---

#### Tertiary — Emerald Green (`#4CAF50`)
*Used for:* Level badges, success feedback, pattern recognition domain, positive metric delta.

| Token | Hex | Usage |
|---|---|---|
| `tertiary.900` | `#123E15` | Deep forest dark |
| `tertiary.800` | `#1B5E20` | Dark pine green |
| `tertiary.700` | `#2E7D32` | Forest green |
| `tertiary.600` | `#388E3C` | Rich leaf green |
| **`tertiary.500` (Base)** | **`#4CAF50`** | **Core tertiary green, level badge, pattern indicator** |
| `tertiary.400` | `#66BB6A` | Light emerald accent |
| `tertiary.300` | `#81C784` | Mint highlight |
| `tertiary.200` | `#A5D6A7` | Soft green border |
| `tertiary.100` | `#E3EEDC` | Sage container (Reaction skill card & badge fill) |
| `tertiary.50` | `#F1F8E9` | Light sage wash |

---

#### Neutral & Canvas (`#FFFBF5`)
*Used for:* Root background, card surfaces, borders, body copy, and muted text.

| Token | Hex | Usage |
|---|---|---|
| `neutral.900` | `#1A1F36` | Headings & high-emphasis text |
| `neutral.800` | `#3C312E` | Deep warm charcoal (body copy on cream) |
| `neutral.700` | `#524541` | Secondary body text |
| `neutral.600` | `#766B67` | Warm muted gray (subtitles, secondary info) |
| `neutral.500` | `#9C918C` | Placeholder text, inactive tab labels |
| `neutral.400` | `#C4BBB5` | Border strong |
| `neutral.300` | `#E0D8D1` | Standard card border |
| `neutral.200` | `#E8DFD7` | Subtle border, divider, orbit ring |
| `neutral.150` | `#EFEBE4` | Secondary button background, search bar surface |
| `neutral.100` | `#F4EFEA` | Card variant surface (Memory skill card) |
| **`neutral.50` (Canvas)** | **`#FFFBF5`** | **Root screen background (warm linen/cream)** |
| `neutral.0` | `#FFFFFF` | Elevated card background, pure white surface |

---

## 2. Typography Specification

As defined in `docs/ui/colors palette.jpeg`, the primary typeface across all components is:

* **Font Family:** `Plus Jakarta Sans` (weights: `400` Regular, `500` Medium, `600` SemiBold, `700` Bold)
* **Fallback Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

| Role | Weight | Color | Suggested Size / Line Height |
|---|---|---|---|
| **Headline / H1** | Bold (700) | `#1A1F36` | 28px–32px / 1.2 |
| **H2 / Section Title** | SemiBold (600) | `#1A1F36` | 20px–24px / 1.3 |
| **Card Header** | Bold (700) | `#1A1F36` | 18px–20px / 1.3 |
| **Subhead / Accent** | SemiBold (600) | `#9DA7D0` or `#FF6B4A` | 14px–16px / 1.4 |
| **Body (Default)** | Regular (400) / Medium (500) | `#3C312E` or `#1A1F36` | 15px–16px / 1.5 |
| **Body (Muted)** | Regular (400) | `#766B67` | 13px–14px / 1.5 |
| **Label / Button Text** | SemiBold (600) | `#FFFFFF` or `#1A1F36` | 14px–15px / 1.2 |
| **Caption / Badge** | Medium (500) | `#766B67` or `#1A1F36` | 11px–12px / 1.2 |

---

## 3. UI Component Patterns

### 3.1. Buttons & Controls

| Variant | Background | Text / Icon Color | Border | Border Radius |
|---|---|---|---|---|
| **Primary Solid** | `#A82E18` or `#FF6B4A` | `#FFFFFF` | None | `14px`–`16px` |
| **Inverted (Dark)** | `#1A1F36` | `#FFFFFF` | None | `14px`–`16px` |
| **Secondary (Muted)** | `#EFEBE4` | `#1A1F36` | None | `14px`–`16px` |
| **Outlined** | `#FFFBF5` | `#1A1F36` | `1.5px solid #C4BBB5` | `14px`–`16px` |
| **Action Pill (Label)** | `#FF6B4A` | `#FFFFFF` | None | `9999px` (Full Pill) |
| **Action Circle** | `#1A1F36` | `#FFFFFF` | None | `9999px` (Circle) |

### 3.2. Floating Controls & Badges (Feed Screen)
* **Hint Button:** Circular dark navy button (`#1A1F36`) with white lightbulb icon (`#FFFFFF`).
* **Level Badge:** Pill badge with translucent white background (`rgba(255, 255, 255, 0.35)`) and bold white text (`LVL 2`).
* **Category Pill:** Pill badge (`Quick Math`) in translucent white (`rgba(255, 255, 255, 0.2)`).

### 3.3. Cards & Containers
* **White Card (Standard):** `#FFFFFF` fill, `16px`–`20px` border radius, subtle warm drop shadow (`rgba(26, 31, 54, 0.05)`), optional border `1px solid #E8DFD7`.
* **Insight Card (Lavender):** `#E3E2FF` tint fill, `#1A1F36` title, `#566290` description.
* **Skill Card (Reaction / Green):** `#E3EEDC` sage green fill, `#4CAF50` icon.
* **Skill Card (Memory / Warm):** `#F4EFEA` linen fill, `#A82E18` icon.
* **Feed Canvas:** Vibrant warm coral gradient (`#FF6B4A` at top to `#E64A19` at bottom), question card in white/translucent card with white text.

### 3.4. Navigation Dock (Bottom Tab Bar)
* **Bar Container:** White (`#FFFFFF`) or Warm Cream (`#FFFBF5`) pill dock with rounded corners (`28px`–`32px`).
* **Active Tab Item:** Solid coral pill (`#FF6B4A`), white icon (`#FFFFFF`), white or coral label.
* **Inactive Tab Item:** Transparent background, dark slate outline icon (`#1A1F36`), dark label (`#1A1F36` or `#766B67`).

---

## 4. Cognitive Domain / Chart Legend Colors

As visualized in `docs/ui/stats.jpeg`:

| Cognitive Domain | Hex Color | Role |
|---|---|---|
| **Math / Arithmetic** | `#FF6B4A` | Coral Orange |
| **Logic / Reasoning** | `#1A1F36` | Deep Navy |
| **Pattern Recognition** | `#4CAF50` | Emerald Green |
| **Words / Verbal** | `#A82E18` | Brick Red |
| **Memory** | `#A82E18` / `#F4EFEA` | Rust icon with warm container |
| **Reaction Time** | `#4CAF50` / `#E3EEDC` | Green icon with sage container |

---

## 5. Accessibility & Neurodivergent Mode Guidelines

* **Default Mode:** Meets WCAG AA contrast (e.g. `#1A1F36` on `#FFFBF5` yields **14.2:1** contrast; `#FFFFFF` on `#A82E18` yields **7.1:1** contrast).
* **Neurodivergent Mode (Private App Setting):**
  - Reduce visual vibration: Replace intense pure coral background washes with calm `#FFFBF5` or muted `#F4EFEA`.
  - Use coral `#FF6B4A` purely as a focused indicator/accent rather than full-screen fill.
  - Maintain predictable card layouts and clear readable Plus Jakarta Sans typography.
  - Disable rapid animations and flash effects.
