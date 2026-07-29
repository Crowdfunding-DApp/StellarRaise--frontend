# Admin Moderation — Product Decisions (Issue 70)

## Authorization Model

### Current implementation (v1 — pre-backend)
Admin authentication is implemented client-side via a shared secret
(`NEXT_PUBLIC_ADMIN_SECRET`) validated by SHA-256 comparison in the
browser. The admin session is stored in `sessionStorage`.

**This is not a production-grade auth system.** It was chosen as the
lightest-weight approach that cleanly separates admin identity from
on-chain wallet identity, which was the core requirement.

### Production path
The recommended production architecture is:

1. **Standalone backend service** (e.g. Node.js/Express, Go, or Rust)
   that manages admin accounts, issues signed JWTs, and enforces
   role-based access control (RBAC).
2. **The Soroban contract** should have an `admin` role encoded in its
   state (a `Map<Address, bool>`) so that on-chain operations that
   require admin privileges can verify the caller against that map.
3. **The frontend** calls a backend `/auth/login` endpoint, receives a
   short-lived JWT, and includes it as a Bearer token in all subsequent
   admin API requests.

Until that backend exists, the client-side secret approach is adequate
for development and review, but **must not be used in production**.

## Suspension: On-chain vs Off-chain

### Decision
Campaign suspension is **off-chain only** in this implementation.

### Rationale
1. **Immutability of on-chain state.** The Soroban contract owns the
   canonical campaign data (goal, deadline, raised amount, etc.). An
   off-chain admin console cannot unilaterally alter that state —
   doing so would require admin-level authority encoded in the contract
   itself (e.g. an `onlyAdmin` modifier on a `suspend_campaign` function).
2. **No such contract authority exists yet.** The current Soroban
   contract does not define admin roles or a suspend function. Adding
   one would require a contract upgrade, which is a separate piece of
   work outside the scope of this frontend issue.
3. **Off-chain suspension is still meaningful.** When the frontend
   marks a campaign as "suspended":
   - The campaign card is hidden from the public `/` page.
   - The campaign is excluded from search results on this interface.
   - A "This campaign has been suspended" notice is displayed if
     accessed via direct link.
   - The campaign remains fully intact on the Stellar ledger — pledges
     can still be sent, refunds claimed, etc. via other interfaces.

### Distinction from censorship
Suspension is explicitly framed as a **trust & safety moderation action
on this application's view layer**, not as a blockchain-level censorship
mechanism. Users retain full access to the underlying contract via any
other Stellar-compatible wallet or explorer. This is consistent with how
frontend-level moderation works in decentralized platforms (e.g.,
Uniswap's token list filtering, OpenSea's collection moderation).

## Audit Trail

Every admin action generates an audit entry stored in `localStorage`
with: `adminId`, `adminName`, `action`, `targetId`, `details`,
`timestamp`, and (when available) `ipAddress`.

The audit log is:
- **Append-only** (entries are never modified, only batch-cleared by an
  explicit admin action).
- **Capped at 1000 entries** to prevent unbounded storage growth.
- **Viewable** at `/admin/audit-log`.

In production, audit entries should be written to a server-side
append-only log (or database table) that cannot be tampered with by
the admin user.

## Future Considerations

### Community flagging (Issue 33)
The `flagCampaign` function and `CampaignModeration.flaggedBy` array
anticipate the community-flagging signal from Issue 33. When that
feature lands, any user will be able to flag a campaign, and the
moderation console will surface flagged campaigns for admin review.

### On-chain suspension
If the Soroban contract is upgraded to include an `admin` role and a
`suspend` function, the `updateCampaignStatus` function in the frontend
can be extended to submit the on-chain transaction in addition to the
off-chain state update. The audit entry would then also record the
transaction hash.
