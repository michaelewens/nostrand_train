# Design Guidelines: NYC Subway Departure Tracker

## Design Approach

**Reference-Based**: Modern MTA digital departure boards—clean, scannable, and instantly comprehensible. Think contemporary subway signage: crisp typography, official MTA blue for routes, and a minimalist interface that prioritizes information clarity.

**Key References**:
- Modern MTA digital departure displays
- Official MTA branding and color system
- Contemporary transit information design
- Clean, functional UI patterns

**Design Principles**:
- Information clarity: Data is instantly scannable and easy to read
- Clean and minimal: Modern typography with generous whitespace
- Official branding: Uses authentic MTA blue (#0039A6) for route indicators
- Functional design: Every element serves a purpose

---

## Typography

**Font Stack**: 
- Primary: `Open Sans, sans-serif` (clean, modern, readable)
- Monospace: `Menlo, monospace` (for countdown timers)
- System fallback: `-apple-system, BlinkMacSystemFont, sans-serif`

**Hierarchy**:
- Station Header: text-3xl, font-bold
- Route Badges: text-4xl, font-black (circular badges)
- Countdown Times: text-4xl, font-bold, tabular-nums
- Destination: text-lg, font-medium
- Direction: text-sm
- Timestamps: text-xs

**Typography Treatment**: Title case for most text. Bold weights for emphasis. Tabular numerals for countdown consistency.

---

## Layout System

**Spacing Units**: Tailwind 2, 4, 8, 12, 16
- Compact padding: p-4 for cards and sections
- Thin borders: border (1px default)
- Moderate gaps: gap-4 between elements

**Container Structure**:
- Centered layout with max-w-2xl mx-auto
- Full viewport (min-h-screen)
- Sticky header with simple bottom border
- Clean card container for departure list

**Visual Rhythm**: Light borders, moderate padding, and clear visual separation between sections create a clean, scannable interface.

---

## Component Library

### Header
- Station name in massive pixelated typography (text-4xl, uppercase, tracking-wide)
- Decorative geometric border (stepped pattern, subway tile motif)
- Route indicators as large circular badges
- "LAST UPDATED" timestamp in small LED-style text
- Thick bottom border (border-b-8) to separate from content

### Departure Board Cards
Large, chunky cards mimicking vintage LED displays:
- Thick borders (border-4) around each card
- Generous internal padding (p-8)
- Layout: `[Giant Route Badge] [DESTINATION TEXT] [HUGE COUNTDOWN]`
- Route badge: Massive circular element (w-20 h-20) with bold letter
- Countdown: Monospace, pixelated numbers (text-5xl)
- Card dividers: Thick horizontal rules (border-t-4) with geometric accents

**Board Structure**:
- Display 5-6 departures in chunky list
- Each row feels like a mechanical flip board segment
- Subtle texture/grain overlay on cards (optional background pattern)

### Geometric Decorative Elements
Incorporate 1980s subway tile patterns:
- Stepped corner treatments on header/footer
- Horizontal stripe patterns as section dividers
- Small geometric accent blocks (squares, diamonds) in margins
- Mosaic-inspired borders using Tailwind utilities

### Empty State
- Large pixelated train icon (built from box characters or simple shapes)
- "NO TRAINS SCHEDULED" in bold LED typography
- Chunky bordered container

### Loading State
- Animated "LOADING..." text with blinking cursor effect
- Pixelated skeleton blocks
- Maintains chunky layout structure

### Footer
- Decorative geometric border pattern (mirror of header)
- "MTA • REAL-TIME DEPARTURES • 1980s STYLE" in small caps
- Thick top border (border-t-8)

---

## Data Display Patterns

**Time Format**:
- Arriving: "ARRIVING NOW" (uppercase, bold)
- 1-59 min: "X MIN" (large monospace digits)
- >60 min: "HH:MM" (24-hour LED display style)

**Route Badges**: 
- Giant circular containers (w-20 h-20 or larger)
- Thick borders (border-4)
- Massive letters (text-6xl, font-black)
- Apply vintage subway line styling

**Visual Hierarchy**: Use size and weight dramatically—route letters dominate, countdown times are huge and clear, destinations are bold uppercase.

---

## Interactions

**Minimal Animation**: 
- No smooth transitions—instant updates like mechanical boards
- Optional subtle "flicker" on data update (brief opacity shift)
- Refresh icon rotates once on click (mechanical flip feel)
- No hover effects—this is a display board, not interactive UI

**Refresh**: Auto-refresh every 30s with small rotating indicator and timestamp update.

---

## Responsive Behavior

**Mobile (320px+)**:
- Full-width chunky cards
- Slightly smaller typography (text-3xl for routes, text-2xl for times)
- Maintain thick borders and generous padding

**Desktop (768px+)**:
- Larger typography fully displayed
- Max-w-4xl container centered
- Same single-column layout (no multi-column for clarity)

---

## Images & Assets

**No hero image**—this is immediate data display. The interface starts with the departure board.

**Icons**: Use Heroicons (outlined style) via CDN:
- `arrow-path` for refresh
- Custom geometric train icon for empty state (built from simple shapes/Unicode)
- Location pin for station marker

**Decorative Graphics**: Simple geometric patterns using Tailwind borders and spacing:
- Subway tile border patterns (repeated small squares)
- Stepped corner accents (using nested divs with borders)
- Horizontal stripe dividers

---

## Accessibility

- High contrast chunky typography ensures readability
- Semantic HTML: `<header>`, `<main>`, `<ul>` for departures
- ARIA labels: "Route A train", "Arriving in 2 minutes"
- Focus states: Thick outline (ring-4) on refresh button
- Screen reader announcements on data updates
- Tabular-nums for consistent number width

---

## Special Considerations

**Retro Digital Display Feel**:
- Embrace pixelation: Use monospace fonts, chunky elements
- Instant updates: No fade transitions, data snaps in place
- Limited palette aesthetic: Work within retro constraint
- Texture: Consider subtle noise/grain overlay on backgrounds

**Real-Time Handling**:
- "DELAYED" indicator in bold uppercase with thick border
- Service alerts as chunky banner at top (border-4, p-6)
- Data appears/disappears instantly like mechanical boards

**Performance**: Keep DOM simple despite heavy visual treatment. Use CSS borders and spacing for decoration rather than images.