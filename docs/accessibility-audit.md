# WCAG 2.1 AA Accessibility Audit

Scope: Navbar, campaign cards/grid, PledgeModal, RefundModal, CountdownTimer,
ProgressBar, Button — the app's only theme (dark, `--color-background: #0b0c10`).
No light theme exists yet (tracked separately in Issue 59); re-run this audit
against it once it lands.

Method: contrast ratios were computed directly from the token values in
`src/app/globals.css` using the WCAG relative-luminance formula (accounting
for Tailwind opacity utilities, which blend the foreground color toward
whatever sits behind it). Semantic/screen-reader findings came from reading
every component's markup for landmark structure, accessible names, and
keyboard/focus behavior. **This audit was not verified with a live
automated (axe) run or a live VoiceOver/NVDA pass** — the sandboxed
environment this was done in has no browser tooling available. Before
merging, run axe (or the browser DevTools accessibility panel) against the
dev server and do one manual screen-reader pass over both modals to confirm
the fixes below behave as intended.

## Contrast findings (WCAG 1.4.3 / 1.4.11)

| # | Where | Was | Ratio | Needed | Fix |
|---|---|---|---|---|---|
| 1 | Campaign card "`X XLM raised`" (`page.tsx`), RefundModal "Refund amount" | `text-primary` (#6366f1) on `bg-card` / `bg-background/50`-over-card | 3.29 / 3.87 | 4.5 (normal text) | New `text-primary-300` token (#818cf8) → 4.92 on card |
| 2 | Default button (Connect Wallet, Pledge Now, etc.) | white text on `bg-primary` | 4.47 | 4.5 | Button `default` variant now rests on `bg-primary-hover` (6.29), hovers to new `bg-primary-active` (#4338ca, 7.90) |
| 3 | Destructive button (Claim Refund, Try Again) | `text-slate-50` on `bg-red-500` | 3.60 | 4.5 | `bg-red-600` / hover `bg-red-700`, `text-white` → 4.83 |
| 4 | "Failed" badge on campaign image | white text on `bg-red-500/90` | ~3.76 | 4.5 | `bg-red-600/90` → ~4.83 |
| 5 | ProgressBar fill vs. track | `from-primary to-accent` vs `bg-card-border` | 2.31 / 2.61 | 3.0 (non-text) | Fill now `from-primary-300 to-accent-300` → 3.46 / 3.79 |

Passed, no change needed (worth recording so nobody "fixes" them again):
- `text-foreground/50` through `/80` against both `--color-background` and
  `--color-card` all clear 4.5:1 (lowest case, `/50` on card, is 4.50 —
  right at the line; treat as a floor, don't go lower).
- The gradient headline ("Fund the Future on **Stellar**") and the Navbar
  logo wordmark are both large text (≥18.66px bold) by WCAG's definition,
  so they only need 3:1. Both gradient endpoints (`primary` 4.38,
  `accent` 4.94) clear that easily — gradient-clipped text was flagged as a
  likely failure going in, but it's fine everywhere it's currently used
  *because* it's always large/bold. If a gradient treatment is ever applied
  to small text, redo this check — the endpoints don't clear 4.5:1.
- `red-300`/`red-400` notice text and icons in RefundModal's failed-campaign
  banner (7–9.5:1).

Flagged for manual visual QA (can't be computed — depends on runtime image content):
- `CountdownTimer` renders over the campaign photo with only
  `bg-background/50` + blur behind it. Against a bright photo the badge
  text can lose contrast even though the math above (which assumes a solid
  background) checks out. If spot-checking against real campaign images
  shows this, raise the backdrop opacity or give it a solid `bg-card`
  chip instead of a translucent one.

## New design tokens (`globals.css`)

```
--color-primary-active: #4338ca   /* button hover/press, replaces bg-primary-hover as the darkest step */
--color-primary-300:    #818cf8   /* accessible tint of primary for small text/fills on dark surfaces */
--color-accent-300:     #a78bfa  /* accessible tint of accent, same purpose */
```

`--color-primary` / `--color-accent` are unchanged and still correct to use
for large text and purely decorative surfaces (icon chips, glows) — they
just aren't AA-safe for small body text, which is the mistake the campaign
card and refund amount had made.

## Semantic structure / screen-reader findings (WCAG 1.3.1, 4.1.2, 2.4.3)

- **Neither modal had dialog semantics.** No `role="dialog"`, no
  `aria-modal`, no focus management — a screen-reader or keyboard user
  could tab straight through the modal into the page behind it, and focus
  was never moved into the dialog or restored on close. Added a shared
  `src/lib/useDialogA11y.ts` hook (focus-trap, Escape-to-close, initial
  focus, restore-focus-on-close) and wired it into `PledgeModal` and
  `RefundModal`, plus `role="dialog"`, `aria-modal="true"`, and
  `aria-labelledby` pointing at each modal's heading.
- **PledgeModal's close button had no accessible name** (icon-only, no
  `aria-label`) — RefundModal's did. Added `aria-label="Close pledge
  modal"` to match.
- **"Amount to Pledge" label wasn't associated with its input** — a
  `<label>` with no `htmlFor` next to an `<input>` with no `id`. Screen
  readers announce nothing when the field receives focus. Fixed with
  `htmlFor="pledge-amount"` / `id="pledge-amount"`.
- **Success/error state changes inside both modals weren't announced.**
  Added `role="status"` to the success panel and `role="alert"` to the
  error panel in both `PledgeModal` and `RefundModal`, and `role="alert"`
  to the page-level campaign-load error message.
- **Decorative icons weren't hidden from the accessibility tree.** Every
  icon whose meaning is already carried by adjacent text (close buttons,
  loading spinners, the countdown clock, status icons, the inline error
  SVG) now has `aria-hidden="true"`, so screen readers don't announce a
  redundant unlabeled "graphic".
- **CountdownTimer's shorthand text (`3d 4h 22m`) had no accessible
  expansion** — added `aria-label="Time remaining: 3 days, 4 hours, 22
  minutes"` on the container and hid the shorthand + icon from AT.
- **ProgressBar had no accessible semantics at all** — it was a plain
  `<div>` conveying funding progress only visually. Added
  `role="progressbar"` with `aria-valuenow/min/max` and a descriptive
  `aria-label` (defaults to `"N% funded"`, callers can override — the
  campaign grid now passes a fuller label with the raised/goal amounts).
- **Campaign grid used bare `<div>`s for a list of repeated items.**
  Converted to `<ul>`/`<li>` so assistive tech reports it as a list (e.g.
  "list, 3 items") instead of an undifferentiated block, and added a
  visually-hidden `<h2 className="sr-only">Campaigns</h2>` landmark before
  it so the section has a name in the heading outline (`h1` → `h2` →
  card `h3`s stays a clean hierarchy in every state: loading, error, and
  loaded).
- **Navbar's connected-wallet display (desktop) was a `<button>` with no
  `onClick`** — a focusable control that does nothing, which is a dead
  stop for keyboard and screen-reader users. Changed to a non-interactive
  `<span>` styled identically (via `buttonVariants`), keeping the
  `aria-label` with the full wallet address.

## Also fixed (blocking, not accessibility)

`page.tsx` referenced `setSelectedRefundCampaign` / `setRefundModalKey` /
`selectedRefundCampaign` without ever declaring that state, and never
rendered `<RefundModal>` — left over from the Issue 4 claim-refund-flow
merge. This failed `tsc --noEmit` outright (4 errors) and meant the refund
flow, and therefore half of this audit's acceptance criteria ("both
modals"), couldn't be exercised at all. Added the missing `useState` calls
and rendered `RefundModal` alongside `PledgeModal`.

## Not done / follow-ups

- No automated axe run or live screen-reader pass — see the Method note
  above. Do this before merging.
- Issue 59's light theme doesn't exist yet; this audit only covers the
  current hardcoded dark theme. Re-audit contrast once light-theme tokens
  land, since none of the ratios here transfer automatically.
- `CountdownTimer`'s translucent backdrop over campaign photos (see the
  manual-QA flag above) needs a look with real images, not just computed
  ratios against a hypothetical background.
