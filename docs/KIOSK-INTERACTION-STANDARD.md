# Entriss Kiosk Interaction Standard (v1.0)

## 1. Core Principle

The kiosk is a **public-facing, high-traffic, low-attention system**.

Every interaction must optimize for:

* Speed over flexibility
* Clarity over density
* Guided flows over free navigation
* Large-touch usability over precision input
* Zero confusion under time pressure

---

## 2. Layout Rules

### 2.1 Screen density

* Maximum **3 primary actions per screen**
* No dense tables or admin-style layouts
* Avoid multi-column form layouts unless explicitly step-based
* No vertical scrolling on primary kiosk home screen

### 2.2 Hierarchy

Each screen must have:

1. Primary action (dominant CTA)
2. Secondary option (optional alternative)
3. Escape route (Home / Back)

Nothing else should compete visually.

---

## 3. Interaction Rules

### 3.1 Touch-first design

* Minimum touch target: **48px height (absolute minimum)**
* Preferred: **64–80px touch targets**
* All key actions must be usable without keyboard

### 3.2 Flow design

* All complex processes MUST be step-based
* No single-page long forms
* Each step should contain:

  * one intent
  * one decision category

Example:

* Step 1: Personal details
* Step 2: Visit details
* Step 3: Media capture
* Step 4: Review

---

## 4. Navigation Rules

* Kiosk must always have a visible **Home escape**
* No deep nested navigation stacks (>2 levels)
* No hidden routes without visible entry points
* Back action must always preserve state where possible

---

## 5. Visual Design Rules

### 5.1 Typography

* Large, high-legibility fonts
* Avoid small helper text as primary instruction
* Instructions must be readable from 1–2 meters distance

### 5.2 Spacing

* Generous vertical spacing (minimum 16–24px between blocks)
* Use whitespace as structure, not borders

### 5.3 Cards & surfaces

* Cards should represent **actions**, not data tables
* Equal-height interactive cards preferred for choices
* Avoid dense list rows unless in “results-only” screens

---

## 6. State & Feedback Rules

### 6.1 System feedback

Every action must clearly communicate:

* Loading state
* Success state
* Failure state (non-technical language)
* Recovery path

### 6.2 Result screens

* Use full-screen result states for:

  * check-in success
  * check-out success
  * errors requiring attention
* Auto-reset only after visible feedback is shown

---

## 7. Camera / Scanner Rules

* Camera initialization must never block UX permanently
* Always provide fallback path if camera fails:

  * manual lookup
  * booking search
  * return home
* Scanner failure must never break flow continuity

---

## 8. Registration Rules

* Registration must be **multi-step by default**

* Must include:

  * Personal details
  * Visit intent
  * Optional media capture
  * Review step before submission

* No single-page “long form” registration allowed

---

## 9. Data Entry Rules

* Prefer selection over typing wherever possible
* Use:

  * cards
  * segmented controls
  * dropdowns with search
* Minimize keyboard dependency

---

## 10. Performance & Perception

* Every screen must feel instant (<300ms perceived response)
* Use skeletons instead of blank loading states
* Avoid layout jumps during transitions
* Animations must be subtle and functional (not decorative)

---

## 11. Kiosk Identity Rule

The kiosk must feel like:

* airport check-in terminal
* hotel reception desk
* hospital intake station

NOT:

* admin dashboard
* CRM system
* web form application

---

## 12. Hard Constraints (Non-negotiable)

* No backend logic changes from UI work
* No modal stacking for primary flows
* No scroll-heavy home screen
* No ambiguous CTAs
* No mixed intent screens (each screen = one purpose)

---

## 13. Success Definition

A kiosk flow is successful if:

* A first-time user can complete check-in in <30 seconds
* No instruction reading is required beyond titles
* Staff intervention is rarely needed
* Errors always provide a recovery path

---

## Implementation reference

Shared UI tokens: `components/kiosk/kiosk-ui.ts`  
Shell entry: `components/kiosk/kiosk-shell.tsx`
