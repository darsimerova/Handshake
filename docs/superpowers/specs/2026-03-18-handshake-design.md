# Handshake MVP — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Overview

Handshake is a micro-contract app where two parties negotiate terms in real-time and seal the deal by holding a button simultaneously for 3 seconds. Once sealed, the contract is immutable and permanently accessible via a read-only URL.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | shadcn/ui |
| Realtime / DB | Convex |
| Auth | Clerk |
| Hosting | Vercel |

---

## Core Flow

1. **Creator signs in** via Clerk
2. **Creator writes** a title + terms block, creating a contract (status: `negotiating`)
3. **Creator shares** the contract link (`/c/:contractId`)
4. **Party B opens** the link — assigned an anonymous guest session ID (no sign-in, no name entry)
5. **Both negotiate** — creator edits terms live, Party B sees changes instantly via Convex; both chat in a sidebar
6. **Both hold** the "Hold to Seal" button simultaneously for 3 seconds (forgiving: requires a 3s overlap within a ~2–3s window)
7. **Contract seals** — becomes immutable, both parties redirected to a read-only sealed certificate

---

## Routes

| Route | View |
|---|---|
| `/` | Home / create screen (creator must be signed in) |
| `/c/:contractId` | Contract screen (negotiation, observer, or certificate depending on status and identity) |

## Create Screen

Shown at `/` when the creator is signed in. A minimal form:
- Title input
- Terms textarea
- "Create & Get Link" button

On submit, a Convex mutation creates the contract (status: `negotiating`, `creatorId` set, `guestId` null) and returns the contract ID. The creator is immediately redirected to `/c/:contractId`.

No contract list / dashboard for MVP.

## Screen Layout

Single screen for negotiation: **left panel (contract) / right panel (chat)**, ratio ~3:2.

**Left panel:**
- Contract title (editable by creator, read-only for guest)
- Terms textarea (editable by creator, read-only for guest; changes debounced 500ms before writing to Convex)
- Presence dots (who is online — implemented via a `lastSeen` timestamp on the contract, updated on any mutation; a party is considered "online" if their `lastSeen` is within the last 30 seconds)
- Hold-to-Seal button (visible to both active parties)

**Right panel:**
- Chat message list (live via Convex)
- Message input

**Third-party observer view** (negotiating contract, different session ID):
- Read-only contract title and terms
- No chat input, no hold button
- A message: "This contract is being negotiated."

Note: the single `/c/:contractId` route renders one of three views based on contract status and caller identity: (1) negotiation UI for the two active parties, (2) third-party observer view, (3) sealed certificate view.

---

## Hold-to-Seal Mechanic

Four button states:

| State | Trigger | UI |
|---|---|---|
| **Idle** | Default | Purple button, "Hold to Seal" |
| **One holding** | One party presses | Pulsing, "Waiting for other…" |
| **Both holding** | Overlap starts | Green, countdown fills over 3s; release by either resets |
| **Sealed** | 3s overlap complete | Celebration, redirect to certificate |

**Implementation (MVP-simple):**
- Each party's hold start time is stored in Convex (`creatorHoldStart`, `guestHoldStart`)
- On `mousedown`/`touchstart`: call a Convex mutation to write the current server-side `Date.now()` timestamp
- On `mouseup`/`touchend`: call a Convex mutation to clear the timestamp
- The client subscribes to the contract via a Convex query and watches `creatorHoldStart` and `guestHoldStart` reactively; when both are set, the client renders a countdown using `Date.now() - Math.max(creatorHoldStart, guestHoldStart)` (the overlap started when the later party joined)
- When the client-side countdown reaches 3000ms, the client calls the seal mutation
- Seal mutation (server-side): re-checks all of the following before committing:
  1. `status === 'negotiating'`
  2. Both `creatorHoldStart` and `guestHoldStart` are set
  3. Both timestamps are less than 10 seconds old (stale guard — a generous bound to handle slow connections; prevents a crashed tab's stale timestamp from enabling an accidental seal)
  4. `now - Math.max(creatorHoldStart, guestHoldStart) >= 3000` — the overlap has lasted at least 3 seconds server-side (prevents a buggy or early-calling client from sealing before the full duration)
  If check 1 fails (already sealed), the mutation no-ops — the calling client picks up `sealed` via its reactive subscription and redirects automatically. If checks 2–4 fail, the mutation no-ops silently; the client resets to idle.
- Release by either party clears their timestamp; the other party's timestamp is left as-is. When the released party re-presses, their timestamp is overwritten with a fresh value — this resets the 3-second overlap clock from scratch (no resuming from a prior hold)

---

## Data Model (Convex)

### `contracts`

| Field | Type | Notes |
|---|---|---|
| `_id` | Convex ID | Auto |
| `title` | string | |
| `terms` | string | |
| `status` | `'negotiating' \| 'sealed'` | |
| `creatorId` | string | Clerk user ID |
| `creatorName` | string | Creator's display name at creation time (stored so guests see it on the certificate) |
| `guestId` | string \| null | Anonymous session ID (stored in localStorage); null until claimed |
| `createdAt` | number | Unix ms |
| `sealedAt` | number \| null | Unix ms |
| `creatorHoldStart` | number \| null | Unix ms, null when not holding |
| `guestHoldStart` | number \| null | Unix ms, null when not holding |
| `creatorLastSeen` | number \| null | Unix ms, updated on any creator mutation |
| `guestLastSeen` | number \| null | Unix ms, updated on any guest mutation |

### `messages`

| Field | Type | Notes |
|---|---|---|
| `_id` | Convex ID | Auto |
| `contractId` | Convex ID | |
| `senderId` | string | Clerk user ID or guest session ID |
| `senderLabel` | string | Creator's name or "Guest" |
| `text` | string | |
| `createdAt` | number | Unix ms |

---

## Sealed Certificate View

The contract URL (`/c/:contractId`) is a single route. On load, the app queries the contract status: if `sealed`, it renders the certificate view immediately; if `negotiating`, it renders the negotiation UI. No separate route needed.

Read-only content once `status === 'sealed'`:

- Contract title
- Terms (read-only)
- Sealed timestamp
- "Sealed by [Creator Name] and Guest on [date]"
- Permanent — no edit controls shown

---

## Auth & Identity

- **Creator:** Clerk authentication (required to create a contract)
- **Guest (Party B):** Anonymous — session ID generated client-side (`crypto.randomUUID()`) and stored in `localStorage` on first visit to the contract link. No sign-in required.
- **Guest slot claiming:** The `guestId` field on a contract is `null` until a non-creator visits the link. On load, the client resolves identity as follows:
  - If the caller is authenticated via Clerk and their user ID matches `creatorId` → they are the creator
  - If the caller is authenticated via Clerk and their user ID does NOT match `creatorId` → they are a third-party signed-in user; treated as an observer (no slot-claiming, no interaction)
  - If the caller has no Clerk session → they are an anonymous guest; proceed to claim
  For anonymous guests, the client calls a `claimGuest` mutation passing the local session ID. The mutation checks: (1) `status === 'negotiating'`, (2) `guestId` is currently null. If all checks pass, it sets `guestId`. If `guestId` already matches the caller's session ID (refresh/re-open), the mutation no-ops — the caller is the registered guest. If `guestId` is set to a different session ID, the caller is a third-party observer. For a `sealed` contract, all visitors see the certificate view regardless of identity.
  **Trust model:** The session ID is trust-on-first-claim — any client can pass any UUID to claim an unclaimed slot. There is no server-side cryptographic verification. This is MVP-acceptable; the client-side guard (checking the local `localStorage` session ID before calling the mutation) is the only enforcement layer.
- **Tab/refresh resilience:** The guest session ID persists in `localStorage`, so refreshing the page or re-opening the same link in the same browser restores the guest identity correctly.

---

## What's Cut for MVP

- PDF export
- Email notifications
- Version / edit history
- Dashboard listing multiple contracts (the creator has no way to recover a prior contract URL if lost — acceptable for MVP demo)
- Party B authentication
- Complex heartbeat / reconnection logic
- Mobile-specific polish

---

## Risky Parts

| Risk | Mitigation |
|---|---|
| Simultaneous hold feels off | Countdown starts when both are holding — one can press slightly before the other; the 3s clock only starts once both timestamps exist |
| Double-seal race condition | Seal mutation checks `status === 'negotiating'` atomically |
| Guest loses session (refresh) | Guest session ID persisted in `localStorage` |
| Hold fires on mobile | Handle both `mousedown`/`mouseup` and `touchstart`/`touchend` |

---

## Demo Wow Factor

The simultaneous hold is the centrepiece. In a demo: open two browser windows side by side, negotiate one term change in chat, then both hold — the 3-second countdown builds tension, the green flash + "Contract Sealed 🎉" is the payoff. Simple, tactile, memorable.
