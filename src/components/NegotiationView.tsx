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
