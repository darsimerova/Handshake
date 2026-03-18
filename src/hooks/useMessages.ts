import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useMessages(contractId: Id<"contracts">) {
  const messages = useQuery(api.messages.listMessages, { contractId });
  const sendMessage = useMutation(api.messages.sendMessage);
  return { messages: messages ?? [], sendMessage };
}
