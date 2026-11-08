---
name: T-Secure
description: A little pause. A safer next step.
colors:
  magenta: "#e20074"
  magenta-dark: "#a80056"
  canvas: "#fcfafc"
  surface: "#ffffff"
  ink: "#342b35"
  muted: "#766a76"
  rose: "#fcebf4"
  line: "#ece5eb"
  warning-surface: "#fff9ef"
  warning-ink: "#895a1e"
  unknown-surface: "#f0eafa"
  unknown-ink: "#7a6092"
typography:
  display:
    fontFamily: "'Manrope Variable', 'Segoe UI', sans-serif"
    fontSize: "42px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Manrope Variable', 'Segoe UI', sans-serif"
    fontSize: "25px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Manrope Variable', 'Segoe UI', sans-serif"
    fontSize: "20px"
    lineHeight: 1.55
  supporting:
    fontFamily: "'Manrope Variable', 'Segoe UI', sans-serif"
    fontSize: "17px"
    lineHeight: 1.8
  label:
    fontFamily: "'Manrope Variable', 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 750
    lineHeight: 1.7
rounded:
  chip: "5px"
  field: "8px"
  button: "9px"
  nav: "10px"
  icon: "12px"
  surface: "14px"
  feature: "16px"
spacing:
  tight: "8px"
  control-y: "12px"
  compact: "16px"
  control-x: "20px"
  group: "24px"
  panel: "28px"
  roomy: "32px"
  workspace: "48px"
components:
  button-primary:
    backgroundColor: "{colors.magenta}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.magenta-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#4e3b4b"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  nav-active:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.magenta-dark}"
    rounded: "{rounded.nav}"
    padding: "12px 16px"
  surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "28px"
---

# Design System: T-Secure

## Overview

**Creative North Star: "A calm community-service guide"**

T-Secure uses familiar web controls, generous reading space, and a reassuring voice. Its pale rose surfaces and magenta actions retain the T-Mobile association without turning a protection task into an alarm-heavy dashboard.

The system is primarily flat. Clear headings, readable guidance, and grounded evidence lead; decorative interface geometry stays secondary. Simulation labels and analysis-source explanations are part of the visible interface.

**Key Characteristics:**

- Clear task hierarchy and familiar controls.
- Large essential reading text at every breakpoint.
- White and rose surfaces with a purposeful magenta accent.
- Written risk labels, evidence, and verification actions together.
- Explicit distinctions between demonstrations and connected analysis.

## Colors

Magenta directs action and selection; subdued plum text provides the reading foundation. Amber supports warnings without relying on color alone.

### Primary

- **T-Secure Magenta:** primary actions, brand mark, selected switches, focus outlines, and the T-Life concept header.
- **Deep Magenta:** primary hover and emphasized links.

### Secondary

- **Warning Paper and Amber Ink:** high-risk analysis panels and warning badges.
- **Soft Lilac and Plum:** unknown/incomplete analysis state.

### Neutral

- **Rose-tinted Canvas:** application workspace.
- **White Surface:** navigation rail, forms, transcript, and account panels.
- **Deep Plum Ink:** headings and essential content.
- **Muted Plum:** supporting text.
- **Pale Rose:** selected navigation and assessment emphasis.
- **Quiet Divider:** thin boundaries and row separation.

**The Written Warning Rule.** State colors accompany explicit labels, explanations, and evidence; they never carry risk meaning alone.

## Typography

**Display and Body Font:** self-hosted Manrope Variable, followed by Segoe UI and sans-serif fallbacks.

Rounded letterforms and measured weight changes keep the interface approachable. Paragraphs have a maximum measure of 72ch; essential guidance is retained at the body reading size rather than shrunk to fit a panel.

### Hierarchy

- **Display:** main page headings use the frontmatter display style. Home uses 46px on the standard desktop, 52px on wide screens, and 35–38px on mobile.
- **Title:** section headings use the title style, with context-specific headings around 20–28px.
- **Body:** essential introductions, call transcripts, warning explanations, assessment advice, and recovery descriptions use the body size across breakpoints.
- **Supporting:** secondary help and trusted-contact descriptions use the supporting size.
- **Label:** action links and explanatory source/coverage text commonly use 14px. Form fields use 16px; desktop navigation uses 16px and mobile navigation 14px.
- **Score:** large tabular numerals are reserved for the requested vulnerability assessment and accompanied by coverage, date, and a sample-data explanation.

**The Reading Size Rule.** Essential protective guidance remains 20px at every breakpoint; shorten or reflow content before reducing its reading size.

## Layout

The desktop shell has a sticky white navigation rail (256px) and a bounded workspace (maximum 1536px) with 48px side padding. Rail widths reduce at the intermediate breakpoints. A light top bar separates workspace context from page content.

The home surface uses an asymmetric primary task area plus a trusted-contact column. Call and message tasks pair their work area with a guidance area. Assessment summaries pair score interpretation with evidence coverage.

At 1020px, many task grids become a single primary column. At 900px, the rail becomes a compact header with an accessible Menu button. Opening it reveals labeled destinations in two columns, including Settings and the T-Life preview. Selecting a destination closes it. Account context becomes compact and assessment summaries stack. This layout also covers landscape phones. At 440px, optional phone-preview geometry is hidden and helper areas stack. Workspace padding reduces to 18–22px on narrow screens.

**The Room to Read Rule.** Preserve reading space by stacking panels and wrapping action rows; do not compress the essential copy.

## Elevation & Depth

Thin boundaries and tonal surfaces establish most hierarchy. Soft offset shadows are used sparingly for the phone-preview interface, notifications, and primary-button hover. Main application panels remain flat.

### Shadow Vocabulary

- **Primary hover:** `0 4px 12px #a4004e17`.
- **Notification:** `0 6px 25px #35252f24`.
- **Phone preview:** `0 12px 32px #7b2e5920`.

## Shapes

Controls use gently curved corners, with small radii for chips and fields and larger radii for contained work areas. The shield logo has its own rounded shield-like silhouette. Circular avatars identify people without suggesting identity verification.

## Components

### Buttons

Primary buttons use magenta with white type; secondary buttons use a white surface and a quiet plum boundary. The standard button is at least 50px tall, with a 16px label. Focus uses a three-pixel magenta outline with a four-pixel offset. Disabled controls reduce opacity and show a noninteractive cursor.

The destructive call-ending button uses a deep red surface with white type. Text actions remain explicit labels rather than icon-only affordances.

### Inputs / Fields

White fields have a thin boundary, rounded field corners, and comfortable internal padding. Focus shifts the boundary to magenta and adds a soft outline. Labels are visible outside fields; placeholders are supplementary.

Advanced analysis uses a labeled checkbox switch inside a 64px × 48px click target. The signup opt-in is initially unchecked.

### Navigation

Default items use muted plum; selected items use pale rose, deep magenta, and an active indicator. Icons use consistent inline SVG strokes. Mobile Settings and T-Life links retain accessible names even when their visible text is hidden, and their controls have at least 48px targets.

### Chips and State Labels

Chips are compact, gently rounded labels. Risk badges combine a consistent icon with one of four written states: “No clear warning signs,” “More information needed,” “Pause and verify,” or “High-risk warning.”

### Work Surfaces

Forms, contacts, transcripts, and analysis results use bounded white surfaces. Amber and lilac result variants carry warning or incomplete states. Internal padding commonly ranges from 24–34px, reducing to 20–24px on mobile.

### Transcript and Evidence

Caller and sample-user turns are visually distinct, with explicit speaker labels. Grounded evidence receives an amber highlight. The warning panel keeps the reason, quoted evidence, analysis source, and independent-verification action close together.

### Assessment and Demonstration States

The score appears with its denominator, evidence counts, sample window, update time, and readable “Demo estimate based on sample conversations” explanation. Insufficient information has a written empty state rather than a zero. The T-Life header and concept badge frame the same assessment as a prototype view.

### Motion

The phone preview has a small animated waveform; an in-progress call has a pulse. Buttons and switches have brief state transitions. The reduced-motion preference disables animations and transitions and removes smooth scrolling.

## Do's and Don'ts

### Do:

- **Do** keep essential protective guidance at 20px across breakpoints.
- **Do** keep primary controls at least 48px in their active target area.
- **Do** pair warnings with written reasons, source labels, and verification actions.
- **Do** retain visible sample-data and concept labels beside demo results.
- **Do** use the shared inline SVG icon vocabulary and visible focus treatment.

### Don't:

- **Don't** use color alone to communicate risk.
- **Don't** make a sample score look like a verified prediction about the real user.
- **Don't** replace an insufficient-information state with zero.
- **Don't** reduce essential reading text to fit a narrow layout.
- **Don't** promote decorative preview geometry into the primary task.

