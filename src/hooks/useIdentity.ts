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
    claimGuest({ contractId, sessionId });
  }, [isLoaded, contractId, contract?.status, contract?.guestId, user]);

  if (!isLoaded || contract === undefined) return { role: "loading", sessionId };
  if (contract?.status === "sealed") return { role: "observer", sessionId };
  if (user && contract?.creatorId === user.id) return { role: "creator", sessionId };
  if (user) return { role: "observer", sessionId }; // signed in but not creator
  if (contract?.guestId === sessionId) return { role: "guest", sessionId };
  if (contract?.guestId === null) return { role: "loading", sessionId }; // still claiming
  return { role: "observer", sessionId }; // slot taken
}
