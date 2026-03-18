import { useState } from "react";

interface GuestNamePromptProps {
  contractTitle: string;
  onConfirm: (name: string) => void; // receives "" when user skips
}

export function GuestNamePrompt({ contractTitle, onConfirm }: GuestNamePromptProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(name.trim());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

        {/* Contract preview */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
            You've been invited to review
          </p>
          <p className="text-sm font-semibold text-zinc-400">{contractTitle}</p>
        </div>

        {/* Gradient rule */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* Prompt */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">👋</span>
          <h1 className="font-serif text-2xl font-bold">What's your name?</h1>
          <p className="text-sm text-zinc-600 leading-relaxed">
            This will appear on the sealed contract.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-center text-zinc-50 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            Join Contract →
          </button>
          <button
            type="button"
            onClick={() => onConfirm("")}
            className="text-xs text-zinc-700 hover:text-zinc-600 underline underline-offset-2 transition-colors"
          >
            Skip — join as Guest
          </button>
        </form>

      </div>
    </div>
  );
}
