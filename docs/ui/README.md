# PikPok — UI Design System & Screen Blueprints Reference

> **Notice for AI Agents & Developers:**
> This document is the authoritative textual design system for PikPok. It translates all visual references located in `docs/ui/` (`colors palette.jpeg`, `ScrollMind login.svg`, `fedd ui.jpeg`, and `stats.jpeg`) into comprehensive, machine-readable screen blueprints, color tokens, typography scales, and component specifications.
>
> **Mandatory Agent Rule (per `AGENTS.md` § 1 & § 10):**
> Any agent implementing or modifying client screens, components, or styles must follow the tokens, layout structures, and screen blueprints defined in this file.
>
> *Historical Context Note:* The concept mockups use the legacy project name "ScrollMind" and illustrate out-of-scope features (e.g., Library tab, sharing, multiple-choice buttons). The accepted v1 product name is **PikPok**, navigation uses **Feed / Stats / Profile**, and answer inputs are **short typed text** with server-side fuzzy verification.

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
*Used for:* Primary brand identity, active tabs, streak badges, key action buttons, chart highlight curves, feed background gradient.

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

## 3. Screen Blueprints (Screen-by-Screen Implementation Guide)

### 3.1. Feed Screen (`docs/ui/fedd ui.jpeg`)

The Feed is the core immersive puzzle-solving screen. It uses a high-energy warm coral canvas with high-contrast interactive elements.

```
┌────────────────────────────────────────────────────────────┐
│ [Avatar]   PikPok                              12 🔥       │ Top Bar
├────────────────────────────────────────────────────────────┤
│ ( Quick Math )                                    (LVL 2)  │ Badges Row
│                                                            │
│       ┌────────────────────────────────────┐               │
│       │                                    │  [💡 Hint]    │
│       │        PUZZLE CARD STAGE           │               │
│       │      Structured Prompt Text        │  [>> Skip]    │ Action
│       │                                    │               │ Rail
│       └────────────────────────────────────┘               │
│                                                            │
│       ┌────────────────────────────────────┐               │
│       │        SHORT TYPED INPUT           │               │ Input
│       │     [Enter your answer...] [Go]    │               │ Stage
│       └────────────────────────────────────┘               │
│                                                            │
│                          ● ○ ○ ○ ○                         │ Dots
│                       Swipe for next                       │
├────────────────────────────────────────────────────────────┤
│   ( Feed )          Stats            Profile               │ Bottom Dock
└────────────────────────────────────────────────────────────┘
```

#### Screen Elements & Tokens:
1. **Top Bar:**
   - Background: Smooth vertical gradient transition from `#FFFBF5` into the coral canvas.
   - User Avatar: Circular thumbnail (36px).
   - Brand Wordmark: "PikPok" in bold Plus Jakarta Sans (`#1A1F36` or `#A82E18`, 20px).
   - Streak Counter: "12 🔥" pill on the right (`#1A1F36` text, subtle peach background `rgba(255,255,255,0.3)`).
2. **Main Canvas Background:**
   - Full-bleed vertical gradient: `#FF6B4A` at the top fading to deeper coral `#E64A19` at the bottom.
3. **Upper Info Badges:**
   - Left: Cognitive Domain / Tag badge (e.g., `Quick Math`) — translucent white pill (`rgba(255, 255, 255, 0.22)`), bold white text (`#FFFFFF`, 13px), radius 20px.
   - Right: Difficulty / Level badge (e.g., `LVL 2`) — translucent circular badge (`rgba(255, 255, 255, 0.22)`), 40px diameter, white text (`#FFFFFF`).
4. **Puzzle Card Stage:**
   - Elevated rounded card with subtle drop shadow (`rgba(0, 0, 0, 0.12)`).
   - Fill: Either warm white `#FFFBF5` or translucent card (`rgba(255, 255, 255, 0.25)`).
   - Structured Prompt / Question Text: Bold white text (`#FFFFFF`, 22px–26px, centered).
5. **Floating Action Rail (Right Side):**
   - **Hint Control:** Solid dark navy circle (`#1A1F36`), 48px diameter, white lightbulb icon (`#FFFFFF`, 22px), shadow `rgba(0,0,0,0.2)`. Tapping opens the 3-tier progressive hint sheet.
   - **Skip Control:** Translucent dark circle (`rgba(0, 0, 0, 0.25)`), 44px diameter, white fast-forward icon (`#FFFFFF`, 18px).
6. **Answer Input Stage (v1 Contract Reconciliation):**
   - Instead of legacy multiple-choice buttons, render a rounded input container (`rgba(255, 255, 255, 0.95)` or solid `#1A1F36`).
   - Short typed text entry field with clear submit button in `#1A1F36` or `#FFFFFF`.
7. **Feed Pagination Indicator:**
   - Horizontal pagination dots: 5 pills/dots, active dot is solid white (`#FFFFFF`, width 16px pill), inactive dots are translucent white (`rgba(255, 255, 255, 0.4)`).
   - Swipe helper: Chevron arrow up + text "Swipe for next" (`rgba(255, 255, 255, 0.85)`, 12px).

---

### 3.2. Stats & Progress Screen (`docs/ui/stats.jpeg`)

The Stats screen provides an analytical, clean, and motivating overview of user cognitive growth.

```
┌────────────────────────────────────────────────────────────┐
│ [Avatar]   PikPok                              12 🔥       │ Top Bar
├────────────────────────────────────────────────────────────┤
│ Your Growth                                                │ Section Title
│ Keep pushing your cognitive boundaries.                    │ Subtitle
│                                                            │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │     342      │  │    📊 12     │  │    LVL 7     │       │ Quick Stats
│ │    SOLVED    │  │    STREAK    │  │    BADGE     │       │ Cards
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Weekly Trend                                       ··· │ │ Chart Card
│ │       ╭────────────╮                                   │ │
│ │  ────╯              ╰─────────●                        │ │
│ │   MON   TUE   WED   THU   FRI   SAT   SUN              │ │
│ │   ● Math  ● Logic  ● Patterns  ● Words                 │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ [↗] Your pattern recognition is up 24% this month      │ │ Insight Card
│ │     You're processing logic puzzles 1.2s faster...     │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌───────────────────────────┐  ┌─────────────────────────┐ │
│ │ [🧠] Memory               │  │ [⏱️] Reaction           │ │ Skill Cards
│ └───────────────────────────┘  └─────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│     Feed           ( Stats )          Profile              │ Bottom Dock
└────────────────────────────────────────────────────────────┘
```

#### Screen Elements & Tokens:
1. **Background Canvas:** Solid Warm Cream (`#FFFBF5`).
2. **Title Section:**
   - "Your Growth": Plus Jakarta Sans Bold (28px) in Lavender-Slate (`#9DA7D0` or `#7480B2`).
   - Subtitle: "Keep pushing your cognitive boundaries." in Deep Charcoal (`#3C312E`, 15px).
3. **Quick Metric 3-Card Row:**
   - Card 1 ("Solved"): White container (`#FFFFFF`), rounded 16px, large rust-red number (`#A82E18`, 24px bold), label `SOLVED` in `#1A1F36` (11px semi-bold).
   - Card 2 ("Streak"): Solid coral card (`#FF6B4A`), rounded 16px, white/navy icon + number `📊 12`, label `STREAK` (11px semi-bold).
   - Card 3 ("Badge"): White container (`#FFFFFF`), rounded 16px, emerald green text (`#4CAF50`, 22px bold) `LVL 7`, label `BADGE` in `#1A1F36` (11px semi-bold).
4. **Weekly Trend Card:**
   - Container: Pure white card (`#FFFFFF`), rounded 20px, subtle shadow `rgba(26, 31, 54, 0.05)`, padding 20px.
   - Header: "Weekly Trend" in bold `#1A1F36` (18px) with menu dots (`···`) in `#9C918C`.
   - Chart Area: Smooth curve in `#FF6B4A` / `#A82E18` with soft vertical gradient fill underneath.
   - Curve Dots:
     - Math: `#FF6B4A` (Coral)
     - Logic: `#1A1F36` (Deep Navy)
     - Patterns: `#4CAF50` (Emerald Green)
     - Words: `#A82E18` (Brick Red)
   - Day Labels: Mon through Sun in muted `#766B67`, with active day (`SUN`) highlighted in bold `#A82E18`.
   - Legend Row: Colored bullet points matching cognitive domain colors.
5. **Insight Highlight Card:**
   - Container: Soft lavender surface (`#E3E2FF`), rounded 18px, padding 16px.
   - Icon Badge: 36px circular badge with upward arrow in cool slate `#566290`.
   - Heading: "Your pattern recognition is up 24% this month" in bold `#1A1F36` (15px).
   - Description: "You're processing logic puzzles 1.2s faster than your average." in slate gray (`#566290`, 13px).
6. **Domain Skill Cards Grid:**
   - Memory Card: Light warm cream fill (`#F4EFEA`), rounded 18px, rust gear/brain icon (`#A82E18`), label "Memory" in bold `#1A1F36`.
   - Reaction Card: Soft sage green fill (`#E3EEDC`), rounded 18px, green speedometer icon (`#4CAF50`), label "Reaction" in bold `#1A1F36`.

---

### 3.3. Authentication / Login Screen (`docs/ui/ScrollMind login.svg`)

```
┌────────────────────────────────────────────────────────────┐
│ 9:41                                              📶 🔋    │ Status Bar
├────────────────────────────────────────────────────────────┤
│                                                            │
│                         ┌──────┐                           │
│                      ┌──┤  ★   ├──┐                        │ Brand
│                      │  │ #FF68│  │                        │ Emblem
│                      └──┤  4A  ├──┘                        │
│                         └──────┘                           │
│                                                            │
│                      PikPok                                │ App Wordmark
│               (Smart Daily Micro-Puzzles)                  │ Tagline
│                                                            │
│       Welcome Back.                                        │ Heading
│       Sign in to continue your streak.                     │ Subhead
│                                                            │
│       ┌────────────────────────────────────────────┐       │
│       │ Email address                              │       │ Input
│       └────────────────────────────────────────────┘       │
│                                                            │
│       ┌────────────────────────────────────────────┐       │
│       │ Password                                   │       │ Input
│       └────────────────────────────────────────────┘       │
│                                                            │
│       ┌────────────────────────────────────────────┐       │
│       │ Sign In                                    │       │ Primary CTA
│       └────────────────────────────────────────────┘       │
│                                                            │
│       Don't have an account? Sign up                       │ Footer Link
└────────────────────────────────────────────────────────────┘
```

#### Screen Elements & Tokens:
1. **Background:** Solid Warm Cream (`#FFFBF5`).
2. **Status Bar Icons & Clock:** `#1A1F36`.
3. **Illustrated Brand Emblem (from SVG tokens):**
   - Coral badge: Rounded rectangle (`#FF684A`, rx 10px).
   - Sage accent tile: Angled square (`#E3EEDC`, rx 14px, rotate 10deg) with green icon (`#4CAF50`).
   - Coral accent tile: Angled square (`#FF684A`, rx 16px, rotate -12deg) with cream icon (`#FFFBF5`).
   - Central badge: Circular badge (`#E3E2FF`, 124px diameter) with deep navy illustration (`#1A1F36`).
   - Orbital Ring: Subtle ellipse border in Warm Tan (`#E8DFD7`).
4. **App Wordmark & Tagline:**
   - "PikPok" in bold Plus Jakarta Sans (`#1A1F36`, 28px).
   - Small pill tag in `#1A1F36` with white text.
5. **Headlines:**
   - "Welcome Back": `#1A1F36` bold (32px).
   - Subhead: `#766B67` regular (15px).
6. **Input Fields:**
   - Container background: `#FFFBF5` or `#FFFFFF`, border: `1.5px solid #E8DFD7`, border-radius: 14px, height: 52px.
   - Focused border: `#FF6B4A`.
   - Text: `#1A1F36`, placeholder: `#9C918C`.
7. **Action Button (Sign In):**
   - High-contrast solid navy button: `#1A1F36` background, `#FFFFFF` bold text, border-radius 16px, height: 54px.
8. **Secondary Link:**
   - "Sign up" in bold Coral (`#FF684A`).

---

### 3.4. Navigation Dock (Bottom Tab Bar)

The bottom dock is persistent across main screens (`Feed`, `Stats`, `Profile`).

```
┌────────────────────────────────────────────────────────────┐
│      ┌──────────────────────────────────────────────┐      │
│      │   ╭──────╮                                   │      │
│      │   │  🧭  │       📊            👤            │      │ Floating
│      │   │ Feed │      Stats        Profile         │      │ Dock
│      │   ╰──────╯                                   │      │
│      └──────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
```

#### Dock Specifications:
* **Container:** Floating white card (`#FFFFFF`) or cream bar (`#FFFBF5`) with rounded corners (`28px`–`32px`), elevation shadow `rgba(26, 31, 54, 0.08)`.
* **Active Tab Item:**
  - Background: Solid coral pill (`#FF6B4A`), padding 8px horizontal, 6px vertical, rounded 20px.
  - Icon: Solid white (`#FFFFFF`, 20px).
  - Label: White (`#FFFFFF`, 12px bold).
* **Inactive Tab Item:**
  - Background: Transparent.
  - Icon: Slate navy outline (`#1A1F36` or `#566290`, 20px).
  - Label: Dark charcoal (`#1A1F36` or `#766B67`, 12px medium).

---

## 4. Reconciled Cognitive Domains

Matching `docs/ui/stats.jpeg` to the v1 domain specifications:

| Cognitive Domain | Hex Color | Visual Theme |
|---|---|---|
| **Math / Arithmetic** | `#FF6B4A` | Warm Coral |
| **Logic / Reasoning** | `#1A1F36` | Deep Navy |
| **Pattern Recognition** | `#4CAF50` | Emerald Green |
| **Words / Verbal** | `#A82E18` | Brick Red |
| **Memory** | `#A82E18` / `#F4EFEA` | Rust icon with warm container |
| **Reaction** | `#4CAF50` / `#E3EEDC` | Green icon with sage container |

---

## 5. Accessibility & Neurodivergent Mode Guidelines

* **Default Mode:** Meets WCAG AA contrast standards:
  - Deep Navy `#1A1F36` on Cream `#FFFBF5` = **14.2:1** (AAA).
  - White `#FFFFFF` on Brick Red `#A82E18` = **7.1:1** (AAA).
  - White `#FFFFFF` on Deep Coral `#D84323` = **4.6:1** (AA).
* **Neurodivergent Mode (Private App Setting):**
  - **Sensory Calming:** Replace full-screen vibrant coral background washes in the Feed with calm Warm Cream (`#FFFBF5`) or soft Linen (`#F4EFEA`).
  - **Focused Accents:** Use Coral `#FF6B4A` purely as a focused indicator/active tab highlight rather than a screen-wide flood.
  - **Predictability:** Maintain clean card structures, generous whitespace, clear borders, and readable Plus Jakarta Sans typography.
  - **Motion:** Disable spring bounces, flashing streak banners, and rapid auto-scroll transitions.
