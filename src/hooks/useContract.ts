import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useContract(contractId: Id<"contracts"> | undefined) {
  return useQuery(
    api.contracts.getContract,
    contractId ? { contractId } : "skip"
  );
}
