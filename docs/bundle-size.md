# stellar-sdk code splitting

`src/lib/soroban.ts` imports `@stellar/stellar-sdk` at module scope, and
`src/app/page.tsx` imported `soroban.ts` the same way — so every visitor
downloaded the full SDK on page load, whether or not the campaign fetch
that actually needs it ever ran (e.g. even a completely static build of
this page, or a future route that doesn't touch campaigns, would still
ship it).

## Fix

`page.tsx` now imports `soroban.ts` with a dynamic `import()` inside a
`loadCampaigns()` helper, called from the mount effect and the "Try Again"
retry handler — the only two places that use it. `Campaign` is still
imported as a type-only import (`import type { Campaign } from
"@/lib/soroban"`), which is erased at compile time and has no effect on
the runtime bundle.

```ts
async function loadCampaigns(): Promise<Campaign[]> {
  const { getCampaigns } = await import("@/lib/soroban")
  return getCampaigns()
}
```

This is the finest-grained split available here: the whole app is a single
client-rendered route (`/`), so there's no unrelated route to push the SDK
onto — the split is at the import boundary around the one thing that
actually needs it, which pulls it out of the chunks referenced by the
initial `<script>` tags and into a separate chunk fetched only once
`loadCampaigns()` actually runs.

No tree-shaking configuration was attempted — `@stellar/stellar-sdk` v16
doesn't ship an ESM build that tree-shakes cleanly under Turbopack/webpack
(confirmed by chunk contents below still including the whole package, not
just `Contract`/`rpc`/`TransactionBuilder`/`scValToNative`/`BASE_FEE`).
Deferring the load was the change actually available without vendoring a
lighter subset of the SDK ourselves.

## Before / after

Measured via `npm run build && npm run start`, then diffing the
`<script src>` tags `curl localhost:3000/` actually returns against file
sizes in `.next/static/chunks`. This is what a browser would fetch on
first load of `/` — not an estimate from a manifest file.

| | Before | After | Change |
|---|---|---|---|
| Initial JS (raw) | 1,047,541 B (1023 KB) | 747,263 B (730 KB) | **−300,278 B (−28.7%)** |
| Initial JS (gzip) | 305,943 B (299 KB) | 229,753 B (224 KB) | **−76,190 B (−24.9%)** |
| stellar-sdk chunk | 482,233 B raw / 134,669 B gzip, **in the initial script list** | 300,485 B raw / 76,197 B gzip, **not in the initial script list** — fetched only when `loadCampaigns()` runs | moved off the critical path |

(The stellar-sdk chunk itself is a different size before/after because
Turbopack bundled it together with some shared vendor code in the "before"
build; the number that matters is that it no longer ships with the
initial page load at all.)

Functionality is unchanged — `getCampaigns()`'s implementation, error
handling, and call sites are untouched; only *when* its module is fetched
changed.

## Regression check

`npm run check-bundle-size` (`scripts/check-bundle-size.mjs`) builds the
app, boots the production server, fetches `/`, sums the byte size of every
chunk its HTML references, and fails if the total exceeds an 830 KB raw
budget (current baseline ~730 KB, with headroom for organic growth but
tight enough to catch something the size of re-inlining stellar-sdk,
~300 KB raw). Wired into `.github/workflows/bundle-size.yml`, which runs it
on every PR to `main`. Ties into Issue 48's broader bundle-size tracking —
this is a single-route regression gate, not a full bundle-analyzer setup.
