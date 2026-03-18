import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contracts: defineTable({
    title: v.string(),
    terms: v.string(),
    status: v.union(v.literal("negotiating"), v.literal("sealed")),
    creatorId: v.string(),
    creatorName: v.string(), // stored at creation so guests see it on the certificate
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
