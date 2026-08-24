# Feature Flags — Stellar Raise Interface

This document describes the feature-flag system used for progressive rollout
of in-progress features. The system supports **boolean** (on/off) and
**percentage-rollout** (gradual enablement by user) flag types, all
config-driven and evaluated client-side.

---

## Adding a New Flag

1. **Open** `src/lib/feature-flags.ts`.
2. **Locate** the `FLAG_REGISTRY` object (around line 58).
3. **Add a new entry** using the pattern below:

```ts
// ---- <Issue / Feature Name> ----
// <Short description of what the flag controls>
"<kebab-case-flag-key>": {
  type: "boolean",            // or "percentage-rollout"
  enabled: true,              // only for boolean flags
  // -- OR for percentage-rollout --
  percentage: 25,             // 0–100, only for percentage-rollout flags
},
```

4. **Document the flag** here in this file in the **Flag Registry** section.
5. **Use the flag** in your component:

```tsx
import { isFlagEnabled } from "@/lib/feature-flags"

// Non-React code (utility, lib)
if (isFlagEnabled("my-flag-key", walletAddress)) { ... }

// React component
const { enabled } = useFeatureFlag("my-flag-key", walletAddress)
```

---

## Flag Types

### Boolean
| Property  | Type      | Description                          |
|-----------|-----------|--------------------------------------|
| `type`    | `"boolean"` | Discriminant for the flag type      |
| `enabled` | `boolean`   | `true` = feature active for everyone |

Best for: fully-rolled-out or still-in-dev features toggled via config-only.

### Percentage Rollout
| Property     | Type      | Description                                       |
|--------------|-----------|---------------------------------------------------|
| `type`       | `"percentage-rollout"` | Discriminant for the flag type    |
| `percentage` | `number`  | 0–100. % of users (by stable seed hash) who see the feature |
| `seedKey`    | `string` (optional) | Override the user-identifier key (default: wallet address or anonymous session hash) |

Best for: gradual rollouts, A/B testing, canary releases.

---

## Flag Registry

| Flag Key            | Type                | Config                       | Description                                                  | Removal Criteria                               |
|---------------------|---------------------|------------------------------|--------------------------------------------------------------|------------------------------------------------|
| `indexer-migration` | `percentage-rollout`| `percentage: 10`             | Migrate contract-read calls from deprecated Soroban RPC      | Indexer endpoint stable, old RPC deprecated    |
|                     |                     |                              | `simulateTransaction` flow to the new indexer endpoint.      |                                                |
| `admin-console`     | `boolean`           | `enabled: true`              | Admin moderation console at `/admin` (Issue 70).             | Replaced by backend auth system                |
|                     |                     |                              | Requires `NEXT_PUBLIC_ADMIN_SECRET` env var.                 |                                                |
| `grace-period-countdown-mock` | `boolean` | `enabled: false`             | Injects a deterministic mock `fundedAt` for funded campaigns | Contract returns a real fundedAt               |
|                     |                     |                              | so the withdrawal grace-period countdown (Issue 34) can be   |                                                |
|                     |                     |                              | built/reviewed. Dev/review aid only.                         |                                                |

---

## Security & Privacy

- **No sensitive data in public bundles.** Flag definitions are part of
  the public JS bundle by design. Do **not** store admin secrets, API keys,
  or rollout-targeting rules that would compromise security if exposed.
- **Percentage-rollout hashing** uses a stable identifier (wallet address
  or anonymous session UUID) to deterministically bucket users — no
  personal data is transmitted or stored server-side for flag evaluation.
- **Remote toggle (future):** If a remote-toggle endpoint is added, it
  must authenticate requests and serve over HTTPS. Never embed an admin
  JWT or API key in client-side code.

---

## Performance

- `isFlagEnabled()` is a synchronous O(1) Map lookup + optional string
  hash (~2 µs per call). No promises, no network, no async.
- `useFeatureFlag()` memoises the result via `useMemo` so re-renders
  are cheap.
- Both are safe to call in hot paths like campaign-rendering loops.
