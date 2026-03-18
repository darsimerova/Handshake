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
