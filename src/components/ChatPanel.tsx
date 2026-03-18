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
    <div className="flex flex-col h-full p-4 gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Chat
      </span>

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
          <input
            className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
