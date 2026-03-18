import type { HoldState } from "../hooks/useHoldToSeal";

interface HoldButtonProps {
  holdState: HoldState;
  progress: number; // 0–1
  onPressStart: () => void;
  onPressEnd: () => void;
}

const CONFIG = {
  idle:        { label: "Hold to Seal",      sub: "Both must hold 3s", emoji: "🤝", cls: "border-indigo-500 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" },
  oneHolding:  { label: "Waiting for other…", sub: "Keep holding",      emoji: "⏳", cls: "border-indigo-400 bg-indigo-500/20 text-indigo-300 animate-pulse" },
  bothHolding: { label: "Hold…",              sub: "",                   emoji: "🔒", cls: "border-green-500 bg-green-500/20 text-green-400" },
  sealed:      { label: "Sealed",             sub: "",                   emoji: "✅", cls: "border-green-500 bg-green-500/20 text-green-400" },
};

export function HoldButton({ holdState, progress, onPressStart, onPressEnd }: HoldButtonProps) {
  const { label, sub, emoji, cls } = CONFIG[holdState];

  return (
    <div className="relative w-full select-none">
      {holdState === "bothHolding" && (
        <div
          className="absolute inset-0 bg-green-500/30 rounded-lg"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <button
        className={`relative w-full border-2 rounded-lg py-4 text-center transition-colors ${cls}`}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={(e) => { e.preventDefault(); onPressStart(); }}
        onTouchEnd={onPressEnd}
        disabled={holdState === "sealed"}
      >
        <div className="text-2xl">{emoji}</div>
        <div className="font-bold mt-1">{label}</div>
        {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
      </button>
    </div>
  );
}
