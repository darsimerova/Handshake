# Handshake v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply dark visual redesign, add guest name prompt, and add mobile tab-based layout to the Handshake app.

**Architecture:** Three additive changes that don't touch auth or the hold mechanic: (1) swap all Tailwind classes to zinc/indigo dark palette + Playfair Display headings, (2) show a name prompt gate inside NegotiationView for guests who haven't set a name, with the name stored both in localStorage and in Convex so both parties see it on the sealed certificate, (3) replace NegotiationView's side-by-side layout with a tab-bar layout on mobile (< 768px).

**Tech Stack:** React 19, TypeScript, Tailwind v4 (@tailwindcss/vite), Convex, Clerk, bun:test

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `index.html` | Modify | Add Google Fonts (Playfair Display + Inter) |
| `src/index.css` | Modify | Add `@theme` block for serif font; set body background |
| `convex/schema.ts` | Modify | Add `guestName: v.optional(v.string())` to contracts table |
| `convex/contracts.ts` | Modify | `claimGuest` accepts + stores optional `guestName` |
| `src/lib/session.ts` | Modify | Add `getGuestName()` / `setGuestName()` helpers |
| `src/lib/__tests__/guestName.test.ts` | Create | Unit tests for guest name helpers |
| `src/components/GuestNamePrompt.tsx` | Create | Name prompt screen |
| `src/pages/HomePage.tsx` | Modify | Dark redesign |
| `src/components/PresenceDots.tsx` | Modify | Dark redesign (add glow to dots) |
| `src/components/HoldButton.tsx` | Modify | Dark redesign (styling only — touch events already present) |
| `src/components/TermsEditor.tsx` | Modify | Dark redesign |
| `src/components/ChatPanel.tsx` | Modify | Dark redesign |
| `src/components/CertificateView.tsx` | Modify | Dark redesign + accept `guestName` prop |
| `src/components/ObserverView.tsx` | Modify | Dark redesign |
| `src/components/NegotiationView.tsx` | Modify | Dark redesign + guest name gate + mobile tabs |
| `src/pages/ContractPage.tsx` | Modify | Pass `guestName` to CertificateView |

---

## Task 1: Backend — guestName field

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/contracts.ts`

- [ ] **Step 1: Add `guestName` to the Convex schema**

In `convex/schema.ts`, add one line to the contracts table definition:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contracts: defineTable({
    title: v.string(),
    terms: v.string(),
    status: v.union(v.literal("negotiating"), v.literal("sealed")),
    creatorId: v.string(),
    creatorName: v.string(),
    guestId: v.union(v.string(), v.null()),
    guestName: v.optional(v.string()),   // ← ADD THIS LINE
    createdAt: v.number(),
    sealedAt: v.union(v.number(), v.null()),
    creatorHoldStart: v.union(v.number(), v.null()),
    guestHoldStart: v.union(v.number(), v.null()),
    creatorLastSeen: v.union(v.number(), v.null()),
    guestLastSeen: v.union(v.number(), v.null()),
  }),
  messages: defineTable({
    contractId: v.id("contracts"),
    senderId: v.string(),
    senderLabel: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_contract", ["contractId", "createdAt"]),
});
```

- [ ] **Step 2: Update `claimGuest` to accept and store `guestName`**

In `convex/contracts.ts`, update only the `claimGuest` mutation. Add `guestName: v.optional(v.string())` to args, and write it when inserting the guest slot:

```typescript
export const claimGuest = mutation({
  args: {
    contractId: v.id("contracts"),
    sessionId: v.string(),
    guestName: v.optional(v.string()),    // ← ADD
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) return;
    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.status === "sealed") return;
    if (contract.guestId === args.sessionId) {
      await ctx.db.patch(args.contractId, { guestLastSeen: Date.now() });
      return;
    }
    if (contract.guestId !== null) return;
    await ctx.db.patch(args.contractId, {
      guestId: args.sessionId,
      guestName: args.guestName,          // ← ADD
      guestLastSeen: Date.now(),
    });
  },
});
```

All other mutations are unchanged.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/contracts.ts
git commit -m "feat: add guestName field to contracts schema and claimGuest"
```

---

## Task 2: Foundation — fonts and body background

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Add Google Fonts to `index.html`**

Replace the entire `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Handshake</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Update `src/index.css`**

Replace the entire file with:

```css
@import "tailwindcss";

@theme {
  --font-serif: "Playfair Display", Georgia, serif;
  --font-sans: "Inter", system-ui, sans-serif;
}

body {
  background-color: #09090b;
  color: #fafafa;
  font-family: var(--font-sans);
}
```

- [ ] **Step 3: Check dev server renders dark background**

```bash
bun run dev
```

Open `http://localhost:5173`. The page should have a near-black background. Fonts may still look the same (they'll be updated component by component in later tasks).

- [ ] **Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: add Playfair Display font and dark body background"
```

---

## Task 3: Guest name helpers + tests

**Files:**
- Modify: `src/lib/session.ts`
- Create: `src/lib/__tests__/guestName.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `src/lib/__tests__/guestName.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "bun:test";

// Minimal localStorage mock (bun:test runs in Node/Bun without DOM)
const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage;

// Import after mock is set up
import { getGuestName, setGuestName } from "../session";

beforeEach(() => {
  for (const k in store) delete store[k];
});

describe("guest name helpers", () => {
  it("returns null when no name has been set", () => {
    expect(getGuestName()).toBeNull();
  });

  it("returns the stored name after setGuestName", () => {
    setGuestName("Alice");
    expect(getGuestName()).toBe("Alice");
  });

  it("stores empty string for skip", () => {
    setGuestName("");
    expect(getGuestName()).toBe("");
  });

  it("overwrites a previous name", () => {
    setGuestName("Bob");
    setGuestName("Robert");
    expect(getGuestName()).toBe("Robert");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
bun test src/lib/__tests__/guestName.test.ts
```

Expected: FAIL — `getGuestName is not a function` or similar import error.

- [ ] **Step 3: Add the helpers to `src/lib/session.ts`**

Replace the entire file:

```typescript
const SESSION_KEY = "handshake_guest_id";
const GUEST_NAME_KEY = "handshake_guest_name";

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Returns null if the prompt has never been shown; "" if the user skipped. */
export function getGuestName(): string | null {
  return localStorage.getItem(GUEST_NAME_KEY);
}

/** Call with the entered name, or "" to indicate the user skipped. */
export function setGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
bun test src/lib/__tests__/guestName.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/__tests__/guestName.test.ts
git commit -m "feat: add getGuestName/setGuestName localStorage helpers"
```

---

## Task 4: GuestNamePrompt component

**Files:**
- Create: `src/components/GuestNamePrompt.tsx`

No unit test for this component — it is pure JSX with no logic beyond a controlled input. Visual verification in the running app.

- [ ] **Step 1: Create `src/components/GuestNamePrompt.tsx`**

```tsx
import { useState } from "react";

interface GuestNamePromptProps {
  contractTitle: string;
  onConfirm: (name: string) => void; // receives "" when user skips
}

export function GuestNamePrompt({ contractTitle, onConfirm }: GuestNamePromptProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(name.trim());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

        {/* Contract preview */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
            You've been invited to review
          </p>
          <p className="text-sm font-semibold text-zinc-400">{contractTitle}</p>
        </div>

        {/* Gradient rule */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* Prompt */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">👋</span>
          <h1 className="font-serif text-2xl font-bold">What's your name?</h1>
          <p className="text-sm text-zinc-600 leading-relaxed">
            This will appear on the sealed contract.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-center text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            Join Contract →
          </button>
          <button
            type="button"
            onClick={() => onConfirm("")}
            className="text-xs text-zinc-700 hover:text-zinc-600 underline underline-offset-2 transition-colors"
          >
            Skip — join as Guest
          </button>
        </form>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/GuestNamePrompt.tsx
git commit -m "feat: add GuestNamePrompt component"
```

---

## Task 5: Dark redesign — HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Replace the JSX in `src/pages/HomePage.tsx`**

Replace the entire file:

```tsx
import { useState } from "react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export function HomePage() {
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createContract = useMutation(api.contracts.createContract);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !terms.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const id = await createContract({ title: title.trim(), terms: terms.trim() });
      navigate(`/c/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-12 gap-10">

      {/* Hero */}
      <div className="text-center flex flex-col gap-3">
        <div className="text-5xl">🤝</div>
        <h1 className="font-serif text-5xl font-black tracking-tight text-zinc-50 leading-none">
          Handshake
        </h1>
        <p className="text-base text-zinc-500 max-w-xs mx-auto leading-relaxed">
          Create a micro-contract. Negotiate in real time. Seal it together.
        </p>
      </div>

      {/* Gradient rule */}
      <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <SignedOut>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-600">Sign in to create a contract</p>
          <SignInButton mode="modal">
            <button className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg px-6 py-3 text-sm transition-colors">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-md">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Contract title
            </label>
            <input
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Freelance Design Work — April 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Terms
            </label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Describe the agreement…"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={5}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !title.trim() || !terms.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold rounded-lg px-4 py-3 text-sm transition-colors"
          >
            {loading ? "Creating…" : "Create & Get Link →"}
          </button>
        </form>
      </SignedIn>

      <p className="text-[11px] uppercase tracking-widest text-zinc-800">
        Sealed contracts are permanent &amp; immutable
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Check in browser**

Open `http://localhost:5173`. The home page should show dark background, large Playfair Display "Handshake" heading, and dark form inputs.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: dark redesign for HomePage"
```

---

## Task 6: Dark redesign — PresenceDots + HoldButton

**Files:**
- Modify: `src/components/PresenceDots.tsx`
- Modify: `src/components/HoldButton.tsx`

- [ ] **Step 1: Update `src/components/PresenceDots.tsx`**

Add glowing box-shadows (inline style) to the dots and update label colors:

```tsx
import { useState, useEffect } from "react";

const ONLINE_MS = 30_000;

interface PresenceDotsProps {
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
}

export function PresenceDots({ creatorLastSeen, guestLastSeen }: PresenceDotsProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const creatorOnline = creatorLastSeen !== null && now - creatorLastSeen < ONLINE_MS;
  const guestOnline = guestLastSeen !== null && now - guestLastSeen < ONLINE_MS;

  return (
    <div className="flex items-center gap-4 text-xs text-zinc-600">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-[7px] h-[7px] rounded-full"
          style={creatorOnline
            ? { background: "#6366f1", boxShadow: "0 0 6px #6366f188" }
            : { background: "#27272a" }}
        />
        Creator
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-[7px] h-[7px] rounded-full"
          style={guestOnline
            ? { background: "#22c55e", boxShadow: "0 0 6px #22c55e88" }
            : { background: "#27272a" }}
        />
        Guest
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/HoldButton.tsx`**

Update the styling to match the dark mockup more precisely. Touch events are already in place — only visual classes change:

```tsx
import type { HoldState } from "../hooks/useHoldToSeal";

interface HoldButtonProps {
  holdState: HoldState;
  progress: number; // 0–1
  onPressStart: () => void;
  onPressEnd: () => void;
}

const CONFIG = {
  idle: {
    label: "Hold to Seal",
    sub: "Both must hold 3s",
    emoji: "🤝",
    border: "#6366f1",
    fill: "rgba(99,102,241,0.08)",
    labelColor: "#6366f1",
  },
  oneHolding: {
    label: "Waiting for other…",
    sub: "Keep holding",
    emoji: "⏳",
    border: "#818cf8",
    fill: "rgba(99,102,241,0.15)",
    labelColor: "#818cf8",
  },
  bothHolding: {
    label: "Hold…",
    sub: "",
    emoji: "🔒",
    border: "#22c55e",
    fill: "rgba(34,197,94,0.08)",
    labelColor: "#22c55e",
  },
  sealed: {
    label: "Sealed",
    sub: "",
    emoji: "✅",
    border: "#22c55e",
    fill: "rgba(34,197,94,0.08)",
    labelColor: "#22c55e",
  },
};

export function HoldButton({ holdState, progress, onPressStart, onPressEnd }: HoldButtonProps) {
  const cfg = CONFIG[holdState];

  return (
    <div className="relative w-full select-none">
      {/* progress fill */}
      {holdState === "bothHolding" && (
        <div
          className="absolute inset-0 rounded-[10px] bg-green-500/20 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <button
        className="relative w-full rounded-[10px] py-5 text-center transition-colors disabled:cursor-default"
        style={{
          border: `2px solid ${cfg.border}`,
          background: cfg.fill,
        }}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={(e) => { e.preventDefault(); onPressStart(); }}
        onTouchEnd={onPressEnd}
        disabled={holdState === "sealed"}
      >
        <div className="text-2xl">{cfg.emoji}</div>
        <div className="text-sm font-bold mt-1" style={{ color: cfg.labelColor }}>
          {cfg.label}
        </div>
        {cfg.sub && (
          <div className="text-[11px] text-zinc-600 mt-0.5">{cfg.sub}</div>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PresenceDots.tsx src/components/HoldButton.tsx
git commit -m "feat: dark redesign for PresenceDots and HoldButton"
```

---

## Task 7: Dark redesign — TermsEditor

**Files:**
- Modify: `src/components/TermsEditor.tsx`

- [ ] **Step 1: Replace `src/components/TermsEditor.tsx`**

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Role } from "../hooks/useIdentity";
import type { HoldState } from "../hooks/useHoldToSeal";
import { PresenceDots } from "./PresenceDots";
import { HoldButton } from "./HoldButton";

interface TermsEditorProps {
  contractId: Id<"contracts">;
  title: string;
  terms: string;
  role: Role;
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
  holdState: HoldState;
  progress: number;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function TermsEditor({
  contractId, title, terms, role,
  creatorLastSeen, guestLastSeen,
  holdState, progress, onPressStart, onPressEnd,
}: TermsEditorProps) {
  const updateTerms = useMutation(api.contracts.updateTerms);
  const [localTitle, setLocalTitle] = useState(title);
  const [localTerms, setLocalTerms] = useState(terms);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalTitle(title); }, [title]);
  useEffect(() => { setLocalTerms(terms); }, [terms]);

  const isCreator = role === "creator";

  const save = useCallback((t: string, tm: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateTerms({ contractId, title: t, terms: tm });
    }, 500);
  }, [contractId, updateTerms]);

  return (
    <div className="flex flex-col gap-4 h-full p-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
          Contract
        </span>
        <PresenceDots creatorLastSeen={creatorLastSeen} guestLastSeen={guestLastSeen} />
      </div>

      {/* Title */}
      <div className="flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-1.5">
          Title
        </div>
        <input
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors read-only:cursor-default"
          value={localTitle}
          onChange={(e) => { setLocalTitle(e.target.value); save(e.target.value, localTerms); }}
          readOnly={!isCreator}
          placeholder="Contract title"
        />
      </div>

      {/* Terms */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-1.5 flex-shrink-0">
          Terms
        </div>
        <textarea
          className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-400 placeholder:text-zinc-700 resize-none focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed read-only:cursor-default"
          value={localTerms}
          onChange={(e) => { setLocalTerms(e.target.value); save(localTitle, e.target.value); }}
          readOnly={!isCreator}
          placeholder="Terms…"
        />
      </div>

      {/* Hold button */}
      {(role === "creator" || role === "guest") && (
        <div className="flex-shrink-0">
          <HoldButton
            holdState={holdState}
            progress={progress}
            onPressStart={onPressStart}
            onPressEnd={onPressEnd}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TermsEditor.tsx
git commit -m "feat: dark redesign for TermsEditor"
```

---

## Task 8: Dark redesign — ChatPanel

**Files:**
- Modify: `src/components/ChatPanel.tsx`

- [ ] **Step 1: Replace `src/components/ChatPanel.tsx`**

Color messages by role: sender name in indigo if it matches `senderLabel` (i.e., the current user), otherwise zinc. Pass `senderLabel` through to identify self:

```tsx
import { useState, useEffect, useRef } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMessages } from "../hooks/useMessages";

interface ChatPanelProps {
  contractId: Id<"contracts">;
  senderId: string;
  senderLabel: string;
  readOnly?: boolean;
}

export function ChatPanel({ contractId, senderId, senderLabel, readOnly }: ChatPanelProps) {
  const { messages, sendMessage } = useMessages(contractId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await sendMessage({ contractId, senderId, senderLabel, text: text.trim() });
    setText("");
  };

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 flex-shrink-0">
        Chat
      </span>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-700">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderLabel === senderLabel;
          return (
            <div key={msg._id} className="text-[13px] leading-relaxed">
              <span className={`font-semibold ${isMine ? "text-indigo-400" : "text-zinc-500"}`}>
                {msg.senderLabel}:{" "}
              </span>
              <span className={isMine ? "text-indigo-300" : "text-zinc-500"}>
                {msg.text}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!readOnly && (
        <form onSubmit={handleSend} className="flex gap-2 flex-shrink-0">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-400 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChatPanel.tsx
git commit -m "feat: dark redesign for ChatPanel"
```

---

## Task 9: Dark redesign — CertificateView + ObserverView

**Files:**
- Modify: `src/components/CertificateView.tsx`
- Modify: `src/components/ObserverView.tsx`
- Modify: `src/pages/ContractPage.tsx`

- [ ] **Step 1: Replace `src/components/CertificateView.tsx`**

Add `guestName?: string` prop and display it:

```tsx
import { useState } from "react";

interface CertificateViewProps {
  title: string;
  terms: string;
  sealedAt: number;
  creatorName: string;
  guestName?: string;
  contractUrl: string;
}

export function CertificateView({
  title, terms, sealedAt, creatorName, guestName, contractUrl
}: CertificateViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contractUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displaySealedAt = new Date(sealedAt).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg border border-zinc-800 rounded-2xl overflow-hidden">

        {/* Header band */}
        <div
          className="px-10 py-9 text-center flex flex-col items-center gap-3 border-b border-indigo-900"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" }}
        >
          <div className="text-4xl">🎉</div>
          <h1 className="font-serif text-2xl font-bold text-zinc-50 leading-tight">{title}</h1>
          <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1 text-[11px] font-bold text-green-400 uppercase tracking-widest">
            ✓ Sealed
          </span>
        </div>

        {/* Body */}
        <div className="bg-zinc-950 px-10 py-8 flex flex-col gap-6">

          {/* Terms */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-2">
              Terms
            </p>
            <p className="whitespace-pre-wrap text-sm text-zinc-400 leading-relaxed">{terms}</p>
          </div>

          <div className="h-px bg-zinc-900" />

          {/* Parties */}
          <div className="flex gap-4">
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Creator</p>
              <p className="text-sm font-semibold text-zinc-50">{creatorName}</p>
              <p className="text-[11px] text-green-400 mt-0.5">✓ Signed</p>
            </div>
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Guest</p>
              <p className="text-sm font-semibold text-zinc-50">{guestName || "Guest"}</p>
              <p className="text-[11px] text-green-400 mt-0.5">✓ Signed</p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-center text-xs text-zinc-700">{displaySealedAt}</p>

          <div className="h-px bg-zinc-900" />

          {/* Permalink */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <code className="text-[11px] text-zinc-600 font-mono truncate">{contractUrl}</code>
            <button
              onClick={handleCopy}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap transition-colors"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `ContractPage.tsx` to pass `guestName`**

In `src/pages/ContractPage.tsx`, update the `CertificateView` call to pass `guestName`.

`contract.guestName` is automatically available because `ContractPage` uses `useContract` which calls `getContract` — a Convex query that returns the entire contract document. Since we added `guestName` to the schema in Task 1, Convex will include it in the returned document. The TypeScript type is inferred from the schema so `contract.guestName` will be typed as `string | undefined`. No query changes needed.

```tsx
// Replace the CertificateView render block (lines 21–31) with:
if (contract.status === "sealed") {
  return (
    <CertificateView
      title={contract.title}
      terms={contract.terms}
      sealedAt={contract.sealedAt!}
      creatorName={contract.creatorName}
      guestName={contract.guestName}
      contractUrl={window.location.href}
    />
  );
}
```

- [ ] **Step 3: Replace `src/components/ObserverView.tsx`**

```tsx
interface ObserverViewProps {
  title: string;
  terms: string;
  message?: string;
}

export function ObserverView({
  title,
  terms,
  message = "This contract is being negotiated.",
}: ObserverViewProps) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg flex flex-col gap-5">
        <p className="text-center text-sm text-zinc-600">{message}</p>
        <div className="border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 opacity-50">
          <h2 className="font-serif text-xl font-bold text-zinc-50">{title}</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-500 leading-relaxed">{terms}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CertificateView.tsx src/components/ObserverView.tsx src/pages/ContractPage.tsx
git commit -m "feat: dark redesign for CertificateView and ObserverView, add guestName to certificate"
```

---

## Task 10: NegotiationView — guest name gate + senderLabel + mobile tabs

This is the most complex task. It combines three changes into one component.

**Files:**
- Modify: `src/components/NegotiationView.tsx`

- [ ] **Step 1: Read the current file carefully before editing**

Open `src/components/NegotiationView.tsx` and verify it still matches what was described in the session (it should — we read it earlier).

- [ ] **Step 2: Replace `src/components/NegotiationView.tsx`**

Note on `useIdentity.ts`: that file also calls `claimGuest` but without `guestName`. Since `guestName` is `v.optional(v.string())` in the Convex schema, calls without it are fully backward compatible — no changes needed in `useIdentity.ts`.

```tsx
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Role } from "../hooks/useIdentity";
import { useHoldToSeal } from "../hooks/useHoldToSeal";
import { getGuestName, setGuestName } from "../lib/session";
import { GuestNamePrompt } from "./GuestNamePrompt";
import { TermsEditor } from "./TermsEditor";
import { ChatPanel } from "./ChatPanel";
import { PresenceDots } from "./PresenceDots";

interface NegotiationViewProps {
  contractId: Id<"contracts">;
  title: string;
  terms: string;
  role: Role;
  sessionId: string;
  creatorId: string;
  creatorName: string;
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
  creatorHoldStart: number | null;
  guestHoldStart: number | null;
  status: "negotiating" | "sealed";
}

type Tab = "contract" | "chat";

export function NegotiationView({
  contractId, title, terms, role, sessionId,
  creatorId, creatorName, creatorLastSeen, guestLastSeen,
  creatorHoldStart, guestHoldStart, status,
}: NegotiationViewProps) {
  // ── Hooks ──────────────────────────────────────────────────
  const touchPresence = useMutation(api.contracts.touchPresence);
  const claimGuest = useMutation(api.contracts.claimGuest);
  const presenceRole = role === "creator" ? "creator" : "guest";

  const [guestNameState, setGuestNameLocalState] = useState<string | null>(() =>
    role === "guest" ? getGuestName() : ""
  );
  const [activeTab, setActiveTab] = useState<Tab>("contract");

  const { holdState, progress, handlePressStart, handlePressEnd } = useHoldToSeal({
    contractId,
    role: role as "creator" | "guest",
    creatorHoldStart,
    guestHoldStart,
    status,
  });

  useEffect(() => {
    touchPresence({ contractId, role: presenceRole });
    const id = setInterval(() => touchPresence({ contractId, role: presenceRole }), 15_000);
    return () => clearInterval(id);
  }, [contractId, presenceRole]);

  // ── Handlers ───────────────────────────────────────────────
  const handleNameConfirm = (name: string) => {
    setGuestName(name);
    setGuestNameLocalState(name);
    claimGuest({ contractId, sessionId, guestName: name || undefined });
  };

  // ── Guest name gate ────────────────────────────────────────
  if (role === "guest" && guestNameState === null) {
    return <GuestNamePrompt contractTitle={title} onConfirm={handleNameConfirm} />;
  }

  // ── Derived values ─────────────────────────────────────────
  const senderId = role === "creator" ? creatorId : sessionId;
  const senderLabel = role === "creator" ? creatorName : (guestNameState || "Guest");

  // ── Shared top bar ─────────────────────────────────────────
  const topBar = (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-900 flex-shrink-0">
      <div className="font-serif text-base font-bold text-zinc-50">🤝 Handshake</div>
      <PresenceDots creatorLastSeen={creatorLastSeen} guestLastSeen={guestLastSeen} />
    </div>
  );

  // ── Shared contract + chat content ─────────────────────────
  const contractContent = (
    <TermsEditor
      contractId={contractId}
      title={title}
      terms={terms}
      role={role}
      creatorLastSeen={creatorLastSeen}
      guestLastSeen={guestLastSeen}
      holdState={holdState}
      progress={progress}
      onPressStart={handlePressStart}
      onPressEnd={handlePressEnd}
    />
  );

  const chatContent = (
    <ChatPanel
      contractId={contractId}
      senderId={senderId}
      senderLabel={senderLabel}
    />
  );

  return (
    <>
      {/* ── Desktop (md+): side-by-side ── */}
      <div className="hidden md:flex h-screen bg-zinc-950 flex-col">
        {topBar}
        <div className="flex flex-1 min-h-0">
          <div className="w-3/5 border-r border-zinc-900 flex flex-col overflow-hidden">
            {contractContent}
          </div>
          <div className="w-2/5 flex flex-col overflow-hidden">
            {chatContent}
          </div>
        </div>
      </div>

      {/* ── Mobile (<md): tabs ── */}
      <div className="flex md:hidden flex-col h-[100dvh] bg-zinc-950">
        {topBar}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === "contract" ? contractContent : chatContent}
        </div>
        <div className="flex border-t border-zinc-900 flex-shrink-0">
          {(["contract", "chat"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors border-t-2 ${
                activeTab === tab
                  ? "text-indigo-400 border-t-indigo-500"
                  : "text-zinc-700 border-t-transparent"
              }`}
            >
              <span className="text-lg">{tab === "contract" ? "📄" : "💬"}</span>
              {tab}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: no errors. If `claimGuest` type error occurs (old call sites don't pass `guestName`), check `useIdentity.ts` — its `claimGuest` call doesn't need `guestName` because it's called before the name prompt is shown. The `guestName` arg is optional (`v.optional`) so existing calls without it are valid.

- [ ] **Step 4: Run all tests**

```bash
bun test
```

Expected: all tests pass (holdState tests + guest name tests).

- [ ] **Step 5: Manual test — guest name gate**

1. Open app, create a contract (sign in as creator)
2. Copy link, open in incognito/new browser
3. Should see the name prompt screen with the contract title shown
4. Enter a name and click "Join Contract →"
5. Should land in the negotiation view

- [ ] **Step 6: Manual test — mobile tabs**

1. Open Chrome DevTools → toggle device toolbar (mobile view, ~375px wide)
2. Navigate to a contract page
3. Should see "Contract" and "Chat" tabs at the bottom
4. Tapping "Chat" should show the chat panel
5. Tapping back to "Contract" should show terms + hold button

- [ ] **Step 7: Commit**

```bash
git add src/components/NegotiationView.tsx
git commit -m "feat: guest name gate, senderLabel update, and mobile tab layout in NegotiationView"
```

---

## Task 11: Final verification

- [ ] **Step 1: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all tests**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 3: Build check**

```bash
bun run build
```

Expected: build succeeds with no errors. Note: build may warn about unused CSS variables (acceptable).

- [ ] **Step 4: Full end-to-end smoke test**

1. Open `http://localhost:5173` — should show dark home page with Playfair Display heading
2. Sign in, create a contract — should navigate to negotiation view
3. Copy link, open in incognito/private window
4. Guest should see name prompt → enter name → negotiate → both hold → sealed
5. Certificate should show guest name, copy link button should work
6. View on mobile width — should see tab bar

- [ ] **Step 5: Commit all remaining changes if any**

```bash
git status
# If clean, nothing to do. If dirty, add and commit with descriptive message.
```

- [ ] **Step 6: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

After push, Vercel will auto-deploy. Verify the deployed app at the Vercel URL works end-to-end.
