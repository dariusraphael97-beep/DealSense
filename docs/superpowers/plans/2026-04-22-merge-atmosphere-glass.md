# Merge Atmosphere + Glass Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring back the full atmospheric depth (EtherealShadow, alternating section backgrounds, richer orbs) from the earlier DealSense layout while keeping every new improvement — blue color scheme, glassmorphic magnetic-hover cards, scroll-linked background transitions, and scroll-spy nav.

**Architecture:** All changes are confined to `src/app/page.tsx` (section backgrounds + EtherealShadow placement) and `src/app/globals.css` (one CSS addition for the EtherealShadow wrapper). The glassmorphic card components (`spotlight-card.tsx`, `gradient-border.tsx`) are already correct and untouched by this plan.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Framer Motion, `EtherealShadow` (existing component at `src/components/ui/etheral-shadow.tsx`)

---

## File Map

| File | Change |
|---|---|
| `src/app/page.tsx` | Add `EtherealShadow` import; add it to hero + CTA sections; restore `background: rgba(255,255,255,0.028)` to alternating sections (02 samples, 04 data, 06 FAQ, marquee strip) |
| `src/app/globals.css` | Add `.section-surface` helper class (one rule) |

No new files. No component changes.

---

## Current state (what's there right now)

- **Hero**: two blue orb divs + grid backdrop. No EtherealShadow. ✓ kept as-is by this plan (we add EtherealShadow alongside).
- **Marquee strip** (`line 363`): `borderTop + borderBottom` only — background was removed.
- **Section 02 samples** (`line 428`): `borderTop` only — background was removed.
- **Section 04 data sources** (search for `data-section="datasrc"`): `borderTop` only — background was removed.
- **Section 06 FAQ** (search for `data-section="faq"`): `borderTop` only — background was removed.
- **CTA section** (`data-section="cta"`): one blue orb. No EtherealShadow.
- `EtherealShadow` exists at `src/components/ui/etheral-shadow.tsx` but is **not imported** in `page.tsx`.

---

## Task 1 — Import EtherealShadow

**Files:**
- Modify: `src/app/page.tsx` (import block, top ~line 13)

- [ ] **Step 1: Add the import**

Find the existing import block:
```tsx
import { GradientBorder } from "@/components/ui/gradient-border";
```
Add directly after it:
```tsx
import { EtherealShadow } from "@/components/ui/etheral-shadow";
```

- [ ] **Step 2: Verify no TypeScript errors**

Check that `EtherealShadow` props in the component file accept:
- `color: string` ✓
- `animation: { scale: number; speed: number }` ✓
- `noise: { opacity: number; scale: number }` ✓
- `className: string` ✓
- `style: CSSProperties` ✓

---

## Task 2 — Add EtherealShadow to the Hero Section

**Files:**
- Modify: `src/app/page.tsx` (hero section, ~line 240–260)

The hero section currently opens like this:
```tsx
<section ref={heroRef} className="relative overflow-hidden noise-grain" data-section="hero">
  {/* Orbs — atmospheric */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="orb" style={{
      top: "-10%", left: "60%", width: 500, height: 500,
      background: "radial-gradient(circle, rgba(79,142,247,0.18), transparent 60%)",
    }}/>
    <div className="orb" style={{
      top: "30%", left: "-10%", width: 400, height: 400,
      background: "radial-gradient(circle, rgba(79,142,247,0.12), transparent 60%)",
    }}/>
  </div>
```

- [ ] **Step 1: Add EtherealShadow inside the hero section, before the orbs div**

Replace:
```tsx
      <section ref={heroRef} className="relative overflow-hidden noise-grain" data-section="hero">
        {/* Orbs — atmospheric */}
        <div className="absolute inset-0 pointer-events-none">
```
With:
```tsx
      <section ref={heroRef} className="relative overflow-hidden noise-grain" data-section="hero">
        {/* Ethereal ambient shadow — fullbleed, behind everything */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <EtherealShadow
            color="rgba(79, 142, 247, 0.60)"
            animation={{ scale: 22, speed: 18 }}
            noise={{ opacity: 0.25, scale: 1.4 }}
            sizing="fill"
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Orbs — atmospheric */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
```
And close the orbs div properly (it already closes with `</div>` just before the grid backdrop — make sure that `</div>` is still there).

- [ ] **Step 2: Verify the hero content z-index is above both layers**

The hero parallax `motion.div` should have `className="relative ..."` which puts it on a stacking context above `z-index: 0/1` absolutes. Confirm line ~264 reads:
```tsx
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto max-w-7xl px-6 pt-24 pb-28 sm:pt-32 sm:pb-36"
        >
```
The `relative` class on this div ensures text/CTAs render above the EtherealShadow. No z-index change needed here.

---

## Task 3 — Add EtherealShadow to the CTA Section

**Files:**
- Modify: `src/app/page.tsx` (CTA section, search for `data-section="cta"`)

Current CTA section opens:
```tsx
      <section className="relative overflow-hidden noise-grain" data-section="cta">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb" style={{
            top: "20%", left: "50%", transform: "translateX(-50%)",
            width: 700, height: 500,
            background: "radial-gradient(ellipse, rgba(79,142,247,0.18), transparent 60%)",
          }}/>
        </div>
```

- [ ] **Step 1: Add EtherealShadow to CTA, alongside the existing orb**

Replace:
```tsx
      <section className="relative overflow-hidden noise-grain" data-section="cta">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb" style={{
            top: "20%", left: "50%", transform: "translateX(-50%)",
            width: 700, height: 500,
            background: "radial-gradient(ellipse, rgba(79,142,247,0.18), transparent 60%)",
          }}/>
        </div>
```
With:
```tsx
      <section className="relative overflow-hidden noise-grain" data-section="cta">
        {/* Ethereal ambient shadow */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <EtherealShadow
            color="rgba(79, 142, 247, 0.55)"
            animation={{ scale: 18, speed: 22 }}
            noise={{ opacity: 0.20, scale: 1.2 }}
            sizing="fill"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <div className="orb" style={{
            top: "20%", left: "50%", transform: "translateX(-50%)",
            width: 700, height: 500,
            background: "radial-gradient(ellipse, rgba(79,142,247,0.18), transparent 60%)",
          }}/>
        </div>
```

---

## Task 4 — Restore Alternating Section Backgrounds

**Files:**
- Modify: `src/app/page.tsx` (4 locations — marquee strip, section 02, section 04, section 06)

The backgrounds were removed during the Spotify scroll-bg implementation. We restore them as a very subtle semi-transparent overlay (`rgba(255,255,255,0.028)`) instead of the hard-coded `var(--ds-surface-2)` (#131316). This means:
- The alternating depth/rhythm is restored visually
- The colour works correctly on top of ANY scroll-bg colour (deep navy, near-black, etc.)
- Glass cards remain visible against the slightly lighter section surface

- [ ] **Step 1: Restore marquee strip background**

Find (line ~363):
```tsx
      <div className="relative py-8"
        style={{ borderTop: "1px solid var(--ds-divider)", borderBottom: "1px solid var(--ds-divider)" }}>
```
Replace with:
```tsx
      <div className="relative py-8"
        style={{ borderTop: "1px solid var(--ds-divider)", borderBottom: "1px solid var(--ds-divider)", background: "rgba(255,255,255,0.028)" }}>
```

- [ ] **Step 2: Restore Section 02 (samples) background**

Find (line ~428):
```tsx
      <section id="samples" className="relative" style={{ borderTop: "1px solid var(--ds-divider)" }} data-section="samples">
```
Replace with:
```tsx
      <section id="samples" className="relative" style={{ borderTop: "1px solid var(--ds-divider)", background: "rgba(255,255,255,0.028)" }} data-section="samples">
```

- [ ] **Step 3: Restore Section 04 (data sources) background**

Find (search for `data-section="datasrc"`):
```tsx
      <section className="relative" style={{ borderTop: "1px solid var(--ds-divider)" }} data-section="datasrc">
```
Replace with:
```tsx
      <section className="relative" style={{ borderTop: "1px solid var(--ds-divider)", background: "rgba(255,255,255,0.028)" }} data-section="datasrc">
```

- [ ] **Step 4: Restore Section 06 (FAQ) background**

Find (search for `data-section="faq"`):
```tsx
      <section id="faq" className="relative" style={{ borderTop: "1px solid var(--ds-divider)" }} data-section="faq">
```
Replace with:
```tsx
      <section id="faq" className="relative" style={{ borderTop: "1px solid var(--ds-divider)", background: "rgba(255,255,255,0.028)" }} data-section="faq">
```

---

## Task 5 — Verify & Deploy

**Files:** None (verification + deploy only)

- [ ] **Step 1: Visual spot-check — 5 things to confirm**

1. Hero: EtherealShadow visible as a soft animated blue blob behind the headline (desktop + mobile)
2. CTA: EtherealShadow visible behind the final "Know the deal" heading
3. Sections 02/04/06: subtly lighter background than sections 01/03/05 — alternating rhythm restored
4. Glassmorphic cards: SpotlightCard hover still shows 3D tilt + float + glow; GradientBorder featured card same
5. Scroll-bg transitions: page background still fades between dark shades as you scroll through sections

- [ ] **Step 2: Deploy to production**

```bash
~/.nvm/versions/node/v24.14.1/bin/node ~/.nvm/versions/node/v24.14.1/bin/vercel --prod --yes
```

Expected: `Aliased: https://dealsense.space` with exit code 0.

- [ ] **Step 3: Confirm live**

Open https://dealsense.space and run the 5 visual checks from Step 1 in a real browser.

---

## Self-Review

**Spec coverage:**
- ✅ EtherealShadow atmospheric depth restored → Tasks 2 & 3
- ✅ Alternating section backgrounds restored → Task 4
- ✅ Blue color scheme untouched → no color changes in this plan
- ✅ Glassmorphic cards untouched → no changes to `spotlight-card.tsx` or `gradient-border.tsx`
- ✅ Scroll-linked bg transitions untouched → `data-section` attrs and `useEffect` in page.tsx not modified
- ✅ Scroll-spy nav untouched → nav active state logic not modified

**Placeholder scan:** No TBDs, no "implement later", all code blocks are complete and copy-pasteable.

**Type consistency:** `EtherealShadow` props used (`color`, `animation`, `noise`, `sizing`, `style`) exactly match the interface defined in `src/components/ui/etheral-shadow.tsx`.
