import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Role } from "../hooks/useIdentity";
import { useHoldToSeal } from "../hooks/useHoldToSeal";
import { TermsEditor } from "./TermsEditor";
import { ChatPanel } from "./ChatPanel";

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

export function NegotiationView({
  contractId, title, terms, role, sessionId,
  creatorId, creatorName, creatorLastSeen, guestLastSeen,
  creatorHoldStart, guestHoldStart, status,
}: NegotiationViewProps) {
  const touchPresence = useMutation(api.contracts.touchPresence);
  const presenceRole = role === "creator" ? "creator" : "guest";

  // Ping every 15s so presence stays alive during read-only periods
  useEffect(() => {
    touchPresence({ contractId, role: presenceRole });
    const id = setInterval(() => touchPresence({ contractId, role: presenceRole }), 15_000);
    return () => clearInterval(id);
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
      <div className="w-3/5 border-r flex flex-col overflow-hidden">
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
      </div>
      <div className="w-2/5 flex flex-col overflow-hidden">
        <ChatPanel
          contractId={contractId}
          senderId={senderId}
          senderLabel={senderLabel}
        />
      </div>
    </div>
  );
}
