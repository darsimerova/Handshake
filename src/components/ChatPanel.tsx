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
    <div className="flex flex-col h-full p-5 gap-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 flex-shrink-0">
        Chat
      </span>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-700">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderLabel === senderLabel;
          return (
            <div key={msg._id} className="text-[13px] leading-relaxed">
              <span className={`font-semibold ${isMine ? "text-indigo-400" : "text-zinc-500"}`}>
                {msg.senderLabel}:{" "}
              </span>
              <span className={isMine ? "text-indigo-300" : "text-zinc-500"}>
                {msg.text}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!readOnly && (
        <form onSubmit={handleSend} className="flex gap-2 flex-shrink-0">
          <input
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-400 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
