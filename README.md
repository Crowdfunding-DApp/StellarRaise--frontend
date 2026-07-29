# 🚀 Stellar Raise Frontend

![Stellar Ecosystem](https://img.shields.io/badge/Stellar-Ecosystem-primary?logo=stellar&style=flat-square)
![Next.js React](https://img.shields.io/badge/Next.js-16-black?logo=next.js&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwind-css&style=flat-square)

A **decentralized crowdfunding platform frontend** built on the [Stellar](https://stellar.org/) network using [Next.js](https://nextjs.org/) and the new App Router.

## Overview

The Stellar Raise Interface lets backers discover and support innovative projects. Relying on the speed and security of the Stellar blockchain, this client seamlessly integrates with Freighter for authentication and transaction signing, providing a fluid path toward interacting with on-chain Soroban smart contracts.

### Key Features

| Feature                   | Description                                                                 |
| :------------------------ | :-------------------------------------------------------------------------- |
| **Freighter Integration** | Seamless authentication, connection, and transaction signing via Freighter  |
| **Campaign Dashboard**    | View live projects with progress bars, countdown timers, and goal tracking  |
| **Pledge Interface**      | Intuitive modal UI to safely pledge XLM or custom assets to campaigns       |
| **Modern UI/UX**          | Fast, responsive design built with Tailwind CSS, Radix UI, and Framer Motion|
| **Creator Analytics**     | Owner-only analytics with wallet signature-challenge authentication (Issue #77) |

## Project Structure

```text
stellar-raise-interface/
├── src/
│   ├── app/                     # Next.js App Router root layout and pages
│   │   └── layout.tsx           # Wraps WalletProvider > NotificationProvider
│   ├── components/              # Reusable React components
│   │   ├── layout/              # Navbar, Footer, etc.
│   │   └── ui/                  # Atomic + composite UI components
│   │       ├── NotificationDock.tsx        # Opt-in CTA + trigger host (Issue #78)
│   │       └── NotificationSettingsModal.tsx
│   ├── context/                 # React Context providers
│   │   ├── WalletContext.tsx
│   │   └── NotificationContext.tsx          # Bridges wallet & service (Issue #78)
│   └── lib/
│       ├── soroban.ts
│       └── notifications/       # Notification subsystem (Issue #78)
│           ├── types.ts         # Event/preference/record contracts
│           ├── validation.ts    # Email + consent validators, redactors
│           ├── storage.ts       # localStorage adapter (SSR-safe)
│           ├── channels.ts      # EmailChannel + PushChannel implementations
│           ├── service.ts       # NotificationService orchestration
│           ├── hooks.ts         # useDeadlineApproachingTrigger / useRefundEligibleTrigger
│           └── __tests__/       # Vitest suite
├── public/                      # Static assets and images
├── package.json                 # App dependencies and scripts
└── vitest.config.ts             # Test runner configuration
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher)
- npm (or yarn/pnpm)
- [Freighter Wallet Browser Extension](https://www.freighter.app/) (Required for interacting with the blockchain)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Crowdfunding-DApp/StellarRaise-frontend.git
cd StellarRaise-frontend

# Install dependencies
npm install

# Run the development server
npm run dev

# Open the local development build
# URL: http://localhost:3000
```

### Available Scripts

```bash
npm run dev        # Next.js dev server
npm run build      # Production build
npm run start      # Run a production build
npm run lint       # ESLint (next/core-web-vitals + TypeScript rules)
npm run typecheck  # tsc --noEmit
npm test           # Vitest (single run)
npm run test:watch # Vitest watch mode
```

## Notification Subsystem (Issue #78)

The notification layer is **opt-in**, wallet-bound, privacy-first, and
designed so new channels (browser push, mobile push, webhook, etc.) can be
added without changing business logic.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ React UI  (NotificationDock + NotificationSettingsModal)     │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ NotificationContext     consumes WalletContext              │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ NotificationService     register / update / optOut / dispatch│
│                         (per-wallet, consent-aware)          │
└────────────────┬─────────────────────┬───────────────────────┘
                 ▼                     ▼
        ┌────────────────┐    ┌──────────────────────────────┐
        │localStorage    │    │ Channels (compose freely)     │
        │(SSR-safe,      │    │  • emailChannel (mock + HTTP) │
        │ schema-checked)│    │  • pushChannel (browser API)  │
        └────────────────┘    │  • future…                     │
                              └──────────────────────────────┘
```

- **Event bus is implicit**: the service exposes `dispatch(event)` and each
  channel decides independently whether to act. There is no shared mutable
  state between channels.
- **Hooks fire events from React**: `useDeadlineApproachingTrigger` and
  `useRefundEligibleTrigger` are mounted by `NotificationDock`. They dedupe
  per session using a `useRef<Set>`, so the same event never fires twice in
  one browser session.
- **Channels are pluggable**: `NotificationService.setChannels(...)` swaps
  the registry at runtime. New channels only need to satisfy
  `NotificationChannel` (an async `send(event, prefs): Record`).

### Supported Events

| Event                            | Triggered when…                                                   |
| :------------------------------- | :----------------------------------------------------------------- |
| `campaign.deadline_approaching`  | A campaign deadline is **≤ 24 hours** away (window configurable) |
| `campaign.refund_eligible`       | A campaign deadline passed without reaching its funding goal       |

### Adding a New Channel (Future Push, Webhooks, etc.)

1. Implement the `NotificationChannel` interface from
   `src/lib/notifications/types.ts`:
   ```ts
   export const webhookChannel: NotificationChannel = {
     id: "webhook",
     async send(event, prefs) {
       // dispatch, never include prefs.email or raw wallet
       return {
         eventType: event.type,
         channel: "webhook",
         status: "sent",
         timestamp: Date.now(),
       };
     },
   };
   ```
2. Add the id to `NotificationChannelId` in `types.ts`.
3. Register the channel with the service (e.g. in `index.ts`):
   ```ts
   getNotificationService().setChannels([emailChannel, pushChannel, webhookChannel]);
   ```
4. The notification dock UI uses the channel ids via `channels` toggles —
   add a toggle in `NotificationSettingsModal.tsx`.

No business logic in pages, hooks, or service orchestration changes.

### Privacy & Compliance

- **Explicit consent** is required before any contact information is stored.
  The consent checkbox is **disabled gating** for the submit button; the user
  cannot save without it. The consent timestamp is preserved through future
  updates so we have an audit trail of when consent was given.
- **No PII in logs**: all console output, error records, and delivery
  records use the `redactEmail` and `redactWallet` helpers. The raw email is
  never written to the browser console.
- **Wallet-bound**: preferences are stored under
  `stellarraise:notifications:prefs:<walletAddress>`. There is no global user
  record. Clearing local storage or opting out deletes all data for that
  wallet.
- **Duplicate-safe**: re-registering the same wallet merges the new email
  instead of erroring. The original consent timestamp is preserved.
- **SSR-safe**: the storage adapter no-ops when `window` is undefined and
  catches quota / private-mode errors without ever leaking the email value.
- **No orphan data**: `optOut` and `update({ consent: false })` both
  completely delete the stored record.

### Environment Configuration

| Variable                                | Purpose                                              | Fallback when missing                                                          |
| :-------------------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SOROBAN_RPC_URL`           | Soroban RPC endpoint (existing)                      | Surfaced as a load error in the dashboard                                       |
| `NEXT_PUBLIC_CONTRACT_ID`               | Crowdfunding contract ID (existing)                  | Surfaced as a load error in the dashboard                                       |
| `NEXT_PUBLIC_NOTIFICATIONS_API_URL`     | Backend email API (Issue #3 dependency)              | Falls back to a local “simulated delivery” path; UI flow remains exercisable    |

When `NEXT_PUBLIC_NOTIFICATIONS_API_URL` is set, the email channel POSTs to
`${url}/notifications/email`. The backend is responsible for rate limiting,
anti-abuse, and any unsubscribe flow.

### Opt-in / Update / Opt-out Flow

1. User connects a wallet via Freighter.
2. `NotificationDock` renders either:
   - An **empty state** opt-in CTA if the wallet has no stored preferences.
   - A **manage** badge with the current email if preferences are present.
3. Clicking either opens `NotificationSettingsModal`.
4. The modal enforces:
   - **Email format** validation via `validateEmail`.
   - **Consent checkbox** must be checked to enable Submit.
   - **Channel toggles** — at least one must be selected when updating.
5. On submit, the service record is saved / merged with the wallet binding.
6. On “Opt out & erase stored data”, the record is deleted.

### Error States

| Scenario                              | What the user sees                                               |
| :------------------------------------ | :--------------------------------------------------------------- |
| Invalid email                         | Inline validation + submit-disabled state                       |
| Missing consent                       | “Please confirm consent before continuing.” error panel          |
| Duplicate registration                | Success path (duplicate-safe; email is updated, consent preserved) |
| Delivery failure (channel throws)     | Channel returns a `failed` record; service does not surface it to UI |
| Network failure on email POST         | Email channel records `NETWORK_ERROR`; simulated fallback applies if `NEXT_PUBLIC_NOTIFICATIONS_API_URL` is missing |
| Missing service config                | Detected via env; falls back to simulation; logs a redacted message |
| Storage unavailable (private mode, quota) | Preferences still resolve in-memory; persisted writes log a PII-redacted warning and do not throw to the UI |

## Client Interface Context

This application relies on the centralized `WalletContext` to maintain wallet states locally without needing repetitive window requests.

```typescript
interface WalletContextType {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}
```

The `NotificationContext` wraps `WalletContext` and is also mounted at the
root layout. It exposes `preferences`, `register`, `update`, `optOut`, and
`refresh`.

```typescript
interface NotificationContextType {
  preferences: NotificationPreferences | null;
  isReady: boolean;
  register: (email: string, consent: boolean) => SimpleResult;
  update: (patch: Partial<Pick<NotificationPreferences,
    "email" | "consent" | "channels">>) => SimpleResult;
  optOut: () => SimpleResult;
  refresh: () => void;
}
```

### Example: Using the Notification Hook

Hooks fire events from campaign data; they are mounted by `NotificationDock`.

```tsx
import {
  useDeadlineApproachingTrigger,
  useRefundEligibleTrigger,
} from "@/lib/notifications";

useDeadlineApproachingTrigger({
  enabled: Boolean(address),
  walletAddress: address,
  campaigns,
});
useRefundEligibleTrigger({
  enabled: Boolean(address),
  walletAddress: address,
  campaigns,
});
```

## Smart Contract Interaction Architecture

The frontend is built to communicate with the corresponding **Pull-based Refund** model on the Soroban Contracts.

### How it Works
1. When a user presses **Pledge**, the UI requests an access signature from the Freighter Wallet.
2. The transaction is parsed into an XDR envelope and executed via the `@stellar/freighter-api` interface targeting the project's contract ID.
3. If the campaign **misses its goal**, the interface enables a **Claim Refund** state for contributors, initiating a direct contract call to pull their stranded tokens back securely.

### Example: Triggering a Freighter Transaction
```typescript
import freighter from "@stellar/freighter-api";
import { pledgeEnvelope } from "@/lib/soroban";

const handlePledge = async (amount: number) => {
  if (await freighter.isConnected() && await freighter.isAllowed()) {
    try {
      const signedTransaction = await freighter.signTransaction(pledgeEnvelope(amount), {
        network: "TESTNET"
      });
      console.log("Successfully signed:", signedTransaction);
    } catch (error) {
      console.error("User rejected the transaction or it failed:", error);
    }
  }
}
```

## Performance Testing

The StellarRaise frontend includes automated performance testing using [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to ensure optimal user experience.

### Performance Targets

We maintain strict performance budgets to prevent regressions:

| Metric | Target |
|--------|--------|
| **Lighthouse Performance** | ≥ 75 |
| **Lighthouse Accessibility** | ≥ 90 |
| **Lighthouse Best Practices** | ≥ 85 |
| **Lighthouse SEO** | ≥ 90 |
| **LCP (Largest Contentful Paint)** | < 2.5s |
| **CLS (Cumulative Layout Shift)** | < 0.1 |

### Running Performance Tests Locally

```bash
# Run a complete performance test
npm run performance:test

# Or run individual commands:
npm run build && npm start

# In another terminal:
npm run lighthouse:audit
npm run lighthouse:analyze
```

For detailed information, see [PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) and [PERFORMANCE_BUDGET.md](./PERFORMANCE_BUDGET.md).

### CI/CD Integration

Performance audits run automatically on every pull request. Failed performance checks will block merging until thresholds are met.

## Deployment

Deploying the Interface to the open web is quick and straightforward thanks to Next.js portability.

### Vercel Deployment

The easiest way to deploy your StellarRaise app is to use the Vercel Platform.

1. Log into [Vercel](https://vercel.com/new).
2. Import your GitHub repository (`StellarRaise-frontend`).
3. Set your Framework Preset to **Next.js**.
4. Configure any environment variables if needed (e.g. `NEXT_PUBLIC_SOROBAN_RPC_URL`, `NEXT_PUBLIC_NOTIFICATIONS_API_URL`).
5. Click **Deploy**.

### Static Export (Manual Deployment)

If you are dropping dynamic API routes entirely and serving strictly static assets:

```bash
# 1. Update next.config.ts
# const nextConfig = { output: 'export' };

# 2. Build the static payload
npm run build

# Next.js will export your static files to the /out directory for arbitrary hosting (Netlify, AWS S3, etc.)
```

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing to ensure a welcoming environment for all.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of notable updates.

## Security

Please review our [Security Policy](SECURITY.md) for responsible disclosure guidelines to ensure our users stay safe.

## Contributing (The Wave Program)

StellarRaise operates **The Wave Program**, a structured workflow process connecting builders directly to strictly scoped issues.

- Find actively curated tasks on our [Issues board](./issue.md).
- Issues are fully tagged (e.g., `bug`, `feature`, `soroban`, `good-first-issue`).
- Review our [Wave Program Strategy Document](./wave-program-strategy.md) to understand how to claim a bug and submit a PR properly.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
