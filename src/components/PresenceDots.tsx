import { useState, useEffect } from "react";

const ONLINE_MS = 30_000;

interface PresenceDotsProps {
  creatorLastSeen: number | null;
  guestLastSeen: number | null;
}

export function PresenceDots({ creatorLastSeen, guestLastSeen }: PresenceDotsProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const creatorOnline = creatorLastSeen !== null && now - creatorLastSeen < ONLINE_MS;
  const guestOnline = guestLastSeen !== null && now - guestLastSeen < ONLINE_MS;

  return (
    <div className="flex items-center gap-4 text-xs text-zinc-600">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-[7px] h-[7px] rounded-full"
          style={creatorOnline
            ? { background: "#6366f1", boxShadow: "0 0 6px #6366f188" }
            : { background: "#27272a" }}
        />
        Creator
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-[7px] h-[7px] rounded-full"
          style={guestOnline
            ? { background: "#22c55e", boxShadow: "0 0 6px #22c55e88" }
            : { background: "#27272a" }}
        />
        Guest
      </span>
    </div>
  );
}
