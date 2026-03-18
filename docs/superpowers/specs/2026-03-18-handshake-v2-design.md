# Handshake v2: Visual Redesign + Guest Name + Mobile Design

## Overview

Three improvements to the existing Handshake MVP:

1. **Dark visual redesign** — Full dark theme (#09090b background), Playfair Display serif headings, indigo/violet accents (#6366f1), replacing the default Tailwind styling
2. **Guest name prompt** — Guests enter a display name on first opening a contract link; stored in localStorage alongside session ID
3. **Mobile responsiveness** — Tab-based layout on small screens (Contract tab / Chat tab), replacing the side-by-side split

These changes are primarily presentational and UX. One Convex schema change is required: adding `guestName` to the contracts table so the sealed certificate shows the guest's name to both parties.

---

## 1. Dark Visual Redesign

### Color palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#09090b` | Page background |
| `bg-surface` | `#18181b` | Card/input backgrounds |
| `bg-border` | `#27272a` | Borders, dividers |
| `text-primary` | `#fafafa` | Headings, values |
| `text-muted` | `#71717a` | Labels, placeholder |
| `text-dim` | `#52525b` | Captions, metadata |
| `accent` | `#6366f1` | Buttons, active states, focus rings |
| `accent-hover` | `#4f46e5` | Button hover |
| `accent-soft` | `rgba(99,102,241,0.08)` | Hold button idle fill |
| `green` | `#22c55e` | Online dot, sealed/both-holding state |
| `green-soft` | `rgba(34,197,94,0.08)` | Hold button both-holding fill |

### Typography

- Headings (`h1`, logo, contract title display): **Playfair Display** — load via Google Fonts in `index.html`
- Body / UI: **Inter** (already system-safe, add as explicit import for consistency)
- Font weights: Playfair 700/900 for headings; Inter 400/500/600 for body

### Component-level changes

**HomePage** (`src/pages/HomePage.tsx`):
- Background fills to `#09090b`, full-height centered layout
- `h1` "Handshake" in Playfair Display 52px weight-900
- Form inputs: `#18181b` bg, `#27272a` border, focus ring `#6366f1`
- CTA button: `#6366f1` bg, white text, hover `#4f46e5`
- Gradient rule divider between hero and form

**NegotiationView** (`src/components/NegotiationView.tsx`):
- Top bar with 🤝 Handshake logo (Playfair) + two presence dots
- Contract panel: dark inputs for title and terms
- Chat panel: message sender names colored by role (indigo for self, zinc for other)
- Hold button states (already correct logic, update styling):
  - Idle: indigo border + soft indigo fill
  - Both holding: green border + soft green fill + progress bar

**HoldButton** (`src/components/HoldButton.tsx`):
- Restyle to match mockup (border-radius 10px, padding 18px, inner emoji + label + sub)
- Progress fill as absolute positioned div, width = `progress * 100%`

**TermsEditor** (`src/components/TermsEditor.tsx`):
- Inputs match dark surface style
- Label: `text-xs font-semibold uppercase tracking-wider text-zinc-600`

**ChatPanel** (`src/components/ChatPanel.tsx`):
- Messages: sender name in color by role, message text in muted zinc
- Input: dark surface style, focus ring indigo
- Send button: zinc bg with muted text

**CertificateView** (`src/components/CertificateView.tsx`):
- Header band: `linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)` with indigo-900 border
- "✓ Sealed" badge: green text, green border, green-tinted bg
- Parties row: two cards side by side in `#18181b`
- Permalink row: monospace code + "Copy link" in indigo

**PresenceDots** (`src/components/PresenceDots.tsx`):
- Dots: 7px, indigo for creator, green for guest. Glowing box-shadow.

---

## 2. Guest Name Prompt

### Flow

1. Guest opens `/c/:contractId` for the first time
2. **Before** rendering NegotiationView, show a name prompt screen
3. Guest types a display name (or clicks "Skip — join as Guest")
4. Name is stored in localStorage under key `handshake_guest_name`
5. Name is read by `useIdentity` and used as `senderLabel` in chat and certificate

### When to show the prompt

Show if: role === "guest" AND `localStorage.getItem("handshake_guest_name")` is null

Once submitted (or skipped), the name is persisted — navigating away and back should not re-show the prompt.

### Component: `GuestNamePrompt`

New file: `src/components/GuestNamePrompt.tsx`

Props:
```ts
interface GuestNamePromptProps {
  contractTitle: string;
  onConfirm: (name: string) => void; // receives "" for skip
}
```

UI (matches `guest-name-mockup.html`):
- Contract title preview card at top
- Gradient rule divider
- 👋 emoji, "What's your name?" in Playfair Display
- Sub-text: "This will appear on the sealed contract."
- Text input, centered placeholder "Your name"
- "Join Contract →" button (indigo)
- "Skip — join as Guest" link below

### localStorage key

```
handshake_guest_name — string | null
  null → prompt not yet seen
  ""   → user skipped (display as "Guest")
  "Bob" → display name
```

### Integration in `NegotiationView`

The name prompt lives **inside `NegotiationView`**, not in `ContractPage`. This avoids adding awkward state to ContractPage and keeps the flow clean.

In `src/components/NegotiationView.tsx`:
- Add `useState<string | null>(() => localStorage.getItem("handshake_guest_name"))` for `guestName`
- If `role === "guest"` and `guestName === null` → render `<GuestNamePrompt>` as a full-screen overlay (replaces the negotiation layout entirely)
- On confirm: call `localStorage.setItem("handshake_guest_name", name)` and also call the `claimGuest` mutation with `guestName`; set the local state to transition out of the prompt
- The prompt renders **before** the tab layout / side-by-side layout — it is a full-screen gate, not a modal

`ContractPage` does not change.

### `senderLabel` in NegotiationView

`NegotiationView` currently hardcodes `"Guest"`. Change to:
```ts
const guestDisplayName = localStorage.getItem("handshake_guest_name") || "Guest";
const senderLabel = role === "creator" ? creatorName : guestDisplayName;
```

### CertificateView guest name

`CertificateView` currently shows `"Guest"` for the guest party name. It should show whatever name was stored (or "Guest" if skipped). Since `CertificateView` runs on both creator and guest devices, it should read `localStorage.getItem("handshake_guest_name")` for the guest name — but only if the viewer is the guest. If the viewer is the creator, we have no way to know the guest's name unless it's stored on the server.

**Decision for MVP**: Store the guest's display name in the Convex `contracts` table as `guestName: v.optional(v.string())`. Set it when the guest calls `claimGuest`. This makes the name available to both parties on the certificate.

**Schema change**: Add `guestName: v.optional(v.string())` to the `contracts` table.

**`claimGuest` mutation change**: Accept optional `guestName: v.optional(v.string())` parameter and set it on the contract.

**`CertificateView`**: Display `contract.guestName ?? "Guest"`.

---

## 3. Mobile Responsiveness

### Breakpoint strategy

- **≥ 768px (md)**: existing side-by-side layout (3/5 contract + 2/5 chat)
- **< 768px**: tab-based layout with bottom tab bar

### Tab bar component: `MobileTabs`

New component inline in `NegotiationView.tsx` (or extracted as needed):

```tsx
type Tab = "contract" | "chat";
const [activeTab, setActiveTab] = useState<Tab>("contract");
```

Tab bar renders at the bottom (fixed, `border-top`). Two tabs:
- 📄 Contract (active on load)
- 💬 Chat

Active tab: indigo text + indigo top border. Inactive: zinc text.

### Layout switch in `NegotiationView`

Use a flex-column layout on mobile with the tab bar as a flex-shrink-0 element at the bottom. This avoids `position: fixed` which gets pushed up by the iOS soft keyboard and can cause the tab bar to overlap the keyboard. Instead, use a flex container so the tab bar always stays at the bottom of the visible viewport without fighting the keyboard:

```tsx
// Desktop: side-by-side
<div className="hidden md:flex h-screen">
  <div className="w-3/5 ...">contract + hold button</div>
  <div className="w-2/5 ...">chat</div>
</div>

// Mobile: flex-col, tab bar is flex-shrink-0 (NOT position: fixed)
<div className="flex md:hidden flex-col h-[100dvh]">
  <TopBar />  {/* flex-shrink-0 */}
  <div className="flex-1 overflow-y-auto min-h-0">
    {activeTab === "contract" ? <ContractContent /> : <ChatContent />}
  </div>
  <TabBar activeTab={activeTab} onChange={setActiveTab} />  {/* flex-shrink-0 */}
</div>
```

`h-[100dvh]` uses the dynamic viewport height unit which accounts for mobile browser chrome (address bar) correctly. `min-h-0` on the scrollable area is required to prevent flex overflow in Safari.

### Mobile top bar

Shared top bar (visible on mobile only, or always) showing:
- 🤝 Handshake logo (Playfair)
- Two presence dots (creator + guest)

On desktop, topbar is already part of the contract panel design.

### Hold button on mobile

On mobile, the Hold button lives in the Contract tab. It is **sticky to the bottom of the contract panel**, above the tab bar. This ensures it is always reachable regardless of how long the terms text is, and doesn't get pushed off-screen when the soft keyboard appears.

Layout structure for the Contract tab on mobile:
```
┌───────────────────────┐
│ terms / title (scrollable, flex-1) │
├───────────────────────┤
│ hold button (sticky, flex-shrink-0) │
├───────────────────────┤
│ tab bar (fixed bottom) │
└───────────────────────┘
```

The Hold button is not visible in the Chat tab — this is intentional per the approved mockup.

### Touch events for hold button

On mobile, `mousedown`/`mouseup` events do not fire reliably. `HoldButton` must also listen to `touchstart`/`touchend`. Add both event handlers:

```tsx
onMouseDown={onPressStart}
onMouseUp={onPressEnd}
onMouseLeave={onPressEnd}
onTouchStart={(e) => { e.preventDefault(); onPressStart(); }} // preventDefault stops ghost click; still calls onPressStart
onTouchEnd={onPressEnd}
```

`e.preventDefault()` on touchStart prevents the 300ms click delay and ghost click synthesis. `onPressStart()` must still be called after to trigger the countdown.

Other interactive elements (inputs, send button) use native browser handling and do not need custom touch event wiring.

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add Google Fonts (Playfair Display + Inter) |
| `src/index.css` | Add CSS custom properties / font-face fallbacks if needed |
| `convex/schema.ts` | Add `guestName: v.optional(v.string())` |
| `convex/contracts.ts` | `claimGuest` accepts + stores `guestName` |
| `src/lib/session.ts` | Add `getGuestName()` / `setGuestName()` helpers |
| `src/components/GuestNamePrompt.tsx` | New component |
| `src/components/NegotiationView.tsx` | Guest name gate: render `GuestNamePrompt` if role is guest and name is null (in addition to dark redesign + mobile tabs) |
| `src/pages/HomePage.tsx` | Dark redesign |
| `src/components/NegotiationView.tsx` | Dark redesign + mobile tabs + touch events |
| `src/components/TermsEditor.tsx` | Dark redesign |
| `src/components/ChatPanel.tsx` | Dark redesign |
| `src/components/HoldButton.tsx` | Dark redesign + touch events |
| `src/components/PresenceDots.tsx` | Dark redesign (indigo + green dots) |
| `src/components/CertificateView.tsx` | Dark redesign + show `guestName` from Convex |
| `src/components/ObserverView.tsx` | Dark redesign |

---

## Out of Scope

- No new Convex indexes
- No changes to hold mechanic logic
- No new routes
- No animations beyond existing transition utilities
- No light mode toggle
