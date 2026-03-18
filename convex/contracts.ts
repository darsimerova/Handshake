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
    // Duration guard: overlap must be at least 3s server-side
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
