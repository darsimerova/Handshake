import type { HoldState } from "../hooks/useHoldToSeal";

interface HoldButtonProps {
  holdState: HoldState;
  progress: number; // 0–1
  onPressStart: () => void;
  onPressEnd: () => void;
}

const CONFIG = {
  idle: {
    label: "Hold to Seal",
    sub: "Both must hold 3s",
    emoji: "🤝",
    border: "#6366f1",
    fill: "rgba(99,102,241,0.08)",
    labelColor: "#6366f1",
  },
  oneHolding: {
    label: "Waiting for other…",
    sub: "Keep holding",
    emoji: "⏳",
    border: "#818cf8",
    fill: "rgba(99,102,241,0.15)",
    labelColor: "#818cf8",
  },
  bothHolding: {
    label: "Hold…",
    sub: "",
    emoji: "🔒",
    border: "#22c55e",
    fill: "rgba(34,197,94,0.08)",
    labelColor: "#22c55e",
  },
  sealed: {
    label: "Sealed",
    sub: "",
    emoji: "✅",
    border: "#22c55e",
    fill: "rgba(34,197,94,0.08)",
    labelColor: "#22c55e",
  },
};

export function HoldButton({ holdState, progress, onPressStart, onPressEnd }: HoldButtonProps) {
  const cfg = CONFIG[holdState];

  return (
    <div className="relative w-full select-none">
      {/* progress fill */}
      {holdState === "bothHolding" && (
        <div
          className="absolute inset-0 rounded-[10px] bg-green-500/20 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      <button
        className="relative w-full rounded-[10px] py-5 text-center transition-colors disabled:cursor-default"
        style={{
          border: `2px solid ${cfg.border}`,
          background: cfg.fill,
        }}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={(e) => { e.preventDefault(); onPressStart(); }}
        onTouchEnd={onPressEnd}
        disabled={holdState === "sealed"}
      >
        <div className="text-2xl">{cfg.emoji}</div>
        <div className="text-sm font-bold mt-1" style={{ color: cfg.labelColor }}>
          {cfg.label}
        </div>
        {cfg.sub && (
          <div className="text-[11px] text-zinc-600 mt-0.5">{cfg.sub}</div>
        )}
      </button>
    </div>
  );
}
