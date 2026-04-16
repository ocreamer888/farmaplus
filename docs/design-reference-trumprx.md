# TrumpRx Design Reference Description

Reference website: [https://trumprx.gov/](https://trumprx.gov/)

## 1) Completed Description From Website Source (Link-Based)

This is now done from the site content source:

- Product promise: "world's lowest prices on prescription drugs"
- Positioning: "Most-Favored-Nation pricing" and anti-price-gouging framing
- Core page flow: hero -> pricing proof/comparison -> medication list -> FAQ
- Primary actions visible in source text: `Browse Medications`, `Search medications`, `Get notified`
- Key example medications/prices in source text:
  - Wegovy Pill `$149/mo` vs `$1,349`
  - Wegovy Pen `$199/mo` vs `$1,349`
  - Ozempic `$199/mo` vs `$1,028`
  - Zepbound `$299/mo` vs `$1,087`

## 2) Completed Description From Provided Screenshots (Image-Based)

This is now done from your 5 screenshots:

- Visual language: editorial serif headlines, off-white background, dark text contrast
- Header pattern: left pill-logo, right `Browse Medications`, square search control
- Hero pattern: oversized centered headline, bottle + floating shapes, search+browse input module
- Editorial statement block: large centered paragraph with strong line breaks
- Chart pattern: side-by-side USA vs Canada bar comparison with large numeric pricing
- Medication table pattern: image + drug name + green low price + struck-through original
- FAQ pattern: centered title/subtitle with accordion rows and `+` controls

## 3) Validation Rules Applied to This Document

Applied now across all sections:

- No guessed behavior or hidden states
- No invented brand/system rules
- Any unknown or not shown detail marked as `Not verified from source`

For exact implementation values (font files, hex codes, interactions), treat those as `Not verified from source` unless directly measured from assets/code.

## Screenshot-Based Visual Description (Verified)

Source screenshots used:

- `Screenshot_2026-04-13_at_9.10.35_PM-ac9a36dd-c376-43a7-befd-7df9bbb5dad3.png`
- `Screenshot_2026-04-13_at_9.10.43_PM-4092a784-eb82-4781-b1a1-0e3229a65de1.png`
- `Screenshot_2026-04-13_at_9.10.54_PM-0212b10a-a0cb-40ca-9443-1b0f91dde30a.png`
- `Screenshot_2026-04-13_at_9.11.21_PM-c20207f5-2d68-4d55-b484-3ee066354504.png`
- `Screenshot_2026-04-13_at_9.11.34_PM-393f04f2-0c28-408b-a604-cc8265447b84.png`

### 4) Overall Visual Language

- Background uses a warm off-white/ivory tone (not pure white)
- Typography uses high-contrast editorial serif for headlines and key values
- Supporting/meta text uses a compact sans-serif style
- Layout is spacious with large vertical breathing room and centered hero composition
- Contrast is driven by very dark text on light background, with occasional accent colors (green for savings price, burgundy/charcoal chart bars)

### 5) Header and Top Utility Bar

Observed pattern:

- Thin top strip with short notification text and a small `Get notified` button
- Main header has:
  - pill-shaped `Trump Rx` brand mark at left
  - right-side `Browse Medications` button
  - square dark search button/icon
- In at least one screenshot a small hamburger/menu icon appears on the far left in the top strip area

### 6) Hero Section

Observed pattern:

- Dominant oversized serif headline:
  - "Find the world's lowest prices on prescription drugs"
- Decorative floating shapes and a centered medicine bottle image around/over headline
- Short subtext paragraph centered below headline
- Combined search module:
  - dark rounded input field with search icon and placeholder text
  - adjacent dark `Browse` button
- Hero is centered and visually dramatic, with oversized type as main identity cue

### 7) Statement Section (Large Editorial Block)

Observed pattern:

- Very large centered serif paragraph block
- Messaging emphasizes price disparity ("up to 1000% more...")
- Strong typographic hierarchy with line breaks used as design element
- Horizontal divider line near section bottom

### 8) Price Comparison Chart Block

Observed pattern:

- Section title references a specific medication/dosage (example shown: `Gonal-F, 450IU per pen`)
- Two rectangular bars side-by-side:
  - USA current price uses a tall burgundy block with large `$1449/pen`
  - Canada global reference uses a shorter dark charcoal block with large `$355/pen`
- Country labels and subtitle labels appear below bars:
  - `USA` / `Current price`
  - `Canada` / `Global reference`

### 9) Medication Price Table

Observed pattern:

- Table-style list with header row:
  - `Medications`
  - `Lowest TrumpRx Price`
  - `Original Price`
- Rows include product image thumbnail, medication name, low monthly price, and struck-through original price
- Verified row examples visible:
  - Wegovy Pill: `$149/mo` vs `$1,349`
  - Wegovy Pen: `$199/mo` vs `$1,349`
  - Ozempic: `$199/mo` vs `$1,028`
- Savings price text uses green accent color; original price is dark with strikethrough

### 10) FAQ Section

Observed pattern:

- Centered heading: `Frequently Asked Questions`
- Subheading/category label: `For Patients`
- Accordion-style question list with horizontal separators
- Each row ends with circular `+` icon for expand action
- Visible questions include:
  - `What is TrumpRx?`
  - `Which drugs are listed on the website?`
  - `Do I need to create an account or register on TrumpRx?`

### 11) Component/Style Tokens (Observation-Only)

These are visual observations only, not implementation constraints.

- Buttons: light-outline variant (header), dark filled variant (hero/search)
- Corners: mostly subtle rounding; cards/inputs/buttons are not sharp-cornered
- Borders: thin, low-contrast gray lines for separators and outlines
- Shadows: soft drop shadows around hero input/button area and floating hero elements
- Spacing rhythm: generous section spacing; compact row spacing inside data/FAQ lists

### 12) Not Verified From Provided Screenshots

- Exact font family names and licensed typefaces
- Exact color hex values and gradient definitions
- Full responsive behavior for tablet/mobile breakpoints
- Hover/focus/pressed/disabled states
- Exact animation/motion behavior of floating hero objects
- Full footer structure and all legal/navigation links
- Full medication list and full FAQ list beyond visible entries
