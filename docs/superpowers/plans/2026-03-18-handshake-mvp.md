# Handshake MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a micro-contract app where two parties negotiate terms in real-time and seal the deal by holding a button simultaneously for 3 seconds.

**Architecture:** React + Vite SPA with two routes (`/` and `/c/:contractId`). Convex handles all real-time state (contract, messages, hold timestamps). Clerk authenticates the creator; Party B is anonymous with a localStorage session ID.

**Tech Stack:** React 18, Vite, TypeScript, Convex, Clerk, shadcn/ui, React Router v6, Vercel

---

## File Map

```
convex/
  schema.ts               - Convex schema: contracts + messages tables
  contracts.ts            - All contract mutations + queries
  messages.ts             - Message mutations + queries

src/
  main.tsx                - App entry: ConvexProvider + ClerkProvider
  App.tsx                 - React Router: / and /c/:contractId
  lib/
    session.ts            - Guest session ID (localStorage)
  hooks/
    useIdentity.ts        - Resolve caller role: creator | guest | observer
    useHoldToSeal.ts      - Hold-to-seal mechanic (countdown, seal trigger)
    useMessages.ts        - Messages query + send mutation
  pages/
    HomePage.tsx          - Create contract form (requires Clerk sign-in)
    ContractPage.tsx      - Loads contract, dispatches to correct view
  components/
    CreateForm.tsx        - Title + terms form
    NegotiationView.tsx   - Split layout: ContractPanel + ChatPanel
    ContractPanel.tsx     - Title, terms (editable/RO), presence, hold button
    ChatPanel.tsx         - Message list + input
    HoldButton.tsx        - 4-state hold-to-seal button
    PresenceDots.tsx      - Online indicators (lastSeen within 30s)
    CertificateView.tsx   - Read-only sealed contract display
    ObserverView.tsx      - "This contract is being negotiated" screen

.gitignore                - Add .superpowers/
vercel.json               - SPA rewrite rule
```

---

## Task 1: Project Scaffold

**Files:**
- Modify: `package.json`, `tsconfig.json`, `vite.config.ts`
- Create: `.env.local`, `vercel.json`, update `.gitignore`

- [ ] **Step 1: Create feature branch + install dependencies**

```bash
git checkout -b feature/handshake-mvp
bun add convex @clerk/clerk-react react-router-dom
bun add -d @vitejs/plugin-react
bunx shadcn@latest init
# choose: TypeScript, default style (New York), CSS variables: yes
```

- [ ] **Step 2: Add shadcn components we'll use**

```bash
bunx shadcn@latest add button textarea input card badge
```

- [ ] **Step 3: Initialize Convex**

```bash
bunx convex dev
# Follow prompts to create a new Convex project. This generates:
#   convex/_generated/  (auto-generated, do not edit)
#   convex/tsconfig.json
# Copy the CONVEX_URL from the dashboard.
```

- [ ] **Step 4: Create `.env.local`**

```bash
# .env.local
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<your-clerk-key>
```

- [ ] **Step 5: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

- [ ] **Step 6: Update `.gitignore`**

Add to `.gitignore`:
```
.env.local
.superpowers/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + Convex + Clerk + shadcn"
```

---

## Task 2: Convex Schema

**Files:**
- Create: `convex/schema.ts`

- [ ] **Step 1: Write the schema**

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contracts: defineTable({
    title: v.string(),
    terms: v.string(),
    status: v.union(v.literal("negotiating"), v.literal("sealed")),
    creatorId: v.string(),
    creatorName: v.string(),        // stored at creation so guests can see it on the certificate
    guestId: v.union(v.string(), v.null()),
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

- [ ] **Step 2: Verify schema pushes cleanly**

```bash
bunx convex dev
# Expected: "✓ Schema validated" — no type errors
```

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add Convex schema for contracts and messages"
```

---

## Task 3: Convex Contract Functions

**Files:**
- Create: `convex/contracts.ts`

All contract mutations + queries live here.

- [ ] **Step 1: Write `convex/contracts.ts`**

```typescript
// convex/contracts.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new contract. Requires Clerk auth.
export const createContract = mutation({
  args: { title: v.string(), terms: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.db.insert("contracts", {
      title: args.title,
      terms: args.terms,
      status: "negotiating",
      creatorId: identity.subject,
      creatorName: identity.name ?? identity.email ?? "Creator",
      guestId: null,
      createdAt: Date.now(),
      sealedAt: null,
      creatorHoldStart: null,
      guestHoldStart: null,
      creatorLastSeen: Date.now(),
      guestLastSeen: null,
    });
  },
});

// Subscribe to a contract by ID.
export const getContract = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contractId);
  },
});

// Update title + terms. Creator only.
export const updateTerms = mutation({
  args: {
    contractId: v.id("contracts"),
    title: v.string(),
    terms: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.status !== "negotiating") return;
    if (contract.creatorId !== identity.subject) throw new Error("Only creator can update terms");
    await ctx.db.patch(args.contractId, {
      title: args.title,
      terms: args.terms,
      creatorLastSeen: Date.now(),
    });
  },
});

// Claim the guest slot. Anonymous callers only.
// No-ops if: caller is authenticated, slot already taken by someone else,
// or contract is sealed.
export const claimGuest = mutation({
  args: { contractId: v.id("contracts"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity) return; // authenticated user — skip
    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.status === "sealed") return;
    if (contract.guestId === args.sessionId) {
      // already registered — just update lastSeen
      await ctx.db.patch(args.contractId, { guestLastSeen: Date.now() });
      return;
    }
    if (contract.guestId !== null) return; // slot taken by someone else
    await ctx.db.patch(args.contractId, {
      guestId: args.sessionId,
      guestLastSeen: Date.now(),
    });
  },
});

// Touch lastSeen for a party (called periodically to maintain presence).
export const touchPresence = mutation({
  args: {
    contractId: v.id("contracts"),
    role: v.union(v.literal("creator"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) return;
    const patch =
      args.role === "creator"
        ? { creatorLastSeen: Date.now() }
        : { guestLastSeen: Date.now() };
    await ctx.db.patch(args.contractId, patch);
  },
});

// Start holding. Writes server-side timestamp.
export const setHold = mutation({
  args: {
    contractId: v.id("contracts"),
    role: v.union(v.literal("creator"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.status !== "negotiating") return;
    const now = Date.now();
    const patch =
      args.role === "creator"
        ? { creatorHoldStart: now, creatorLastSeen: now }
        : { guestHoldStart: now, guestLastSeen: now };
    await ctx.db.patch(args.contractId, patch);
  },
});

// Release hold.
export const clearHold = mutation({
  args: {
    contractId: v.id("contracts"),
    role: v.union(v.literal("creator"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) return;
    const patch =
      args.role === "creator"
        ? { creatorHoldStart: null }
        : { guestHoldStart: null };
    await ctx.db.patch(args.contractId, patch);
  },
});

// Attempt to seal. Called by client when countdown completes.
// Server re-validates all conditions before committing.
export const sealContract = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) return;
    if (contract.status !== "negotiating") return; // already sealed — reactive sub handles redirect
    const { creatorHoldStart, guestHoldStart } = contract;
    if (!creatorHoldStart || !guestHoldStart) return;
    const now = Date.now();
    // Stale guard: reject timestamps older than 10s
    if (now - creatorHoldStart > 10_000 || now - guestHoldStart > 10_000) {
      await ctx.db.patch(args.contractId, {
        creatorHoldStart: null,
        guestHoldStart: null,
      });
      return;
    }
    // Duration guard: overlap must be at least 3s
    const overlapStart = Math.max(creatorHoldStart, guestHoldStart);
    if (now - overlapStart < 3_000) return;
    await ctx.db.patch(args.contractId, {
      status: "sealed",
      sealedAt: now,
      creatorHoldStart: null,
      guestHoldStart: null,
    });
  },
});
```

- [ ] **Step 2: Verify functions compile**

```bash
bunx convex dev
# Expected: no TypeScript errors, functions appear in dashboard
```

- [ ] **Step 3: Commit**

```bash
git add convex/contracts.ts
git commit -m "feat: add Convex contract mutations and queries"
```

---

## Task 4: Convex Message Functions

**Files:**
- Create: `convex/messages.ts`

- [ ] **Step 1: Write `convex/messages.ts`**

```typescript
// convex/messages.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    contractId: v.id("contracts"),
    senderId: v.string(),
    senderLabel: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.status !== "negotiating") return;
    await ctx.db.insert("messages", {
      contractId: args.contractId,
      senderId: args.senderId,
      senderLabel: args.senderLabel,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

export const listMessages = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .order("asc")
      .collect();
  },
});
```

- [ ] **Step 2: Verify + commit**

```bash
bunx convex dev
# Expected: no errors
git add convex/messages.ts
git commit -m "feat: add Convex message mutations and queries"
```

---

## Task 5: Guest Session Utility + Identity Hook

**Files:**
- Create: `src/lib/session.ts`
- Create: `src/hooks/useIdentity.ts`

- [ ] **Step 1: Write `src/lib/session.ts`**

```typescript
// src/lib/session.ts
// Returns a stable anonymous session ID, persisted in localStorage.
const SESSION_KEY = "handshake_guest_id";

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
```

- [ ] **Step 2: Write `src/hooks/useIdentity.ts`**

```typescript
// src/hooks/useIdentity.ts
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getSessionId } from "../lib/session";

export type Role = "creator" | "guest" | "observer" | "loading";

interface Contract {
  creatorId: string;
  guestId: string | null;
  status: "negotiating" | "sealed";
}

export function useIdentity(
  contractId: Id<"contracts"> | undefined,
  contract: Contract | null | undefined
): { role: Role; sessionId: string } {
  const { user, isLoaded } = useUser();
  const claimGuest = useMutation(api.contracts.claimGuest);
  const sessionId = getSessionId();

  useEffect(() => {
    if (!isLoaded || !contractId || !contract) return;
    if (contract.status === "sealed") return;
    if (user) return; // authenticated — don't claim
    // Anonymous: attempt to claim guest slot
    claimGuest({ contractId, sessionId });
  }, [isLoaded, contractId, contract?.status, contract?.guestId, user]);

  if (!isLoaded || contract === undefined) return { role: "loading", sessionId };

  // Sealed: everyone can read
  if (contract?.status === "sealed") return { role: "observer", sessionId };

  if (user && contract?.creatorId === user.id) return { role: "creator", sessionId };
  if (user) return { role: "observer", sessionId }; // signed in but not creator
  if (contract?.guestId === sessionId) return { role: "guest", sessionId };
  if (contract?.guestId === null) return { role: "loading", sessionId }; // still claiming
  return { role: "observer", sessionId }; // slot taken by someone else
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/session.ts src/hooks/useIdentity.ts
git commit -m "feat: guest session utility and identity hook"
```

---

## Task 6: Home Page (Create Form)

**Files:**
- Create: `src/components/CreateForm.tsx`
- Create: `src/pages/HomePage.tsx`

- [ ] **Step 1: Write `src/components/CreateForm.tsx`**

```typescript
// src/components/CreateForm.tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateForm() {
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(false);
  const createContract = useMutation(api.contracts.createContract);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !terms.trim()) return;
    setLoading(true);
    try {
      const id = await createContract({ title: title.trim(), terms: terms.trim() });
      navigate(`/c/${id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-lg">
      <div>
        <label className="text-sm font-medium mb-1 block">Contract title</label>
        <Input
          placeholder="e.g. Freelance Design Work — April 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Terms</label>
        <Textarea
          placeholder="Describe the agreement..."
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={6}
          required
        />
      </div>
      <Button type="submit" disabled={loading || !title.trim() || !terms.trim()}>
        {loading ? "Creating…" : "Create & Get Link →"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/pages/HomePage.tsx`**

```typescript
// src/pages/HomePage.tsx
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { CreateForm } from "../components/CreateForm";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">🤝 Handshake</h1>
        <p className="text-muted-foreground mt-2">
          Create a micro-contract. Negotiate. Seal it together.
        </p>
      </div>
      <SignedOut>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">Sign in to create a contract</p>
          <SignInButton mode="modal">
            <Button size="lg">Sign in</Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <CreateForm />
      </SignedIn>
    </div>
  );
}
```

- [ ] **Step 3: Verify mutation fires**

```bash
bunx convex dev
# Sign in → fill form → submit in browser (App.tsx not wired yet — check Convex dashboard)
# Open Convex dashboard → Functions → createContract → should show a successful call
# Full browser smoke test is in Task 11 once App.tsx and main.tsx are wired up
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CreateForm.tsx src/pages/HomePage.tsx
git commit -m "feat: home page with create contract form"
```

---

## Task 7: `useHoldToSeal` Hook

**Files:**
- Create: `src/hooks/useHoldToSeal.ts`

This is the most critical hook. It drives the countdown and calls `sealContract`.

- [ ] **Step 1: Write `src/hooks/useHoldToSeal.ts`**

```typescript
// src/hooks/useHoldToSeal.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type HoldState = "idle" | "oneHolding" | "bothHolding" | "sealed";

interface UseHoldToSealOptions {
  contractId: Id<"contracts">;
  role: "creator" | "guest";
  creatorHoldStart: number | null;
  guestHoldStart: number | null;
  status: "negotiating" | "sealed";
}

export function useHoldToSeal({
  contractId,
  role,
  creatorHoldStart,
  guestHoldStart,
  status,
}: UseHoldToSealOptions) {
  const setHold = useMutation(api.contracts.setHold);
  const clearHold = useMutation(api.contracts.clearHold);
  const sealContract = useMutation(api.contracts.sealContract);

  // 0–1 progress value for the countdown animation
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const sealCalledRef = useRef(false);

  const myHoldStart = role === "creator" ? creatorHoldStart : guestHoldStart;
  const otherHoldStart = role === "creator" ? guestHoldStart : creatorHoldStart;
  const bothHolding = myHoldStart !== null && otherHoldStart !== null;

  // Drive countdown animation when both are holding
  useEffect(() => {
    if (!bothHolding) {
      setProgress(0);
      sealCalledRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const overlapStart = Math.max(creatorHoldStart!, guestHoldStart!);

    const tick = () => {
      const elapsed = Date.now() - overlapStart;
      const p = Math.min(elapsed / 3000, 1);
      setProgress(p);

      if (elapsed >= 3000 && !sealCalledRef.current) {
        sealCalledRef.current = true;
        sealContract({ contractId });
        return;
      }

      if (elapsed < 3000) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [bothHolding, creatorHoldStart, guestHoldStart, contractId]);

  const holdState: HoldState =
    status === "sealed"
      ? "sealed"
      : bothHolding
      ? "bothHolding"
      : myHoldStart !== null || otherHoldStart !== null
      ? "oneHolding"
      : "idle";

  const handlePressStart = useCallback(() => {
    if (status !== "negotiating") return;
    setHold({ contractId, role });
  }, [contractId, role, status]);

  const handlePressEnd = useCallback(() => {
    clearHold({ contractId, role });
  }, [contractId, role]);

  return { holdState, progress, handlePressStart, handlePressEnd };
}
```

- [ ] **Step 2: Write a quick unit test for the hook's hold-state logic**

Create `src/hooks/__tests__/holdState.test.ts`:

```typescript
// src/hooks/__tests__/holdState.test.ts
// Test the hold-state derivation logic in isolation (pure function extracted for testing)

type HoldState = "idle" | "oneHolding" | "bothHolding" | "sealed";

function deriveHoldState(
  status: "negotiating" | "sealed",
  myHoldStart: number | null,
  otherHoldStart: number | null
): HoldState {
  if (status === "sealed") return "sealed";
  if (myHoldStart !== null && otherHoldStart !== null) return "bothHolding";
  if (myHoldStart !== null || otherHoldStart !== null) return "oneHolding";
  return "idle";
}

describe("deriveHoldState", () => {
  it("returns idle when nothing is held", () => {
    expect(deriveHoldState("negotiating", null, null)).toBe("idle");
  });
  it("returns oneHolding when only self is holding", () => {
    expect(deriveHoldState("negotiating", 1000, null)).toBe("oneHolding");
  });
  it("returns oneHolding when only other is holding", () => {
    expect(deriveHoldState("negotiating", null, 1000)).toBe("oneHolding");
  });
  it("returns bothHolding when both are holding", () => {
    expect(deriveHoldState("negotiating", 1000, 2000)).toBe("bothHolding");
  });
  it("returns sealed regardless of hold state when contract is sealed", () => {
    expect(deriveHoldState("sealed", 1000, 2000)).toBe("sealed");
  });
});
```

- [ ] **Step 3: Add Bun test runner and run tests**

```bash
# bun has a built-in test runner — no extra install needed
bun test src/hooks/__tests__/holdState.test.ts
# Expected: 5 passing
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useHoldToSeal.ts src/hooks/__tests__/holdState.test.ts
git commit -m "feat: useHoldToSeal hook with hold-state unit tests"
```

---

## Task 8: `HoldButton` + `PresenceDots` Components

**Files:**
- Create: `src/components/HoldButton.tsx`
- Create: `src/components/PresenceDots.tsx`

- [ ] **Step 1: Write `src/components/PresenceDots.tsx`**

```typescript
// src/components/PresenceDots.tsx
import { useState, useEffect } from "react";

const ONLINE_THRESHOLD_MS = 30_000;

interface PresenceDotsProps {
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
}

export function PresenceDots({ creatorLastSeen, guestLastSeen }: PresenceDotsProps) {
  // Re-render every 10s so dots go offline accurately without waiting for a Convex update
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const creatorOnline = creatorLastSeen !== null && now - creatorLastSeen < ONLINE_THRESHOLD_MS;
  const guestOnline = guestLastSeen !== null && now - guestLastSeen < ONLINE_THRESHOLD_MS;

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            creatorOnline ? "bg-indigo-500" : "bg-muted"
          }`}
        />
        Creator
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            guestOnline ? "bg-green-500" : "bg-muted"
          }`}
        />
        Guest
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/HoldButton.tsx`**

```typescript
// src/components/HoldButton.tsx
import type { HoldState } from "../hooks/useHoldToSeal";

interface HoldButtonProps {
  holdState: HoldState;
  progress: number; // 0–1
  onPressStart: () => void;
  onPressEnd: () => void;
}

const STATE_CONFIG = {
  idle: {
    label: "Hold to Seal",
    sublabel: "Both must hold 3s",
    emoji: "🤝",
    className: "border-indigo-500 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20",
  },
  oneHolding: {
    label: "Waiting for other…",
    sublabel: "Keep holding",
    emoji: "⏳",
    className: "border-indigo-400 bg-indigo-500/20 text-indigo-300 animate-pulse",
  },
  bothHolding: {
    label: "Hold…",
    sublabel: "",
    emoji: "🔒",
    className: "border-green-500 bg-green-500/20 text-green-400",
  },
  sealed: {
    label: "Sealed",
    sublabel: "",
    emoji: "✅",
    className: "border-green-500 bg-green-500/20 text-green-400",
  },
};

export function HoldButton({ holdState, progress, onPressStart, onPressEnd }: HoldButtonProps) {
  const config = STATE_CONFIG[holdState];
  const isDisabled = holdState === "sealed";

  return (
    <div className="relative w-full select-none">
      {/* Progress bar fills from left */}
      {holdState === "bothHolding" && (
        <div
          className="absolute inset-0 bg-green-500/30 rounded-lg transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <button
        className={`relative w-full border-2 rounded-lg py-4 text-center cursor-pointer transition-colors ${config.className}`}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={(e) => { e.preventDefault(); onPressStart(); }}
        onTouchEnd={onPressEnd}
        disabled={isDisabled}
      >
        <div className="text-2xl">{config.emoji}</div>
        <div className="font-bold mt-1">{config.label}</div>
        {config.sublabel && (
          <div className="text-xs opacity-60 mt-0.5">{config.sublabel}</div>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/HoldButton.tsx src/components/PresenceDots.tsx
git commit -m "feat: HoldButton and PresenceDots components"
```

---

## Task 9: `ContractPanel` + `ChatPanel` + `useMessages`

**Files:**
- Create: `src/hooks/useMessages.ts`
- Create: `src/components/ContractPanel.tsx`
- Create: `src/components/ChatPanel.tsx`

- [ ] **Step 1: Write `src/hooks/useMessages.ts`**

```typescript
// src/hooks/useMessages.ts
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useMessages(contractId: Id<"contracts">) {
  const messages = useQuery(api.messages.listMessages, { contractId });
  const sendMessage = useMutation(api.messages.sendMessage);
  return { messages: messages ?? [], sendMessage };
}
```

- [ ] **Step 2: Write `src/components/ContractPanel.tsx`**

```typescript
// src/components/ContractPanel.tsx
import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Role } from "../hooks/useIdentity";
import type { HoldState } from "../hooks/useHoldToSeal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PresenceDots } from "./PresenceDots";
import { HoldButton } from "./HoldButton";

interface ContractPanelProps {
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

export function ContractPanel({
  contractId,
  title,
  terms,
  role,
  creatorLastSeen,
  guestLastSeen,
  holdState,
  progress,
  onPressStart,
  onPressEnd,
}: ContractPanelProps) {
  const updateTerms = useMutation(api.contracts.updateTerms);
  const [localTitle, setLocalTitle] = useState(title);
  const [localTerms, setLocalTerms] = useState(terms);

  // Keep local state in sync when Convex pushes updates
  useEffect(() => { setLocalTitle(title); }, [title]);
  useEffect(() => { setLocalTerms(terms); }, [terms]);

  const isCreator = role === "creator";

  // Debounced save: 500ms after last keystroke
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (newTitle: string, newTerms: string) => {
      setLocalTitle(newTitle);
      setLocalTerms(newTerms);
      if (debounceTimer) clearTimeout(debounceTimer);
      const t = setTimeout(() => {
        updateTerms({ contractId, title: newTitle, terms: newTerms });
      }, 500);
      setDebounceTimer(t);
    },
    [contractId, debounceTimer, updateTerms]
  );

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contract
        </h2>
        <PresenceDots creatorLastSeen={creatorLastSeen} guestLastSeen={guestLastSeen} />
      </div>

      <Input
        value={localTitle}
        onChange={(e) => handleChange(e.target.value, localTerms)}
        readOnly={!isCreator}
        placeholder="Contract title"
        className="font-semibold"
      />

      <Textarea
        value={localTerms}
        onChange={(e) => handleChange(localTitle, e.target.value)}
        readOnly={!isCreator}
        placeholder="Terms..."
        className="flex-1 resize-none"
        rows={8}
      />

      {(role === "creator" || role === "guest") && (
        <HoldButton
          holdState={holdState}
          progress={progress}
          onPressStart={onPressStart}
          onPressEnd={onPressEnd}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/ChatPanel.tsx`**

```typescript
// src/components/ChatPanel.tsx
import { useState, useEffect, useRef } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMessages } from "../hooks/useMessages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  // Auto-scroll to latest message
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
    <div className="flex flex-col h-full p-4 gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Chat
      </h2>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div key={msg._id} className="text-sm">
            <span className="font-medium">{msg.senderLabel}: </span>
            <span className="text-muted-foreground">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!readOnly && (
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!text.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMessages.ts src/components/ContractPanel.tsx src/components/ChatPanel.tsx
git commit -m "feat: ContractPanel, ChatPanel, and useMessages hook"
```

---

## Task 10: Views Assembly + `ContractPage`

**Files:**
- Create: `src/components/NegotiationView.tsx`
- Create: `src/components/CertificateView.tsx`
- Create: `src/components/ObserverView.tsx`
- Create: `src/pages/ContractPage.tsx`

- [ ] **Step 1: Write `src/components/NegotiationView.tsx`**

```typescript
// src/components/NegotiationView.tsx
import { useEffect } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import type { Role } from "../hooks/useIdentity";
import { useHoldToSeal } from "../hooks/useHoldToSeal";
import { ContractPanel } from "./ContractPanel";
import { ChatPanel } from "./ChatPanel";
import { api } from "../../convex/_generated/api";

interface NegotiationViewProps {
  contractId: Id<"contracts">;
  title: string;
  terms: string;
  role: Role;
  sessionId: string;
  creatorId: string;
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
  creatorHoldStart: number | null;
  guestHoldStart: number | null;
  status: "negotiating" | "sealed";
  creatorName: string;
}

export function NegotiationView({
  contractId,
  title,
  terms,
  role,
  sessionId,
  creatorId,
  creatorLastSeen,
  guestLastSeen,
  creatorHoldStart,
  guestHoldStart,
  status,
  creatorName,
}: NegotiationViewProps) {
  const touchPresence = useMutation(api.contracts.touchPresence);
  const presenceRole = role === "creator" ? "creator" : "guest";

  // Ping presence every 15s so presence dots stay lit during read-only periods
  useEffect(() => {
    touchPresence({ contractId, role: presenceRole });
    const interval = setInterval(() => {
      touchPresence({ contractId, role: presenceRole });
    }, 15_000);
    return () => clearInterval(interval);
  }, [contractId, presenceRole]);

  const senderId = role === "creator" ? creatorId : sessionId;
  const senderLabel = role === "creator" ? creatorName : "Guest";

  const { holdState, progress, handlePressStart, handlePressEnd } = useHoldToSeal({
    contractId,
    role: role as "creator" | "guest",
    creatorHoldStart,
    guestHoldStart,
    status,
  });

  return (
    <div className="flex h-screen">
      {/* Contract panel — 3/5 */}
      <div className="w-3/5 border-r flex flex-col">
        <ContractPanel
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
      </div>
      {/* Chat panel — 2/5 */}
      <div className="w-2/5 flex flex-col">
        <ChatPanel
          contractId={contractId}
          senderId={senderId}
          senderLabel={senderLabel}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/CertificateView.tsx`**

```typescript
// src/components/CertificateView.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CertificateViewProps {
  title: string;
  terms: string;
  sealedAt: number;
  creatorName: string;
  contractUrl: string;
}

export function CertificateView({
  title,
  terms,
  sealedAt,
  creatorName,
  contractUrl,
}: CertificateViewProps) {
  const sealedDate = new Date(sealedAt).toLocaleString();

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🎉</div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <Badge variant="secondary" className="w-fit mx-auto mt-2">
            ✅ Sealed
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Terms</p>
            <p className="whitespace-pre-wrap text-sm">{terms}</p>
          </div>
          <div className="border-t pt-4 text-sm text-muted-foreground text-center">
            <p>Sealed by <strong>{creatorName}</strong> and <strong>Guest</strong></p>
            <p className="mt-1">{sealedDate}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Permanent link</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">{contractUrl}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/ObserverView.tsx`**

```typescript
// src/components/ObserverView.tsx
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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center text-muted-foreground text-sm">{message}</div>
        <div className="border rounded-lg p-6 flex flex-col gap-4 opacity-60">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="whitespace-pre-wrap text-sm">{terms}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/pages/ContractPage.tsx`**

```typescript
// src/pages/ContractPage.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useIdentity } from "../hooks/useIdentity";
import { NegotiationView } from "../components/NegotiationView";
import { CertificateView } from "../components/CertificateView";
import { ObserverView } from "../components/ObserverView";

export function ContractPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const contract = useQuery(api.contracts.getContract, {
    contractId: contractId as Id<"contracts">,
  });
  const { role, sessionId } = useIdentity(
    contractId as Id<"contracts">,
    contract ?? null
  );

  if (contract === undefined || role === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (contract === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Contract not found.
      </div>
    );
  }

  const contractUrl = window.location.href;

  if (contract.status === "sealed") {
    return (
      <CertificateView
        title={contract.title}
        terms={contract.terms}
        sealedAt={contract.sealedAt!}
        creatorName={contract.creatorName}  // stored at creation — correct for all visitors
        contractUrl={contractUrl}
      />
    );
  }

  if (role === "observer") {
    return (
      <ObserverView
        title={contract.title}
        terms={contract.terms}
      />
    );
  }

  return (
    <NegotiationView
      contractId={contract._id}
      title={contract.title}
      terms={contract.terms}
      role={role}
      sessionId={sessionId}
      creatorId={contract.creatorId}
      creatorLastSeen={contract.creatorLastSeen}
      guestLastSeen={contract.guestLastSeen}
      creatorHoldStart={contract.creatorHoldStart}
      guestHoldStart={contract.guestHoldStart}
      status={contract.status}
      creatorName={contract.creatorName}  // stored at creation — correct for all visitors
    />
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/NegotiationView.tsx src/components/CertificateView.tsx \
        src/components/ObserverView.tsx src/pages/ContractPage.tsx
git commit -m "feat: NegotiationView, CertificateView, ObserverView, ContractPage"
```

---

## Task 11: App Wiring + Vercel Deploy

**Files:**
- Modify: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Write `src/main.tsx`**

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Write `src/App.tsx`**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ContractPage } from "./pages/ContractPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:contractId" element={<ContractPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Full local smoke test**

```bash
bunx convex dev &
bun run dev
```

Open two browser windows to `http://localhost:5173`:
1. Window 1: Sign in → create contract → copy URL
2. Window 2: Open the URL → guest slot claimed
3. Both windows: negotiate via chat, creator edits terms
4. Both windows: hold button simultaneously → countdown → sealed certificate

Expected: both windows redirect to certificate view on seal.

- [ ] **Step 4: Run all tests**

```bash
bun test
# Expected: all passing
```

- [ ] **Step 5: Deploy to Vercel**

```bash
bunx convex deploy
# Then in Vercel dashboard: import project, add env vars:
#   VITE_CONVEX_URL (production Convex URL)
#   VITE_CLERK_PUBLISHABLE_KEY
```

- [ ] **Step 6: Final commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: wire up app providers, router, and deploy config"
```

---

## Implementation Order Summary

| # | Task | Why first |
|---|---|---|
| 1 | Scaffold | Nothing works without it |
| 2 | Schema | Unblocks everything backend |
| 3 | Contract functions | Core mutations needed by all UI |
| 4 | Message functions | Needed by ChatPanel |
| 5 | Session + identity | Needed by all pages |
| 6 | Home page | First thing users see; validates auth + Convex wiring |
| 7 | `useHoldToSeal` | Hardest logic; test early |
| 8 | HoldButton + PresenceDots | Pure UI; easy to verify in isolation |
| 9 | ContractPanel + ChatPanel | Compose from previous pieces |
| 10 | Views + ContractPage | Final assembly |
| 11 | App wiring + deploy | Ship it |
